export const REVIEW_STATES = [
  "PENDING",
  "NEEDS_INFORMATION",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "READY_FOR_CHECKOUT",
] as const;

export type ReviewState = (typeof REVIEW_STATES)[number];
export type PricingOutcome = "PRICE_WITH_REVIEW" | "MANUAL_QUOTE";
export type EvidenceSecurityState = "QUARANTINED" | "CLEAN" | "REJECTED" | "DELETION_REQUESTED" | "DELETED";
export type PublicAvailabilityState =
  | "FABRIC_AVAILABLE"
  | "LIMITED_AVAILABILITY"
  | "AVAILABLE_SOON"
  | "AVAILABILITY_TO_BE_CONFIRMED"
  | "TEMPORARILY_UNAVAILABLE"
  | "NO_LONGER_AVAILABLE";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface ReviewMoney {
  netAmountMinor: number;
  vatAmountMinor: number;
  grossAmountMinor: number;
  vatRateBasisPoints: 2000;
  currency: "GBP";
}

export interface ReviewFabric {
  fabricId: string;
  supplierId: string;
  supplierName: string;
  supplierSku: string;
  brand: string | null;
  collection: string | null;
  design: string;
  colour: string;
}

export interface ReviewListItem {
  requestId: string;
  configurationId: string;
  reference: string;
  reviewState: ReviewState;
  pricingOutcome: PricingOutcome;
  submittedAt: string;
  updatedAt: string;
  customerName: string | null;
  customerEmail: string;
  windowTypeSlug: string;
  windowTypeLabel: string;
  fabric: ReviewFabric;
  availabilityState: PublicAvailabilityState;
  provisionalGrossPriceMinor: number | null;
  finalGrossPriceMinor: number | null;
  currency: "GBP";
  evidenceCounts: {
    total: number;
    clean: number;
    blocked: number;
  };
}

export interface ReviewEvidence {
  evidenceId: string;
  kind: "PHOTO" | "DRAWING";
  fileName: string;
  contentType: string;
  sizeBytes: number;
  securityState: EvidenceSecurityState;
  scannedAt: string | null;
  retentionExpiresAt: string;
}

export interface ReviewRevision {
  revisionId: string;
  revisionNumber: number;
  previousRevisionId: string | null;
  kind: "CUSTOMER_SUBMISSION" | "STAFF_AMENDMENT";
  specification: Record<string, JsonValue>;
  finalPrice: ReviewMoney | null;
  pricingRuleVersion: string | null;
  actorLabel: string | null;
  reason: string;
  createdAt: string;
}

export interface ReviewAuditEntry {
  eventId: string;
  fromState: ReviewState | null;
  toState: ReviewState;
  actorLabel: string;
  reason: string;
  occurredAt: string;
}

export interface ReviewDetail extends ReviewListItem {
  customer: {
    name: string | null;
    email: string;
    phone: string | null;
    notes: string | null;
  };
  configuration: {
    measurementBasis: string | null;
    measurements: Record<string, JsonValue>;
    heading: string;
    lining: string;
    interlining: string;
    construction: string;
    stackDirection: string;
    fixingPosition: string | null;
    shippingParcelClass: "STANDARD" | "LARGE" | "OVERSIZE" | "SPECIALIST" | null;
    accessories: JsonValue[];
  };
  pricing: {
    outcome: PricingOutcome;
    provisionalGrossPriceMinor: number | null;
    finalPrice: ReviewMoney | null;
    calculationVersion: string | null;
    pricingRuleVersion: string | null;
  };
  availability: {
    state: PublicAvailabilityState;
    label: string;
    checkedAt: string | null;
  };
  evidence: ReviewEvidence[];
  revisions: ReviewRevision[];
  audit: ReviewAuditEntry[];
  checkout: {
    eligible: boolean;
    blockedReasons: string[];
    reference: string | null;
  };
}

export interface ReviewListResponse {
  reviews: ReviewListItem[];
  counts: Record<ReviewState, number>;
  nextCursor: string | null;
}

export interface ReviewDetailResponse {
  review: ReviewDetail;
}

export interface TransitionRequest {
  toState: ReviewState;
  reason: string;
  expectedState: ReviewState;
  latestRevisionId: string | null;
}

export interface AmendmentRequest {
  specification: Record<string, JsonValue>;
  finalPrice: ReviewMoney;
  pricingRuleVersion: string;
  reason: string;
  previousRevisionId: string;
}

export interface CheckoutRequest {
  reason: string;
  expectedState: "APPROVED";
  revisionId: string;
}

