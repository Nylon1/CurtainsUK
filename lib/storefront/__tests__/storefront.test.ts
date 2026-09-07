import assert from "node:assert/strict";
import test from "node:test";
import { WINDOW_TYPES_BY_SLUG } from "../../decision-engine/seed/window-types";
import { STOREFRONT_FABRICS } from "../fabrics";
import { calculateStagingPriceForTest, classifySpecialistReview } from "../staging-pricing";
import { assertAllowedStagingMutation, customerSafeApiError, stagingApiHeaders, stagingOptions } from "../staging-api";
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
  assert.ok(result.totalAmountMinor !== null && result.totalAmountMinor > 0);
  assert.equal(result.totalAmountMinor! % 100, 0, "customer total should round to a whole pound");
  assert.match(result.configurationId, /^[0-9a-f-]{36}$/);
  assert.ok(result.fabricWidths >= 2);
  assert.ok(!Object.hasOwn(result, "directCostNet"), "public response must not expose internal cost");
});

test("a real Dali bay is priced with review at the unchanged 35% rule", () => {
  const fabric = { ...STOREFRONT_FABRICS.find((item) => item.id === "pt-4270-147")!, supplierCostPerMetre: { amountMinor: 2_000, currency: "GBP" as const }, supplierCostEffectiveFrom: "2026-09-07" };
  const result = calculateStagingPriceForTest({
    windowSlug: "bay-window",
    measurementBasis: "TRACK_WIDTH",
    dropCm: 220,
    bayTrackOrPoleFitted: true,
    bayNumberOfSections: 3,
    baySegmentWidthsCm: [80, 180, 80],
    fabricId: "pt-4270-147",
    heading: "WAVE",
    lining: "BLACKOUT",
    construction: "PAIR",
    stackDirection: "SPLIT",
    photoNames: ["bay-room.jpg"],
  }, fabric);
  assert.equal(result.outcome, "PRICE_WITH_REVIEW");
  assert.equal(result.technicalReviewRequired, true);
  assert.equal(result.totalCoverageWidthCm, 340);
  assert.equal(result.bayTrackOrPoleFitted, true);
  assert.equal(result.fabricWidths, 6);
  assert.ok(result.fabricMetres > 0);
  assert.ok(result.totalAmountMinor !== null && result.totalAmountMinor > 0);
  assert.equal(result.message, "Provisional price subject to technical review");
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
    construction: "PAIR",
    fixingPosition: "Wall fixed above glazing",
    stackDirection: "SPLIT",
    photoNames: ["apex-room.jpg"],
  });
  assert.equal(result.outcome, "PRICE_WITH_REVIEW");
  assert.equal(result.paymentState, "BLOCKED");
  assert.equal(result.productionState, "BLOCKED");
  assert.equal(result.message, "Price subject to technical review");
});

test("inconsistent apex geometry is rejected before review routing", () => {
  assert.throws(() => classifySpecialistReview({
    windowSlug: "apex-window",
    measurements: { coverage_width: 300, peak_height: 220, left_vertical: 200, right_vertical: 160, left_slope: 100, right_slope: 100 },
    fabricId: "pt-4269-147",
    heading: "PENCIL_PLEAT",
    lining: "STANDARD",
    construction: "PAIR",
    fixingPosition: "Unknown",
    stackDirection: "SPLIT",
    photoNames: ["apex-room.jpg"],
  }), /incomplete or invalid/);
});

test("manual-quote pricing suppresses every numeric selling amount", () => {
  const fabric = { ...STOREFRONT_FABRICS[0], supplierCostPerMetre: { amountMinor: 2_000, currency: "GBP" as const }, supplierCostEffectiveFrom: "2026-09-07" };
  const result = calculateStagingPriceForTest({
    windowSlug: "standard-window",
    measurementBasis: "TRACK_WIDTH",
    widthCm: 700,
    dropCm: 220,
    fabricId: fabric.id,
    heading: "PENCIL_PLEAT",
    lining: "STANDARD",
    construction: "PAIR",
    stackDirection: "SPLIT",
  }, fabric);

  assert.equal(result.outcome, "MANUAL_QUOTE");
  assert.equal(result.netAmountMinor, null);
  assert.equal(result.vatAmountMinor, null);
  assert.equal(result.totalAmountMinor, null);
  assert.equal(result.message, "Price confirmed after technical review");
  assert.match(result.configurationId, /^[0-9a-f-]{36}$/);
});

