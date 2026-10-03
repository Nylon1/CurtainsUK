import "./curtainsuk-server-script-loader.mjs";
import nextEnv from "@next/env";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { validateFabricSitemapEntries, type FabricSitemapEntry } from "../lib/storefront/fabric-sitemap";

nextEnv.loadEnvConfig(process.cwd());

const SHOP = "carpetup.myshopify.com";
const APP_ID = "gid://shopify/App/328390344705";
const APP_HANDLE = "curtains-uk-mtm";
const TYPE = "$app:fabric_discovery";
const API_VERSION = "2026-07";
const OUTPUT = resolve(process.cwd(), "generated/fabric-profile-sitemap.json");
const arg = process.argv.find((value) => value.startsWith("--expected-count="));
const expectedCount = Number(arg?.slice("--expected-count=".length));
if (!Number.isInteger(expectedCount) || expectedCount < 1) throw new Error("EXPECTED_COUNT_REQUIRED");
if (process.env.CURTAINSUK_SHOPIFY_CHECKOUT_STORE !== SHOP) throw new Error("SHOP_MISMATCH");

const auth = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.CURTAINSUK_SHOPIFY_CLIENT_ID ?? "",
    client_secret: process.env.CURTAINSUK_SHOPIFY_APP_SECRET ?? "",
  }),
});
if (!auth.ok) throw new Error(`SHOPIFY_AUTH_HTTP_${auth.status}`);
const token = (await auth.json() as { access_token?: string }).access_token;
if (!token) throw new Error("SHOPIFY_TOKEN_MISSING");

const query = `query CurtainsUKFabricSitemap($after: String) {
  currentAppInstallation { app { id handle } }
  metaobjects(type: "${TYPE}", first: 250, after: $after) {
    nodes { fields { key value } }
    pageInfo { hasNextPage endCursor }
  }
}`;
const entries: FabricSitemapEntry[] = [];
let after: string | null = null;
let pages = 0;
do {
  const response = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables: { after } }),
  });
  if (!response.ok) throw new Error(`SHOPIFY_GRAPHQL_HTTP_${response.status}`);
  const result = await response.json() as {
    errors?: unknown[];
    data?: { currentAppInstallation?: { app?: { id: string; handle: string } }; metaobjects?: {
      nodes: { fields: { key: string; value: string }[] }[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    } };
  };
  if (result.errors?.length || !result.data?.metaobjects) throw new Error("SHOPIFY_GRAPHQL_FAILED");
  const app = result.data.currentAppInstallation?.app;
  if (app?.id !== APP_ID || app.handle !== APP_HANDLE) throw new Error("SHOPIFY_APP_MISMATCH");
  for (const node of result.data.metaobjects.nodes) {
    const fields = Object.fromEntries(node.fields.map((field) => [field.key, field.value]));
    entries.push({ fabricMasterId: fields.fabric_master_id, canonicalUrl: fields.canonical_url });
  }
  after = result.data.metaobjects.pageInfo.hasNextPage ? result.data.metaobjects.pageInfo.endCursor : null;
  if (after === null && result.data.metaobjects.pageInfo.hasNextPage) throw new Error("SHOPIFY_PAGINATION_CURSOR_MISSING");
  if (++pages > 100) throw new Error("SHOPIFY_PAGINATION_BOUND");
} while (after);

entries.sort((a, b) => a.canonicalUrl < b.canonicalUrl ? -1 : a.canonicalUrl > b.canonicalUrl ? 1 : 0);
validateFabricSitemapEntries(entries, expectedCount);
const manifest = { version: 1, profileCount: entries.length, profiles: entries };
const body = `{"version":${manifest.version},"profileCount":${manifest.profileCount},"profiles":[\n${entries.map((entry) => JSON.stringify(entry)).join(",\n")}\n]}\n`;
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, body);
console.log(JSON.stringify({ profiles: entries.length, uniqueIds: new Set(entries.map((entry) => entry.fabricMasterId)).size, uniqueCanonicalUrls: new Set(entries.map((entry) => entry.canonicalUrl)).size, pages, manifestSha256: createHash("sha256").update(body).digest("hex"), shopifyWrites: 0 }));
