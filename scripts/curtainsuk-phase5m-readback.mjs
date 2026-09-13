/** Read-only development-store safety and Draft Order financial readback. */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv, promisify } from 'node:util';
import { execFile } from 'node:child_process';
import assert from 'node:assert/strict';

const env = parseEnv(readFileSync('.env.phase5m-remote-current.local', 'utf8'));
const shop = env.CURTAINSUK_SHOPIFY_CHECKOUT_STORE;
assert.equal(shop, 'curtainsuk-dev.myshopify.com');
const { stdout } = await promisify(execFile)('shopify', ['app', 'env', 'show', '--no-color'], { shell: true, windowsHide: true, timeout: 45000 });
const app = parseEnv(stdout);
const auth = await fetch(`https://${shop}/admin/oauth/access_token`, {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'client_credentials',
    client_id: app.SHOPIFY_API_KEY,
    client_secret: app.SHOPIFY_API_SECRET }),
  signal: AbortSignal.timeout(30000),
});
const token = await auth.json();
assert.ok(token.access_token, 'DEVELOPMENT_AUTH_REQUIRED');
const response = await fetch(`https://${shop}/admin/api/2026-07/graphql.json`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token.access_token },
  body: JSON.stringify({ query: `{ shop { myshopifyDomain taxesIncluded currencyCode plan { partnerDevelopment displayName } } draftOrders(first: 20, reverse: true) { nodes { id name status taxesIncluded shippingAddress { countryCodeV2 zip } lineItems(first:2) { nodes { title sku quantity taxable requiresShipping customAttributes { key value } } } subtotalPriceSet { shopMoney { amount currencyCode } } totalShippingPriceSet { shopMoney { amount currencyCode } } totalTaxSet { shopMoney { amount currencyCode } } totalPriceSet { shopMoney { amount currencyCode } } customAttributes { key value } } } }` }),
  signal: AbortSignal.timeout(30000),
});
const result = await response.json();
assert.ok(!result.errors, 'SHOPIFY_READBACK_FAILED');
assert.equal(result.data.shop.plan.partnerDevelopment, true);
assert.equal(result.data.shop.myshopifyDomain, shop);
const report = { checkedAt: new Date().toISOString(), ...result.data, remoteWrites: 0, paymentSettingsChanged: false };
writeFileSync('artifacts/phase5m/single-rate-fresh-readback.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ checkedAt: report.checkedAt, shop: report.shop, drafts: report.draftOrders.nodes.map(d => ({ name: d.name, status: d.status, total: d.totalPriceSet.shopMoney.amount })), remoteWrites: 0 }));
