import "./curtainsuk-server-script-loader.mjs";
import { createHash } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { listFabricMasterRecords } from "../lib/fabric-master/repository";
import {
  FABRIC_PROFILE_CREATE_BASE_FIELDS,
  FABRIC_PROFILE_KNOWLEDGE_FIELDS,
  FABRIC_PROFILE_SYNC_FIELD,
  buildFabricProfileCreateBase,
  buildFabricProfilePublication,
  fabricProfilePublicationRichEnough,
} from "../lib/fabric-master/fabric-profile-publication";
import { queryVisualKnowledgeWithFallback } from "../lib/fabric-master/visual-knowledge-source";
import type { VisualRow } from "../lib/fabric-master/visual-knowledge";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";

loadEnvConfig(process.cwd());

const FABRIC_PROFILE_TYPE = "$app:fabric_discovery";
const EXPECTED_LIVE_THEME_FABRIC_PROFILE_TYPE = "app--328390344705--fabric_discovery";
const EXPECTED_CURTAINSUK_APP_ID = "gid://shopify/App/328390344705";
const EXPECTED_CURTAINSUK_APP_HANDLE = "curtains-uk-mtm";
const PRODUCTION_SHOP = "carpetup.myshopify.com";
const SHOPIFY_ADMIN_API_VERSION = "2026-07" as const;
const READ_SCOPE = "read_metaobjects" as const;
const READ_DEFINITIONS_SCOPE = "read_metaobject_definitions" as const;
const WRITE_SCOPE = "write_metaobjects" as const;
const WRITE_CONCURRENCY = 4;

const LIST_PROFILES_QUERY = [
  "query CurtainsUKFabricProfiles($type: String!, $after: String) {",
  "  metaobjects(type: $type, first: 100, after: $after) {",
  "    nodes { id handle fields { key value } }",
  "    pageInfo { hasNextPage endCursor }",
  "  }",
  "}",
].join("\n");

const PROFILE_DEFINITION_QUERY = [
  "query CurtainsUKFabricProfileDefinition($type: String!) {",
  "  metaobjectDefinitionByType(type: $type) {",
  "    type",
  "    fieldDefinitions { key required }",
  "  }",
  "}",
].join("\n");

const ACCESS_SCOPES_QUERY = [
  "query CurtainsUKFabricProfileScopes {",
  "  currentAppInstallation {",
  "    app { id handle }",
  "    accessScopes { handle }",
  "  }",
  "}",
].join("\n");

const UPSERT_PROFILE_MUTATION = [
  "mutation CurtainsUKCreateFabricProfile($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {",
  "  metaobjectUpsert(handle: $handle, metaobject: $metaobject) {",
  "    metaobject { id handle fields { key value } }",
  "    userErrors { field message code }",
  "  }",
  "}",
].join("\n");

