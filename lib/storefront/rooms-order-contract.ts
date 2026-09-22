/**
 * House of Curtains is a multi-line extension of the established Draft Order
 * contract. It is deliberately a contract builder, not a price calculator:
 * every input is an already immutable, server-validated curtain handoff.
 */
import { createHash } from 'node:crypto';
import type { StagingCheckoutHandoff } from './checkout-gates';
import {
  buildShopifyDraftOrderContract,
  allocateVatFromGross,
  type ShopifyAttributeInput,
  type ShopifyDraftOrderExecutionContract,
  type ShopifyDraftOrderExpectedFinancials,
} from './shopify-draft-order-core';
import { ROOMS_RULESET } from './rooms-core';
import type { ShippingQuote } from './shipping';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;
const CHANGE_COPY = 'Need to request a change? Email us within 2 hours of placing your order at enquiries@curtainsuk.com. We’ll review your request and get in touch.';

export type HouseCurtainReference = {
  roomId: string;
  roomName: string;
  windowName: string;
  retainedConfigurationId?: string;
  handoff: Readonly<StagingCheckoutHandoff>;
};

export type HouseCurtainSnapshotIdentity = {
  lineOrdinal: number;
  roomId: string;
  roomName: string;
  windowName: string;
  snapshotId: string;
  configurationId: string;
  fabricMasterId: string;
  pricingRuleVersion: string;
};

export interface ShopifyHouseDraftOrderContract extends ShopifyDraftOrderExecutionContract {
  contractType: 'HOUSE';
  houseId: string;
  revision: number;
  fingerprint: string;
  lineFingerprint: string;
  curtains: readonly HouseCurtainSnapshotIdentity[];
  /** Public House checkout remains off until a separately approved release. */
  releaseBlocker: 'MULTI_SNAPSHOT_PUBLIC_PAYMENT_DISABLED';
}

function immutableClone<T>(value: T): Readonly<T> {
  const clone = structuredClone(value);
  const freeze = (item: unknown): void => {
    if (!item || typeof item !== 'object' || Object.isFrozen(item)) return;
    for (const child of Object.values(item)) freeze(child);
    Object.freeze(item);
  };
  freeze(clone);
  return clone;
}

function assertName(value: unknown, code: string): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80 || /[\u0000-\u001f]/.test(value)) throw Error(code);
  return value.trim();
}

function quoteFromContract(contract: ShopifyDraftOrderExecutionContract): ShippingQuote {
  const gross = contract.expected.shippingGrossAmountMinor;
  if (!Number.isSafeInteger(gross) || gross < 0 || contract.input.shippingAddress.countryCode !== 'GB') throw Error('ROOMS_DELIVERY_INVALID');
  return {
    status: 'READY', postcode: contract.input.shippingAddress.zip, region: 'UK_MAINLAND', parcelClass: 'STANDARD',
    currency: 'GBP', grossAmountMinor: gross, shownSeparately: true, countsTowardGoodsMinimum: false, message: 'Delivery confirmed',
  };
}

function deliveryMatches(first: ShopifyDraftOrderExecutionContract, next: ShopifyDraftOrderExecutionContract): boolean {
  return JSON.stringify(first.input.shippingAddress) === JSON.stringify(next.input.shippingAddress)
    && first.expected.shippingGrossAmountMinor === next.expected.shippingGrossAmountMinor
    && first.expected.shippingVatAmountMinor === next.expected.shippingVatAmountMinor;
}

function privateLineAttributes(
  orderAttributes: readonly ShopifyAttributeInput[], houseId: string, roomId: string, roomName: string, windowName: string,
  lineOrdinal: number, curtain: HouseCurtainReference,
): ShopifyAttributeInput[] {
  const identity = curtain.handoff.snapshot.fabricIdentity;
  if (!identity) throw Error('ROOMS_PRODUCTION_IDENTITY_REQUIRED');
  return [
    ...(curtain.retainedConfigurationId ? [{ key: '_curtainsuk_retained_configuration_id', value: curtain.retainedConfigurationId }] : []),
    { key: '_curtainsuk_house_id', value: houseId },
    { key: '_curtainsuk_room_id', value: roomId },
    { key: '_curtainsuk_room_name', value: roomName },
    { key: '_curtainsuk_window_name', value: windowName },
    { key: '_curtainsuk_line_ordinal', value: String(lineOrdinal) },
    { key: '_curtainsuk_fabric_master_id', value: curtain.handoff.snapshot.fabricMasterId },
    { key: '_curtainsuk_supplier_sku', value: curtain.handoff.snapshot.supplierSku },
    { key: '_curtainsuk_supplier', value: identity.supplier },
    { key: '_curtainsuk_brand', value: identity.brand },
    { key: '_curtainsuk_design', value: identity.design },
    { key: '_curtainsuk_colour', value: identity.colour },
    // Do not duplicate customer-visible fields. This is the complete
    // per-curtain production identity Shopify must retain privately.
    ...orderAttributes.filter((attribute) => attribute.key.startsWith('curtainsuk_'))
      .map((attribute) => ({ key: `_${attribute.key}`, value: attribute.value })),
  ];
}

