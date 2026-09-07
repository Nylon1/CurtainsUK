import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  allocateVatInclusiveRetailTotal,
  createImmutableConfigurationSnapshot,
  evaluateCheckoutGate,
  prepareStagingCheckoutHandoff,
} from "../checkout-gates";
import {
  canTransitionReview,
  createReviewTransition,
  createStaffAmendment,
  REVIEW_STATES,
  type ReviewRevision,
} from "../review-workflow";
import {
  approvedReviewParcelClass,
  instantCurtainParcelClass,
  orderAmounts,
  quoteUkShipping,
  STAGING_UK_SHIPPING_RULES,
  type ShippingQuote,
  type ShippingRule,
} from "../shipping";
import {
  createReviewAcceptanceTokenWithSecret,
  verifyReviewAcceptanceTokenWithSecret,
} from "../review-acceptance-token-core";

const IDS = {
  request: "11111111-1111-4111-8111-111111111111",
  event: "22222222-2222-4222-8222-222222222222",
  customerRevision: "33333333-3333-4333-8333-333333333333",
  staffRevision: "44444444-4444-4444-8444-444444444444",
  snapshot: "55555555-5555-4555-8555-555555555555",
  configuration: "66666666-6666-4666-8666-666666666666",
  handoff: "77777777-7777-4777-8777-777777777777",
};

const READY_SHIPPING: ShippingQuote = {
  region: "UK_MAINLAND",
  parcelClass: "STANDARD",
  status: "READY",
  grossAmountMinor: 1_800,
  currency: "GBP",
  shownSeparately: true,
  countsTowardGoodsMinimum: false,
  message: "Delivery shown separately",
};

const PRICE = {
  netAmountMinor: 100_000,
  vatAmountMinor: 20_000,
  grossAmountMinor: 120_000,
  vatRateBasisPoints: 2_000,
  currency: "GBP" as const,
};

const CUSTOMER_REVISION: ReviewRevision<{ widthCm: number; fabricId: string }> = {
  revisionId: IDS.customerRevision,
  requestId: IDS.request,
  revisionNumber: 1,
  previousRevisionId: null,
  kind: "CUSTOMER_SUBMISSION",
  specification: Object.freeze({ widthCm: 200, fabricId: "fabric-1" }),
  finalPrice: null,
  pricingRuleVersion: "draft-v1",
  actorId: null,
  reason: "Customer submission",
  createdAt: "2026-09-07T12:00:00.000Z",
};

test("review workflow uses only the six agreed states and deterministic transitions", () => {
  assert.deepEqual(REVIEW_STATES, [
    "PENDING",
    "NEEDS_INFORMATION",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "READY_FOR_CHECKOUT",
  ]);
  assert.equal(canTransitionReview("PENDING", "UNDER_REVIEW"), true);
  assert.equal(canTransitionReview("UNDER_REVIEW", "APPROVED"), true);
  assert.equal(canTransitionReview("APPROVED", "READY_FOR_CHECKOUT"), true);
  assert.equal(canTransitionReview("PENDING", "READY_FOR_CHECKOUT"), false);
  assert.equal(canTransitionReview("REJECTED", "UNDER_REVIEW"), false);
  assert.equal(canTransitionReview("READY_FOR_CHECKOUT", "UNDER_REVIEW"), false);
});

