import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const APP_PROXY = 'https://www.curtainsuk.com/apps/curtainsuk-decision';
const STORE = 'carpetup.myshopify.com';

function money(minor) { return `£${(minor / 100).toFixed(2)}`; }
async function post(operation, body) {
  const response = await fetch(`${APP_PROXY}/${operation}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(`${operation} failed: ${json.error || json.message || response.status}`);
  return json;
}
function readShopifyEnvironment() {
  const output = process.platform === 'win32'
    ? execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'shopify app env show --no-color'], { encoding: 'utf8' })
    : execFileSync('shopify', ['app', 'env', 'show', '--no-color'], { encoding: 'utf8' });
  const values = Object.fromEntries([...output.matchAll(/^\s*([A-Z0-9_]+)=(.*)$/gm)].map(([, key, value]) => [key, value.trim()]));
  if (!values.SHOPIFY_API_KEY || !values.SHOPIFY_API_SECRET) throw Error('Shopify application credentials are unavailable to the operator rehearsal.');
  return values;
}
async function shopifyAccessToken() {
  const environment = readShopifyEnvironment();
  const response = await fetch(`https://${STORE}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: environment.SHOPIFY_API_KEY, client_secret: environment.SHOPIFY_API_SECRET, grant_type: 'client_credentials' }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || typeof json.access_token !== 'string') throw Error('Shopify operator access token could not be created.');
  return json.access_token;
}
async function graphql(token, query, variables = {}) {
  const response = await fetch(`https://${STORE}/admin/api/2026-07/graphql.json`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.errors?.length) throw Error(`Shopify GraphQL request failed: ${json.errors?.[0]?.message || response.status}`);
  return json.data;
}
const configurations = [
  { windowSlug: 'french-doors', measurementBasis: 'TRACK_WIDTH', hardware: 'TRACK', widthCm: 201, dropCm: 236, fabricId: 'sdg-f1681-03', heading: 'WAVE', lining: 'BLACKOUT', construction: 'PAIR', stackDirection: 'SPLIT' },
  { windowSlug: 'standard-window', measurementBasis: 'TRACK_WIDTH', hardware: 'TRACK', widthCm: 160, dropCm: 220, fabricId: 'sdg-f1681-03', heading: 'DOUBLE_PINCH', lining: 'STANDARD', construction: 'PAIR', stackDirection: 'SPLIT' },
  { windowSlug: 'standard-window', measurementBasis: 'TRACK_WIDTH', hardware: 'TRACK', widthCm: 180, dropCm: 210, fabricId: 'pt-4262-770', heading: 'PENCIL_PLEAT', lining: 'STANDARD', construction: 'PAIR', stackDirection: 'SPLIT' },
];
const expectedGoods = [66100, 63500, 53200];
let draftId = null;
let houseId = null;
let rehearsalToken = null;

async function removeOnlyOrphanedHouseDraft(token) {
  const data = await graphql(token, `query HouseDrafts { draftOrders(first: 10, query: "tag:CURTAINSUK_PRODUCTION") { nodes { id status email customAttributes { key value } } } }`);
  const candidates = data.draftOrders.nodes.filter(draft => draft.status === 'OPEN' && draft.email === null
    && draft.customAttributes.some(attribute => attribute.key === 'curtainsuk_house_id'));
  if (candidates.length !== 1) throw Error(`Refusing to clean an ambiguous House rehearsal record (${candidates.length} candidates).`);
  const result = await graphql(token, `mutation DeleteDraft($input: DraftOrderDeleteInput!) { draftOrderDelete(input: $input) { deletedId userErrors { field message } } }`, { input: { id: candidates[0].id } });
  if (result.draftOrderDelete.userErrors.length || result.draftOrderDelete.deletedId !== candidates[0].id) throw Error('Orphaned House rehearsal cleanup failed.');
  console.log('Orphaned private House Draft Order cleanup: PASS');
}

try {
  rehearsalToken = await shopifyAccessToken();
  if (process.argv.includes('--clean-orphan')) {
    await removeOnlyOrphanedHouseDraft(rehearsalToken);
    process.exit(0);
  }
  const prices = await Promise.all(configurations.map(configuration => post('price', configuration)));
  prices.forEach((price, index) => {
    assert.equal(price.calculationVersion, '3.0.0-production.1');
    assert.equal(price.outcome, 'INSTANT_PRICE');
    assert.equal(price.commercialState, 'ORDER_READY');
    assert.equal(price.stockSnapshotStale, false);
    assert.equal(price.totalAmountMinor, expectedGoods[index]);
    assert.ok(typeof price.reviewSubmissionToken === 'string' && price.reviewSubmissionToken.length > 20);
  });
  const retained = await Promise.all(prices.map((price, index) => post('rooms', {
    action: 'retain', payload: {
      configuration: configurations[index], configurationId: price.configurationId, priceConfirmationToken: price.reviewSubmissionToken,
    },
  })));
  houseId = randomUUID();
  const firstRoom = randomUUID(); const secondRoom = randomUUID();
  const house = {
    house_id: houseId, revision: 0, postcode: 'BB2 3FA', rooms: [
      { room_id: firstRoom, room_name: 'Living Room', curtains: [
        { configuration_id: retained[0].configuration_id, receipt: retained[0].receipt, window_name: 'French Doors' },
        { configuration_id: retained[1].configuration_id, receipt: retained[1].receipt, window_name: 'Main Window' },
      ] },
      { room_id: secondRoom, room_name: 'Bedroom', curtains: [
        { configuration_id: retained[2].configuration_id, receipt: retained[2].receipt, window_name: 'Main Window' },
      ] },
    ],
  };
  const review = await post('rooms', { action: 'review', payload: house });
  assert.equal(review.ready, true); assert.equal(review.pricingVersion, '3.0.0-production.1');
  assert.equal(review.lines.length, 3); assert.ok(review.lines.every(line => line.status === 'READY'));
  assert.equal(review.goods, expectedGoods.reduce((total, value) => total + value, 0));
  assert.equal(review.delivery, 1295); assert.equal(review.total, review.goods + review.delivery);
  assert.ok(Number.isSafeInteger(review.vat));
  const checkoutInput = { house, reviewToken: review.reviewToken, measurementsConfirmed: true, acceptedPriceChanges: [] };
  const checkout = await post('rooms', { action: 'checkout', payload: checkoutInput });
  assert.equal(checkout.status, 'SUCCESS'); assert.equal(checkout.paymentEnabled, true); assert.equal(checkout.goods, review.goods);
  assert.equal(checkout.delivery, review.delivery); assert.equal(checkout.vat, review.vat); assert.equal(checkout.total, review.total);
  const safeUrl = new URL(checkout.checkoutUrl); assert.equal(safeUrl.protocol, 'https:'); assert.ok(['www.curtainsuk.com', STORE].includes(safeUrl.hostname));
  const retry = await post('rooms', { action: 'checkout', payload: checkoutInput });
  assert.equal(retry.status, 'SUCCESS'); assert.equal(retry.checkoutUrl, checkout.checkoutUrl);
  const data = await graphql(rehearsalToken, `query Drafts($query: String!) { draftOrders(first: 10, query: $query) { nodes { id status email tags customAttributes { key value } lineItems(first: 10) { nodes { title quantity originalTotalSet { presentmentMoney { amount currencyCode } } customAttributes { key value } } } totalLineItemsPriceSet { presentmentMoney { amount currencyCode } } totalShippingPriceSet { presentmentMoney { amount currencyCode } } totalTaxSet { presentmentMoney { amount currencyCode } } totalPriceSet { presentmentMoney { amount currencyCode } } } } }`, { query: `tag:CURTAINSUK_PRODUCTION` });
  const matches = data.draftOrders.nodes.filter(draft => draft.customAttributes.some(attribute => attribute.key === 'curtainsuk_house_id' && attribute.value === houseId));
  assert.equal(matches.length, 1); const draft = matches[0]; draftId = draft.id;
  assert.equal(draft.status, 'OPEN'); assert.equal(draft.email, null); assert.equal(draft.lineItems.nodes.length, 3);
  assert.ok(!draft.tags.some(tag => ['CURTAINSUK_STAGING', 'DO_NOT_FULFIL', 'NO_REAL_PAYMENT'].includes(tag)));
  const attributes = Object.fromEntries(draft.customAttributes.map(attribute => [attribute.key, attribute.value]));
  assert.equal(attributes.curtainsuk_house_id, houseId); assert.equal(attributes.curtainsuk_pricing_rule_version, '3.0.0-production.1');
  assert.equal(attributes.curtainsuk_post_payment_state, 'PAID_TO_CURTAINSUK_REVIEW');
  const values = draft.lineItems.nodes.map(line => Number(line.originalTotalSet.presentmentMoney.amount) * 100);
  assert.deepEqual(values, expectedGoods);
  const minor = moneySet => Math.round(Number(moneySet.presentmentMoney.amount) * 100);
  const shopify = { goods: minor(draft.totalLineItemsPriceSet), delivery: minor(draft.totalShippingPriceSet), vat: minor(draft.totalTaxSet), total: minor(draft.totalPriceSet) };
  assert.deepEqual(shopify, { goods: review.goods, delivery: review.delivery, vat: review.vat, total: review.total });
  console.log(JSON.stringify({
    house: '2 rooms / 3 curtains', goods: money(shopify.goods), vat: money(shopify.vat), delivery: money(shopify.delivery), total: money(shopify.total),
    checkoutUrlVerified: true, idempotency: 'PASS', lineIdentity: 'PASS', invoiceUrlOpened: false, paymentPerformed: false, customerEmail: false,
  }));
} finally {
  if (draftId && rehearsalToken) {
    const result = await graphql(rehearsalToken, `mutation DeleteDraft($input: DraftOrderDeleteInput!) { draftOrderDelete(input: $input) { deletedId userErrors { field message } } }`, { input: { id: draftId } });
    if (result.draftOrderDelete.userErrors.length || result.draftOrderDelete.deletedId !== draftId) throw Error('Private Draft Order rehearsal cleanup failed.');
    console.log('Private Draft Order rehearsal cleanup: PASS');
  }
}
