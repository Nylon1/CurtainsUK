import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createImmutableConfigurationSnapshot, evaluateCheckoutGate, prepareStagingCheckoutHandoff } from '../checkout-gates';
import { buildHouseDraftContract, housePaidOrderLineAttributes } from '../rooms-order-contract';
import { housePaymentFromShopify } from '../mtm-house-paid-webhook';
import { assertShopifyDraftOrderFinancials, validateShopifyDraftOrderNode } from '../shopify-draft-order-core';
import { ROOMS_RULESET } from '../rooms-core';
import type { ShippingQuote } from '../shipping';

function curtain(roomId = randomUUID(), roomName = 'Living Room', windowName = 'French Doors', fabric = 'sdg-f1681-03') {
  const price = { grossAmountMinor: 66100, netAmountMinor: 55083, vatAmountMinor: 11017, vatRateBasisPoints: 2000, currency: 'GBP' as const };
  const shipping: ShippingQuote = { status: 'READY', postcode: 'BB23FA', region: 'UK_MAINLAND', parcelClass: 'STANDARD', currency: 'GBP', grossAmountMinor: 1295, shownSeparately: true, countsTowardGoodsMinimum: false, message: 'Delivery confirmed' };
  const gate = evaluateCheckoutGate({ outcome: 'INSTANT_PRICE', price, fabricPricingEligible: true, technicallyValid: true, availability: 'FABRIC_AVAILABLE', reviewState: null, customerAccepted: true, shipping });
  const now = '2026-09-21T20:00:00.000Z';
  const snapshot = createImmutableConfigurationSnapshot({
    snapshotId: randomUUID(), configurationId: randomUUID(), reviewRequestId: null, reviewRevisionId: null,
    outcome: 'INSTANT_PRICE', windowType: 'french-doors',
    measurements: { hardware: 'TRACK', raw_width_cm: 201, raw_drop_cm: 236, width_anchor: 'TRACK_FULL_WIDTH', drop_anchor: 'TRACK_BOTTOM_TO_FINISH', measurement_contract_version: 'guided-measure-v1' },
    fabricMasterId: fabric, supplierSku: fabric === 'sdg-f1681-03' ? 'F1681/03' : '4270/147',
    fabricIdentity: { supplier: fabric.startsWith('sdg') ? 'SDG' : 'Prestigious', brand: 'Sanderson', design: 'Acanthus', colour: 'Slate/Dove' },
    heading: 'WAVE', lining: 'BLACKOUT', construction: 'PAIR', calculatedFabricMetres: 12,
    pricingRuleVersion: ROOMS_RULESET, customerPrice: price, availability: 'FABRIC_AVAILABLE', shipping,
    customerAcceptedAt: now, recordedAt: now, gate,
  });
  return { roomId, roomName, windowName, handoff: prepareStagingCheckoutHandoff({ handoffId: randomUUID(), snapshot, preparedAt: now }) };
}

function financialNode(contract: ReturnType<typeof buildHouseDraftContract>) {
  const money = (minor: number) => ({ presentmentMoney: { amount: (minor / 100).toFixed(2), currencyCode: 'GBP' } });
  return {
    taxesIncluded: true, presentmentCurrencyCode: 'GBP',
    totalLineItemsPriceSet: money(contract.expected.goodsGrossAmountMinor), subtotalPriceSet: money(contract.expected.goodsGrossAmountMinor),
    totalShippingPriceSet: money(contract.expected.shippingGrossAmountMinor), totalTaxSet: money(contract.expected.orderVatAmountMinor),
    totalDiscountsSet: money(0), totalPriceSet: money(contract.expected.orderGrossAmountMinor),
  };
}

function verifiedLines(contract: ReturnType<typeof buildHouseDraftContract>) {
  return contract.input.lineItems.map((line) => ({
    title: line.title, quantity: line.quantity, customAttributes: line.customAttributes,
    originalTotalSet: { presentmentMoney: { amount: line.originalUnitPriceWithCurrency.amount, currencyCode: 'GBP' } },
  }));
}

test('three curtain House is a multi-line non-payable contract with one delivery and exact reconciliation', () => {
  const a = curtain();
  const b = curtain(a.roomId, 'Living Room', 'Bay Window');
  const c = curtain(randomUUID(), 'Main Bedroom', 'Main Window', 'pt-4270-147');
  const contract = buildHouseDraftContract({ houseId: randomUUID(), revision: 4, curtains: [a, b, c] });
  assert.equal(contract.contractType, 'HOUSE');
  assert.equal(contract.paymentEnabled, false);
  assert.equal(contract.releaseBlocker, 'MULTI_SNAPSHOT_PUBLIC_PAYMENT_DISABLED');
  assert.equal(contract.input.lineItems.length, 3);
  assert.equal(contract.expected.goodsGrossAmountMinor, 198300);
  assert.equal(contract.expected.shippingGrossAmountMinor, 1295, 'delivery is governed once for the House');
  assert.equal(contract.expected.orderGrossAmountMinor, 199595);
  assert.doesNotThrow(() => assertShopifyDraftOrderFinancials(financialNode(contract), contract.expected));
  const node = { ...financialNode(contract), lineItems: { nodes: verifiedLines(contract) }, id: 'gid://shopify/DraftOrder/123', name: '#D-house', status: 'OPEN', invoiceUrl: 'https://curtainsuk-dev.myshopify.com/invoice/test', tags: contract.input.tags, customAttributes: contract.input.customAttributes };
  assert.equal(validateShopifyDraftOrderNode(node, contract).id, node.id);
  const wrongLine = structuredClone(node);
  wrongLine.lineItems.nodes[1].originalTotalSet.presentmentMoney.amount = '1.00';
  assert.throws(() => validateShopifyDraftOrderNode(wrongLine, contract), /LINE_PRICE_MISMATCH/);
  assert.ok(contract.input.lineItems.every((line) => line.customAttributes.some((property) => property.key === '_curtainsuk_snapshot_id')));
  assert.ok(contract.input.lineItems.every((line) => line.customAttributes.some((property) => property.key === '_curtainsuk_window_name')));
  assert.equal(contract.input.customAttributes.some((property) => property.key === 'curtainsuk_snapshot_id'), false, 'a House never pretends its first curtain represents every line');
});