test("review state changes require actor, timestamp, reason, clean evidence and a final price", () => {
  const amendment = createStaffAmendment({
    revisionId: IDS.staffRevision,
    previous: CUSTOMER_REVISION,
    specification: { widthCm: 205, fabricId: "fabric-1" },
    actorId: "staff@example.com",
    reason: "Customer confirmed revised width",
    createdAt: "2026-09-07T12:15:00.000Z",
    pricingRuleVersion: "draft-v1",
    finalPrice: PRICE,
  });
  const event = createReviewTransition({
    eventId: IDS.event,
    requestId: IDS.request,
    fromState: "UNDER_REVIEW",
    toState: "APPROVED",
    actorId: "staff@example.com",
    reason: "Technical measurements and price checked",
    occurredAt: "2026-09-07T12:20:00.000Z",
    pricingOutcome: "PRICE_WITH_REVIEW",
    latestRevision: amendment,
    emailEvidenceReviewed: true,
  });
  assert.equal(event.toState, "APPROVED");
  assert.throws(() => createReviewTransition({
    eventId: IDS.event,
    requestId: IDS.request,
    fromState: "UNDER_REVIEW",
    toState: "APPROVED",
    actorId: "staff@example.com",
    reason: "Approve project",
    occurredAt: "2026-09-07T12:20:00.000Z",
    pricingOutcome: "MANUAL_QUOTE",
    latestRevision: amendment,
    emailEvidenceReviewed: false,
  }), /REVIEW_EMAIL_EVIDENCE_REQUIRED/);
  assert.throws(() => createReviewTransition({
    eventId: IDS.event,
    requestId: IDS.request,
    fromState: "PENDING",
    toState: "READY_FOR_CHECKOUT",
    actorId: "staff@example.com",
    reason: "Skip straight to checkout",
    occurredAt: "2026-09-07T12:20:00.000Z",
    pricingOutcome: "PRICE_WITH_REVIEW",
    latestRevision: amendment,
    emailEvidenceReviewed: true,
  }), /REVIEW_TRANSITION_INVALID/);
});

test("staff amendments create immutable revisions without changing customer-submitted content", () => {
  const amended = createStaffAmendment({
    revisionId: IDS.staffRevision,
    previous: CUSTOMER_REVISION,
    specification: { widthCm: 210, fabricId: "fabric-1" },
    actorId: "staff@example.com",
    reason: "Width amended from customer follow-up",
    createdAt: "2026-09-07T12:30:00.000Z",
    pricingRuleVersion: "draft-v1",
    finalPrice: PRICE,
  });
  assert.equal(CUSTOMER_REVISION.specification.widthCm, 200);
  assert.equal(amended.specification.widthCm, 210);
  assert.equal(amended.previousRevisionId, CUSTOMER_REVISION.revisionId);
  assert.equal(amended.revisionNumber, 2);
  assert.equal(amended.kind, "STAFF_AMENDMENT");
  assert.equal(Object.isFrozen(amended), true);
  assert.equal(Object.isFrozen(amended.specification), true);
  assert.throws(() => createStaffAmendment({
    revisionId: IDS.staffRevision,
    previous: CUSTOMER_REVISION,
    specification: { widthCm: 210, fabricId: "fabric-1" },
    actorId: "staff@example.com",
    reason: "Bad total",
    createdAt: "2026-09-07T12:30:00.000Z",
    pricingRuleVersion: "draft-v1",
    finalPrice: { ...PRICE, grossAmountMinor: 119_999 },
  }), /REVIEW_FINAL_PRICE_INVALID/);
});

test("instant checkout is allowed only when every independent gate is satisfied", () => {
  const allowed = evaluateCheckoutGate({
    outcome: "INSTANT_PRICE",
    price: PRICE,
    fabricPricingEligible: true,
    technicallyValid: true,
    availability: "FABRIC_AVAILABLE",
    reviewState: null,
    customerAccepted: true,
    shipping: READY_SHIPPING,
  });
  assert.equal(allowed.eligible, true);
  assert.equal(allowed.action, "STAGING_CHECKOUT_HANDOFF");
  assert.equal(allowed.paymentEnabled, false);

  const staleSupplier = evaluateCheckoutGate({
    outcome: "INSTANT_PRICE",
    price: PRICE,
    fabricPricingEligible: true,
    technicallyValid: true,
    availability: "AVAILABILITY_TO_BE_CONFIRMED",
    reviewState: null,
    customerAccepted: true,
    shipping: READY_SHIPPING,
  });
  assert.equal(staleSupplier.action, "BLOCKED");
  assert.deepEqual(staleSupplier.blockers, ["AVAILABILITY_NOT_ACCEPTABLE"]);
});

