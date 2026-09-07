import type { DecisionOutcome } from "@/lib/decision-engine/types";
import { allocateVatInclusiveRetailTotal } from "./checkout-gates";

export const REVIEW_STATES = [
  "PENDING",
  "NEEDS_INFORMATION",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "READY_FOR_CHECKOUT",
] as const;

export type ReviewState = (typeof REVIEW_STATES)[number];

const ALLOWED_TRANSITIONS: Readonly<Record<ReviewState, readonly ReviewState[]>> = {
  PENDING: ["NEEDS_INFORMATION", "UNDER_REVIEW", "REJECTED"],
  NEEDS_INFORMATION: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["NEEDS_INFORMATION", "APPROVED", "REJECTED"],
  APPROVED: ["UNDER_REVIEW", "READY_FOR_CHECKOUT", "REJECTED"],
  REJECTED: [],
  READY_FOR_CHECKOUT: [],
};

export interface ReviewAuditEntry {
  eventId: string;
  requestId: string;
  fromState: ReviewState;
  toState: ReviewState;
  actorId: string;
  reason: string;
  occurredAt: string;
}

export interface ReviewRevision<TSpecification extends Record<string, unknown> = Record<string, unknown>> {
  revisionId: string;
  requestId: string;
  revisionNumber: number;
  previousRevisionId: string | null;
  kind: "CUSTOMER_SUBMISSION" | "STAFF_AMENDMENT";
  specification: Readonly<TSpecification>;
  finalPrice: Readonly<{
    netAmountMinor: number;
    vatAmountMinor: number;
    grossAmountMinor: number;
    vatRateBasisPoints: number;
    currency: "GBP";
  }> | null;
  pricingRuleVersion: string | null;
  actorId: string | null;
  reason: string;
  createdAt: string;
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validIsoTimestamp(value: string) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function normalizedReason(value: string) {
  const reason = value.trim();
  if (reason.length < 3 || reason.length > 2_000) throw new Error("REVIEW_REASON_INVALID");
  return reason;
}

function immutableClone<T>(value: T): Readonly<T> {
  const clone = structuredClone(value);
  const freeze = (item: unknown): void => {
    if (!item || typeof item !== "object" || Object.isFrozen(item)) return;
    for (const child of Object.values(item)) freeze(child);
    Object.freeze(item);
  };
  freeze(clone);
  return clone;
}

export function canTransitionReview(from: ReviewState, to: ReviewState) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function createReviewTransition(input: {
  eventId: string;
  requestId: string;
  fromState: ReviewState;
  toState: ReviewState;
  actorId: string;
  reason: string;
  occurredAt: string;
  pricingOutcome: Exclude<DecisionOutcome, "INSTANT_PRICE">;
  latestRevision: ReviewRevision | null;
  emailEvidenceReviewed: boolean;
}): ReviewAuditEntry {
  if (!validUuid(input.eventId) || !validUuid(input.requestId)) throw new Error("REVIEW_ID_INVALID");
  if (!input.actorId.trim() || input.actorId.length > 320) throw new Error("REVIEW_ACTOR_INVALID");
  if (!validIsoTimestamp(input.occurredAt)) throw new Error("REVIEW_TIMESTAMP_INVALID");
  if (!canTransitionReview(input.fromState, input.toState)) throw new Error("REVIEW_TRANSITION_INVALID");

  if (["APPROVED", "READY_FOR_CHECKOUT"].includes(input.toState)) {
    if (!input.emailEvidenceReviewed) throw new Error("REVIEW_EMAIL_EVIDENCE_REQUIRED");
    if (!input.latestRevision?.finalPrice || input.latestRevision.finalPrice.grossAmountMinor <= 0) {
      throw new Error("REVIEW_FINAL_PRICE_REQUIRED");
    }
  }
  if (input.toState === "READY_FOR_CHECKOUT" && input.fromState !== "APPROVED") {
    throw new Error("REVIEW_APPROVAL_REQUIRED");
  }

  return immutableClone({
    eventId: input.eventId,
    requestId: input.requestId,
    fromState: input.fromState,
    toState: input.toState,
    actorId: input.actorId.trim(),
    reason: normalizedReason(input.reason),
    occurredAt: input.occurredAt,
  });
}

export function createStaffAmendment<TSpecification extends Record<string, unknown>>(input: {
  revisionId: string;
  previous: ReviewRevision<TSpecification>;
  specification: TSpecification;
  actorId: string;
  reason: string;
  createdAt: string;
  pricingRuleVersion: string;
  finalPrice: {
    netAmountMinor: number;
    vatAmountMinor: number;
    grossAmountMinor: number;
    vatRateBasisPoints: number;
    currency: "GBP";
  };
}): ReviewRevision<TSpecification> {
  if (!validUuid(input.revisionId) || !input.actorId.trim()) throw new Error("REVIEW_AMENDMENT_IDENTITY_INVALID");
  if (!validIsoTimestamp(input.createdAt)) throw new Error("REVIEW_TIMESTAMP_INVALID");
  if (!input.specification || Array.isArray(input.specification)) throw new Error("REVIEW_SPECIFICATION_INVALID");
  const price = input.finalPrice;
  if (![price.netAmountMinor, price.vatAmountMinor, price.grossAmountMinor, price.vatRateBasisPoints].every(Number.isSafeInteger)
      || price.netAmountMinor <= 0
      || price.vatAmountMinor < 0
      || price.netAmountMinor + price.vatAmountMinor !== price.grossAmountMinor) {
    throw new Error("REVIEW_FINAL_PRICE_INVALID");
  }
  const allocation = allocateVatInclusiveRetailTotal(price.grossAmountMinor, price.vatRateBasisPoints);
  if (allocation.netAmountMinor !== price.netAmountMinor || allocation.vatAmountMinor !== price.vatAmountMinor) {
    throw new Error("REVIEW_FINAL_PRICE_INVALID");
  }
  if (!input.pricingRuleVersion.trim()) throw new Error("REVIEW_PRICING_VERSION_REQUIRED");

  return immutableClone({
    revisionId: input.revisionId,
    requestId: input.previous.requestId,
    revisionNumber: input.previous.revisionNumber + 1,
    previousRevisionId: input.previous.revisionId,
    kind: "STAFF_AMENDMENT" as const,
    specification: input.specification,
    finalPrice: price,
    pricingRuleVersion: input.pricingRuleVersion.trim(),
    actorId: input.actorId.trim(),
    reason: normalizedReason(input.reason),
    createdAt: input.createdAt,
  });
}
