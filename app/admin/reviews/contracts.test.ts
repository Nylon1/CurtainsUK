import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  REVIEW_STATES,
  REVIEW_TRANSITIONS,
  isActionReason,
  parseReviewDetailResponse,
  parseReviewListResponse,
  reviewEndpoints,
} from "./contracts";

const requestId = "0eb67621-3df8-4552-9b27-c183d3b24860";

const fabric = {
  fabricId: "fabric-01",
  supplierId: "prestigious-textiles",
  supplierName: "Prestigious Textiles",
  supplierSku: "4270/147",
  brand: "Prestigious Textiles",
  collection: "Portfolio",
  design: "Dali",
  colour: "Mocha",
};

const summary = {
  requestId,
  configurationId: "1c10477e-f08b-4f08-a559-97049f692f15",
  reference: "CUK-R-000012",
  reviewState: "UNDER_REVIEW",
  pricingOutcome: "PRICE_WITH_REVIEW",
  submittedAt: "2026-09-07T10:00:00.000Z",
  updatedAt: "2026-09-07T11:00:00.000Z",
  customerName: "Example Customer",
  customerEmail: "customer@example.test",
  windowTypeSlug: "bay-window",
  windowTypeLabel: "Bay Window",
  fabric,
  availabilityState: "AVAILABILITY_TO_BE_CONFIRMED",
  provisionalGrossPriceMinor: 125_100,
  finalGrossPriceMinor: null,
  currency: "GBP",
  evidenceCounts: { total: 2, clean: 1, blocked: 1 },
};

const detail = {
  ...summary,
  customer: {
    name: "Example Customer",
    email: "customer@example.test",
    phone: "07000000000",
    notes: "Please call after 5pm.",
  },
  configuration: {
    measurementBasis: "TRACK_WIDTH",
    measurements: { coverage_width: 340, finished_drop: 220, bay_segment_widths: [80, 180, 80] },
    heading: "WAVE",
    lining: "BLACKOUT",
    interlining: "NONE",
    construction: "PAIR",
    stackDirection: "SPLIT",
    fixingPosition: null,
    shippingParcelClass: "STANDARD",
    accessories: [],
  },
  pricing: {
    outcome: "PRICE_WITH_REVIEW",
    provisionalGrossPriceMinor: 125_100,
    finalPrice: { netAmountMinor: 105_000, vatAmountMinor: 21_000, grossAmountMinor: 126_000, vatRateBasisPoints: 2000, currency: "GBP" },
    calculationVersion: "2.2.0-draft.1",
    pricingRuleVersion: "2.2.0-draft.1",
  },
  availability: {
    state: "AVAILABILITY_TO_BE_CONFIRMED",
    label: "Availability to be confirmed",
    checkedAt: null,
  },
  evidence: [
    {
      evidenceId: "evidence-clean",
      kind: "PHOTO",
      fileName: "bay-room.jpg",
      contentType: "image/jpeg",
      sizeBytes: 124_000,
      securityState: "CLEAN",
      scannedAt: "2026-09-07T10:01:00.000Z",
      retentionExpiresAt: "2027-03-06T10:00:00.000Z",
    },
    {
      evidenceId: "evidence-quarantine",
      kind: "DRAWING",
      fileName: "bay-plan.pdf",
      contentType: "application/pdf",
      sizeBytes: 220_000,
      securityState: "QUARANTINED",
      scannedAt: null,
      retentionExpiresAt: "2027-03-06T10:00:00.000Z",
    },
  ],
  revisions: [
    {
      revisionId: "revision-01",
      revisionNumber: 1,
      previousRevisionId: null,
      kind: "CUSTOMER_SUBMISSION",
      specification: { heading: "WAVE", lining: "BLACKOUT" },
      finalPrice: null,
      pricingRuleVersion: null,
      actorLabel: null,
      reason: "Customer submission",
      createdAt: "2026-09-07T10:00:00.000Z",
    },
  ],
  audit: [
    {
      eventId: "event-01",
      fromState: "PENDING",
      toState: "UNDER_REVIEW",
      actorLabel: "staff@example.test",
      reason: "Initial measurements checked",
      occurredAt: "2026-09-07T11:00:00.000Z",
    },
  ],
  checkout: {
    eligible: false,
    blockedReasons: ["Review approval is required"],
    reference: null,
  },
};

test("review list contract preserves every workflow state and private queue fields", () => {
  const counts = Object.fromEntries(REVIEW_STATES.map((state) => [state, state === "UNDER_REVIEW" ? 1 : 0]));
  const parsed = parseReviewListResponse({ reviews: [summary], counts, nextCursor: "cursor-2" });

  assert.equal(parsed.reviews[0].fabric.supplierSku, "4270/147");
  assert.equal(parsed.reviews[0].evidenceCounts.blocked, 1);
  assert.equal(parsed.counts.UNDER_REVIEW, 1);
  assert.equal(parsed.nextCursor, "cursor-2");
  assert.deepEqual(REVIEW_STATES, ["PENDING", "NEEDS_INFORMATION", "UNDER_REVIEW", "APPROVED", "REJECTED", "READY_FOR_CHECKOUT"]);
});

