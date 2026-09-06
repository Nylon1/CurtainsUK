import assert from "node:assert/strict";
import test from "node:test";
import { WINDOW_TYPES_BY_SLUG } from "../../decision-engine/seed/window-types";
import { STOREFRONT_FABRICS } from "../fabrics";
import { calculateStagingPrice, classifySpecialistReview } from "../staging-pricing";
import { STOREFRONT_WINDOW_TYPES } from "../window-catalog";

test("the storefront exposes the 14 approved window families with unique canonical routes", () => {
  assert.equal(STOREFRONT_WINDOW_TYPES.length, 14);
  assert.equal(new Set(STOREFRONT_WINDOW_TYPES.map((item) => item.slug)).size, 14);
  for (const windowType of STOREFRONT_WINDOW_TYPES) {
    assert.ok(windowType.masterSlugs.length >= 1);
    for (const masterSlug of windowType.masterSlugs) assert.ok(WINDOW_TYPES_BY_SLUG.has(masterSlug), `${masterSlug} must exist in Window Type Master`);
    assert.ok(windowType.faqs.length >= 3);
  }
});

test("synthetic fabrics are feed blocked and safe for staging configuration", () => {
  assert.equal(STOREFRONT_FABRICS.length, 4);
  for (const fabric of STOREFRONT_FABRICS) {
    assert.equal(fabric.fixtureOnly, true);
    assert.equal(fabric.googleFeedEligibility.eligible, false);
    assert.equal(fabric.recordLifecycle, "ACTIVE");
    assert.ok(fabric.supplierCostPerMetre);
  }
});

test("a normal standard curtain receives a server-authoritative instant price", () => {
  const result = calculateStagingPrice({
    windowSlug: "standard-window",
    measurementBasis: "TRACK_WIDTH",
    widthCm: 200,
    dropCm: 220,
    fabricId: "stage-fabric-linwood-natural",
    heading: "PENCIL_PLEAT",
    lining: "STANDARD",
    construction: "PAIR",
    stackDirection: "SPLIT",
  });
  assert.equal(result.outcome, "INSTANT_PRICE");
  assert.ok(result.totalAmountMinor > 0);
  assert.equal(result.totalAmountMinor % 100, 0, "customer total should round to a whole pound");
  assert.ok(result.fabricWidths >= 2);
  assert.ok(!Object.hasOwn(result, "directCostNet"), "public response must not expose internal cost");
});

test("a bay configuration produces a price but remains routed to review", () => {
  const result = calculateStagingPrice({
    windowSlug: "bay-window",
    measurementBasis: "TRACK_WIDTH",
    widthCm: 340,
    dropCm: 220,
    baySegmentWidthsCm: [80, 180, 80],
    bayAnglesDegrees: [135, 135],
    fabricId: "stage-fabric-linwood-natural",
    heading: "PENCIL_PLEAT",
    lining: "BLACKOUT",
    construction: "PAIR",
    stackDirection: "SPLIT",
    photoNames: ["bay-room.jpg"],
  });
  assert.equal(result.outcome, "PRICE_WITH_REVIEW");
  assert.equal(result.technicalReviewRequired, true);
  assert.ok(result.totalAmountMinor > 0);
});

test("specialist apex geometry blocks payment and manufacture", () => {
  const result = classifySpecialistReview({
    windowSlug: "apex-window",
    measurements: { coverage_width: 300, peak_height: 300, left_vertical: 200, right_vertical: 200, left_slope: 180.28, right_slope: 180.28 },
    fabricId: "stage-fabric-linwood-natural",
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
    fabricId: "stage-fabric-linwood-natural",
    heading: "PENCIL_PLEAT",
    lining: "STANDARD",
    fixingPosition: "Unknown",
    stackDirection: "SPLIT",
    photoNames: ["apex-room.jpg"],
  });
  assert.equal(result.outcome, "MANUAL_QUOTE");
  assert.equal(result.pricingConfidence, "LOW");
});