export const REVIEW_TRANSITIONS: Readonly<Record<ReviewState, readonly ReviewState[]>> = {
  PENDING: ["NEEDS_INFORMATION", "UNDER_REVIEW", "REJECTED"],
  NEEDS_INFORMATION: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["NEEDS_INFORMATION", "APPROVED", "REJECTED"],
  APPROVED: ["UNDER_REVIEW", "REJECTED"],
  REJECTED: [],
  READY_FOR_CHECKOUT: [],
};

export function isActionReason(value: string) {
  const reason = value.trim();
  return reason.length >= 3 && reason.length <= 2_000;
}

const AVAILABILITY_STATES: readonly PublicAvailabilityState[] = [
  "FABRIC_AVAILABLE",
  "LIMITED_AVAILABILITY",
  "AVAILABLE_SOON",
  "AVAILABILITY_TO_BE_CONFIRMED",
  "TEMPORARILY_UNAVAILABLE",
  "NO_LONGER_AVAILABLE",
];

const EVIDENCE_STATES: readonly EvidenceSecurityState[] = ["QUARANTINED", "CLEAN", "REJECTED", "DELETION_REQUESTED", "DELETED"];
const PRICING_OUTCOMES: readonly PricingOutcome[] = ["PRICE_WITH_REVIEW", "MANUAL_QUOTE"];

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`REVIEW_API_CONTRACT_INVALID:${path}`);
  return value as Record<string, unknown>;
}

function string(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`REVIEW_API_CONTRACT_INVALID:${path}`);
  return value;
}

function nullableString(value: unknown, path: string): string | null {
  if (value === null) return null;
  return string(value, path);
}