test("review detail contract exposes customer, configuration, pricing, availability, evidence and audit data", () => {
  const parsed = parseReviewDetailResponse({ review: detail }).review;

  assert.equal(parsed.customer.email, "customer@example.test");
  assert.deepEqual(parsed.configuration.measurements.bay_segment_widths, [80, 180, 80]);
  assert.equal(parsed.pricing.finalPrice?.grossAmountMinor, 126_000);
  assert.equal(parsed.availability.state, "AVAILABILITY_TO_BE_CONFIRMED");
  assert.deepEqual(parsed.evidence.map((item) => item.securityState), ["CLEAN", "QUARANTINED"]);
  assert.equal(parsed.revisions[0].kind, "CUSTOMER_SUBMISSION");
  assert.equal(parsed.audit[0].toState, "UNDER_REVIEW");
  assert.equal(parsed.checkout.eligible, false);
});

test("review contracts reject unknown states, evidence states and invalid price arithmetic", () => {
  const counts = Object.fromEntries(REVIEW_STATES.map((state) => [state, 0]));
  assert.throws(() => parseReviewListResponse({ reviews: [{ ...summary, reviewState: "IN_PROGRESS" }], counts, nextCursor: null }), /reviewState/);
  assert.throws(() => parseReviewDetailResponse({ review: { ...detail, evidence: [{ ...detail.evidence[0], securityState: "UNSCANNED" }] } }), /securityState/);
  assert.throws(() => parseReviewDetailResponse({ review: { ...detail, pricing: { ...detail.pricing, finalPrice: { ...detail.pricing.finalPrice, grossAmountMinor: 1 } } } }), /finalPrice/);
  assert.throws(() => parseReviewDetailResponse({ review: { ...detail, checkout: { ...detail.checkout, eligible: "yes" } } }), /checkout\.eligible/);
});

test("state transitions and checkout readiness remain explicit", () => {
  assert.deepEqual(REVIEW_TRANSITIONS.PENDING, ["NEEDS_INFORMATION", "UNDER_REVIEW", "REJECTED"]);
  assert.deepEqual(REVIEW_TRANSITIONS.UNDER_REVIEW, ["NEEDS_INFORMATION", "APPROVED", "REJECTED"]);
  assert.equal(REVIEW_TRANSITIONS.APPROVED.includes("READY_FOR_CHECKOUT"), false, "checkout uses its dedicated endpoint");
  assert.deepEqual(REVIEW_TRANSITIONS.REJECTED, []);
  assert.deepEqual(REVIEW_TRANSITIONS.READY_FOR_CHECKOUT, []);
});

test("every staff action requires an audit reason", () => {
  assert.equal(isActionReason(""), false);
  assert.equal(isActionReason("  "), false);
  assert.equal(isActionReason("ok"), false);
  assert.equal(isActionReason("Reviewed against customer drawing"), true);
  assert.equal(isActionReason("x".repeat(2_001)), false);
});

test("admin review endpoint builders encode filters and identifiers", () => {
  assert.equal(
    reviewEndpoints.list({ state: "UNDER_REVIEW", query: "Dali & Mocha", cursor: "next/page", limit: 10 }),
    "/api/admin/reviews?state=UNDER_REVIEW&query=Dali+%26+Mocha&cursor=next%2Fpage&limit=10",
  );
  assert.equal(reviewEndpoints.detail("request/id"), "/api/admin/reviews/request%2Fid");
  assert.equal(reviewEndpoints.transition(requestId), `/api/admin/reviews/${requestId}/transition`);
  assert.equal(reviewEndpoints.amend(requestId), `/api/admin/reviews/${requestId}/amend`);
  assert.equal(reviewEndpoints.checkout(requestId), `/api/admin/reviews/${requestId}/checkout`);
  assert.equal(reviewEndpoints.evidenceAccess("evidence/id"), "/api/admin/review-evidence/evidence%2Fid/access-token");
  assert.throws(() => reviewEndpoints.detail("   "), /REVIEW_ID_REQUIRED/);
});

test("private dashboard keeps its access, target-size and disabled-payment safety cues", () => {
  const dashboardSource = readFileSync(new URL("./review-dashboard.tsx", import.meta.url), "utf8");
  const proxySource = readFileSync(new URL("../../../proxy.ts", import.meta.url), "utf8");

  assert.match(proxySource, /matcher:\s*\["\/admin\/:path\*"\]/, "the admin page route must remain behind session auth");
  assert.match(proxySource, /private, no-store, max-age=0/, "admin pages and auth redirects must never be shared-cacheable");
  assert.match(dashboardSource, /const CONTROL = "min-h-11/, "form controls retain a 44px minimum height");
  assert.match(dashboardSource, /const BUTTON = "inline-flex min-h-11/, "buttons retain a 44px minimum height");
  assert.match(dashboardSource, /item\.securityState !== "CLEAN"/, "non-clean evidence retrieval remains disabled");
  assert.match(dashboardSource, /Checkout\/payment disabled/, "the dashboard visibly states that payment is disabled");
});