test("Bay coverage is derived from section widths and angles are not part of the contract", () => {
  const fabric = { ...STOREFRONT_FABRICS[0], supplierCostPerMetre: { amountMinor: 2_000, currency: "GBP" as const }, supplierCostEffectiveFrom: "2026-09-07" };
  const base = {
    windowSlug: "bay-window",
    measurementBasis: "TRACK_WIDTH" as const,
    widthCm: 999,
    dropCm: 220,
    bayTrackOrPoleFitted: false,
    bayNumberOfSections: 3,
    baySegmentWidthsCm: [80, 180, 80],
    fabricId: fabric.id,
    heading: "WAVE" as const,
    lining: "BLACKOUT" as const,
    construction: "PAIR" as const,
    stackDirection: "SPLIT" as const,
  };
  const result = calculateStagingPriceForTest(base, fabric);
  assert.equal(result.totalCoverageWidthCm, 340);
  assert.equal(result.outcome, "PRICE_WITH_REVIEW");
  assert.notEqual(result.totalAmountMinor, null);
  assert.equal(WINDOW_TYPES_BY_SLUG.get("bay-window")!.requiredMeasurements.some((item) => item.key === "bay_angles_degrees"), false);

  assert.throws(() => calculateStagingPriceForTest({ ...base, bayNumberOfSections: 4 }, fabric), /must match the section count/);
  assert.throws(() => calculateStagingPriceForTest({ ...base, baySegmentWidthsCm: [80, 9.9, 180] }, fabric), /between 10 cm and 600 cm/);
  assert.throws(() => calculateStagingPriceForTest({ ...base, baySegmentWidthsCm: [80, 600.1, 180] }, fabric), /between 10 cm and 600 cm/);
  assert.throws(() => calculateStagingPriceForTest({ ...base, bayTrackOrPoleFitted: undefined }, fabric), /status is required/);
});

test("Bay section-count and per-section launch boundaries are server-authoritative", () => {
  const fabric = { ...STOREFRONT_FABRICS[0], supplierCostPerMetre: { amountMinor: 2_000, currency: "GBP" as const }, supplierCostEffectiveFrom: "2026-09-07" };
  const base = {
    windowSlug: "bay-window",
    measurementBasis: "TRACK_WIDTH" as const,
    dropCm: 220,
    bayTrackOrPoleFitted: true,
    fabricId: fabric.id,
    heading: "PENCIL_PLEAT" as const,
    lining: "STANDARD" as const,
    construction: "PAIR" as const,
    stackDirection: "SPLIT" as const,
  };
  assert.equal(calculateStagingPriceForTest({ ...base, bayNumberOfSections: 2, baySegmentWidthsCm: [10, 600] }, fabric).totalCoverageWidthCm, 610);
  assert.equal(calculateStagingPriceForTest({ ...base, bayNumberOfSections: 8, baySegmentWidthsCm: [10, 10, 10, 10, 10, 10, 10, 10] }, fabric).totalCoverageWidthCm, 80);
  assert.throws(() => calculateStagingPriceForTest({ ...base, bayNumberOfSections: 1, baySegmentWidthsCm: [100] }, fabric), /between 2 and 8/);
  assert.throws(() => calculateStagingPriceForTest({ ...base, bayNumberOfSections: 9, baySegmentWidthsCm: [10, 10, 10, 10, 10, 10, 10, 10, 10] }, fabric), /between 2 and 8/);
});

