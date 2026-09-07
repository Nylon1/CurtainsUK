import { REVIEW_STATES, type ReviewState } from "./review-workflow";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEARCH_PATTERN = /^[\p{L}\p{N}\s@._/+&#'’-]+$/u;

export interface ReviewListQuery {
  state?: ReviewState;
  query?: string;
  cursor?: string;
  limit: number;
}

export interface ReviewTransitionInput {
  toState: ReviewState;
  reason: string;
  expectedState: ReviewState;
  latestRevisionId: string | null;
}

export interface ReviewAmendmentInput {
  specification: Record<string, unknown>;
  finalPrice: {
    netAmountMinor: number;
    vatAmountMinor: number;
    grossAmountMinor: number;
    vatRateBasisPoints: 2000;
    currency: "GBP";
  };
  pricingRuleVersion: string;
  reason: string;
  previousRevisionId: string;
}

export interface ReviewCheckoutInput {
  reason: string;
  expectedState: "APPROVED";
  revisionId: string;
}

function record(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], code: string) {
  const actual = Object.keys(value).sort();
  const allowed = [...expected].sort();
  if (actual.length !== allowed.length || actual.some((key, index) => key !== allowed[index])) throw new Error(code);
}

function reviewState(value: unknown, code: string): ReviewState {
  if (typeof value !== "string" || !REVIEW_STATES.includes(value as ReviewState)) throw new Error(code);
  return value as ReviewState;
}

function reason(value: unknown): string {
  if (typeof value !== "string") throw new Error("REVIEW_REASON_INVALID");
  const normalized = value.trim();
  if (normalized.length < 3 || normalized.length > 2_000) throw new Error("REVIEW_REASON_INVALID");
  return normalized;
}

function uuid(value: unknown, code: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw new Error(code);
  return value.toLowerCase();
}

function nullableUuid(value: unknown, code: string): string | null {
  return value === null ? null : uuid(value, code);
}

function positiveMoneyInteger(value: unknown, code: string) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new Error(code);
  return value;
}

function nonNegativeMoneyInteger(value: unknown, code: string) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(code);
  return value;
}

function singleSearchParameter(search: URLSearchParams, name: string) {
  const values = search.getAll(name);
  if (values.length > 1) throw new Error("REVIEW_QUERY_INVALID");
  return values[0];
}

export function parseReviewRequestId(value: unknown) {
  return uuid(value, "REVIEW_REQUEST_ID_INVALID");
}

export function parseReviewListQuery(url: string): ReviewListQuery {
  const search = new URL(url).searchParams;
  const allowed = new Set(["state", "query", "cursor", "limit"]);
  for (const key of search.keys()) if (!allowed.has(key)) throw new Error("REVIEW_QUERY_INVALID");

  const stateValue = singleSearchParameter(search, "state");
  const queryValue = singleSearchParameter(search, "query")?.trim();
  const cursorValue = singleSearchParameter(search, "cursor")?.trim();
  const limitValue = singleSearchParameter(search, "limit");
  if (queryValue && (queryValue.length > 100 || !SEARCH_PATTERN.test(queryValue))) throw new Error("REVIEW_QUERY_INVALID");
  if (cursorValue && (cursorValue.length > 512 || !/^[A-Za-z0-9_-]+$/.test(cursorValue))) throw new Error("REVIEW_CURSOR_INVALID");
  if (limitValue !== undefined && !/^[1-9]\d{0,2}$/.test(limitValue)) throw new Error("REVIEW_LIMIT_INVALID");
  const limit = limitValue === undefined ? 30 : Number.parseInt(limitValue, 10);
  if (limit > 100) throw new Error("REVIEW_LIMIT_INVALID");
  return {
    ...(stateValue === undefined ? {} : { state: reviewState(stateValue, "REVIEW_STATE_INVALID") }),
    ...(queryValue ? { query: queryValue } : {}),
    ...(cursorValue ? { cursor: cursorValue } : {}),
    limit,
  };
}

export function parseReviewTransitionInput(value: unknown): ReviewTransitionInput {
  const input = record(value, "REVIEW_TRANSITION_INVALID");
  exactKeys(input, ["toState", "reason", "expectedState", "latestRevisionId"], "REVIEW_TRANSITION_INVALID");
  return {
    toState: reviewState(input.toState, "REVIEW_STATE_INVALID"),
    reason: reason(input.reason),
    expectedState: reviewState(input.expectedState, "REVIEW_STATE_INVALID"),
    latestRevisionId: nullableUuid(input.latestRevisionId, "REVIEW_REVISION_ID_INVALID"),
  };
}

export function parseReviewAmendmentInput(value: unknown): ReviewAmendmentInput {
  const input = record(value, "REVIEW_AMENDMENT_INVALID");
  exactKeys(input, ["specification", "finalPrice", "pricingRuleVersion", "reason", "previousRevisionId"], "REVIEW_AMENDMENT_INVALID");
  const specification = record(input.specification, "REVIEW_SPECIFICATION_INVALID");
  const finalPrice = record(input.finalPrice, "REVIEW_FINAL_PRICE_INVALID");
  exactKeys(finalPrice, ["netAmountMinor", "vatAmountMinor", "grossAmountMinor", "vatRateBasisPoints", "currency"], "REVIEW_FINAL_PRICE_INVALID");
  const netAmountMinor = positiveMoneyInteger(finalPrice.netAmountMinor, "REVIEW_FINAL_PRICE_INVALID");
  const vatAmountMinor = nonNegativeMoneyInteger(finalPrice.vatAmountMinor, "REVIEW_FINAL_PRICE_INVALID");
  const grossAmountMinor = positiveMoneyInteger(finalPrice.grossAmountMinor, "REVIEW_FINAL_PRICE_INVALID");
  if (finalPrice.currency !== "GBP"
      || finalPrice.vatRateBasisPoints !== 2000
      || grossAmountMinor % 100 !== 0
      || netAmountMinor !== Math.round(grossAmountMinor * 10_000 / 12_000)
      || vatAmountMinor !== grossAmountMinor - netAmountMinor) {
    throw new Error("REVIEW_FINAL_PRICE_INVALID");
  }
  if (typeof input.pricingRuleVersion !== "string") throw new Error("REVIEW_PRICING_VERSION_REQUIRED");
  const pricingRuleVersion = input.pricingRuleVersion.trim();
  if (!pricingRuleVersion || pricingRuleVersion.length > 120) throw new Error("REVIEW_PRICING_VERSION_REQUIRED");
  return {
    specification,
    finalPrice: { netAmountMinor, vatAmountMinor, grossAmountMinor, vatRateBasisPoints: 2000, currency: "GBP" },
    pricingRuleVersion,
    reason: reason(input.reason),
    previousRevisionId: uuid(input.previousRevisionId, "REVIEW_REVISION_ID_INVALID"),
  };
}

export function parseReviewCheckoutInput(value: unknown): ReviewCheckoutInput {
  const input = record(value, "REVIEW_CHECKOUT_INVALID");
  exactKeys(input, ["reason", "expectedState", "revisionId"], "REVIEW_CHECKOUT_INVALID");
  if (input.expectedState !== "APPROVED") throw new Error("REVIEW_CHECKOUT_INVALID");
  return {
    reason: reason(input.reason),
    expectedState: "APPROVED",
    revisionId: uuid(input.revisionId, "REVIEW_REVISION_ID_INVALID"),
  };
}
