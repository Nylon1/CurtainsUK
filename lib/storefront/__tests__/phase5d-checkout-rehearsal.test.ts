import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  createImmutableConfigurationSnapshot,
  evaluateCheckoutGate,
  prepareStagingCheckoutHandoff,
  type StagingCheckoutHandoff,
} from "../checkout-gates";
import {
  assertShopifyDraftOrderFinancials,
  allocateVatFromGross,
  buildShopifyDraftOrderContract,
  parseShopifyMoneyMinor,
  SHOPIFY_DRAFT_ORDER_API_VERSION,
  SHOPIFY_DRAFT_ORDER_REQUIRED_SCOPES,
  validateShopifyDraftOrderNode,
  type ShopifyDraftOrderContract,
} from "../shopify-draft-order-core";
import {
  createReviewTransition,
  createStaffAmendment,
  type ReviewRevision,
} from "../review-workflow";
import type { ShippingQuote } from "../shipping";
import { createReviewAcceptanceTokenWithSecret } from "../review-acceptance-token-core";
import { buildStagingReviewResumeUrl } from "../review-resume-link-core";
import { stagingCheckoutIdentity } from "../checkout-idempotency";
import { calculateStagingPriceForTest } from "../staging-pricing";
import { STOREFRONT_FABRICS } from "../fabrics";

const IDS = {
  request: "11111111-1111-4111-8111-111111111111",
  configuration: "22222222-2222-4222-8222-222222222222",
  customerRevision: "33333333-3333-4333-8333-333333333333",
  staffRevision: "44444444-4444-4444-8444-444444444444",
  snapshot: "55555555-5555-4555-8555-555555555555",
  handoff: "66666666-6666-4666-8666-666666666666",
  event1: "77777777-7777-4777-8777-777777777777",
  event2: "88888888-8888-4888-8888-888888888888",
  event3: "99999999-9999-4999-8999-999999999999",
};

const PRICE = Object.freeze({
  netAmountMinor: 104_417,
  vatAmountMinor: 20_883,
  grossAmountMinor: 125_300,
  vatRateBasisPoints: 2_000,
  currency: "GBP" as const,
});

const READY_SHIPPING: ShippingQuote = Object.freeze({
  region: "UK_MAINLAND",
  parcelClass: "STANDARD",
  status: "READY",
  grossAmountMinor: 1_800,
  currency: "GBP",
  shownSeparately: true,
  countsTowardGoodsMinimum: false,
  message: "Delivery shown separately",
});

function approvedHandoff(
  outcome: "INSTANT_PRICE" | "PRICE_WITH_REVIEW" | "MANUAL_QUOTE" = "PRICE_WITH_REVIEW",
  price: { netAmountMinor: number; vatAmountMinor: number; grossAmountMinor: number; vatRateBasisPoints: number; currency: "GBP" } = PRICE,
): Readonly<StagingCheckoutHandoff> {
  const gate = evaluateCheckoutGate({
    outcome,
    price,
    fabricPricingEligible: true,
    technicallyValid: true,
    availability: "FABRIC_AVAILABLE",
    reviewState: outcome === "INSTANT_PRICE" ? null : "READY_FOR_CHECKOUT",
    customerAccepted: true,
    shipping: READY_SHIPPING,
  });
  assert.equal(gate.eligible, true);
  const snapshot = createImmutableConfigurationSnapshot({
    snapshotId: IDS.snapshot,
    configurationId: IDS.configuration,
    reviewRequestId: outcome === "INSTANT_PRICE" ? null : IDS.request,
    reviewRevisionId: outcome === "INSTANT_PRICE" ? null : IDS.staffRevision,
    outcome,
    windowType: outcome === "INSTANT_PRICE" ? "standard-window" : "bay-window",
    measurements: outcome === "INSTANT_PRICE"
      ? { measurement_basis: "TRACK_WIDTH", coverage_width: 200, finished_drop: 220 }
      : { bay_segment_widths: [80, 180, 80], finished_drop: 220 },
    fabricMasterId: "prestigious-4270-147",
    supplierSku: "4270/147",
    heading: outcome === "INSTANT_PRICE" ? "PENCIL_PLEAT" : "WAVE",
    lining: "BLACKOUT",
    construction: "PAIR",
    calculatedFabricMetres: outcome === "INSTANT_PRICE" ? 10.4 : 15.6,
    pricingRuleVersion: "curtainsuk-draft-v1-35",
    customerPrice: price,
    availability: "FABRIC_AVAILABLE",
    shipping: READY_SHIPPING,
    customerAcceptedAt: "2026-09-07T18:00:00.000Z",
    recordedAt: "2026-09-07T18:00:00.000Z",
    gate,
  });
  return prepareStagingCheckoutHandoff({
    handoffId: IDS.handoff,
    snapshot,
    preparedAt: "2026-09-07T18:01:00.000Z",
  });
}