function finiteInteger(value: unknown, path: string, nullable = false): number | null {
  if (nullable && value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new Error(`REVIEW_API_CONTRACT_INVALID:${path}`);
  return value;
}

function timestamp(value: unknown, path: string): string {
  const result = string(value, path);
  if (!Number.isFinite(Date.parse(result))) throw new Error(`REVIEW_API_CONTRACT_INVALID:${path}`);
  return result;
}

function nullableTimestamp(value: unknown, path: string): string | null {
  if (value === null) return null;
  return timestamp(value, path);
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new Error(`REVIEW_API_CONTRACT_INVALID:${path}`);
  return value;
}

function oneOf<T extends string>(value: unknown, options: readonly T[], path: string): T {
  if (typeof value !== "string" || !options.includes(value as T)) throw new Error(`REVIEW_API_CONTRACT_INVALID:${path}`);
  return value as T;
}

function jsonObject(value: unknown, path: string): Record<string, JsonValue> {
  return record(value, path) as Record<string, JsonValue>;
}

function money(value: unknown, path: string): ReviewMoney {
  const item = record(value, path);
  const netAmountMinor = finiteInteger(item.netAmountMinor, `${path}.netAmountMinor`) as number;
  const vatAmountMinor = finiteInteger(item.vatAmountMinor, `${path}.vatAmountMinor`) as number;
  const grossAmountMinor = finiteInteger(item.grossAmountMinor, `${path}.grossAmountMinor`) as number;
  if (item.currency !== "GBP"
      || item.vatRateBasisPoints !== 2000
      || grossAmountMinor % 100 !== 0
      || netAmountMinor !== Math.round(grossAmountMinor * 10_000 / 12_000)
      || vatAmountMinor !== grossAmountMinor - netAmountMinor) {
    throw new Error(`REVIEW_API_CONTRACT_INVALID:${path}`);
  }
  return { netAmountMinor, vatAmountMinor, grossAmountMinor, vatRateBasisPoints: 2000, currency: "GBP" };
}

function fabric(value: unknown, path: string): ReviewFabric {
  const item = record(value, path);
  return {
    fabricId: string(item.fabricId, `${path}.fabricId`),
    supplierId: string(item.supplierId, `${path}.supplierId`),
    supplierName: string(item.supplierName, `${path}.supplierName`),
    supplierSku: string(item.supplierSku, `${path}.supplierSku`),
    brand: nullableString(item.brand, `${path}.brand`),
    collection: nullableString(item.collection, `${path}.collection`),
    design: string(item.design, `${path}.design`),
    colour: string(item.colour, `${path}.colour`),
  };
}

function listItem(value: unknown, path: string): ReviewListItem {
  const item = record(value, path);
  const counts = record(item.evidenceCounts, `${path}.evidenceCounts`);
  if (item.currency !== "GBP") throw new Error(`REVIEW_API_CONTRACT_INVALID:${path}.currency`);
  return {
    requestId: string(item.requestId, `${path}.requestId`),
    configurationId: string(item.configurationId, `${path}.configurationId`),
    reference: string(item.reference, `${path}.reference`),
    reviewState: oneOf(item.reviewState, REVIEW_STATES, `${path}.reviewState`),
    pricingOutcome: oneOf(item.pricingOutcome, PRICING_OUTCOMES, `${path}.pricingOutcome`),
    submittedAt: timestamp(item.submittedAt, `${path}.submittedAt`),
    updatedAt: timestamp(item.updatedAt, `${path}.updatedAt`),
    customerName: nullableString(item.customerName, `${path}.customerName`),
    customerEmail: string(item.customerEmail, `${path}.customerEmail`),
    windowTypeSlug: string(item.windowTypeSlug, `${path}.windowTypeSlug`),
    windowTypeLabel: string(item.windowTypeLabel, `${path}.windowTypeLabel`),
    fabric: fabric(item.fabric, `${path}.fabric`),
    availabilityState: oneOf(item.availabilityState, AVAILABILITY_STATES, `${path}.availabilityState`),
    provisionalGrossPriceMinor: finiteInteger(item.provisionalGrossPriceMinor, `${path}.provisionalGrossPriceMinor`, true),
    finalGrossPriceMinor: finiteInteger(item.finalGrossPriceMinor, `${path}.finalGrossPriceMinor`, true),
    currency: "GBP",
    evidenceCounts: {
      total: finiteInteger(counts.total, `${path}.evidenceCounts.total`) as number,
      clean: finiteInteger(counts.clean, `${path}.evidenceCounts.clean`) as number,
      blocked: finiteInteger(counts.blocked, `${path}.evidenceCounts.blocked`) as number,
    },
  };
}

function detail(value: unknown): ReviewDetail {
  const item = record(value, "review");
  const base = listItem(item, "review");
  const customer = record(item.customer, "review.customer");
  const configuration = record(item.configuration, "review.configuration");
  const pricing = record(item.pricing, "review.pricing");
  const availability = record(item.availability, "review.availability");
  const checkout = record(item.checkout, "review.checkout");
  if (!Array.isArray(item.evidence) || !Array.isArray(item.revisions) || !Array.isArray(item.audit) || !Array.isArray(configuration.accessories) || !Array.isArray(checkout.blockedReasons)) {
    throw new Error("REVIEW_API_CONTRACT_INVALID:review.collections");
  }

  return {
    ...base,
    customer: {
      name: nullableString(customer.name, "review.customer.name"),
      email: string(customer.email, "review.customer.email"),
      phone: nullableString(customer.phone, "review.customer.phone"),
      notes: nullableString(customer.notes, "review.customer.notes"),
    },
    configuration: {
      measurementBasis: nullableString(configuration.measurementBasis, "review.configuration.measurementBasis"),
      measurements: jsonObject(configuration.measurements, "review.configuration.measurements"),
      heading: string(configuration.heading, "review.configuration.heading"),
      lining: string(configuration.lining, "review.configuration.lining"),
      interlining: string(configuration.interlining, "review.configuration.interlining"),
      construction: string(configuration.construction, "review.configuration.construction"),
      stackDirection: string(configuration.stackDirection, "review.configuration.stackDirection"),
      fixingPosition: nullableString(configuration.fixingPosition, "review.configuration.fixingPosition"),
      shippingParcelClass: configuration.shippingParcelClass === null
        ? null
        : oneOf(configuration.shippingParcelClass, ["STANDARD", "LARGE", "OVERSIZE", "SPECIALIST"] as const, "review.configuration.shippingParcelClass"),
      accessories: configuration.accessories as JsonValue[],
    },
    pricing: {
      outcome: oneOf(pricing.outcome, PRICING_OUTCOMES, "review.pricing.outcome"),
      provisionalGrossPriceMinor: finiteInteger(pricing.provisionalGrossPriceMinor, "review.pricing.provisionalGrossPriceMinor", true),
      finalPrice: pricing.finalPrice === null ? null : money(pricing.finalPrice, "review.pricing.finalPrice"),
      calculationVersion: nullableString(pricing.calculationVersion, "review.pricing.calculationVersion"),
      pricingRuleVersion: nullableString(pricing.pricingRuleVersion, "review.pricing.pricingRuleVersion"),
    },
    availability: {
      state: oneOf(availability.state, AVAILABILITY_STATES, "review.availability.state"),
      label: string(availability.label, "review.availability.label"),
      checkedAt: nullableTimestamp(availability.checkedAt, "review.availability.checkedAt"),
    },
    evidence: item.evidence.map((value, index) => {
      const evidence = record(value, `review.evidence.${index}`);
      return {
        evidenceId: string(evidence.evidenceId, `review.evidence.${index}.evidenceId`),
        kind: oneOf(evidence.kind, ["PHOTO", "DRAWING"] as const, `review.evidence.${index}.kind`),
        fileName: string(evidence.fileName, `review.evidence.${index}.fileName`),
        contentType: string(evidence.contentType, `review.evidence.${index}.contentType`),
        sizeBytes: finiteInteger(evidence.sizeBytes, `review.evidence.${index}.sizeBytes`) as number,
        securityState: oneOf(evidence.securityState, EVIDENCE_STATES, `review.evidence.${index}.securityState`),
        scannedAt: nullableTimestamp(evidence.scannedAt, `review.evidence.${index}.scannedAt`),
        retentionExpiresAt: timestamp(evidence.retentionExpiresAt, `review.evidence.${index}.retentionExpiresAt`),
      };
    }),
    revisions: item.revisions.map((value, index) => {
      const revision = record(value, `review.revisions.${index}`);
      return {
        revisionId: string(revision.revisionId, `review.revisions.${index}.revisionId`),
        revisionNumber: finiteInteger(revision.revisionNumber, `review.revisions.${index}.revisionNumber`) as number,
        previousRevisionId: nullableString(revision.previousRevisionId, `review.revisions.${index}.previousRevisionId`),
        kind: oneOf(revision.kind, ["CUSTOMER_SUBMISSION", "STAFF_AMENDMENT"] as const, `review.revisions.${index}.kind`),
        specification: jsonObject(revision.specification, `review.revisions.${index}.specification`),
        finalPrice: revision.finalPrice === null ? null : money(revision.finalPrice, `review.revisions.${index}.finalPrice`),
        pricingRuleVersion: nullableString(revision.pricingRuleVersion, `review.revisions.${index}.pricingRuleVersion`),
        actorLabel: nullableString(revision.actorLabel, `review.revisions.${index}.actorLabel`),
        reason: string(revision.reason, `review.revisions.${index}.reason`),
        createdAt: timestamp(revision.createdAt, `review.revisions.${index}.createdAt`),
      };
    }),
    audit: item.audit.map((value, index) => {
      const audit = record(value, `review.audit.${index}`);
      return {
        eventId: string(audit.eventId, `review.audit.${index}.eventId`),
        fromState: audit.fromState === null ? null : oneOf(audit.fromState, REVIEW_STATES, `review.audit.${index}.fromState`),
        toState: oneOf(audit.toState, REVIEW_STATES, `review.audit.${index}.toState`),
        actorLabel: string(audit.actorLabel, `review.audit.${index}.actorLabel`),
        reason: string(audit.reason, `review.audit.${index}.reason`),
        occurredAt: timestamp(audit.occurredAt, `review.audit.${index}.occurredAt`),
      };
    }),
    checkout: {
      eligible: boolean(checkout.eligible, "review.checkout.eligible"),
      blockedReasons: checkout.blockedReasons.map((value, index) => string(value, `review.checkout.blockedReasons.${index}`)),
      reference: nullableString(checkout.reference, "review.checkout.reference"),
    },
  };
}

export function parseReviewListResponse(value: unknown): ReviewListResponse {
  const payload = record(value, "response");
  if (!Array.isArray(payload.reviews)) throw new Error("REVIEW_API_CONTRACT_INVALID:response.reviews");
  const countsValue = record(payload.counts, "response.counts");
  const counts = Object.fromEntries(REVIEW_STATES.map((state) => [state, finiteInteger(countsValue[state], `response.counts.${state}`)])) as Record<ReviewState, number>;
  return {
    reviews: payload.reviews.map((item, index) => listItem(item, `response.reviews.${index}`)),
    counts,
    nextCursor: nullableString(payload.nextCursor, "response.nextCursor"),
  };
}

export function parseReviewDetailResponse(value: unknown): ReviewDetailResponse {
  const payload = record(value, "response");
  return { review: detail(payload.review) };
}

function safeId(value: string) {
  const id = value.trim();
  if (!id) throw new Error("REVIEW_ID_REQUIRED");
  return encodeURIComponent(id);
}

function reviewDetailPath(requestId: string) {
  return `/api/admin/reviews/${safeId(requestId)}`;
}

export const reviewEndpoints = {
  list(input: { state?: ReviewState | "ALL"; query?: string; cursor?: string | null; limit?: number } = {}) {
    const search = new URLSearchParams();
    if (input.state && input.state !== "ALL") search.set("state", input.state);
    if (input.query?.trim()) search.set("query", input.query.trim());
    if (input.cursor) search.set("cursor", input.cursor);
    search.set("limit", String(input.limit ?? 30));
    return `/api/admin/reviews?${search.toString()}`;
  },
  detail(requestId: string) {
    return reviewDetailPath(requestId);
  },
  transition(requestId: string) {
    return `${reviewDetailPath(requestId)}/transition`;
  },
  amend(requestId: string) {
    return `${reviewDetailPath(requestId)}/amend`;
  },
  checkout(requestId: string) {
    return `${reviewDetailPath(requestId)}/checkout`;
  },
  evidenceAccess(evidenceId: string) {
    return `/api/admin/review-evidence/${safeId(evidenceId)}/access-token`;
  },
};
