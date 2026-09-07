import { emailEvidenceReady } from "./email-evidence";
import "server-only";
import { getStaffReviewDashboard, getStaffReviewRequest } from "./review-operations-repository";
import { verifyReviewAcceptanceToken } from "./review-acceptance-token";

const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCEPTANCE_TOKEN = /^v1\.\d{10,12}\.[A-Za-z0-9_-]{43}$/;

export interface CustomerReviewAcceptanceInput {
  reviewRequestId?: unknown;
  reviewAcceptanceToken?: unknown;
}

function positiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function assertFinalPrice(price: {
  netAmountMinor: number;
  vatAmountMinor: number;
  grossAmountMinor: number;
  vatRateBasisPoints: 2000;
  currency: "GBP";
} | null) {
  if (!price
      || !Number.isInteger(price.netAmountMinor)
      || !Number.isInteger(price.vatAmountMinor)
      || !Number.isInteger(price.grossAmountMinor)
      || price.grossAmountMinor <= 0
      || price.grossAmountMinor % 100 !== 0
      || price.vatRateBasisPoints !== 2000
      || price.currency !== "GBP"
      || price.netAmountMinor + price.vatAmountMinor !== price.grossAmountMinor
      || price.netAmountMinor !== Math.round(price.grossAmountMinor * 10_000 / 12_000)) {
    throw new Error("REVIEW_ACCEPTANCE_PRICE_INVALID");
  }
  return price;
}

/**
 * Resolves an opaque, revision-bound customer capability into the smallest
 * storefront-safe review summary. The returned object intentionally excludes
 * customer PII, supplier cost, margin, raw stock, batches and evidence detail.
 */
export async function getCustomerReviewAcceptance(
  input: CustomerReviewAcceptanceInput,
) {
  if (typeof input?.reviewRequestId !== "string"
      || !REQUEST_ID.test(input.reviewRequestId)
      || typeof input.reviewAcceptanceToken !== "string"
      || !ACCEPTANCE_TOKEN.test(input.reviewAcceptanceToken)) {
    throw new Error("REVIEW_ACCEPTANCE_REQUEST_INVALID");
  }

  const [review, persisted] = await Promise.all([
    getStaffReviewDashboard(input.reviewRequestId),
    getStaffReviewRequest(input.reviewRequestId),
  ]);
  if (!review || !persisted) throw new Error("REVIEW_ACCEPTANCE_NOT_FOUND");
  const latest = review.revisions.toSorted((left, right) => right.revisionNumber - left.revisionNumber)[0];
  if (!latest || !verifyReviewAcceptanceToken(input.reviewAcceptanceToken, {
    reviewRequestId: review.requestId,
    reviewRevisionId: latest.revisionId,
  })) {
    throw new Error("REVIEW_ACCEPTANCE_TOKEN_INVALID");
  }
  if (review.reviewState !== "READY_FOR_CHECKOUT") {
    throw new Error("REVIEW_ACCEPTANCE_NOT_READY");
  }

  const price = assertFinalPrice(latest.finalPrice);
  const calculatedFabricMetres = positiveNumber(latest.specification.calculated_fabric_metres)
    ?? positiveNumber(persisted.request.calculated_fabric_metres);
  if (!calculatedFabricMetres
      || !latest.pricingRuleVersion
      || !review.configuration.shippingParcelClass
      || !emailEvidenceReady(review.emailEvidence)) {
    throw new Error("REVIEW_ACCEPTANCE_NOT_READY");
  }

  return {
    reviewRequestId: review.requestId,
    reviewRevisionId: latest.revisionId,
    configurationId: review.configurationId,
    reference: review.reference,
    reviewState: "READY_FOR_CHECKOUT" as const,
    pricingOutcome: review.pricingOutcome,
    window: {
      slug: review.windowTypeSlug,
      label: review.windowTypeLabel,
    },
    measurements: review.configuration.measurements,
    fabric: {
      brand: review.fabric.brand,
      collection: review.fabric.collection,
      design: review.fabric.design,
      colour: review.fabric.colour,
      supplierSku: review.fabric.supplierSku,
    },
    heading: review.configuration.heading,
    lining: review.configuration.lining,
    construction: review.configuration.construction,
    calculatedFabricMetres,
    pricingRuleVersion: latest.pricingRuleVersion,
    price,
    availability: {
      state: review.availability.state,
      label: review.availability.label,
    },
    shippingParcelClass: review.configuration.shippingParcelClass,
    delivery: {
      status: "SELECT_DELIVERY_AREA_AT_HANDOFF" as const,
      label: "Delivery is calculated separately after you choose your delivery area.",
    },
    paymentEnabled: false as const,
    supplierCommercialDataIncluded: false as const,
  };
}