test("Curved and bow pricing uses the entered track arc as both coverage and required curve geometry", () => {
  const fabric = { ...STOREFRONT_FABRICS[0], supplierCostPerMetre: { amountMinor: 2_000, currency: "GBP" as const }, supplierCostEffectiveFrom: "2026-09-07" };
  const base = {
    windowSlug: "curved-bow-window",
    measurementBasis: "TRACK_WIDTH" as const,
    widthCm: 260,
    dropCm: 220,
    fabricId: fabric.id,
    heading: "WAVE" as const,
    lining: "STANDARD" as const,
    construction: "PAIR" as const,
    stackDirection: "SPLIT" as const,
    photoNames: ["curved-window.jpg"],
  };

  const result = calculateStagingPriceForTest(base, fabric);
  assert.equal(result.outcome, "PRICE_WITH_REVIEW");
  assert.equal(result.totalCoverageWidthCm, 260);
  assert.ok(result.totalAmountMinor !== null && result.totalAmountMinor > 0);
  assert.throws(() => calculateStagingPriceForTest({ ...base, photoNames: [] }, fabric), /incomplete or invalid/);
});

test("Corner pricing derives coverage from exactly two sections and retains one corner angle", () => {
  const fabric = { ...STOREFRONT_FABRICS[0], supplierCostPerMetre: { amountMinor: 2_000, currency: "GBP" as const }, supplierCostEffectiveFrom: "2026-09-07" };
  const base = {
    windowSlug: "corner-window",
    measurementBasis: "TRACK_WIDTH" as const,
    dropCm: 220,
    cornerSectionWidthsCm: [160, 140],
    cornerAngleDegrees: 90,
    fabricId: fabric.id,
    heading: "PENCIL_PLEAT" as const,
    lining: "BLACKOUT" as const,
    construction: "PAIR" as const,
    stackDirection: "SPLIT" as const,
    photoNames: ["corner-window.jpg"],
  };

  const result = calculateStagingPriceForTest(base, fabric);
  assert.equal(result.outcome, "PRICE_WITH_REVIEW");
  assert.equal(result.totalCoverageWidthCm, 300);
  assert.ok(result.totalAmountMinor !== null && result.totalAmountMinor > 0);
  assert.throws(() => calculateStagingPriceForTest({ ...base, cornerSectionWidthsCm: [300] }, fabric), /exactly two/);
  assert.throws(() => calculateStagingPriceForTest({ ...base, cornerAngleDegrees: 0 }, fabric), /between 1 and 359/);
  assert.throws(() => calculateStagingPriceForTest({ ...base, cornerSectionWidthsCm: [9, 291] }, fabric), /between 10 cm and 600 cm/);
});

test("Awkward and unusual windows collect rough dimensions and require both photo and drawing", () => {
  const base = {
    windowSlug: "awkward-unusual-window",
    measurements: { coverage_width: 240, finished_drop: 210 },
    fabricId: "pt-4269-147",
    heading: "PENCIL_PLEAT" as const,
    lining: "STANDARD" as const,
    construction: "PAIR" as const,
    fixingPosition: "Ceiling fixed around the glazed opening",
    stackDirection: "SPLIT" as const,
    photoNames: ["unusual-window.jpg"],
    drawingName: "unusual-window-sketch.pdf",
  };

  const result = classifySpecialistReview(base);
  assert.equal(result.outcome, "MANUAL_QUOTE");
  assert.equal(result.paymentState, "BLOCKED");
  assert.equal(result.productionState, "BLOCKED");
  assert.equal(result.message, "Price confirmed after technical review");
  assert.throws(() => classifySpecialistReview({ ...base, drawingName: undefined }), /incomplete or invalid/);
  assert.throws(() => classifySpecialistReview({ ...base, measurements: { coverage_width: 240 } }), /incomplete or invalid/);
});