test("review and manual-quote routes cannot bypass approval or customer acceptance", () => {
  const review = evaluateCheckoutGate({
    outcome: "PRICE_WITH_REVIEW",
    price: PRICE,
    fabricPricingEligible: true,
    technicallyValid: true,
    availability: "FABRIC_AVAILABLE",
    reviewState: "UNDER_REVIEW",
    customerAccepted: false,
    shipping: READY_SHIPPING,
  });
  assert.equal(review.action, "SUBMIT_FOR_REVIEW");
  assert.equal(review.numericPriceMayBeShown, true);
  assert.ok(review.blockers.includes("REVIEW_NOT_READY"));

  const manual = evaluateCheckoutGate({
    outcome: "MANUAL_QUOTE",
    price: { netAmountMinor: null, vatAmountMinor: null, grossAmountMinor: null, vatRateBasisPoints: null, currency: "GBP" },
    fabricPricingEligible: true,
    technicallyValid: true,
    availability: "FABRIC_AVAILABLE",
    reviewState: "PENDING",
    customerAccepted: false,
    shipping: READY_SHIPPING,
  });
  assert.equal(manual.action, "SUBMIT_PROJECT");
  assert.equal(manual.numericPriceMayBeShown, false);
  assert.ok(manual.blockers.includes("PRICE_INVALID"));

  const ready = evaluateCheckoutGate({
    outcome: "MANUAL_QUOTE",
    price: PRICE,
    fabricPricingEligible: true,
    technicallyValid: true,
    availability: "LIMITED_AVAILABILITY",
    reviewState: "READY_FOR_CHECKOUT",
    customerAccepted: true,
    shipping: READY_SHIPPING,
  });
  assert.equal(ready.eligible, true);
  assert.equal(ready.numericPriceMayBeShown, true);
});

test("approved checkout snapshot and handoff stay immutable when later supplier inputs change", () => {
  const gate = evaluateCheckoutGate({
    outcome: "PRICE_WITH_REVIEW",
    price: PRICE,
    fabricPricingEligible: true,
    technicallyValid: true,
    availability: "FABRIC_AVAILABLE",
    reviewState: "READY_FOR_CHECKOUT",
    customerAccepted: true,
    shipping: READY_SHIPPING,
  });
  const snapshot = createImmutableConfigurationSnapshot({
    snapshotId: IDS.snapshot,
    configurationId: IDS.configuration,
    reviewRequestId: IDS.request,
    reviewRevisionId: IDS.staffRevision,
    outcome: "PRICE_WITH_REVIEW",
    windowType: "bay-window",
    measurements: { bay_segment_widths: [80, 180, 80], finished_drop: 220 },
    fabricMasterId: "fabric-1",
    supplierSku: "PT-4270-147",
    heading: "WAVE",
    lining: "BLACKOUT",
    construction: "PAIR",
    calculatedFabricMetres: 15.6,
    pricingRuleVersion: "draft-v1",
    customerPrice: PRICE,
    availability: "FABRIC_AVAILABLE",
    shipping: READY_SHIPPING,
    customerAcceptedAt: "2026-09-07T12:45:00.000Z",
    recordedAt: "2026-09-07T12:45:00.000Z",
    gate,
  });
  const laterSupplierPrice = 999_999;
  assert.notEqual(snapshot.customerPrice.grossAmountMinor, laterSupplierPrice);
  assert.equal(snapshot.customerPrice.grossAmountMinor, 120_000);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.measurements), true);

  const handoff = prepareStagingCheckoutHandoff({
    handoffId: IDS.handoff,
    snapshot,
    preparedAt: "2026-09-07T12:46:00.000Z",
  });
  assert.equal(handoff.mode, "SHOPIFY_DRAFT_ORDER_EXACT_PRICE");
  assert.equal(handoff.paymentEnabled, false);
  assert.equal(handoff.shopifyWritePerformed, false);
  assert.equal(handoff.checkoutUrl, null);
  assert.equal(handoff.goodsPriceGrossAmountMinor, 120_000);
  assert.equal(handoff.shippingGrossAmountMinor, 1_800);
});

