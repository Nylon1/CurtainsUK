import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  parseReviewAmendmentInput,
  parseReviewCheckoutInput,
  parseReviewListQuery,
  parseReviewRequestId,
  parseReviewTransitionInput,
} from "../review-admin-validation";

const requestId = "0eb67621-3df8-4552-9b27-c183d3b24860";
const revisionId = "1c10477e-f08b-4f08-a559-97049f692f15";

test("review list query accepts bounded filters and rejects unknown or duplicate inputs", () => {
  assert.deepEqual(
    parseReviewListQuery("https://example.test/api/admin/reviews?state=UNDER_REVIEW&query=Dali%20Mocha&limit=25"),
    { state: "UNDER_REVIEW", query: "Dali Mocha", limit: 25 },
  );
  assert.deepEqual(parseReviewListQuery("https://example.test/api/admin/reviews"), { limit: 30 });
  assert.throws(() => parseReviewListQuery("https://example.test/api/admin/reviews?limit=10&limit=20"), /REVIEW_QUERY_INVALID/);
  assert.throws(() => parseReviewListQuery("https://example.test/api/admin/reviews?debug=true"), /REVIEW_QUERY_INVALID/);
  assert.throws(() => parseReviewListQuery("https://example.test/api/admin/reviews?query=%25admin"), /REVIEW_QUERY_INVALID/);
  assert.throws(() => parseReviewListQuery("https://example.test/api/admin/reviews?limit=101"), /REVIEW_LIMIT_INVALID/);
});

test("staff transition input is exact, audited and optimistic", () => {
  assert.deepEqual(parseReviewTransitionInput({
    toState: "UNDER_REVIEW",
    reason: " Initial technical review ",
    expectedState: "PENDING",
    latestRevisionId: revisionId,
  }), {
    toState: "UNDER_REVIEW",
    reason: "Initial technical review",
    expectedState: "PENDING",
    latestRevisionId: revisionId,
  });
  assert.throws(() => parseReviewTransitionInput({
    toState: "UNDER_REVIEW",
    reason: "ok",
    expectedState: "PENDING",
    latestRevisionId: revisionId,
  }), /REVIEW_REASON_INVALID/);
  assert.throws(() => parseReviewTransitionInput({
    toState: "UNDER_REVIEW",
    reason: "Start review",
    expectedState: "PENDING",
    latestRevisionId: revisionId,
    unexpected: true,
  }), /REVIEW_TRANSITION_INVALID/);
});

test("staff amendments require an immutable predecessor and exact GBP arithmetic", () => {
  const parsed = parseReviewAmendmentInput({
    specification: { heading: "WAVE", measurements: { coverage_width: 340 } },
    finalPrice: { netAmountMinor: 100_000, vatAmountMinor: 20_000, grossAmountMinor: 120_000, vatRateBasisPoints: 2000, currency: "GBP" },
    pricingRuleVersion: " curtainsuk-draft-v1 ",
    reason: "Measurements confirmed by staff",
    previousRevisionId: revisionId,
  });
  assert.equal(parsed.pricingRuleVersion, "curtainsuk-draft-v1");
  assert.equal(parsed.previousRevisionId, revisionId);
  assert.throws(() => parseReviewAmendmentInput({
    ...parsed,
    finalPrice: { ...parsed.finalPrice, grossAmountMinor: 119_999 },
  }), /REVIEW_FINAL_PRICE_INVALID/);
  assert.throws(() => parseReviewAmendmentInput({
    ...parsed,
    finalPrice: { ...parsed.finalPrice, vatRateBasisPoints: 500 },
  }), /REVIEW_FINAL_PRICE_INVALID/);
  assert.throws(() => parseReviewAmendmentInput({ ...parsed, debug: true }), /REVIEW_AMENDMENT_INVALID/);
});

test("checkout readiness accepts only approved state and the reviewed revision", () => {
  assert.deepEqual(parseReviewCheckoutInput({
    reason: "Customer-safe quote is ready",
    expectedState: "APPROVED",
    revisionId,
  }), {
    reason: "Customer-safe quote is ready",
    expectedState: "APPROVED",
    revisionId,
  });
  assert.throws(() => parseReviewCheckoutInput({ reason: "Ready", expectedState: "UNDER_REVIEW", revisionId }), /REVIEW_CHECKOUT_INVALID/);
  assert.equal(parseReviewRequestId(requestId), requestId);
  assert.throws(() => parseReviewRequestId("request-1"), /REVIEW_REQUEST_ID_INVALID/);
});

test("admin review routes use private auth, no-store responses and optimistic repository calls", () => {
  const root = new URL("../../..", import.meta.url);
  const shared = readFileSync(new URL("app/api/admin/reviews/_shared.ts", root), "utf8");
  const repository = readFileSync(new URL("lib/storefront/review-operations-repository.ts", root), "utf8");
  assert.match(shared, /supplierAdminIdentity/);
  assert.match(shared, /PRIVATE_NO_STORE_HEADERS/);
  assert.match(shared, /AUTHENTICATION_REQUIRED/);
  assert.match(shared, /STAFF_ROLE_REQUIRED/);
  assert.match(repository, /expected_state: input\.expectedState/);
  assert.match(repository, /p_expected_latest_revision_id: input\.expectedLatestRevisionId/);
  assert.match(repository, /calculated_fabric_metres/);
  assert.match(repository, /effectiveReviewSpecification/);
  assert.match(repository, /select\("request_id,revision_number,specification,final_gross_amount_minor"\)/);
  assert.match(repository, /fabric\.supplierSku === effective\.supplierSku/);
});
