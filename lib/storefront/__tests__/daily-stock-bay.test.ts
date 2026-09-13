import assert from "node:assert/strict";
import test from "node:test";
import { calculateStagingPriceForTest } from "../staging-pricing";
import { STOREFRONT_FABRICS } from "../fabrics";

test("ordinary Bay uses section sum and instant pricing without track status or angles", () => {
  const fabric = {
    ...STOREFRONT_FABRICS[0],
    supplierCostPerMetre: { amountMinor: 2000, currency: "GBP" as const },
    supplierCostEffectiveFrom: "2026-09-13",
  };
  const common = {
    measurementBasis: "TRACK_WIDTH" as const,
    dropCm: 220,
    fabricId: fabric.id,
    heading: "PENCIL_PLEAT" as const,
    lining: "STANDARD" as const,
    construction: "PAIR" as const,
    stackDirection: "SPLIT" as const,
  };
  const bay = calculateStagingPriceForTest(
    {
      ...common,
      windowSlug: "bay-window",
      bayNumberOfSections: 3,
      baySegmentWidthsCm: [80, 180, 80],
    },
    fabric,
  );
  const straight = calculateStagingPriceForTest(
    { ...common, windowSlug: "standard-window", widthCm: 340 },
    fabric,
  );
  assert.equal(bay.outcome, "INSTANT_PRICE");
  assert.equal(bay.technicalReviewRequired, false);
  assert.equal(bay.totalCoverageWidthCm, 340);
  assert.equal(bay.totalAmountMinor, straight.totalAmountMinor);
  assert.equal(bay.fabricMetres, straight.fabricMetres);
  assert.throws(() =>
    calculateStagingPriceForTest(
      {
        ...common,
        windowSlug: "bay-window",
        bayNumberOfSections: 3,
        baySegmentWidthsCm: [80, 180],
      },
      fabric,
    ),
  );
  const specialist = calculateStagingPriceForTest(
    {
      ...common,
      windowSlug: "bay-window",
      bayNumberOfSections: 3,
      baySegmentWidthsCm: [200, 300, 200],
    },
    fabric,
  );
  assert.equal(specialist.outcome, "MANUAL_QUOTE");
});

import { dailyStockDecision, ukDate, morningDue } from "../daily-stock";
const now = new Date("2026-09-13T07:00:00Z");
test("strict aggregate floor, usage, stale retention and no private quantities", () => {
  const base = {
    aggregateMetres: 100,
    confirmedUsageMetres: 0,
    snapshotDate: "2026-09-13",
    discontinued: false,
  };
  for (const [stock, usage, available] of [
    [30, 0, false],
    [30.01, 0, true],
    [100, 70, false],
    [100, 69.99, true],
    [0, 0, false],
    [100, 120, false],
  ] as const) {
    const result = dailyStockDecision(
      { ...base, aggregateMetres: stock, confirmedUsageMetres: usage },
      now,
    );
    assert.equal(
      result.status,
      available ? "AVAILABLE" : "OUT_OF_STOCK_FOR_CURTAINSUK",
    );
    assert.equal(
      result.label,
      available ? "Fabric available" : "Currently unavailable",
    );
    assert.ok(!JSON.stringify(result).includes("Metres"));
  }
  const stale = dailyStockDecision(
    { ...base, snapshotDate: "2026-09-12", refreshFailed: true },
    now,
  );
  assert.equal(stale.stale, true);
  assert.equal(stale.status, "AVAILABLE");
  assert.equal(
    dailyStockDecision({ ...base, aggregateMetres: null }, now).status,
    "UNKNOWN",
  );
  assert.equal(
    dailyStockDecision({ ...base, discontinued: true }, now).status,
    "DISCONTINUED",
  );
  assert.equal(
    dailyStockDecision({ ...base, confirmedUsageMetres: 70 }, now).status,
    "OUT_OF_STOCK_FOR_CURTAINSUK",
  );
  assert.equal(
    dailyStockDecision(
      { ...base, aggregateMetres: 80, confirmedUsageMetres: 0 },
      now,
    ).status,
    "AVAILABLE",
  );
});
test("UK morning handles BST, GMT and local dates", () => {
  assert.equal(morningDue(new Date("2026-07-01T05:00:00Z")), true);
  assert.equal(morningDue(new Date("2026-01-01T05:00:00Z")), false);
  assert.equal(morningDue(new Date("2026-01-01T06:00:00Z")), true);
  assert.equal(ukDate(new Date("2026-07-01T23:30:00Z")), "2026-07-02");
});

import {
  evaluateCheckoutGate,
  allocateVatInclusiveRetailTotal,
} from "../checkout-gates";
test("daily floor controls instant checkout; Bay requires no approval when stock passes", () => {
  for (const stock of [30, 30.01]) {
    const availability = dailyStockDecision(
      {
        aggregateMetres: stock,
        confirmedUsageMetres: 0,
        snapshotDate: "2026-09-13",
        discontinued: false,
      },
      now,
    ).availability;
    const gate = evaluateCheckoutGate({
      outcome: "INSTANT_PRICE",
      price: allocateVatInclusiveRetailTotal(165700),
      fabricPricingEligible: true,
      technicallyValid: true,
      availability,
      reviewState: null,
      customerAccepted: true,
      shipping: {
        region: "UK_MAINLAND",
        parcelClass: "STANDARD",
        status: "READY",
        grossAmountMinor: 1295,
        currency: "GBP",
        shownSeparately: true,
        countsTowardGoodsMinimum: false,
        message: "Delivery",
      },
    });
    assert.equal(gate.eligible, stock > 30);
    assert.equal(gate.paymentEnabled, false);
  }
});
