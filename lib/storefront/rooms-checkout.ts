import { createImmutableConfigurationSnapshot, evaluateCheckoutGate, prepareStagingCheckoutHandoff } from './checkout-gates';
import { stagingCheckoutIdentity } from './checkout-idempotency';
import { buildHouseDraftContract, type HouseCurtainReference } from './rooms-order-contract';
import { reviewHouse, reviewFinancialDigest, roomsDigest, unseal, type HouseReviewClaims, type HouseReviewRequest, type RoomsServices } from './rooms-core';
import type { ShippingQuote } from './shipping';
import type { StagingPriceResponse } from './staging-pricing';

export type HouseCheckoutInput = {
  house: HouseReviewRequest;
  reviewToken: string;
  measurementsConfirmed: boolean;
  acceptedPriceChanges: Array<{ configuration_id: string; currentPrice: number }>;
};
export type HouseCheckoutServices = RoomsServices & {
  productionFabric(id: string): Promise<{ supplierSku: string; identity: { supplier: string; brand: string; design: string; colour: string } }>;
};

/** Preparation only. All effects are in the server binding; no browser price is authority. */
export async function prepareHouseCheckout(input: HouseCheckoutInput, services: HouseCheckoutServices) {
  if (!input || input.measurementsConfirmed !== true || !Array.isArray(input.acceptedPriceChanges)) throw Error('ROOMS_CONFIRMATION_REQUIRED');
  const claims = unseal<HouseReviewClaims>('review', input.reviewToken, services.secret);
  if (!Number.isFinite(claims.expiresAt) || claims.expiresAt <= Date.parse(services.now())) throw Error('ROOMS_REVIEW_EXPIRED');
  if (claims.requestDigest !== roomsDigest(input.house)) throw Error('ROOMS_REVIEW_CHANGED');
  const prices: StagingPriceResponse[] = [];
  let delivery: ShippingQuote | undefined;
  const review = await reviewHouse(input.house, { ...services,
    async calculate(configuration) { const price = await services.calculate(configuration); prices.push(price); return price; },
    async delivery(...args) { delivery = await services.delivery(...args); return delivery; },
  });
  // Return fresh, line-specific state so the customer can acknowledge a new price or remove an unavailable curtain.
  if (!review.ready || claims.financialDigest !== reviewFinancialDigest(review)) return { prepared: false as const, review };
  for (const line of review.lines) {
    if (line.status === 'PRICE_CHANGED' && !input.acceptedPriceChanges.some(ack => ack.configuration_id === line.configuration_id && ack.currentPrice === line.currentPrice)) throw Error('ROOMS_CONFIRMATION_REQUIRED');
  }
  if (!delivery || delivery.status !== 'READY') throw Error('ROOMS_DELIVERY_INVALID');
  const curtains: HouseCurtainReference[] = [];
  for (const [index, line] of review.lines.entries()) {
    const configuration = line.configuration!, calculation = prices[index];
    const fabric = await services.productionFabric(configuration.fabricId);
    const customerPrice = { netAmountMinor: calculation.netAmountMinor!, vatAmountMinor: calculation.vatAmountMinor!, grossAmountMinor: calculation.totalAmountMinor!, vatRateBasisPoints: calculation.vatRateBasisPoints!, currency: 'GBP' as const };
    const gate = evaluateCheckoutGate({ outcome: calculation.outcome, price: customerPrice, fabricPricingEligible: true, technicallyValid: calculation.fabricMetres! > 0, availability: 'FABRIC_AVAILABLE', reviewState: null, customerAccepted: true, shipping: delivery });
    // Existing snapshot persistence is unique by configuration ID. Give each accepted
    // House commercial revision its own deterministic execution ID; keep the original
    // retained curtain ID as private line metadata, never mutate device identity.
    const hex = roomsDigest({ scope: 'house-execution-v1', house: claims.requestDigest, financials: claims.financialDigest, retained: line.configuration_id });
    const configurationId = `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;
    const identity = stagingCheckoutIdentity(configurationId);
    const snapshot = createImmutableConfigurationSnapshot({
      snapshotId: identity.snapshotId, configurationId, reviewRequestId: null, reviewRevisionId: null,
      outcome: calculation.outcome, windowType: configuration.windowSlug,
      measurements: {
        measurement_contract_version: 'guided-measure-v1', hardware: configuration.hardware,
        raw_width_cm: calculation.totalCoverageWidthCm, raw_drop_cm: configuration.dropCm,
        width_anchor: configuration.windowSlug === 'bay-window' ? 'BAY_TRACK_ROUTE' : configuration.measurementBasis === 'POLE_USABLE_WIDTH' ? 'POLE_BETWEEN_FINIALS' : 'TRACK_FULL_WIDTH',
        drop_anchor: configuration.windowSlug === 'bay-window' ? 'TRACK_TOP_TO_FINISH' : configuration.measurementBasis === 'POLE_USABLE_WIDTH' ? 'POLE_BOTTOM_TO_FINISH' : calculation.heading === 'WAVE' ? 'TRACK_BOTTOM_TO_FINISH' : 'TRACK_TOP_TO_FINISH',
        ...(configuration.desiredFinish ? { desired_finish: configuration.desiredFinish } : {}),
      },
      fabricMasterId: configuration.fabricId, supplierSku: fabric.supplierSku, fabricIdentity: fabric.identity,
      heading: calculation.heading, lining: calculation.lining, construction: calculation.construction,
      calculatedFabricMetres: calculation.fabricMetres!, pricingRuleVersion: calculation.calculationVersion,
      ...(calculation.patternAllowance ? { patternAllowance: calculation.patternAllowance } : {}),
      customerPrice, availability: 'FABRIC_AVAILABLE', shipping: delivery,
      customerAcceptedAt: claims.reviewedAt, recordedAt: claims.reviewedAt, gate,
    });
    curtains.push({ roomId: line.room_id, roomName: line.room_name, windowName: line.window_name, retainedConfigurationId: line.configuration_id,
      handoff: prepareStagingCheckoutHandoff({ handoffId: identity.handoffId, snapshot, preparedAt: claims.reviewedAt }) });
  }
  const contract = buildHouseDraftContract({ houseId: input.house.house_id, revision: input.house.revision, curtains, delivery });
  if (contract.expected.orderGrossAmountMinor !== review.total || contract.expected.orderVatAmountMinor !== review.vat) throw Error('ROOMS_FINANCIAL_MISMATCH');
  return { prepared: true as const, review, curtains, contract };
}

export function houseCheckoutCustomerResult(prepared: Awaited<ReturnType<typeof prepareHouseCheckout>>) {
  if (!prepared.prepared) {
    const status = prepared.review.lines.some((line) => line.status === 'PRICE_CHANGED')
      ? 'PRICE_CHANGED'
      : prepared.review.lines.some((line) => line.status === 'BLOCKED')
        ? prepared.review.lines.some((line) => /enough fabric/i.test(line.message)) ? 'STOCK_CHANGED' : 'INVALID_CONFIGURATION'
        : 'REVIEW_REQUIRED';
    return { status, prepared: false, paymentEnabled: false, checkoutUrl: null, review: prepared.review, message: 'Your rooms need another look. Please check the updated review below.' };
  }
  return { status: 'REVIEW_REQUIRED' as const, prepared: true, paymentEnabled: false, checkoutUrl: null, shopifyWritePerformed: false,
    goods: prepared.review.goods, delivery: prepared.review.delivery, total: prepared.review.total, vat: prepared.review.vat,
    message: 'Your curtains and combined total have been checked again. Checkout is not open yet, so no order or payment has been created. Your rooms remain saved.' };
}