function houseFingerprint(input: { houseId: string; revision: number; curtains: readonly HouseCurtainSnapshotIdentity[]; delivery: ShippingQuote }): string {
  return createHash('sha256').update(JSON.stringify({
    houseId: input.houseId,
    revision: input.revision,
    curtains: input.curtains.map((curtain) => ({
      lineOrdinal: curtain.lineOrdinal, roomId: curtain.roomId, roomName: curtain.roomName, windowName: curtain.windowName,
      snapshotId: curtain.snapshotId, configurationId: curtain.configurationId,
      fabricMasterId: curtain.fabricMasterId, pricingRuleVersion: curtain.pricingRuleVersion,
    })),
    delivery: { postcode: input.delivery.postcode ?? null, grossAmountMinor: input.delivery.grossAmountMinor },
  })).digest('hex');
}

function curtainLineFingerprint(curtains: readonly HouseCurtainSnapshotIdentity[]): string {
  return createHash('sha256').update(JSON.stringify(curtains.map((curtain) => ({
    snapshot_id: curtain.snapshotId, configuration_id: curtain.configurationId, room_id: curtain.roomId,
    room_name: curtain.roomName, window_name: curtain.windowName, line_ordinal: curtain.lineOrdinal,
  })))).digest('hex');
}

/**
 * Builds a non-payable, multi-line Draft Order request after server-side House
 * revalidation. The optional delivery quote is the single governed quote for
 * the House. It is never calculated by this module.
 */