type Args = {
  apply: boolean;
  confirmedShopifyOnly: boolean;
  addCount: number;
  expectedSelection: string | null;
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

type ProfileDefinition = {
  keys: Set<string>;
  requiredKeys: Set<string>;
};

type Candidate = {
  fabricId: string;
  handle: string;
  fields: Array<{ key: string; value: string }>;
  state: string;
};

function parseArgs(argv: string[]): Args {
  let apply = false;
  let confirmedShopifyOnly = false;
  let addCount = 0;
  let expectedSelection: string | null = null;

  for (const arg of argv) {
    if (arg === "--apply") apply = true;
    else if (arg === "--confirm-shopify-only") confirmedShopifyOnly = true;
    else if (arg.startsWith("--add=")) {
      const value = Number.parseInt(arg.slice("--add=".length), 10);
      if (!Number.isInteger(value) || value < 1 || value > 5000) throw new Error("FABRIC_PROFILE_ADD_COUNT_INVALID");
      addCount = value;
    } else if (arg.startsWith("--expected-selection=")) {
      expectedSelection = arg.slice("--expected-selection=".length).trim() || null;
    } else {
      throw new Error("FABRIC_PROFILE_ARGUMENT_INVALID:" + arg);
    }
  }

  if (addCount < 1) throw new Error("FABRIC_PROFILE_ADD_COUNT_REQUIRED");
  if (apply && !confirmedShopifyOnly) throw new Error("FABRIC_PROFILE_APPLY_REQUIRES_CONFIRM_SHOPIFY_ONLY");
  if (apply && !expectedSelection) throw new Error("FABRIC_PROFILE_APPLY_REQUIRES_EXPECTED_SELECTION");
  if (expectedSelection && !/^fabric-profile-add-[0-9]+-[a-f0-9]{24}$/.test(expectedSelection)) {
    throw new Error("FABRIC_PROFILE_EXPECTED_SELECTION_INVALID");
  }

  return { apply, confirmedShopifyOnly, addCount, expectedSelection };
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
  const required = apply
    ? [READ_SCOPE, READ_DEFINITIONS_SCOPE, WRITE_SCOPE]
    : [READ_SCOPE, READ_DEFINITIONS_SCOPE];
  for (const scope of required) {
    if (!scopes.has(scope)) throw new Error("FABRIC_PROFILE_SCOPE_MISSING:" + scope);
  }
}

async function accessToken(config: ReturnType<typeof runtimeConfig>, apply: boolean) {
  const response = await fetch("https://" + config.shopDomain + "/admin/oauth/access_token", {
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

function throttled(errors: unknown) {
  return Array.isArray(errors)
    && errors.length > 0
    && errors.every((error) =>
      isRecord(error)
      && isRecord(error.extensions)
      && error.extensions.code === "THROTTLED"
    );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function graphql(
  config: ReturnType<typeof runtimeConfig>,
  token: string,
  query: string,
  variables: Record<string, unknown>,
) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(
      "https://" + config.shopDomain + "/admin/api/" + SHOPIFY_ADMIN_API_VERSION + "/graphql.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({ query, variables }),
        cache: "no-store",
        signal: AbortSignal.timeout(25_000),
      },
    );

    if (response.status === 429) {
      await delay(Math.min(5000, 500 * (2 ** attempt)));
      continue;
    }
    if (!response.ok) throw new Error("FABRIC_PROFILE_SHOPIFY_REQUEST_FAILED");

    const envelope = await response.json() as GraphqlEnvelope;
    if (throttled(envelope.errors)) {
      await delay(Math.min(5000, 500 * (2 ** attempt)));
      continue;
    }
    if (Array.isArray(envelope.errors) && envelope.errors.length) {
      throw new Error("FABRIC_PROFILE_SHOPIFY_GRAPHQL_ERROR");
    }
    if (!isRecord(envelope.data)) throw new Error("FABRIC_PROFILE_SHOPIFY_RESPONSE_INVALID");
    return envelope.data;
  }

  throw new Error("FABRIC_PROFILE_SHOPIFY_THROTTLED");
}

async function verifyInstalledScopes(
  config: ReturnType<typeof runtimeConfig>,
  token: string,
  apply: boolean,
) {
  const data = await graphql(config, token, ACCESS_SCOPES_QUERY, {});
  const installation = data.currentAppInstallation;
  if (!isRecord(installation) || !isRecord(installation.app) || !Array.isArray(installation.accessScopes)) {
    throw new Error("FABRIC_PROFILE_SCOPE_RESPONSE_INVALID");
  }
  if (installation.app.id !== EXPECTED_CURTAINSUK_APP_ID
    || installation.app.handle !== EXPECTED_CURTAINSUK_APP_HANDLE) {
    throw new Error("FABRIC_PROFILE_WRONG_SHOPIFY_APP");
  }
  const scopes = new Set(installation.accessScopes.flatMap((entry) =>
    isRecord(entry) && typeof entry.handle === "string" ? [entry.handle] : [],
  ));
  assertScopes(scopes, apply);
}

async function verifyProfileDefinition(
  config: ReturnType<typeof runtimeConfig>,
  token: string,
): Promise<ProfileDefinition> {
  const data = await graphql(config, token, PROFILE_DEFINITION_QUERY, { type: FABRIC_PROFILE_TYPE });
  const definition = data.metaobjectDefinitionByType;
  if (!isRecord(definition) || definition.type !== EXPECTED_LIVE_THEME_FABRIC_PROFILE_TYPE
    || !Array.isArray(definition.fieldDefinitions)) {
    throw new Error("FABRIC_PROFILE_DEFINITION_MISMATCH");
  }

  const keys = new Set<string>();
  const requiredKeys = new Set<string>();
  for (const field of definition.fieldDefinitions) {
    if (!isRecord(field) || typeof field.key !== "string") throw new Error("FABRIC_PROFILE_DEFINITION_INVALID");
    keys.add(field.key);
    if (field.required === true) requiredKeys.add(field.key);
  }

  for (const key of [...FABRIC_PROFILE_CREATE_BASE_FIELDS, ...FABRIC_PROFILE_KNOWLEDGE_FIELDS, FABRIC_PROFILE_SYNC_FIELD]) {
    if (!keys.has(key)) throw new Error("FABRIC_PROFILE_DEFINITION_FIELD_MISSING:" + key);
  }
  return { keys, requiredKeys };
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

function fieldsMap(profile: ShopifyProfile) {
  return Object.fromEntries(profile.fields.map((field) => [field.key, field.value]));
}

function exactFabricId(profile: ShopifyProfile) {
  const value = fieldsMap(profile).fabric_master_id;
  if (typeof value !== "string" || !/^[a-zA-Z0-9-]{1,150}$/.test(value)) {
    throw new Error("FABRIC_PROFILE_IDENTITY_INVALID:" + profile.handle);
  }
  return value;
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

async function visualRows(ids: string[]) {
  const database = createSupplierServiceClient();
  const rows: VisualRow[] = [];
  for (let from = 0; from < ids.length; from += 400) {
    const batch = ids.slice(from, from + 400);
    const { data, error } = await queryVisualKnowledgeWithFallback(
      (source) => database
        .from(source)
        .select("fabric_id,knowledge_state,visual_fields")
        .in("fabric_id", batch),
      "fabric_visual_knowledge_enriched",
      "fabric_visual_knowledge_read_cache",
    );
    if (error) throw new Error("FABRIC_PROFILE_DATABASE_READ_FAILED");
    rows.push(...((data ?? []) as VisualRow[]));
  }
  return new Map(rows.map((row) => [row.fabric_id, row]));
}

async function currentSampleEligibleIds() {
  const database = createSupplierServiceClient();
  const { data: control, error: controlError } = await database
    .from("browse_projection_control")
    .select("active_generation")
    .limit(1);
  if (controlError || !control?.[0]?.active_generation) throw new Error("FABRIC_PROFILE_BROWSE_GENERATION_UNAVAILABLE");

  const generation = String(control[0].active_generation);
  const ids: string[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await database
      .from("browse_read_projection")
      .select("fabric_id")
      .eq("generation_id", generation)
      .eq("sample_current", true)
      .order("fabric_id")
      .range(from, from + 499);
    if (error) throw new Error("FABRIC_PROFILE_SAMPLE_ELIGIBILITY_UNAVAILABLE");
    const page = data ?? [];
    ids.push(...page.map((row) => String(row.fabric_id)));
    if (page.length < 500) break;
  }
  return new Set(ids);
}

function candidateOrder(candidate: Candidate) {
  const stateRank = candidate.state === "COMPLETE" ? "0" : "1";
  const hash = createHash("sha256").update(candidate.fabricId).digest("hex");
  return stateRank + ":" + hash;
}

function selectionRevision(candidates: Candidate[], addCount: number) {
  const digest = createHash("sha256")
    .update(candidates.map((candidate) => candidate.fabricId).join("\n"))
    .digest("hex")
    .slice(0, 24);
  return "fabric-profile-add-" + addCount + "-" + digest;
}

function assertCandidateDefinition(candidate: Candidate, definition: ProfileDefinition) {
  const fieldKeys = new Set(candidate.fields.map((field) => field.key));
  for (const field of candidate.fields) {
    if (!definition.keys.has(field.key)) throw new Error("FABRIC_PROFILE_DEFINITION_FIELD_MISSING:" + field.key);
  }
  for (const required of definition.requiredKeys) {
    if (!fieldKeys.has(required)) throw new Error("FABRIC_PROFILE_REQUIRED_CREATE_FIELD_MISSING:" + required);
  }
}

async function upsertProfile(
  config: ReturnType<typeof runtimeConfig>,
  token: string,
  candidate: Candidate,
) {
  const data = await graphql(config, token, UPSERT_PROFILE_MUTATION, {
    handle: { type: FABRIC_PROFILE_TYPE, handle: candidate.handle },
    metaobject: {
      fields: candidate.fields,
      capabilities: { publishable: { status: "ACTIVE" } },
    },
  });
  const payload = data.metaobjectUpsert;
  if (!isRecord(payload) || !Array.isArray(payload.userErrors) || payload.userErrors.length > 0) {
    throw new Error("FABRIC_PROFILE_CREATE_REJECTED:" + candidate.fabricId);
  }
  const profile = parseProfileNode(payload.metaobject);
  const current = fieldsMap(profile);
  if (current.fabric_master_id !== candidate.fabricId) {
    throw new Error("FABRIC_PROFILE_CREATE_IDENTITY_MISMATCH:" + candidate.fabricId);
  }
  for (const field of candidate.fields) {
    if (current[field.key] !== field.value) {
      throw new Error("FABRIC_PROFILE_CREATE_READBACK_MISMATCH:" + candidate.fabricId + ":" + field.key);
    }
  }
  return profile;
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = runtimeConfig();
  const token = await accessToken(config, args.apply);
  await verifyInstalledScopes(config, token, args.apply);
  const definition = await verifyProfileDefinition(config, token);

  const profiles = await existingProfiles(config, token);
  if (!profiles.length) throw new Error("FABRIC_PROFILE_NONE_DISCOVERED");

  const existingByFabricId = new Map<string, ShopifyProfile>();
  const existingHandles = new Set<string>();
  for (const profile of profiles) {
    const fabricId = exactFabricId(profile);
    if (existingByFabricId.has(fabricId)) throw new Error("FABRIC_PROFILE_DUPLICATE_IDENTITY:" + fabricId);
    existingByFabricId.set(fabricId, profile);
    existingHandles.add(profile.handle);
  }

  const [records, sampleEligible] = await Promise.all([
    listFabricMasterRecords({ storefrontOnly: true }),
    currentSampleEligibleIds(),
  ]);
  const candidateRecords = records.filter((record) =>
    !existingByFabricId.has(record.fabric_id)
    && sampleEligible.has(record.fabric_id)
  );

  const rows = await visualRows(candidateRecords.map((record) => record.fabric_id));
  const candidates: Candidate[] = [];

  for (const record of candidateRecords) {
    const row = rows.get(record.fabric_id);
    if (!row) continue;
    const publication = buildFabricProfilePublication(row);
    if (!publication || !fabricProfilePublicationRichEnough(publication)) continue;
    const base = buildFabricProfileCreateBase(record);
    if (!base) continue;
    if (existingHandles.has(base.handle)) throw new Error("FABRIC_PROFILE_HANDLE_COLLISION:" + base.handle);

    const fields = [
      ...FABRIC_PROFILE_CREATE_BASE_FIELDS.map((key) => ({ key, value: base.fields[key] })),
      ...FABRIC_PROFILE_KNOWLEDGE_FIELDS.flatMap((key) => {
        const value = publication.fields[key];
        return value ? [{ key, value }] : [];
      }),
      { key: FABRIC_PROFILE_SYNC_FIELD, value: publication.revision },
    ];

    const candidate = {
      fabricId: record.fabric_id,
      handle: base.handle,
      fields,
      state: publication.fields.knowledge_state ?? "PARTIAL",
    };
    assertCandidateDefinition(candidate, definition);
    candidates.push(candidate);
  }

  candidates.sort((a, b) => candidateOrder(a).localeCompare(candidateOrder(b)));
  const selected = candidates.slice(0, args.addCount);
  if (selected.length !== args.addCount) {
    throw new Error("FABRIC_PROFILE_INSUFFICIENT_ELIGIBLE_CANDIDATES:" + selected.length);
  }

  const selection = selectionRevision(selected, args.addCount);
  if (args.apply && selection !== args.expectedSelection) {
    throw new Error("FABRIC_PROFILE_SELECTION_CHANGED:" + selection);
  }

  const stateCounts = selected.reduce<Record<string, number>>((counts, candidate) => {
    counts[candidate.state] = (counts[candidate.state] ?? 0) + 1;
    return counts;
  }, {});

  if (args.apply) {
    await runPool(selected, WRITE_CONCURRENCY, async (candidate) => {
      await upsertProfile(config, token, candidate);
    });

    const after = await existingProfiles(config, token);
    const afterIds = new Set(after.map(exactFabricId));
    for (const candidate of selected) {
      if (!afterIds.has(candidate.fabricId)) throw new Error("FABRIC_PROFILE_POST_APPLY_MISSING:" + candidate.fabricId);
    }
    if (after.length < profiles.length + selected.length) {
      throw new Error("FABRIC_PROFILE_POST_APPLY_COUNT_MISMATCH");
    }

    console.log(JSON.stringify({
      mode: "APPLY",
      databaseWrites: 0,
      startingProfiles: profiles.length,
      selectedCreates: selected.length,
      shopifyWrites: selected.length,
      finalProfiles: after.length,
      selectionRevision: selection,
      intelligenceSource: "fabric_visual_knowledge_enriched",
      stateCounts,
      firstCreated: selected.slice(0, 20).map((candidate) => ({
        fabricId: candidate.fabricId,
        handle: candidate.handle,
      })),
    }, null, 2));
    return;
  }

  console.log(JSON.stringify({
    mode: "DRY_RUN",
    databaseWrites: 0,
    shopifyWrites: 0,
    startingProfiles: profiles.length,
    eligibleCandidates: candidates.length,
    selectedCreates: selected.length,
    selectionRevision: selection,
    intelligenceSource: "fabric_visual_knowledge_enriched",
    selectionRules: {
      existingFabricIdsExcluded: true,
      currentStorefrontEligibilityRequired: true,
      currentSampleEligibilityRequired: true,
      shopifyCdnImageRequired: true,
      completeOrPartialGovernedRequired: true,
      patternPlusThreeSupportingDimensionsRequired: true,
      completePreferredBeforePartial: true,
    },
    stateCounts,
    firstSelected: selected.slice(0, 20).map((candidate) => ({
      fabricId: candidate.fabricId,
      handle: candidate.handle,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "FABRIC_PROFILE_EXPANSION_FAILED");
  process.exitCode = 1;
});