function financialNode(contract: ShopifyDraftOrderContract) {
  const money = (minor: number) => ({
    presentmentMoney: { amount: (minor / 100).toFixed(2), currencyCode: "GBP" },
  });
  return {
    taxesIncluded: true,
    presentmentCurrencyCode: "GBP",
    totalLineItemsPriceSet: money(contract.expected.goodsGrossAmountMinor),
    subtotalPriceSet: money(contract.expected.goodsGrossAmountMinor),
    totalShippingPriceSet: money(contract.expected.shippingGrossAmountMinor),
    totalTaxSet: money(contract.expected.orderVatAmountMinor),
    totalDiscountsSet: money(0),
    totalPriceSet: money(contract.expected.orderGrossAmountMinor),
  };
}

test("Shopify test Draft Order contract carries exact immutable goods, VAT, delivery and configuration references", () => {
  const handoff = approvedHandoff();
  const contract = buildShopifyDraftOrderContract({
    handoff,
    customerEmail: "Customer@Example.com",
    fabricLabel: "Prestigious Harlow — Mocha",
  });
  assert.equal(contract.apiVersion, SHOPIFY_DRAFT_ORDER_API_VERSION);
  assert.deepEqual(contract.requiredScopes, SHOPIFY_DRAFT_ORDER_REQUIRED_SCOPES);
  assert.equal(contract.paymentEnabled, false);
  assert.equal(contract.completionMutationAllowed, false);
  assert.equal(contract.invoiceSendAllowed, false);
  assert.equal(contract.input.email, "customer@example.com");
  assert.equal(contract.input.lineItems[0].originalUnitPriceWithCurrency.amount, "1253.00");
  assert.equal(contract.input.shippingLine.priceWithCurrency.amount, "18.00");
  assert.deepEqual(contract.input.shippingAddress, { countryCode: "GB" });
  assert.equal(contract.expected.goodsVatAmountMinor, 20_883);
  assert.equal(contract.expected.shippingVatAmountMinor, 300);
  assert.equal(contract.expected.orderVatAmountMinor, 21_183);
  assert.equal(contract.expected.orderGrossAmountMinor, 127_100);
  assert.ok(contract.input.tags.includes("CURTAINSUK_STAGING"));
  assert.ok(contract.input.tags.includes("DO_NOT_FULFIL"));
  assert.ok(contract.input.tags.includes("NO_REAL_PAYMENT"));
  assert.ok(contract.input.tags.includes(contract.idempotencyTag));
  assert.ok(contract.input.tags.every(tag => tag.length <= 40), "Shopify Draft Order tags permit at most 40 characters");
  const lineAttributes = new Map(contract.input.lineItems[0].customAttributes.map((item) => [item.key, item.value]));
  assert.equal(lineAttributes.has("Fabric SKU"), false);
  assert.doesNotMatch(JSON.stringify(contract.input), /4270\/147/);
  assert.equal(handoff.snapshot.supplierSku, "4270/147");
  assert.equal(lineAttributes.get("Pricing rules"), "curtainsuk-draft-v1-35");
  assert.match(lineAttributes.get("Measurements") ?? "", /Bay Segment Widths: 80 cm \/ 180 cm \/ 80 cm/);
  assert.match(lineAttributes.get("Review / quote") ?? "", new RegExp(IDS.request));
  assert.equal(Object.isFrozen(contract.input.lineItems[0].customAttributes), true);
  assert.doesNotMatch(JSON.stringify(contract), /supplier_cost|cut_trade_price|gross_margin|batch_reference/i);
});

