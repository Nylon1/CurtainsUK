import "./curtainsuk-server-script-loader.mjs";
import { loadEnvConfig } from "@next/env";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import {
  assertFabricProfilePatchAllowed,
  buildFabricProfilePublication,
  fabricProfilePatch,
} from "../lib/fabric-master/fabric-profile-publication";
import type { VisualRow } from "../lib/fabric-master/visual-knowledge";
import { SHOPIFY_DRAFT_ORDER_API_VERSION } from "../lib/storefront/shopify-draft-order-core";

loadEnvConfig(process.cwd());

const FABRIC_PROFILE_TYPE = "app--328390344705--fabric_discovery";
const PRODUCTION_SHOP = "carpetup.myshopify.com";
const READ_SCOPE = "read_metaobjects" as const;
const WRITE_SCOPE = "write_metaobjects" as const;

const LIST_PROFILES_QUERY = `
  query CurtainsUKFabricProfiles($type: String!, $after: String) {
    metaobjects(type: $type, first: 100, after: $after) {
      nodes { id handle fields { key value } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const ACCESS_SCOPES_QUERY = `
  query CurtainsUKFabricProfileScopes {
    currentAppInstallation { accessScopes { handle } }
  }
`;

const UPDATE_PROFILE_MUTATION = `
  mutation CurtainsUKRefreshFabricProfile($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject { id handle fields { key value } }
      userErrors { field message }
    }
  }
`;

type Args = {
  apply: boolean;
  confirmedShopifyOnly: boolean;
  fabricId: string | null;
  limit: number | null;
};

type ShopifyProfile = {
  id: string;
  handle: string;
  fields: Array<{ key: string; value: string | null }>;
};

type GraphqlEnvelope = {
  data?: Record<string, unknown> | null;
  errors?: unknown;
};

function parseArgs(argv: string[]): Args {
  let apply = false;
  let confirmedShopifyOnly = false;
  let fabricId: string | null = null;
  let limit: number | null = null;

  for (const arg of argv) {
    if (arg === "--apply") apply = true;
    else if (arg === "--confirm-shopify-only") confirmedShopifyOnly = true;
    else if (arg.startsWith("--fabric=")) fabricId = arg.slice("--fabric=".length).trim() || null;
    else if (arg.startsWith("--limit=")) {
      const parsed = Number.parseInt(arg.slice("--limit=".length), 10);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5000) throw new Error("FABRIC_PROFILE_LIMIT_INVALID");
      limit = parsed;
    } else {
      throw new Error(`FABRIC_PROFILE_ARGUMENT_INVALID:${arg}`);
    }
  }

  if (apply && !confirmedShopifyOnly) {
    throw new Error("FABRIC_PROFILE_APPLY_REQUIRES_CONFIRM_SHOPIFY_ONLY");
  }
  if (fabricId && !/^[a-zA-Z0-9-]{1,150}$/.test(fabricId)) {
    throw new Error("FABRIC_PROFILE_FABRIC_ID_INVALID");
  }
  return { apply, confirmedShopifyOnly, fabricId, limit };
}

function runtimeConfig(environment: NodeJS.ProcessEnv = process.env) {
  const shopDomain = (environment.CURTAINSUK_SHOPIFY_CHECKOUT_STORE ?? PRODUCTION_SHOP).trim().toLowerCase();
  const clientId = environment.CURTAINSUK_SHOPIFY_CLIENT_ID?.trim() ?? "";
  const clientSecret = environment.CURTAINSUK_SHOPIFY_APP_SECRET?.trim() ?? "";

  if (shopDomain !== PRODUCTION_SHOP) throw new Error("FABRIC_PROFILE_SHOP_DENIED");
  if (clientId.length < 8 || clientSecret.length < 16) throw new Error("FABRIC_PROFILE_SHOPIFY_CREDENTIALS_MISSING");

  return { shopDomain, clientId, clientSecret };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseScopes(value: unknown) {
  if (typeof value !== "string") throw new Error("FABRIC_PROFILE_TOKEN_INVALID");
  return new Set(value.split(/[\s,]+/).map((scope) => scope.trim()).filter(Boolean));
}

function assertScopes(scopes: ReadonlySet<string>, apply: boolean) {
  const required = apply ? [READ_SCOPE, WRITE_SCOPE] : [READ_SCOPE];
  for (const scope of required) {
    if (!scopes.has(scope)) throw new Error(`FABRIC_PROFILE_SCOPE_MISSING:${scope}`);
  }
}

async function accessToken(config: ReturnType<typeof runtimeConfig>, apply: boolean) {
  const response = await fetch(`https://${config.shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("FABRIC_PROFILE_TOKEN_REQUEST_FAILED");

  const body: unknown = await response.json();
  if (!isRecord(body) || typeof body.access_token !== "string" || body.access_token.length < 16) {
    throw new Error("FABRIC_PROFILE_TOKEN_INVALID");
  }
  const scopes = parseScopes(body.scope);
  assertScopes(scopes, apply);
  return body.access_token;
}