export function buildHouseDraftContract(input: {
  houseId: string;
  revision: number;
  curtains: readonly HouseCurtainReference[];
  delivery?: ShippingQuote;
}): Readonly<ShopifyHouseDraftOrderContract> {
  if (!input.curtains.length || input.curtains.length > 100 || !Number.isSafeInteger(input.revision) || input.revision < 0) throw Error('ROOMS_ORDER_INVALID');
  if (!UUID.test(input.houseId)) throw Error('ROOMS_HOUSE_INVALID');
  const seenConfigurations = new Set<string>();
  const contracts = input.curtains.map((curtain) => {
    if (curtain.retainedConfigurationId && !UUID.test(curtain.retainedConfigurationId)) throw Error('ROOMS_CONFIGURATION_INVALID');
    if (!UUID.test(curtain.roomId)) throw Error('ROOMS_ROOM_INVALID');
    assertName(curtain.roomName, 'ROOMS_NAME_INVALID');
    assertName(curtain.windowName, 'ROOMS_NAME_INVALID');
    const snapshot = curtain.handoff.snapshot;
    if (seenConfigurations.has(snapshot.configurationId)) throw Error('ROOMS_CONFIGURATION_DUPLICATE');
    seenConfigurations.add(snapshot.configurationId);
    if (snapshot.pricingRuleVersion !== ROOMS_RULESET || !snapshot.fabricIdentity) throw Error('ROOMS_PRODUCTION_IDENTITY_REQUIRED');
    return buildShopifyDraftOrderContract({ handoff: curtain.handoff, fabricLabel: `${snapshot.fabricIdentity.design}, ${snapshot.fabricIdentity.colour}` });
  });
  const first = contracts[0];
  const delivery = input.delivery ?? quoteFromContract(first);
  if (delivery.status !== 'READY' || delivery.currency !== 'GBP' || delivery.grossAmountMinor === null) throw Error('ROOMS_DELIVERY_INVALID');
  // If no fresh House quote is supplied, old per-handoff delivery evidence
  // must agree. It is never multiplied by line count.
  if (!input.delivery && contracts.some((contract) => !deliveryMatches(first, contract))) throw Error('ROOMS_DELIVERY_MISMATCH');
  const curtains = input.curtains.map((curtain, index): HouseCurtainSnapshotIdentity => ({
    lineOrdinal: index + 1, roomId: curtain.roomId,
    roomName: assertName(curtain.roomName, 'ROOMS_NAME_INVALID'), windowName: assertName(curtain.windowName, 'ROOMS_NAME_INVALID'),
    snapshotId: curtain.handoff.snapshot.snapshotId, configurationId: curtain.handoff.snapshot.configurationId,
    fabricMasterId: curtain.handoff.snapshot.fabricMasterId, pricingRuleVersion: curtain.handoff.snapshot.pricingRuleVersion,
  }));
  const fingerprint = houseFingerprint({ houseId: input.houseId, revision: input.revision, curtains, delivery });
  const lineFingerprint = curtainLineFingerprint(curtains);
  if (!HASH.test(fingerprint)) throw Error('ROOMS_FINGERPRINT_INVALID');
  const idempotencyTag = `CUK_HOUSE_${fingerprint.slice(0, 30)}`;
  const goodsGrossAmountMinor = contracts.reduce((sum, contract) => sum + contract.expected.goodsGrossAmountMinor, 0);
  const goodsVatAmountMinor = contracts.reduce((sum, contract) => sum + contract.expected.goodsVatAmountMinor, 0);
  // Carry the already-approved VAT treatment from a source snapshot; this
  // module does not introduce a House-specific tax policy.
  const shippingVatAmountMinor = first.expected.shippingGrossAmountMinor === delivery.grossAmountMinor
    ? first.expected.shippingVatAmountMinor
    : allocateVatFromGross(delivery.grossAmountMinor, Math.round(
      first.expected.goodsVatAmountMinor * 10_000 / (first.expected.goodsGrossAmountMinor - first.expected.goodsVatAmountMinor),
    ));
  if (!Number.isSafeInteger(shippingVatAmountMinor) || shippingVatAmountMinor < 0) throw Error('ROOMS_DELIVERY_VAT_INVALID');
  const expected: ShopifyDraftOrderExpectedFinancials = {
    currency: 'GBP', goodsGrossAmountMinor, goodsVatAmountMinor,
    shippingGrossAmountMinor: delivery.grossAmountMinor, shippingVatAmountMinor,
    orderGrossAmountMinor: goodsGrossAmountMinor + delivery.grossAmountMinor,
    orderVatAmountMinor: goodsVatAmountMinor + shippingVatAmountMinor,
  };
  const contract: ShopifyHouseDraftOrderContract = {
    apiVersion: first.apiVersion, contractType: 'HOUSE', environment: 'STAGING',
    houseId: input.houseId, revision: input.revision, fingerprint, lineFingerprint, curtains, idempotencyTag,
    requiredScopes: first.requiredScopes, expected, paymentEnabled: false,
    completionMutationAllowed: false, invoiceSendAllowed: false,
    releaseBlocker: 'MULTI_SNAPSHOT_PUBLIC_PAYMENT_DISABLED',
    input: {
      ...first.input,
      customAttributes: [
        { key: 'curtainsuk_contract_type', value: 'HOUSE' },
        { key: 'curtainsuk_house_id', value: input.houseId },
        { key: 'curtainsuk_house_revision', value: String(input.revision) },
        { key: 'curtainsuk_house_fingerprint', value: fingerprint },
        { key: 'curtainsuk_house_contract_fingerprint', value: lineFingerprint },
        { key: 'curtainsuk_house_curtain_count', value: String(curtains.length) },
        { key: 'curtainsuk_post_payment_state', value: 'PAID_TO_CURTAINSUK_REVIEW' },
        { key: 'curtainsuk_change_request_window', value: CHANGE_COPY },
      ],
      lineItems: contracts.map((lineContract, index) => ({
        ...lineContract.input.lineItems[0], title: `${curtains[index].roomName}, ${curtains[index].windowName}`,
        customAttributes: [
          ...lineContract.input.lineItems[0].customAttributes,
          { key: 'Room', value: curtains[index].roomName },
          ...privateLineAttributes(lineContract.input.customAttributes, input.houseId, curtains[index].roomId, curtains[index].roomName, curtains[index].windowName, index + 1, input.curtains[index]),
        ],
      })),
      note: 'Build My Rooms: every curtain remains subject to CurtainsUK review before any workroom release.',
      shippingLine: { title: first.input.shippingLine.title, priceWithCurrency: { amount: (delivery.grossAmountMinor / 100).toFixed(2), currencyCode: 'GBP' } },
      tags: ['CURTAINSUK_ROOMS_STAGING', 'DO_NOT_FULFIL', 'NO_REAL_PAYMENT', idempotencyTag],
    },
  };
  return immutableClone(contract);
}

/** Exact relational line payload expected by the paid-webhook persistence RPC. */
export function housePaidOrderLineAttributes(contract: Readonly<ShopifyHouseDraftOrderContract>) {
  return contract.curtains.map((curtain) => ({
    snapshot_id: curtain.snapshotId,
    configuration_id: curtain.configurationId,
    room_id: curtain.roomId,
    room_name: curtain.roomName,
    window_name: curtain.windowName,
    line_ordinal: curtain.lineOrdinal,
  }));
}
