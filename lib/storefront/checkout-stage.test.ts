import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCheckoutStageInput, summarizeCheckoutStages, type CheckoutStageRow } from './checkout-stage';

const input = { eventId: 'sh-event-123456789', checkoutToken: 'checkout-token-123456789',
  stage: 'CHECKOUT_STARTED', productMix: 'CURTAIN_ROMAN', totalMinor: 26995,
  shippingMinor: 1295, hasDiscount: false, isTest: false };

test('checkout stage input excludes customer data and unrecognised product labels', () => {
  assert.equal(parseCheckoutStageInput(input).productMix, 'CURTAIN_ROMAN');
  assert.throws(() => parseCheckoutStageInput({ ...input, email: 'buyer@example.com' }), /INPUT_INVALID/);
  assert.throws(() => parseCheckoutStageInput({ ...input, productMix: 'Abeja Teal' }), /INPUT_INVALID/);
  assert.throws(() => parseCheckoutStageInput({ ...input, totalMinor: -100 }), /INPUT_INVALID/);
});

test('checkout stages deduplicate repeated entry and exclude test checkouts', () => {
  const now = Date.parse('2026-11-09T12:00:00Z');
  const row = (checkout_hash: string, stage: CheckoutStageRow['stage'], hoursAgo: number, is_test = false): CheckoutStageRow => ({
    checkout_hash, stage, product_mix: 'CURTAIN_ROMAN', occurred_at: new Date(now - hoursAgo * 3_600_000).toISOString(),
    total_minor: 26995, shipping_minor: 1295, has_discount: false, is_test,
  });
  const result = summarizeCheckoutStages([
    row('a', 'CHECKOUT_STARTED', 30), row('a', 'CHECKOUT_STARTED', 29), row('a', 'ADDRESS_SUBMITTED', 28),
    row('b', 'CHECKOUT_STARTED', 1), row('c', 'CHECKOUT_COMPLETED', 2, true),
  ], now);
  assert.equal(result[0].checkouts, 2);
  assert.equal(result[0].stages.CHECKOUT_STARTED, 2);
  assert.equal(result[0].lastObservedAfter24h.ADDRESS_SUBMITTED, 1);
  assert.equal(result[0].stages.CHECKOUT_COMPLETED, 0);
});
