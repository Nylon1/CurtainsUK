import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const source = readFileSync('shopify-pixels/checkout-funnel.js', 'utf8');
const checkout = { token: 'checkout-token-123456789', totalPrice: { amount: '269.95' },
  shippingLine: { price: { amount: '12.95' } }, discountApplications: [{ type: 'DISCOUNT_CODE', title: 'PRIVATE-CODE' }],
  email: 'buyer@example.com', shippingAddress: { address1: 'Private address' },
  lineItems: [
    { title: 'Made-to-measure curtains — Standard window', properties: [] },
    { title: 'Made-to-measure Roman blind', properties: [] },
  ] };

test('Shopify pixel sends only fixed consented checkout data and no customer or discount values', async () => {
  const subscriptions = new Map<string, (event: unknown) => Promise<void>>();
  const sent: Record<string, unknown>[] = [];
  let consent = true;
  runInNewContext(source, {
    analytics: { subscribe: (name: string, callback: (event: unknown) => Promise<void>) => subscriptions.set(name, callback) },
    init: { customerPrivacy: { analyticsProcessingAllowed: true } },
    customerPrivacy: { subscribe: (_: string, callback: (event: { customerPrivacy: { analyticsProcessingAllowed: boolean } }) => void) =>
      { consent = false; void callback; } },
    browser: { sessionStorage: { getItem: async () => null } },
    fetch: async (_: string, options: { body: string }) => { sent.push(JSON.parse(options.body)); return { ok: true }; },
  });
  assert.equal(consent, false);
  assert.equal(subscriptions.size, 6);
  await subscriptions.get('checkout_started')!({ id: 'sh-event-123456789', data: { checkout } });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].productMix, 'CURTAIN_ROMAN');
  assert.equal(sent[0].totalMinor, 26995);
  assert.equal(sent[0].shippingMinor, 1295);
  assert.equal(sent[0].hasDiscount, true);
  assert.equal(JSON.stringify(sent[0]).includes('buyer@example.com'), false);
  assert.equal(JSON.stringify(sent[0]).includes('PRIVATE-CODE'), false);
  assert.equal(JSON.stringify(sent[0]).includes('Private address'), false);
});

test('Shopify pixel does not send checkout stages without analytics permission', async () => {
  const subscriptions = new Map<string, (event: unknown) => Promise<void>>();
  let calls = 0;
  runInNewContext(source, {
    analytics: { subscribe: (name: string, callback: (event: unknown) => Promise<void>) => subscriptions.set(name, callback) },
    init: { customerPrivacy: { analyticsProcessingAllowed: false } },
    browser: { sessionStorage: { getItem: async () => null } },
    fetch: async () => { calls++; return { ok: true }; },
  });
  await subscriptions.get('checkout_started')!({ id: 'sh-event-123456789', data: { checkout } });
  assert.equal(calls, 0);
});
