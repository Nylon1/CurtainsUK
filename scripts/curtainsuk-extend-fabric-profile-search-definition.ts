import "./curtainsuk-server-script-loader.mjs";
import { loadEnvConfig } from "@next/env";
import { FABRIC_PROFILE_SEARCH_FIELD_DEFINITIONS } from "../lib/fabric-master/fabric-search-intent";

loadEnvConfig(process.cwd());

const SHOP = "carpetup.myshopify.com";
const APP_ID = "gid://shopify/App/328390344705";
const APP_HANDLE = "curtains-uk-mtm";
const TYPE = "app--328390344705--fabric_discovery";
const API = "2026-07";
const apply = process.argv.includes("--apply");
if (process.argv.slice(2).some((arg) => arg !== "--apply")) throw new Error("UNKNOWN_ARGUMENT");
if (process.env.CURTAINSUK_SHOPIFY_CHECKOUT_STORE !== SHOP) throw new Error("SHOP_MISMATCH");

async function main() {
  const response = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.CURTAINSUK_SHOPIFY_CLIENT_ID ?? "",
      client_secret: process.env.CURTAINSUK_SHOPIFY_APP_SECRET ?? "",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`SHOPIFY_AUTH_HTTP_${response.status}`);
  const auth = await response.json() as { access_token?: string; scope?: string };
  if (!auth.access_token) throw new Error("SHOPIFY_TOKEN_MISSING");
  const scopes = new Set((auth.scope ?? "").split(/[\s,]+/));
  if ((!scopes.has("read_metaobject_definitions") && !scopes.has("write_metaobject_definitions"))
    || (apply && !scopes.has("write_metaobject_definitions"))) {
    throw new Error("SHOPIFY_METAOBJECT_DEFINITION_SCOPE_MISSING");
  }
  async function graphql(query: string, variables: Record<string, unknown>) {
    const result = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": auth.access_token! },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!result.ok) throw new Error(`SHOPIFY_GRAPHQL_HTTP_${result.status}`);
    const envelope = await result.json() as { data?: Record<string, unknown>; errors?: unknown[] };
    if (envelope.errors?.length || !envelope.data) throw new Error("SHOPIFY_GRAPHQL_ERROR");
    return envelope.data;
  }
  const query = `query($type:String!){
    currentAppInstallation { app { id handle } }
    metaobjectDefinitionByType(type:$type) {
      id type fieldDefinitions { key name type { name } required }
    }
  }`;
  async function read() {
    const data = await graphql(query, { type: "$app:fabric_discovery" });
    const app = (data.currentAppInstallation as { app?: { id: string; handle: string } })?.app;
    if (app?.id !== APP_ID || app.handle !== APP_HANDLE) throw new Error("SHOPIFY_APP_MISMATCH");
    const definition = data.metaobjectDefinitionByType as {
      id: string; type: string;
      fieldDefinitions: Array<{ key: string; name: string; type: { name: string }; required: boolean }>;
    };
    if (definition?.type !== TYPE || !/^gid:\/\/shopify\/MetaobjectDefinition\/\d+$/.test(definition.id)) {
      throw new Error("FABRIC_PROFILE_DEFINITION_MISMATCH");
    }
    return definition;
  }
  const before = await read();
  const existing = new Map(before.fieldDefinitions.map((field) => [field.key, field]));
  for (const field of FABRIC_PROFILE_SEARCH_FIELD_DEFINITIONS) {
    const current = existing.get(field.key);
    if (current && (current.type.name !== field.type || current.required)) {
      throw new Error(`SEARCH_FIELD_DEFINITION_CONFLICT:${field.key}`);
    }
  }
  const missing = FABRIC_PROFILE_SEARCH_FIELD_DEFINITIONS.filter((field) => !existing.has(field.key));
  if (apply && missing.length) {
    const mutation = `mutation($id:ID!,$definition:MetaobjectDefinitionUpdateInput!){
      metaobjectDefinitionUpdate(id:$id,definition:$definition){
        metaobjectDefinition { id }
        userErrors { field message code }
      }
    }`;
    const data = await graphql(mutation, {
      id: before.id,
      definition: {
        fieldDefinitions: missing.map((field) => ({ create: field })),
      },
    });
    const payload = data.metaobjectDefinitionUpdate as { metaobjectDefinition?: { id: string }; userErrors?: unknown[] };
    if (payload?.metaobjectDefinition?.id !== before.id || payload.userErrors?.length) {
      throw new Error(`SEARCH_DEFINITION_UPDATE_FAILED:${JSON.stringify(payload?.userErrors ?? [])}`);
    }
  }
  const after = apply ? await read() : before;
  if (apply) {
    const keys = new Set(after.fieldDefinitions.map((field) => field.key));
    for (const field of FABRIC_PROFILE_SEARCH_FIELD_DEFINITIONS) {
      if (!keys.has(field.key)) throw new Error(`SEARCH_DEFINITION_READBACK_MISSING:${field.key}`);
    }
  }
  console.log(JSON.stringify({
    mode: apply ? "APPLY" : "DRY_RUN",
    definitionId: before.id,
    beforeFieldCount: before.fieldDefinitions.length,
    fieldsToAdd: missing.map((field) => field.key),
    afterFieldCount: after.fieldDefinitions.length,
    exactApp: true,
    profileWrites: 0,
  }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