async function graphql(
  config: ReturnType<typeof runtimeConfig>,
  token: string,
  query: string,
  variables: Record<string, unknown>,
) {
  const response = await fetch(
    `https://${config.shopDomain}/admin/api/${SHOPIFY_DRAFT_ORDER_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!response.ok) throw new Error("FABRIC_PROFILE_SHOPIFY_REQUEST_FAILED");

  const envelope = await response.json() as GraphqlEnvelope;
  if (Array.isArray(envelope.errors) && envelope.errors.length) {
    throw new Error("FABRIC_PROFILE_SHOPIFY_GRAPHQL_ERROR");
  }
  if (!isRecord(envelope.data)) throw new Error("FABRIC_PROFILE_SHOPIFY_RESPONSE_INVALID");
  return envelope.data;
}

async function verifyInstalledScopes(
  config: ReturnType<typeof runtimeConfig>,
  token: string,
  apply: boolean,
) {
  const data = await graphql(config, token, ACCESS_SCOPES_QUERY, {});
  const installation = data.currentAppInstallation;
  if (!isRecord(installation) || !Array.isArray(installation.accessScopes)) {
    throw new Error("FABRIC_PROFILE_SCOPE_RESPONSE_INVALID");
  }
  const scopes = new Set(installation.accessScopes.flatMap((entry) =>
    isRecord(entry) && typeof entry.handle === "string" ? [entry.handle] : [],
  ));
  assertScopes(scopes, apply);
}

function parseProfileNode(value: unknown): ShopifyProfile {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.handle !== "string" || !Array.isArray(value.fields)) {
    throw new Error("FABRIC_PROFILE_NODE_INVALID");
  }
  const fields = value.fields.map((field) => {
    if (!isRecord(field) || typeof field.key !== "string" || (field.value !== null && typeof field.value !== "string")) {
      throw new Error("FABRIC_PROFILE_FIELD_INVALID");
    }
    return { key: field.key, value: field.value as string | null };
  });
  return { id: value.id, handle: value.handle, fields };
}

async function existingProfiles(
  config: ReturnType<typeof runtimeConfig>,
  token: string,
) {
  const profiles: ShopifyProfile[] = [];
  let after: string | null = null;

  for (;;) {
    const data = await graphql(config, token, LIST_PROFILES_QUERY, { type: FABRIC_PROFILE_TYPE, after });
    const connection = data.metaobjects;
    if (!isRecord(connection) || !Array.isArray(connection.nodes) || !isRecord(connection.pageInfo)) {
      throw new Error("FABRIC_PROFILE_LIST_INVALID");
    }
    profiles.push(...connection.nodes.map(parseProfileNode));
    const hasNextPage = connection.pageInfo.hasNextPage === true;
    const endCursor = typeof connection.pageInfo.endCursor === "string" ? connection.pageInfo.endCursor : null;
    if (!hasNextPage) break;
    if (!endCursor) throw new Error("FABRIC_PROFILE_CURSOR_MISSING");
    after = endCursor;
  }

  return profiles;
}

function fieldsMap(profile: ShopifyProfile) {
  return Object.fromEntries(profile.fields.map((field) => [field.key, field.value]));
}

function exactFabricId(profile: ShopifyProfile) {
  const value = fieldsMap(profile).fabric_master_id;
  if (typeof value !== "string" || !/^[a-zA-Z0-9-]{1,150}$/.test(value)) {
    throw new Error(`FABRIC_PROFILE_IDENTITY_INVALID:${profile.handle}`);
  }
  return value;
}

async function visualRows(ids: string[]) {
  const database = createSupplierServiceClient();
  const rows: VisualRow[] = [];
  for (let from = 0; from < ids.length; from += 400) {
    const { data, error } = await database
      .from("fabric_visual_knowledge_read_cache")
      .select("fabric_id,knowledge_state,visual_fields")
      .in("fabric_id", ids.slice(from, from + 400));
    if (error) throw new Error("FABRIC_PROFILE_DATABASE_READ_FAILED");
    rows.push(...((data ?? []) as VisualRow[]));
  }
  return new Map(rows.map((row) => [row.fabric_id, row]));
}

async function updateProfile(
  config: ReturnType<typeof runtimeConfig>,
  token: string,
  profile: ShopifyProfile,
  patch: Array<{ key: string; value: string }>,
) {
  assertFabricProfilePatchAllowed(patch);
  const data = await graphql(config, token, UPDATE_PROFILE_MUTATION, {
    id: profile.id,
    metaobject: { fields: patch },
  });
  const payload = data.metaobjectUpdate;
  if (!isRecord(payload) || !Array.isArray(payload.userErrors) || payload.userErrors.length > 0) {
    throw new Error(`FABRIC_PROFILE_UPDATE_REJECTED:${profile.handle}`);
  }
  const updated = parseProfileNode(payload.metaobject);
  const current = fieldsMap(updated);
  for (const field of patch) {
    if (current[field.key] !== field.value) {
      throw new Error(`FABRIC_PROFILE_READBACK_MISMATCH:${profile.handle}:${field.key}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = runtimeConfig();
  const token = await accessToken(config, args.apply);
  await verifyInstalledScopes(config, token, args.apply);

  let profiles = await existingProfiles(config, token);
  if (args.apply && profiles.length === 0) throw new Error("FABRIC_PROFILE_APPLY_NO_LIVE_PROFILES");
  const byFabricId = new Map<string, ShopifyProfile>();
  for (const profile of profiles) {
    const fabricId = exactFabricId(profile);
    if (byFabricId.has(fabricId)) throw new Error(`FABRIC_PROFILE_DUPLICATE_IDENTITY:${fabricId}`);
    byFabricId.set(fabricId, profile);
  }

  if (args.fabricId) profiles = profiles.filter((profile) => exactFabricId(profile) === args.fabricId);
  if (args.limit !== null) profiles = profiles.slice(0, args.limit);

  const ids = profiles.map(exactFabricId);
  const rows = await visualRows(ids);
  const changes: Array<{
    fabricId: string;
    handle: string;
    fields: Array<{ key: string; from: string | null; to: string }>;
  }> = [];
  const skipped: Array<{ fabricId: string; handle: string; reason: string }> = [];

  for (const profile of profiles) {
    const fabricId = exactFabricId(profile);
    const row = rows.get(fabricId);
    if (!row) {
      skipped.push({ fabricId, handle: profile.handle, reason: "NO_GOVERNED_CACHE_ROW" });
      continue;
    }
    const publication = buildFabricProfilePublication(row);
    if (!publication) {
      skipped.push({ fabricId, handle: profile.handle, reason: `STATE_${row.knowledge_state}` });
      continue;
    }

    const existing = fieldsMap(profile);
    const patch = fabricProfilePatch(existing, publication);
    assertFabricProfilePatchAllowed(patch);
    if (!patch.length) continue;

    changes.push({
      fabricId,
      handle: profile.handle,
      fields: patch.map((field) => ({
        key: field.key,
        from: typeof existing[field.key] === "string" ? existing[field.key] : null,
        to: field.value,
      })),
    });

    if (args.apply) {
      await updateProfile(config, token, profile, patch);
    }
  }

  console.log(JSON.stringify({
    mode: args.apply ? "APPLY" : "DRY_RUN",
    databaseWrites: 0,
    shopifyWrites: args.apply ? changes.length : 0,
    profileCreates: 0,
    profileDeletes: 0,
    identityOrCommerceFieldsWritable: false,
    discoveredProfiles: byFabricId.size,
    selectedProfiles: profiles.length,
    governedRowsFound: rows.size,
    changedProfiles: changes.length,
    skippedProfiles: skipped.length,
    changes,
    skipped,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "FABRIC_PROFILE_REFRESH_FAILED");
  process.exitCode = 1;
});