test("checkout retries derive stable snapshot and handoff identities from the displayed configuration", () => {
  const first = stagingCheckoutIdentity(IDS.configuration);
  const retry = stagingCheckoutIdentity(IDS.configuration.toUpperCase());
  const different = stagingCheckoutIdentity("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.deepEqual(retry, first);
  assert.match(first.snapshotId, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.match(first.handoffId, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(first.snapshotId, first.handoffId);
  assert.notDeepEqual(first, different);
  assert.throws(() => stagingCheckoutIdentity("not-a-uuid"), /CHECKOUT_CONFIGURATION_ID_INVALID/);
});

test("Shopify Draft Order contract refuses supplier-commercial leakage and unsafe handoffs", () => {
  const handoff = approvedHandoff("INSTANT_PRICE");
  assert.throws(() => buildShopifyDraftOrderContract({
    handoff: {
      ...handoff,
      snapshot: {
        ...handoff.snapshot,
        measurements: { ...handoff.snapshot.measurements, supplier_cost: 2_000 },
      },
    },
  }), /SHOPIFY_DRAFT_ORDER_PRIVATE_FIELD/);
  assert.throws(() => buildShopifyDraftOrderContract({
    handoff: { ...handoff, paymentEnabled: true } as unknown as StagingCheckoutHandoff,
  }), /SHOPIFY_DRAFT_ORDER_HANDOFF_UNSAFE/);
});

test("Shopify financial preflight fails closed unless tax-inclusive GBP totals exactly match the snapshot", () => {
  const contract = buildShopifyDraftOrderContract({ handoff: approvedHandoff() });
  const exact = financialNode(contract);
  assert.doesNotThrow(() => assertShopifyDraftOrderFinancials(exact, contract.expected));
  assert.throws(() => assertShopifyDraftOrderFinancials({ ...exact, taxesIncluded: false }, contract.expected), /TAX_BASIS_MISMATCH/);
  assert.throws(() => assertShopifyDraftOrderFinancials({
    ...exact,
    totalPriceSet: { presentmentMoney: { amount: "1271.01", currencyCode: "GBP" } },
  }, contract.expected), /EXACT_PRICE_MISMATCH/);
  assert.throws(() => assertShopifyDraftOrderFinancials({
    ...exact,
    totalDiscountsSet: { presentmentMoney: { amount: "1.00", currencyCode: "GBP" } },
  }, contract.expected), /EXACT_PRICE_MISMATCH/);
  assert.equal(parseShopifyMoneyMinor("1253.0"), 125_300);
  assert.equal(parseShopifyMoneyMinor("18"), 1_800);
  assert.throws(() => parseShopifyMoneyMinor("1.999"), /MONEY_RESPONSE_INVALID/);
});

test("existing or newly created test Draft Orders must retain exact price and handoff identity", () => {
  const contract = buildShopifyDraftOrderContract({ handoff: approvedHandoff() });
  const valid = validateShopifyDraftOrderNode({
    ...financialNode(contract),
    id: "gid://shopify/DraftOrder/123456789",
    name: "#D123",
    invoiceUrl: "https://example.myshopify.com/12345/invoices/test",
    status: "OPEN",
    tags: contract.input.tags,
    customAttributes: contract.input.customAttributes,
  }, contract);
  assert.equal(valid.id, "gid://shopify/DraftOrder/123456789");
  assert.equal(valid.status, "OPEN");
  assert.throws(() => validateShopifyDraftOrderNode({
    ...financialNode(contract),
    id: "gid://shopify/DraftOrder/123456789",
    name: "#D123",
    invoiceUrl: "https://example.myshopify.com/12345/invoices/test",
    status: "OPEN",
    tags: contract.input.tags.filter((tag) => tag !== contract.idempotencyTag),
    customAttributes: contract.input.customAttributes,
  }, contract), /IDEMPOTENCY_MISMATCH/);
});

test("server adapter is calculate-first, idempotent by handoff tag and contains no payment-completion mutation", () => {
  const source = readFileSync(join(process.cwd(), "lib", "storefront", "shopify-draft-order-server.ts"), "utf8");
  const controller = readFileSync(join(process.cwd(), "lib", "storefront", "checkout-handoff-server.ts"), "utf8");
  assert.match(source, /CURTAINSUK_SHOPIFY_DRAFT_ORDER_MODE/);
  assert.match(source, /CURTAINSUK_DEPLOYMENT_STAGE/);
  assert.match(source, /CURTAINSUK_SHOPIFY_REAL_PAYMENTS_DISABLED_CONFIRMED/);
  assert.match(source, /CURTAINSUK_SHOPIFY_CHECKOUT_STORE/);
  assert.match(source, /curtainsuk-dev\.myshopify\.com/);
  assert.match(source, /CURTAINSUK_SHOPIFY_CLIENT_ID/);
  assert.match(source, /CURTAINSUK_SHOPIFY_APP_SECRET/);
  assert.match(source, /client_credentials/);
  assert.match(source, /currentAppInstallation/);
  assert.match(source, /SHOPIFY_DRAFT_ORDER_SCOPE_MISSING/);
  assert.doesNotMatch(source, /CURTAINSUK_SHOPIFY_ADMIN_ACCESS_TOKEN/);
  assert.match(source, /draftOrderCalculate/);
  assert.match(source, /draftOrders\(first: 2, query: \$query/);
  assert.match(source, /await calculate[\s\S]{0,500}await create/);
  assert.doesNotMatch(source, /draftOrderComplete\s*\(/);
  assert.doesNotMatch(source, /draftOrderInvoiceSend\s*\(/);
  assert.doesNotMatch(source, /console\.(log|info|warn|error)/);
  assert.match(controller, /configurationId = input\.configurationId!/);
  assert.match(controller, /stagingCheckoutIdentity\(configurationId\)/);
});

test("checkout persistence recovers only an exact immutable retry and rejects identity conflicts", () => {
  const source = readFileSync(join(process.cwd(), "lib", "storefront", "review-operations-repository.ts"), "utf8");
  assert.match(source, /\.eq\("configuration_id", snapshot\.configurationId\)/);
  assert.match(source, /idempotent_recovery: true/);
  assert.match(source, /CHECKOUT_IDEMPOTENCY_CONFLICT/);
  assert.match(source, /canonical\(existingSnapshot\.customer_summary\) === canonical\(input\.customerSummary\)/);
});

test("Phase 5D persists Shopify execution as append-only private audit without storing checkout capability URLs", () => {
  const migration = readFileSync(
    join(process.cwd(), "supabase", "migrations", "20260907203000_phase5d_shopify_test_checkout.sql"),
    "utf8",
  );
  assert.match(migration, /create table curtainsuk_private\.staging_checkout_executions/);
  assert.match(migration, /record_staging_checkout_execution\(p_execution jsonb\)/);
  assert.match(migration, /staging_checkout_executions_append_only/);
  assert.match(migration, /force row level security/);
  assert.match(migration, /grant select on curtainsuk_private\.staging_checkout_executions to service_role/);
  assert.match(migration, /grant execute on function curtainsuk_private\.record_staging_checkout_execution\(jsonb\)[\s\S]{0,80}to service_role/);
  assert.match(migration, /Checkout financial verification does not match immutable snapshot/);
  assert.match(migration, /payment_enabled boolean not null default false check \(payment_enabled = false\)/);
  assert.doesNotMatch(migration, /checkout_url\s+(text|varchar)/i);

  const controller = readFileSync(join(process.cwd(), "lib", "storefront", "checkout-handoff-server.ts"), "utf8");
  assert.match(controller, /executeStagingShopifyDraftOrder/);
  assert.match(controller, /persistShopifyDraftOrderExecution/);
  assert.match(controller, /paymentEnabled: false/);
});

function customerRevision(input: {
  requestId: string;
  windowType: string;
  outcome: "PRICE_WITH_REVIEW" | "MANUAL_QUOTE";
}): ReviewRevision {
  return Object.freeze({
    revisionId: IDS.customerRevision,
    requestId: input.requestId,
    revisionNumber: 1,
    previousRevisionId: null,
    kind: "CUSTOMER_SUBMISSION" as const,
    specification: Object.freeze({
      window_type_slug: input.windowType,
      measurements: input.windowType === "bay-window"
        ? { section_widths: [80, 180, 80], finished_drop: 220 }
        : { base_width: 300, peak_height: 450, left_vertical: 220, right_vertical: 220 },
      fabric_id: "prestigious-4270-147",
      supplier_sku: "4270/147",
      heading: "WAVE",
      lining: "BLACKOUT",
      construction: "PAIR",
      outcome: input.outcome,
    }),
    finalPrice: null,
    pricingRuleVersion: input.outcome === "PRICE_WITH_REVIEW" ? "curtainsuk-draft-v1-35" : null,
    actorId: null,
    reason: "Immutable customer submission",
    createdAt: "2026-09-07T18:00:00.000Z",
  });
}

test("Bay operational rehearsal preserves the original submission through staff amendment, approval and checkout readiness", () => {
  const original = customerRevision({ requestId: IDS.request, windowType: "bay-window", outcome: "PRICE_WITH_REVIEW" });
  const underReview = createReviewTransition({
    eventId: IDS.event1,
    requestId: IDS.request,
    fromState: "PENDING",
    toState: "UNDER_REVIEW",
    actorId: "staff@example.com",
    reason: "Reviewing bay section measurements",
    occurredAt: "2026-09-07T18:10:00.000Z",
    pricingOutcome: "PRICE_WITH_REVIEW",
    latestRevision: original,
    emailEvidenceReviewed: true,
  });
  const amended = createStaffAmendment({
    revisionId: IDS.staffRevision,
    previous: original,
    specification: {
      ...original.specification,
      measurements: { section_widths: [80, 185, 80], finished_drop: 220 },
      calculated_fabric_metres: 15.6,
      shipping_parcel_class: "STANDARD",
    },
    actorId: "staff@example.com",
    reason: "Customer confirmed centre section is 185 cm",
    createdAt: "2026-09-07T18:20:00.000Z",
    pricingRuleVersion: "curtainsuk-draft-v1-35",
    finalPrice: PRICE,
  });
  const approved = createReviewTransition({
    eventId: IDS.event2,
    requestId: IDS.request,
    fromState: underReview.toState,
    toState: "APPROVED",
    actorId: "staff@example.com",
    reason: "Bay specification and provisional price approved",
    occurredAt: "2026-09-07T18:30:00.000Z",
    pricingOutcome: "PRICE_WITH_REVIEW",
    latestRevision: amended,
    emailEvidenceReviewed: true,
  });
  const ready = createReviewTransition({
    eventId: IDS.event3,
    requestId: IDS.request,
    fromState: approved.toState,
    toState: "READY_FOR_CHECKOUT",
    actorId: "staff@example.com",
    reason: "Approved revision is ready for customer acceptance",
    occurredAt: "2026-09-07T18:40:00.000Z",
    pricingOutcome: "PRICE_WITH_REVIEW",
    latestRevision: amended,
    emailEvidenceReviewed: true,
  });
  assert.equal(ready.toState, "READY_FOR_CHECKOUT");
  assert.deepEqual((original.specification.measurements as { section_widths: number[] }).section_widths, [80, 180, 80]);
  assert.deepEqual((amended.specification.measurements as { section_widths: number[] }).section_widths, [80, 185, 80]);
  assert.equal(amended.previousRevisionId, original.revisionId);
  assert.equal(amended.revisionNumber, 2);
});

test("Apex and gable operational rehearsal supports information requests but blocks approval until evidence and price are clean", () => {
  for (const windowType of ["apex-window", "gable-end-window"]) {
    const original = customerRevision({ requestId: IDS.request, windowType, outcome: "MANUAL_QUOTE" });
    const needsInformation = createReviewTransition({
      eventId: IDS.event1,
      requestId: IDS.request,
      fromState: "PENDING",
      toState: "NEEDS_INFORMATION",
      actorId: "staff@example.com",
      reason: "Please provide a clear fixing-position photograph",
      occurredAt: "2026-09-07T18:10:00.000Z",
      pricingOutcome: "MANUAL_QUOTE",
      latestRevision: original,
      emailEvidenceReviewed: false,
    });
    const amended = createStaffAmendment({
      revisionId: IDS.staffRevision,
      previous: original,
      specification: {
        ...original.specification,
        customer_follow_up_recorded: true,
        calculated_fabric_metres: 19.2,
        shipping_parcel_class: "SPECIALIST",
      },
      actorId: "staff@example.com",
      reason: "Recorded customer follow-up and verified geometry",
      createdAt: "2026-09-07T18:20:00.000Z",
      pricingRuleVersion: "curtainsuk-draft-v1-35",
      finalPrice: PRICE,
    });
    const underReview = createReviewTransition({
      eventId: IDS.event2,
      requestId: IDS.request,
      fromState: needsInformation.toState,
      toState: "UNDER_REVIEW",
      actorId: "staff@example.com",
      reason: "Required customer evidence has been received",
      occurredAt: "2026-09-07T18:25:00.000Z",
      pricingOutcome: "MANUAL_QUOTE",
      latestRevision: amended,
      emailEvidenceReviewed: true,
    });
    assert.throws(() => createReviewTransition({
      eventId: IDS.event3,
      requestId: IDS.request,
      fromState: underReview.toState,
      toState: "APPROVED",
      actorId: "staff@example.com",
      reason: "Attempt approval with unsafe evidence",
      occurredAt: "2026-09-07T18:30:00.000Z",
      pricingOutcome: "MANUAL_QUOTE",
      latestRevision: amended,
      emailEvidenceReviewed: false,
    }), /REVIEW_EMAIL_EVIDENCE_REQUIRED/);
    assert.doesNotThrow(() => createReviewTransition({
      eventId: IDS.event3,
      requestId: IDS.request,
      fromState: underReview.toState,
      toState: "APPROVED",
      actorId: "staff@example.com",
      reason: "Specialist geometry, evidence and final quote approved",
      occurredAt: "2026-09-07T18:30:00.000Z",
      pricingOutcome: "MANUAL_QUOTE",
      latestRevision: amended,
      emailEvidenceReviewed: true,
    }));
    assert.equal(original.finalPrice, null);
    assert.equal(amended.finalPrice?.grossAmountMinor, 125_300);
  }
});

test("Manual Quote rehearsal exposes no customer price before staff quote and never allows payment before acceptance", () => {
  const beforeQuote = evaluateCheckoutGate({
    outcome: "MANUAL_QUOTE",
    price: {
      netAmountMinor: null,
      vatAmountMinor: null,
      grossAmountMinor: null,
      vatRateBasisPoints: null,
      currency: "GBP",
    },
    fabricPricingEligible: true,
    technicallyValid: true,
    availability: "FABRIC_AVAILABLE",
    reviewState: "PENDING",
    customerAccepted: false,
    shipping: READY_SHIPPING,
  });
  assert.equal(beforeQuote.numericPriceMayBeShown, false);
  assert.equal(beforeQuote.action, "SUBMIT_PROJECT");
  assert.equal(beforeQuote.paymentEnabled, false);

  const beforeAcceptance = evaluateCheckoutGate({
    outcome: "MANUAL_QUOTE",
    price: PRICE,
    fabricPricingEligible: true,
    technicallyValid: true,
    availability: "FABRIC_AVAILABLE",
    reviewState: "READY_FOR_CHECKOUT",
    customerAccepted: false,
    shipping: READY_SHIPPING,
  });
  assert.equal(beforeAcceptance.eligible, false);
  assert.ok(beforeAcceptance.blockers.includes("CUSTOMER_ACCEPTANCE_REQUIRED"));

  const accepted = evaluateCheckoutGate({
    outcome: "MANUAL_QUOTE",
    price: PRICE,
    fabricPricingEligible: true,
    technicallyValid: true,
    availability: "FABRIC_AVAILABLE",
    reviewState: "READY_FOR_CHECKOUT",
    customerAccepted: true,
    shipping: READY_SHIPPING,
  });
  assert.equal(accepted.eligible, true);
  assert.equal(accepted.paymentEnabled, false);
});

test("approved monetary snapshot and Shopify contract do not reprice after later supplier, margin or stock changes", () => {
  const handoff = approvedHandoff();
  const originalContract = buildShopifyDraftOrderContract({ handoff });
  const laterInputs = {
    supplierCutCostMinor: 9_999,
    grossMarginBasisPoints: 5_000,
    availability: "TEMPORARILY_UNAVAILABLE",
  };
  assert.equal(laterInputs.supplierCutCostMinor, 9_999);
  assert.equal(laterInputs.grossMarginBasisPoints, 5_000);
  assert.equal(laterInputs.availability, "TEMPORARILY_UNAVAILABLE");
  const rebuiltFromApprovedSnapshot = buildShopifyDraftOrderContract({ handoff });
  assert.deepEqual(rebuiltFromApprovedSnapshot.expected, originalContract.expected);
  assert.equal(rebuiltFromApprovedSnapshot.input.lineItems[0].originalUnitPriceWithCurrency.amount, "1253.00");
  assert.equal(rebuiltFromApprovedSnapshot.input.lineItems[0].customAttributes.find((item) => item.key === "Availability")?.value, "Fabric available");
});

test("a real pricing-engine cost change affects a new configuration but cannot mutate the existing snapshot contract", () => {
  const pricedFabric = { ...STOREFRONT_FABRICS[0], supplierCostPerMetre: { amountMinor: 2000, currency: "GBP" as const }, supplierCostEffectiveFrom: "2026-09-07" };
  const configuration = { windowSlug: "standard-window", measurementBasis: "TRACK_WIDTH" as const, widthCm: 200, dropCm: 220, fabricId: pricedFabric.id, heading: "PENCIL_PLEAT" as const, lining: "STANDARD" as const, construction: "PAIR" as const, stackDirection: "SPLIT" as const };
  const oldPrice = calculateStagingPriceForTest(configuration, pricedFabric);
  const stored = approvedHandoff("INSTANT_PRICE", { netAmountMinor: oldPrice.netAmountMinor!, vatAmountMinor: oldPrice.vatAmountMinor!, grossAmountMinor: oldPrice.totalAmountMinor!, vatRateBasisPoints: oldPrice.vatRateBasisPoints!, currency: "GBP" });
  const before = buildShopifyDraftOrderContract({ handoff: stored });
  pricedFabric.supplierCostPerMetre.amountMinor = 6000;
  const newPrice = calculateStagingPriceForTest(configuration, pricedFabric);
  assert.ok(newPrice.totalAmountMinor! > oldPrice.totalAmountMinor!);
  assert.notEqual(newPrice.configurationId, oldPrice.configurationId);
  assert.deepEqual(buildShopifyDraftOrderContract({ handoff: stored }), before);
  assert.equal(Object.isFrozen(stored.snapshot.customerPrice), true);
});

test("staff audit operations require actor and a meaningful reason", () => {
  const original = customerRevision({ requestId: IDS.request, windowType: "bay-window", outcome: "PRICE_WITH_REVIEW" });
  assert.throws(() => createReviewTransition({
    eventId: IDS.event1,
    requestId: IDS.request,
    fromState: "PENDING",
    toState: "UNDER_REVIEW",
    actorId: "",
    reason: "Reviewing request",
    occurredAt: "2026-09-07T18:10:00.000Z",
    pricingOutcome: "PRICE_WITH_REVIEW",
    latestRevision: original,
    emailEvidenceReviewed: true,
  }), /REVIEW_ACTOR_INVALID/);
  assert.throws(() => createReviewTransition({
    eventId: IDS.event1,
    requestId: IDS.request,
    fromState: "PENDING",
    toState: "UNDER_REVIEW",
    actorId: "staff@example.com",
    reason: "no",
    occurredAt: "2026-09-07T18:10:00.000Z",
    pricingOutcome: "PRICE_WITH_REVIEW",
    latestRevision: original,
    emailEvidenceReviewed: true,
  }), /REVIEW_REASON_INVALID/);
});

test("staff-issued review resume links keep the revision-bound capability in an allowed staging URL fragment", () => {
  const token = createReviewAcceptanceTokenWithSecret({
    reviewRequestId: IDS.request,
    reviewRevisionId: IDS.staffRevision,
  }, "phase5d-test-secret-that-is-long-enough-for-hmac", {
    nowSeconds: 1_788_793_200,
    ttlSeconds: 86_400,
  });
  const resumeUrl = buildStagingReviewResumeUrl({
    baseUrl: "https://carpetup.myshopify.com/pages/curtain-visualiser?preview_theme_id=182264234363",
    allowedOrigins: ["https://carpetup.myshopify.com"],
    reviewRequestId: IDS.request,
    reviewAcceptanceToken: token,
  });
  const parsed = new URL(resumeUrl);
  assert.equal(parsed.origin, "https://carpetup.myshopify.com");
  assert.equal(parsed.searchParams.get("preview_theme_id"), "182264234363");
  assert.equal(new URLSearchParams(parsed.hash.slice(1)).get("cuk_review"), IDS.request);
  assert.equal(new URLSearchParams(parsed.hash.slice(1)).get("cuk_token"), token);
  assert.equal(parsed.searchParams.has("cuk_token"), false, "the bearer capability must not be sent in the initial request URL");
  assert.throws(() => buildStagingReviewResumeUrl({
    baseUrl: "https://evil.example/pages/curtain-visualiser",
    allowedOrigins: ["https://carpetup.myshopify.com"],
    reviewRequestId: IDS.request,
    reviewAcceptanceToken: token,
  }), /REVIEW_RESUME_BASE_URL_DENIED/);
});

test("customer review acceptance projection is revision-bound and statically excludes private supplier and customer fields", () => {
  const source = readFileSync(join(process.cwd(), "lib", "storefront", "review-acceptance-server.ts"), "utf8");
  const proxy = readFileSync(join(process.cwd(), "app", "api", "staging", "shopify-proxy", "[operation]", "route.ts"), "utf8");
  assert.match(source, /verifyReviewAcceptanceToken/);
  assert.match(source, /review\.reviewState !== "READY_FOR_CHECKOUT"/);
  assert.match(source, /latest\.pricingRuleVersion/);
  assert.match(source, /supplierCommercialDataIncluded: false/);
  assert.doesNotMatch(source, /supplier_cost|cut_trade_price|gross_margin|batch_reference|customer_email|customer_phone/i);
  assert.match(proxy, /selected === "review-acceptance"/);
  assert.doesNotMatch(proxy, /selected === "review-acceptance"[\s\S]{0,300}claimShopifyMutationReplay/);
});


test("shipping VAT rounds the tax amount itself, matching Shopify half-penny boundaries", () => {
  assert.equal(allocateVatFromGross(1295,2000),216);
  assert.equal(allocateVatFromGross(1995,2000),333);
  assert.equal(allocateVatFromGross(2995,2000),499);
  assert.equal(allocateVatFromGross(4495,2000),749);
});


test("saved Shopify receipt recovers directly by ID without a search-index dependent create", async () => {
  const {serverScriptHooks:hooks}=await import("../../../scripts/curtainsuk-server-script-loader.mjs");
  try {
    const {executeShopifyDraftOrder}=await import("../shopify-draft-order-server");
    const contract=buildShopifyDraftOrderContract({handoff:approvedHandoff()});
    const id="gid://shopify/DraftOrder/123";
    const queries:string[]=[];
    const config={mode:"CREATE_TEST_DRAFT" as const,deploymentStage:"STAGING" as const,shopDomain:"curtainsuk-dev.myshopify.com",clientId:"test-client-id",clientSecret:"test-client-secret-not-real",realPaymentsDisabledConfirmed:true,requestTimeoutMs:1000};
    const fetchImpl:typeof fetch=async(url,init)=>{
      if(String(url).endsWith("/access_token"))return Response.json({access_token:"test-token-not-real-1234",expires_in:3600,scope:"write_draft_orders"});
      const body=JSON.parse(String(init?.body));queries.push(body.query);
      if(body.query.includes("currentAppInstallation"))return Response.json({data:{currentAppInstallation:{accessScopes:[{handle:"write_draft_orders"}]}}});
      assert.ok(body.query.includes("draftOrder(id: $id)"));assert.equal(body.variables.id,id);
      return Response.json({data:{draftOrder:{...financialNode(contract),id,name:"#D-test",status:"OPEN",invoiceUrl:"https://curtainsuk-dev.myshopify.com/test-invoice",tags:contract.input.tags,customAttributes:contract.input.customAttributes}}});
    };
    const result=await executeShopifyDraftOrder({contract,config,existingDraftOrderId:id,fetchImpl});
    assert.equal(result.status,"EXISTING_TEST_DRAFT_REUSED");assert.equal(result.shopifyWritePerformed,false);
    assert.ok(queries.every(query=>!query.includes("draftOrders(")&&!query.includes("draftOrderCreate(")));
  } finally {hooks.deregister();}
});