test("a valid oversized specialist job remains blocked and uses manual-quote messaging", () => {
  const slope = Math.hypot(350, 400);
  const result = classifySpecialistReview({
    windowSlug: "apex-window",
    measurements: { coverage_width: 700, peak_height: 500, left_vertical: 100, right_vertical: 100, left_slope: slope, right_slope: slope },
    fabricId: "pt-4269-147",
    heading: "PENCIL_PLEAT",
    lining: "STANDARD",
    construction: "SINGLE",
    fixingPosition: "Wall fixed above glazing",
    stackDirection: "LEFT",
    photoNames: ["oversized-apex.jpg"],
  });
  assert.equal(result.outcome, "MANUAL_QUOTE");
  assert.equal(result.message, "Price confirmed after technical review");
  assert.equal(result.construction, "SINGLE");
  assert.equal(result.paymentState, "BLOCKED");
  assert.match(result.configurationId, /^[0-9a-f-]{36}$/);
});

test("specialist review rejects non-positive and impossible geometry for every launch shape", () => {
  const validMeasurements = { coverage_width: 300, peak_height: 300, left_vertical: 200, right_vertical: 200, left_slope: 180.28, right_slope: 180.28 };
  const base = {
    fabricId: "pt-4269-147",
    heading: "PENCIL_PLEAT" as const,
    lining: "STANDARD" as const,
    construction: "PAIR" as const,
    fixingPosition: "Wall fixed above glazing",
    stackDirection: "SPLIT" as const,
    photoNames: ["specialist-room.jpg"],
  };

  for (const windowSlug of ["apex-window", "triangular-window", "gable-end-window"]) {
    const valid = classifySpecialistReview({ ...base, windowSlug, measurements: validMeasurements });
    assert.equal(valid.outcome, "PRICE_WITH_REVIEW");
    assert.equal(valid.paymentState, "BLOCKED");
  }
  assert.throws(
    () => classifySpecialistReview({ ...base, windowSlug: "apex-window", measurements: { ...validMeasurements, left_slope: 0 } }),
    /incomplete or invalid/,
  );
  assert.throws(
    () => classifySpecialistReview({ ...base, windowSlug: "triangular-window", measurements: { ...validMeasurements, peak_height: -10 } }),
    /incomplete or invalid/,
  );
  assert.throws(
    () => classifySpecialistReview({ ...base, windowSlug: "gable-end-window", measurements: { ...validMeasurements, right_slope: 110 } }),
    /incomplete or invalid/,
  );
  assert.throws(
    () => classifySpecialistReview({ ...base, fixingPosition: " ", windowSlug: "apex-window", measurements: validMeasurements }),
    /fixing position is required/,
  );
});

test("the staging API permits only the Shopify store origins used by theme previews", () => {
  for (const origin of ["https://carpetup.myshopify.com", "https://www.curtainsuk.com", "https://curtainsuk.com"]) {
    const headers = stagingApiHeaders(new Request("https://staging.example/api", { headers: { origin } }));
    assert.equal(headers["Access-Control-Allow-Origin"], origin);
  }
  const blocked = stagingOptions(new Request("https://staging.example/api", { method: "OPTIONS", headers: { origin: "https://example.invalid" } }));
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get("access-control-allow-origin"), null);
  assert.doesNotThrow(() => assertAllowedStagingMutation(new Request("https://staging.example/api", { method: "POST", headers: { origin: "https://staging.example" } })));
  assert.doesNotThrow(() => assertAllowedStagingMutation(new Request("https://staging.example/api", { method: "POST", headers: { origin: "https://carpetup.myshopify.com" } })));
  assert.throws(() => assertAllowedStagingMutation(new Request("https://staging.example/api", { method: "POST" })), /STAGING_REQUEST_ORIGIN_DENIED/);
  assert.throws(() => assertAllowedStagingMutation(new Request("https://staging.example/api", { method: "POST", headers: { origin: "https://example.invalid" } })), /STAGING_REQUEST_ORIGIN_DENIED/);
  assert.equal(
    customerSafeApiError(new Error("PRICE_REQUIRES_VERIFICATION"), "Unable to calculate the staging price"),
    "This fabric price must be confirmed before it can be configured",
  );
});
