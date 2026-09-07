import assert from "node:assert/strict";
import test from "node:test";
import { WINDOW_TYPES_BY_SLUG } from "../../decision-engine/seed/window-types";
import { STOREFRONT_FABRICS } from "../fabrics";
import { calculateStagingPriceForTest, classifySpecialistReview } from "../staging-pricing";
import { stagingApiHeaders, stagingOptions } from "../staging-api";
import { STOREFRONT_WINDOW_TYPES } from "../window-catalog";
import { buildShopifyCatalogPayload } from "../shopify-contract";
import { runPhase4ABayPricingGate } from "../../decision-engine/calibration/phase4a-bay";

test("the storefront exposes the 14 approved window families with unique canonical routes", () => {
  assert.equal(STOREFRONT_WINDOW_TYPES.length, 14);
  assert.equal(new Set(STOREFRONT_WINDOW_TYPES.map((item) => item.slug)).size, 14);
  for (const windowType of STOREFRONT_WINDOW_TYPES) {
    assert.ok(windowType.masterSlugs.length >= 1);
    for (const masterSlug of windowType.masterSlugs) assert.ok(WINDOW_TYPES_BY_SLUG.has(masterSlug), `${masterSlug} must exist in Window Type Master`);
    assert.ok(windowType.faqs.length >= 3);
  }
});

test("20 real Prestigious pilot fabrics are feed blocked and commercially separated", () => {
  assert.equal(STOREFRONT_FABRICS.length, 20);
  for (const fabric of STOREFRONT_FABRICS) {
    assert.equal(fabric.fixtureOnly, false);
    assert.equal(fabric.googleFeedEligibility.eligible, false);
    assert.equal(fabric.recordLifecycle, "ACTIVE");
    assert.equal(fabric.supplierCostPerMetre, null);
  }
});

test("the Shopify catalogue payload contains 14 routes and no commercial cost data", () => {
  const payload = buildShopifyCatalogPayload();
  const serialised = JSON.stringify(payload);
  assert.equal(payload.windows.length, 14);
  assert.equal(new Set(payload.windows.map((item) => item.route)).size, 14);
  assert.equal(payload.checkoutEnabled, false);
  assert.ok(payload.fabrics.every((item) => !item.stagingFixture && !item.feedEligible));
  assert.equal(/supplierCost|sellingRate|grossMargin|makeup/i.test(serialised), false);
});

test("a normal standard curtain receives a server-authoritative instant price", () => {
  const fabric = { ...STOREFRONT_FABRICS[0], supplierCostPerMetre: { amountMinor: 2_000, currency: "GBP" as const }, supplierCostEffectiveFrom: "2026-09-07" };
  const result = calculateStagingPriceForTest({
    windowSlug: "standard-window",
    measurementBasis: "TRACK_WIDTH",
    widthCm: 200,
    dropCm: 220,
    fabricId: "pt-4269-147",
    heading: "PENCIL_PLEAT",
    lining: "STANDARD",
    construction: "PAIR",
    stackDirection: "SPLIT",
  }, fabric);
  assert.equal(result.outcome, "INSTANT_PRICE");
  assert.ok(result.totalAmountMinor > 0);
  assert.equal(result.totalAmountMinor % 100, 0, "customer total should round to a whole pound");
  assert.ok(result.fabricWidths >= 2);
  assert.ok(!Object.hasOwn(result, "directCostNet"), "public response must not expose internal cost");
});

test("a real Dali bay is priced with review at the unchanged 35% rule", () => {
  const fabric = { ...STOREFRONT_FABRICS.find((item) => item.id === "pt-4270-147")!, supplierCostPerMetre: { amountMinor: 2_000, currency: "GBP" as const }, supplierCostEffectiveFrom: "2026-09-07" };
  const result = calculateStagingPriceForTest({
    windowSlug: "bay-window",
    measurementBasis: "TRACK_WIDTH",
    widthCm: 340,
    dropCm: 220,
    baySegmentWidthsCm: [80, 180, 80],
    bayAnglesDegrees: [135, 135],
    fabricId: "pt-4270-147",
    heading: "WAVE",
    lining: "BLACKOUT",
    construction: "PAIR",
    stackDirection: "SPLIT",
    photoNames: ["bay-room.jpg"],
  }, fabric);
  assert.equal(result.outcome, "PRICE_WITH_REVIEW");
  assert.equal(result.technicalReviewRequired, true);
  assert.equal(result.fabricWidths, 6);
  assert.ok(result.fabricMetres > 0);
  assert.ok(result.totalAmountMinor > 0);
  assert.ok(!Object.hasOwn(result, "directCostNet"), "public response must not expose internal cost");
});

