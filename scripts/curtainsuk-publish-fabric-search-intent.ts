import "./curtainsuk-server-script-loader.mjs";
import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { listFabricMasterRecords } from "../lib/fabric-master/repository";
import { mapVisualKnowledgeRow, type VisualRow } from "../lib/fabric-master/visual-knowledge";
import {
  buildFabricSearchIntent, fabricProfileSearchPatch,
  FABRIC_PROFILE_SEARCH_FIELD_DEFINITIONS, type FabricSearchIntent,
  type GovernedRetailIntent,
} from "../lib/fabric-master/fabric-search-intent";

loadEnvConfig(process.cwd());

const SHOP = "carpetup.myshopify.com";
const APP_ID = "gid://shopify/App/328390344705";
const APP_HANDLE = "curtains-uk-mtm";
const TYPE = "app--328390344705--fabric_discovery";
const API = "2026-07";
type ShopifyProfile = { id: string; handle: string; fields: Array<{ key: string; value: string | null }> };
type Manifest = { profileCount: number; profiles: Array<{ fabricMasterId: string; canonicalUrl: string }> };

function parseArgs() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const all = args.includes("--all");
  const idsArg = args.find((arg) => arg.startsWith("--ids="));
  const reviewArg = args.find((arg) => arg.startsWith("--review-dir="));
  const shaArg = args.find((arg) => arg.startsWith("--expected-review-sha256="));
  const proofArg = args.find((arg) => arg.startsWith("--canary-proof="));
  const ids = idsArg?.slice("--ids=".length).split(",").filter(Boolean) ?? [];
  if (all === Boolean(ids.length)) throw new Error("SELECT_ALL_OR_IDS");
  if (args.some((arg) => !arg.startsWith("--ids=") && !arg.startsWith("--review-dir=")
    && !arg.startsWith("--expected-review-sha256=") && !arg.startsWith("--canary-proof=")
    && arg !== "--apply" && arg !== "--all")) throw new Error("UNKNOWN_ARGUMENT");
  if (!reviewArg) throw new Error("REVIEW_DIR_REQUIRED");
  if (apply && !shaArg) throw new Error("APPLY_REQUIRES_EXPECTED_REVIEW_SHA");
  if (apply && all && !proofArg) throw new Error("MASS_APPLY_REQUIRES_CANARY_PROOF");
  return {
    apply, all, ids, reviewDir: resolve(reviewArg.slice("--review-dir=".length)),
    expectedSha: shaArg?.slice("--expected-review-sha256=".length),
    canaryProof: proofArg ? resolve(proofArg.slice("--canary-proof=".length)) : null,
  };
}

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function profileNode(value: unknown): ShopifyProfile {
  if (!object(value) || typeof value.id !== "string" || typeof value.handle !== "string" || !Array.isArray(value.fields)) {
    throw new Error("SHOPIFY_PROFILE_NODE_INVALID");
  }
  const fields = value.fields.map((entry) => {
    if (!object(entry) || typeof entry.key !== "string" || (typeof entry.value !== "string" && entry.value !== null)) {
      throw new Error("SHOPIFY_PROFILE_FIELD_INVALID");
    }
    return { key: entry.key, value: entry.value as string | null };
  });
  return { id: value.id, handle: value.handle, fields };
}
function fieldMap(profile: ShopifyProfile) {
  return Object.fromEntries(profile.fields.map((field) => [field.key, field.value])) as Record<string, string | null>;
}