test('orders/paid reconstructs exactly the House lines and rejects property tampering', () => {
  const lines = [curtain(), curtain(randomUUID(), 'Main Bedroom', 'Main Window')];
  const contract = buildHouseDraftContract({ houseId: randomUUID(), revision: 1, curtains: lines });
  const orderAttributes = new Map(contract.input.customAttributes.map((property) => [property.key, property.value]));
  const lineItems = contract.input.lineItems.map((line) => ({ properties: line.customAttributes.map((property) => ({ name: property.key, value: property.value })) }));
  const parsed = housePaymentFromShopify({ orderAttributes, lineItems });
  assert.deepEqual(parsed?.curtains, housePaidOrderLineAttributes(contract).map((line) => ({
    snapshotId: line.snapshot_id, configurationId: line.configuration_id, roomId: line.room_id,
    roomName: line.room_name, windowName: line.window_name, lineOrdinal: line.line_ordinal,
  })));
  const tampered = structuredClone(lineItems);
  tampered[0].properties.find((property) => property.name === '_curtainsuk_window_name')!.value = 'Different window';
  assert.throws(() => housePaymentFromShopify({ orderAttributes, lineItems: tampered }), /HOUSE_IDENTITY_CONFLICT/);
});

test('multi-line execution retains generic exact-total checks and a House-specific idempotency claim', async () => {
  const contract = buildHouseDraftContract({ houseId: randomUUID(), revision: 0, curtains: [curtain(), curtain(randomUUID(), 'Bedroom', 'Window')] });
  const { serverScriptHooks: hooks } = await import('../../../scripts/curtainsuk-server-script-loader.mjs');
  try {
    const { executeShopifyDraftOrder } = await import('../shopify-draft-order-server');
    let claimed = '', created = 0;
    const config = { mode: 'CREATE_TEST_DRAFT' as const, deploymentStage: 'STAGING' as const, shopDomain: 'curtainsuk-dev.myshopify.com', clientId: 'house-test-client', clientSecret: 'house-test-secret-not-real', realPaymentsDisabledConfirmed: true, requestTimeoutMs: 1000 };
    const node = { ...financialNode(contract), lineItems: verifiedLines(contract), id: 'gid://shopify/DraftOrder/987', name: '#D-house', status: 'OPEN', invoiceUrl: 'https://curtainsuk-dev.myshopify.com/invoice/test', tags: contract.input.tags, customAttributes: contract.input.customAttributes };
    const fetchImpl: typeof fetch = async (url, init) => {
      if (String(url).endsWith('/access_token')) return Response.json({ access_token: 'house-test-token-not-real', expires_in: 3600, scope: 'write_draft_orders' });
      const body = JSON.parse(String(init?.body));
      if (body.query.includes('currentAppInstallation')) return Response.json({ data: { currentAppInstallation: { accessScopes: [{ handle: 'write_draft_orders' }] } } });
      if (body.query.includes('draftOrders(')) return Response.json({ data: { draftOrders: { nodes: [] } } });
      if (body.query.includes('draftOrderCalculate(')) return Response.json({ data: { draftOrderCalculate: { calculatedDraftOrder: financialNode(contract), userErrors: [] } } });
      assert.match(body.query, /draftOrderCreate/);
      assert.deepEqual(body.variables.input, contract.input);
      created += 1;
      return Response.json({ data: { draftOrderCreate: { draftOrder: node, userErrors: [] } } });
    };
    const execution = await executeShopifyDraftOrder({ contract, config, fetchImpl, claimCreate: async (identity) => { claimed = identity; return true; } });
    assert.equal(execution.status, 'TEST_DRAFT_CREATED');
    assert.equal(created, 1);
    assert.equal(claimed, contract.idempotencyTag);
    assert.equal(execution.paymentEnabled, false);
  } finally { hooks.deregister(); }
});

test('multi-curtain migration and webhook leave historic single-snapshot lifecycle intact', () => {
  const sql = readFileSync('supabase/migrations/20260921205826_multi_curtain_paid_order_contract.sql', 'utf8');
  const route = readFileSync('app/api/webhooks/shopify/orders-paid/route.ts', 'utf8');
  assert.match(sql, /create table curtainsuk_private\.mtm_paid_order_curtains/);
  assert.match(sql, /create table curtainsuk_private\.mtm_workroom_release_packet_curtains/);
  assert.match(sql, /contract_type in \('SINGLE_CURTAIN','HOUSE'\)/);
  assert.match(sql, /One explicit staff action releases every curtain/);
  assert.match(sql, /case when expected_contract_type = 'SINGLE_CURTAIN' then expected_snapshot_id else null end/);
  assert.match(route, /housePaymentFromShopify/);
  assert.match(route, /snapshotId/);
});