test("rounded VAT-inclusive totals are allocated to exact pennies and reject non-whole-pound checkout prices", () => {
  assert.deepEqual(allocateVatInclusiveRetailTotal(125_300), {
    netAmountMinor: 104_417,
    vatAmountMinor: 20_883,
    grossAmountMinor: 125_300,
    vatRateBasisPoints: 2_000,
    currency: "GBP",
  });
  assert.throws(() => allocateVatInclusiveRetailTotal(125_301), /CHECKOUT_FINAL_ROUNDING_INVALID/);
  const invalid = evaluateCheckoutGate({
    outcome: "INSTANT_PRICE",
    price: { ...PRICE, grossAmountMinor: 119_999, vatAmountMinor: 19_999 },
    fabricPricingEligible: true,
    technicallyValid: true,
    availability: "FABRIC_AVAILABLE",
    reviewState: null,
    customerAccepted: true,
    shipping: READY_SHIPPING,
  });
  assert.equal(invalid.eligible, false);
  assert.ok(invalid.blockers.includes("PRICE_INVALID"));
});

test("private supplier-commercial keys are rejected from checkout snapshots", () => {
  const gate = evaluateCheckoutGate({
    outcome: "INSTANT_PRICE",
    price: PRICE,
    fabricPricingEligible: true,
    technicallyValid: true,
    availability: "FABRIC_AVAILABLE",
    reviewState: null,
    customerAccepted: true,
    shipping: READY_SHIPPING,
  });
  assert.throws(() => createImmutableConfigurationSnapshot({
    snapshotId: IDS.snapshot,
    configurationId: IDS.configuration,
    reviewRequestId: null,
    reviewRevisionId: null,
    outcome: "INSTANT_PRICE",
    windowType: "standard-window",
    measurements: { width: 200, supplier_cost: 2_000 },
    fabricMasterId: "fabric-1",
    supplierSku: "PT-4270-147",
    heading: "PENCIL_PLEAT",
    lining: "STANDARD",
    construction: "PAIR",
    calculatedFabricMetres: 10,
    pricingRuleVersion: "draft-v1",
    customerPrice: PRICE,
    availability: "FABRIC_AVAILABLE",
    shipping: READY_SHIPPING,
    customerAcceptedAt: "2026-09-07T12:45:00.000Z",
    recordedAt: "2026-09-07T12:45:00.000Z",
    gate,
  }), /CHECKOUT_PRIVATE_FIELD/);
});

test("review checkout acceptance is a short-lived capability bound to the exact immutable revision", () => {
  const secret = "a".repeat(48);
  const claims = { reviewRequestId: IDS.request, reviewRevisionId: IDS.staffRevision };
  const token = createReviewAcceptanceTokenWithSecret(claims, secret, { nowSeconds: 1_000, ttlSeconds: 600 });
  assert.equal(verifyReviewAcceptanceTokenWithSecret(token, claims, secret, 1_599), true);
  assert.equal(verifyReviewAcceptanceTokenWithSecret(token, { ...claims, reviewRevisionId: IDS.customerRevision }, secret, 1_599), false);
  assert.equal(verifyReviewAcceptanceTokenWithSecret(token, claims, secret, 1_601), false);
});

test("UK shipping separates three launch regions and parcel classes without international or minimum-order leakage", () => {
  assert.equal(STAGING_UK_SHIPPING_RULES.length, 9);
  const draft = quoteUkShipping({ region: "HIGHLANDS_ISLANDS", parcelClass: "OVERSIZE" });
  assert.equal(draft.status, "RATE_REQUIRES_CONFIRMATION");
  assert.equal(draft.grossAmountMinor, null);
  assert.equal(draft.countsTowardGoodsMinimum, false);
  assert.throws(() => quoteUkShipping({ region: "FRANCE", parcelClass: "STANDARD" }), /INTERNATIONAL_SHIPPING_DISABLED/);

  const rules: ShippingRule[] = [{
    region: "UK_MAINLAND",
    parcelClass: "STANDARD",
    enabled: true,
    grossAmountMinor: 50_000,
    currency: "GBP",
    status: "VALIDATED",
  }];
  const expensiveDelivery = quoteUkShipping({ region: "UK_MAINLAND", parcelClass: "STANDARD", rules });
  const amounts = orderAmounts({
    goodsGrossAmountMinor: 9_999,
    shipping: expensiveDelivery,
    minimumGoodsAmountMinor: 10_000,
  });
  assert.equal(amounts.goodsMinimumSatisfied, false);
  assert.equal(amounts.goodsMinimumBasisMinor, 9_999);
  assert.equal(amounts.shippingCountsTowardGoodsMinimum, false);
  assert.equal(amounts.orderGrossAmountMinor, 59_999);
});