async function main() {
  const args = parseArgs();
  if (process.env.CURTAINSUK_SHOPIFY_CHECKOUT_STORE !== SHOP) throw new Error("SHOP_MISMATCH");
  const file = readFileSync(resolve(args.reviewDir, "generated-intents.json"));
  const digest = createHash("sha256").update(file).digest("hex");
  if (args.expectedSha && digest !== args.expectedSha) throw new Error("REVIEW_DIGEST_MISMATCH");
  const reviewed = JSON.parse(file.toString("utf8")) as FabricSearchIntent[];
  const summary = JSON.parse(readFileSync(resolve(args.reviewDir, "summary.json"), "utf8")) as {
    profileManifestCount: number; generatedCount: number; blockers: unknown[];
  };
  if (reviewed.length !== summary.generatedCount || reviewed.length !== summary.profileManifestCount || summary.blockers.length) {
    throw new Error("REVIEW_NOT_CLEAN");
  }
  const reviewedById = new Map(reviewed.map((item) => [item.fabricId, item]));
  if (reviewedById.size !== reviewed.length) throw new Error("REVIEW_ID_DUPLICATE");
  const manifest = JSON.parse(readFileSync(resolve("generated/fabric-profile-sitemap.json"), "utf8")) as Manifest;
  const manifestById = new Map(manifest.profiles.map((item) => [item.fabricMasterId, item.canonicalUrl]));
  if (manifest.profileCount !== reviewed.length || manifestById.size !== reviewed.length) throw new Error("MANIFEST_COUNT_MISMATCH");
  const selected = args.all ? manifest.profiles.map((item) => item.fabricMasterId) : args.ids;
  if (new Set(selected).size !== selected.length || !selected.length) throw new Error("SELECTED_IDS_INVALID");
  for (const id of selected) if (!reviewedById.has(id)) throw new Error(`REVIEW_ID_MISSING:${id}`);
  if (args.all && args.canaryProof) {
    const proof = JSON.parse(readFileSync(args.canaryProof, "utf8")) as { reviewSha256?: string; verified?: number };
    if (proof.reviewSha256 !== digest || !proof.verified || proof.verified < 4) throw new Error("CANARY_PROOF_INVALID");
  }

  const master = new Map((await listFabricMasterRecords()).map((record) => [record.fabric_id, record]));
  const db = createSupplierServiceClient();
  const fi = new Map<string, VisualRow>();
  for (let from = 0; from < selected.length; from += 400) {
    const { data, error } = await db.from("fabric_visual_knowledge_enriched")
      .select("fabric_id,knowledge_state,visual_fields").in("fabric_id", selected.slice(from, from + 400));
    if (error) throw new Error(`FI_READ_FAILED:${error.code}`);
    for (const row of (data ?? []) as VisualRow[]) fi.set(row.fabric_id, row);
  }
  const { data: retailRows, error: retailError } = await db.from("fabric_retail_profiles")
    .select("fabric_id,description_validated,rooms,styles,headings,linings").range(0, 999);
  if (retailError) throw new Error(`RETAIL_READ_FAILED:${retailError.code}`);
  const retail = new Map((retailRows ?? []).map((row) => [row.fabric_id, row as GovernedRetailIntent & { fabric_id: string }]));
  const fresh = new Map<string, FabricSearchIntent>();
  for (const id of selected) {
    const record = master.get(id), row = fi.get(id), canonical = manifestById.get(id);
    if (!record || !row || !canonical || !["COMPLETE", "PARTIAL_GOVERNED"].includes(row.knowledge_state)) {
      throw new Error(`CURRENT_SOURCE_UNAVAILABLE:${id}`);
    }
    const intent = buildFabricSearchIntent(record, mapVisualKnowledgeRow(row), canonical, retail.get(id));
    if (JSON.stringify(intent) !== JSON.stringify(reviewedById.get(id))) throw new Error(`REVIEW_SOURCE_STALE:${id}`);
    fresh.set(id, intent);
  }

  const tokenResponse = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.CURTAINSUK_SHOPIFY_CLIENT_ID ?? "",
      client_secret: process.env.CURTAINSUK_SHOPIFY_APP_SECRET ?? "",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!tokenResponse.ok) throw new Error(`SHOPIFY_AUTH_HTTP_${tokenResponse.status}`);
  const auth = await tokenResponse.json() as { access_token?: string; scope?: string };
  if (!auth.access_token) throw new Error("SHOPIFY_TOKEN_MISSING");
  const scopes = new Set((auth.scope ?? "").split(/[\s,]+/));
  if (!scopes.has("read_metaobjects") && !scopes.has("write_metaobjects")) throw new Error("METAOBJECT_READ_SCOPE_MISSING");
  if (args.apply && !scopes.has("write_metaobjects")) throw new Error("METAOBJECT_WRITE_SCOPE_MISSING");
  async function graphql(query: string, variables: Record<string, unknown>) {
    const response = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": auth.access_token! },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw new Error(`SHOPIFY_GRAPHQL_HTTP_${response.status}`);
    const payload = await response.json() as { data?: Record<string, unknown>; errors?: unknown[] };
    if (!payload.data || payload.errors?.length) throw new Error("SHOPIFY_GRAPHQL_ERROR");
    return payload.data;
  }
  const verifyQuery = `query {
    currentAppInstallation { app { id handle } }
    metaobjectDefinitionByType(type:"$app:fabric_discovery") {
      type fieldDefinitions { key type { name } }
    }
  }`;
  const verification = await graphql(verifyQuery, {});
  const app = (verification.currentAppInstallation as { app?: { id: string; handle: string } })?.app;
  if (app?.id !== APP_ID || app.handle !== APP_HANDLE) throw new Error("APP_MISMATCH");
  const definition = verification.metaobjectDefinitionByType as {
    type: string; fieldDefinitions: Array<{ key: string; type: { name: string } }>;
  };
  if (definition?.type !== TYPE) throw new Error("DEFINITION_TYPE_MISMATCH");
  const definitionFields = new Map(definition.fieldDefinitions.map((field) => [field.key, field.type.name]));
  if (args.apply) {
    for (const field of FABRIC_PROFILE_SEARCH_FIELD_DEFINITIONS) {
      if (definitionFields.get(field.key) !== field.type) throw new Error(`SEARCH_DEFINITION_MISSING:${field.key}`);
    }
  }

  const listQuery = `query($after:String){
    metaobjects(type:"$app:fabric_discovery",first:250,after:$after){
      nodes{id handle fields{key value}}
      pageInfo{hasNextPage endCursor}
    }
  }`;
  const byId = new Map<string, ShopifyProfile>();
  let after: string | null = null, pages = 0;
  do {
    const result = await graphql(listQuery, { after });
    const connection = result.metaobjects as {
      nodes: unknown[]; pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
    if (!connection || !Array.isArray(connection.nodes)) throw new Error("PROFILE_LIST_INVALID");
    for (const node of connection.nodes) {
      const profile = profileNode(node);
      const fields = fieldMap(profile);
      const id = fields.fabric_master_id;
      if (!id || byId.has(id) || fields.canonical_url !== manifestById.get(id)) {
        throw new Error(`LIVE_PROFILE_IDENTITY_MISMATCH:${id}`);
      }
      if (fields.sample_price !== "2.50" || fields.sample_eligible !== "true") {
        throw new Error(`LIVE_PROFILE_SAMPLE_CONTRACT_MISMATCH:${id}`);
      }
      byId.set(id, profile);
    }
    after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
    if (connection.pageInfo.hasNextPage && !after) throw new Error("SHOPIFY_CURSOR_MISSING");
    if (++pages > 100) throw new Error("SHOPIFY_PAGE_BOUND");
  } while (after);
  if (byId.size !== manifest.profileCount) throw new Error(`LIVE_PROFILE_COUNT_MISMATCH:${byId.size}`);
  const snapshot = [...byId].map(([fabricId, profile]) => {
    const fields = fieldMap(profile);
    if (!/^https:\/\/cdn\.shopify\.com\//.test(fields.image_url ?? "")) {
      throw new Error(`PROFILE_IMAGE_NOT_APPROVED:${fabricId}`);
    }
    return {
      fabricId, id: profile.id, handle: profile.handle,
      canonicalUrl: fields.canonical_url, imageUrl: fields.image_url,
      brand: fields.brand, samplePrice: fields.sample_price,
    };
  }).sort((a, b) => a.fabricId.localeCompare(b.fabricId));
  const snapshotBody = JSON.stringify(snapshot, null, 2) + "\n";
  const snapshotSha256 = createHash("sha256").update(snapshotBody).digest("hex");
  writeFileSync(resolve(args.reviewDir, "shopify-profile-snapshot.json"), snapshotBody);
  const updates = selected.flatMap((id) => {
    const profile = byId.get(id), intent = fresh.get(id);
    if (!profile || !intent) throw new Error(`SELECTED_PROFILE_MISSING:${id}`);
    const patch = fabricProfileSearchPatch(fieldMap(profile), intent);
    return patch.length ? [{ id, profile, patch }] : [];
  });
  const fieldCount = updates.reduce((total, update) => total + update.patch.length, 0);
  if (!args.apply) {
    console.log(JSON.stringify({
      mode: "DRY_RUN", selected: selected.length, changes: updates.length,
      fieldChanges: fieldCount, liveProfiles: byId.size,
      reviewSha256: digest, snapshotSha256, shopifyWrites: 0, pages,
    }));
    return;
  }
  const mutation = `mutation($id:ID!,$fields:[MetaobjectFieldInput!]){
    metaobjectUpdate(id:$id,metaobject:{fields:$fields}){
      metaobject{id handle fields{key value}}
      userErrors{field message}
    }
  }`;
  const readbackQuery = `query($ids:[ID!]!){nodes(ids:$ids){
    ... on Metaobject{id handle fields{key value}}
  }}`;
  let written = 0, verified = 0;
  for (let from = 0; from < updates.length; from += 50) {
    const batch = updates.slice(from, from + 50);
    for (const update of batch) {
      const result = await graphql(mutation, { id: update.profile.id, fields: update.patch });
      const payload = result.metaobjectUpdate as { metaobject?: unknown; userErrors?: unknown[] };
      if (payload.userErrors?.length || !payload.metaobject) throw new Error(`PROFILE_UPDATE_FAILED:${update.id}`);
      const returned = profileNode(payload.metaobject);
      const fields = fieldMap(returned);
      for (const field of update.patch) {
        if (fields[field.key] !== field.value) throw new Error(`MUTATION_READBACK_MISMATCH:${update.id}:${field.key}`);
      }
      written++;
    }
    const readback = await graphql(readbackQuery, { ids: batch.map((update) => update.profile.id) });
    const nodes = readback.nodes;
    if (!Array.isArray(nodes) || nodes.length !== batch.length) throw new Error("BATCH_READBACK_COUNT_MISMATCH");
    const rereadById = new Map(nodes.map((node) => {
      const profile = profileNode(node);
      return [profile.id, profile] as const;
    }));
    for (const update of batch) {
      const profile = rereadById.get(update.profile.id);
      if (!profile) throw new Error(`BATCH_READBACK_MISSING:${update.id}`);
      const fields = fieldMap(profile);
      if (fields.fabric_master_id !== update.id || fields.canonical_url !== manifestById.get(update.id)
        || fields.sample_price !== "2.50") throw new Error(`BATCH_IDENTITY_REGRESSION:${update.id}`);
      for (const field of update.patch) {
        if (fields[field.key] !== field.value) throw new Error(`BATCH_FIELD_MISMATCH:${update.id}:${field.key}`);
      }
      verified++;
    }
    console.log(JSON.stringify({ batchStart: from, batchSize: batch.length, written, verified }));
  }
  const proof = {
    mode: args.all ? "FULL" : "CANARY", reviewSha256: digest,
    selected: selected.length, changed: updates.length, verified,
    fabricIds: selected, shopifyWrites: written,
  };
  const proofPath = resolve(args.reviewDir, args.all ? "shopify-full-proof.json" : "shopify-canary-proof.json");
  writeFileSync(proofPath, JSON.stringify(proof, null, 2) + "\n");
  console.log(JSON.stringify({ ...proof, proofPath }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