test("the Phase 4A Bay gate preserves the auditable component breakdown", () => {
  const result = runPhase4ABayPricingGate();
  assert.deepEqual({ ...result, headingAdjustmentNetMinor: 1_500, vatMinor: 19_273.846153846156 }, {
    calculationVersion: "2.2.0-draft.1",
    enteredWidthCm: 340,
    centreOverlapCm: 5,
    effectiveWidthCm: 345,
    fullness: 2,
    fabricWidths: 6,
    cutLengthCm: 255,
    repeatAdjustedCutLengthCm: 256,
    fabricMetres: 15.4,
    supplierFabricRateNetPerMetreMinor: 2_400,
    faceFabricCostNetMinor: 36_960,
    liningMetres: 15.3,
    liningCostNetMinor: 9_180,
    makeupCostNetMinor: 15_000,
    headingAdjustmentNetMinor: 1_500,
    packagingCostNetMinor: 0,
    directCostNetMinor: 62_640,
    netSellingPriceMinor: 96_369.23076923077,
    vatMinor: 19_273.846153846156,
    grossBeforeRoundingMinor: 115_643.07692307692,
    finalPriceMinor: 115_600,
    grossMarginPercent: 35,
    automaticComplexitySurchargesEnabled: false,
  });
  assert.ok(Math.abs(Number(result.headingAdjustmentNetMinor) - 1_500) < 0.001);
  assert.ok(Math.abs(result.vatMinor - 19_273.846153846156) < 0.001);
});

test("specialist apex geometry blocks payment and manufacture", () => {
  const result = classifySpecialistReview({
    windowSlug: "apex-window",
    measurements: { coverage_width: 300, peak_height: 300, left_vertical: 200, right_vertical: 200, left_slope: 180.28, right_slope: 180.28 },
    fabricId: "pt-4269-147",
    heading: "PENCIL_PLEAT",
    lining: "STANDARD",
    fixingPosition: "Wall fixed above glazing",
    stackDirection: "SPLIT",
    photoNames: ["apex-room.jpg"],
  });
  assert.equal(result.outcome, "PRICE_WITH_REVIEW");
  assert.equal(result.paymentState, "BLOCKED");
  assert.equal(result.productionState, "BLOCKED");
  assert.equal(result.message, "Price subject to technical review");
});

test("inconsistent apex geometry is routed to manual quote at low confidence", () => {
  const result = classifySpecialistReview({
    windowSlug: "apex-window",
    measurements: { coverage_width: 300, peak_height: 220, left_vertical: 200, right_vertical: 160, left_slope: 100, right_slope: 100 },
    fabricId: "pt-4269-147",
    heading: "PENCIL_PLEAT",
    lining: "STANDARD",
    fixingPosition: "Unknown",
    stackDirection: "SPLIT",
    photoNames: ["apex-room.jpg"],
  });
  assert.equal(result.outcome, "MANUAL_QUOTE");
  assert.equal(result.pricingConfidence, "LOW");
});

test("the staging API permits only the Shopify store origins used by theme previews", () => {
  for (const origin of ["https://carpetup.myshopify.com", "https://www.curtainsuk.com", "https://curtainsuk.com"]) {
    const headers = stagingApiHeaders(new Request("https://staging.example/api", { headers: { origin } }));
    assert.equal(headers["Access-Control-Allow-Origin"], origin);
  }
  const blocked = stagingOptions(new Request("https://staging.example/api", { method: "OPTIONS", headers: { origin: "https://example.invalid" } }));
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get("access-control-allow-origin"), null);
});