test("shipping class comes from server calculation or an approved review revision", () => {
  assert.equal(instantCurtainParcelClass(6), "STANDARD");
  assert.equal(instantCurtainParcelClass(7), "OVERSIZE");
  assert.equal(approvedReviewParcelClass("SPECIALIST"), "SPECIALIST");
  assert.throws(() => instantCurtainParcelClass(0), /SHIPPING_CLASS_INPUT_INVALID/);
  assert.throws(() => approvedReviewParcelClass("STANDARD_FROM_BROWSER"), /CHECKOUT_SHIPPING_CLASS_REQUIRES_APPROVAL/);
  const controller = readFileSync(join(process.cwd(), "lib", "storefront", "checkout-handoff-server.ts"), "utf8");
  assert.match(controller, /instantCurtainParcelClass\(calculation\.fabricWidths\)/);
  assert.match(controller, /approvedReviewParcelClass\(spec\.shipping_parcel_class\)/);
  assert.doesNotMatch(controller, /quoteUkShipping\(\{[\s\S]{0,160}parcelClass: input\.parcelClass/);
});

test("Phase 5C migration keeps checkout/evidence private and closes the database-clock import gate", () => {
  const migrationDirectory = join(process.cwd(), "supabase", "migrations");
  const migrationName = readdirSync(migrationDirectory).find((name) => name.endsWith("_curtainsuk_phase5c_checkout_review_operations.sql"));
  assert.ok(migrationName);
  const sql = readFileSync(join(migrationDirectory, migrationName), "utf8");
  assert.match(sql, /new\.imported_at > database_now \+ interval '5 minutes'/);
  assert.match(sql, /new\.source_observed_at > database_now \+ interval '5 minutes'/);
  assert.match(sql, /snapshot\.price_expires_at is not null/);
  assert.match(sql, /snapshot\.price_expires_at > clock_timestamp\(\)/);
  assert.match(sql, /price\.cut_trade_price > 0/);
  assert.match(sql, /\) = 'APPROVED_FOR_PROJECTION'/);
  assert.match(sql, /create_staging_review_request_with_evidence/);
  assert.match(sql, /create_staging_checkout_snapshot_and_handoff/);
  assert.match(sql, /record_staging_review_evidence_scan/);
  assert.match(sql, /request_staging_review_evidence_deletion/);
  assert.match(sql, /complete_staging_review_evidence_deletion/);
  assert.match(sql, /add column calculated_fabric_metres/);
  assert.match(sql, /shipping_parcel_class text not null/);
  assert.match(sql, /supplier_price_snapshot_id text not null/);
  assert.match(sql, /final_vat_rate_basis_points integer/);
  assert.match(sql, /vat_rate_basis_points integer not null/);
  assert.match(sql, /customer_price_minor % 100 = 0/);
  assert.match(sql, /price_gross % 100 <> 0/);
  assert.match(sql, /jsonb_object_keys\(p_snapshot->'measurements'\)/);
  assert.match(sql, /jsonb_object_keys\(p_snapshot->'customer_summary'\)/);
  assert.match(sql, /retention_expires_at'\)::timestamptz[\s\S]{0,100}3650 days 5 minutes/);
  assert.match(sql, /Checkout configuration does not match the approved review revision/);
  assert.match(sql, /Specialist review requires photographic evidence/);
  assert.match(sql, /p_expected_latest_revision_id uuid/);
  assert.match(sql, /alter table curtainsuk_private\.staging_configuration_snapshots force row level security/);
  assert.match(sql, /staging_configuration_snapshots_append_only/);
  assert.match(sql, /payment_enabled boolean not null default false check \(payment_enabled = false\)/);
  assert.match(sql, /from public, anon, authenticated, service_role/);
  assert.doesNotMatch(sql, /grant select, insert, update on curtainsuk_private\.staging_review_evidence/);
});
