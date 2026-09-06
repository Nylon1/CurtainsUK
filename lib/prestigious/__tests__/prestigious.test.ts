import assert from "node:assert/strict";
import test from "node:test";
import { evaluateStock } from "../availability";
import { applyDiscontinuedExport } from "../discontinued-import";
import { PRESTIGIOUS_PILOT_FABRICS, PRESTIGIOUS_PILOT_FABRICS_BY_ID } from "../pilot-fabrics";
import { resolveFabricForServerPricing } from "../private-supplier-records";
import type { PrestigiousPrivateSupplierRecord } from "../types";
import { calculateStagingPrice, classifySpecialistReview } from "@/lib/storefront/staging-pricing";
import { buildShopifyCatalogPayload } from "@/lib/storefront/shopify-contract";

const now = new Date("2026-09-06T12:00:00.000Z");
const record = (overrides: Partial<PrestigiousPrivateSupplierRecord> = {}): PrestigiousPrivateSupplierRecord => ({
  fabricSpecId: "pt-4269-147", supplierSku: "4269/147", standardTradePriceExVat: null, cutTradePriceExVat: null,
  pdfDesignLevelPriceExVat: { amountMinor: 3050, currency: "GBP" },
  costingPriceUsedExVat: null, priceVerificationStatus: "PRICE_REQUIRES_VERIFICATION", priceEffectiveDate: null,
  totalFreeStockMetres: 20, batches: [{ batchReference: "TEST-A", usableMetres: 20, pieces: 1 }], stockState: "AVAILABLE",
  nextDueDate: null, nextDueMetres: null, verifiedAt: "2026-09-06T10:00:00.000Z", notes: null, ...overrides,
});

test("pilot contains 20 stable real Prestigious Formation colourways", () => {
  assert.equal(PRESTIGIOUS_PILOT_FABRICS.length, 20);
  assert.equal(new Set(PRESTIGIOUS_PILOT_FABRICS.map((fabric) => fabric.uniqueSku)).size, 20);
  assert.ok(PRESTIGIOUS_PILOT_FABRICS.every((fabric) => fabric.supplier === "Prestigious Textiles" && !fabric.fixtureOnly));
});

test("stock is available only when one current batch covers the requirement", () => {
  assert.equal(evaluateStock(record(), 12, { now }).internalState, "AVAILABLE");
  const split = evaluateStock(record({ batches: [{ batchReference: "A", usableMetres: 7, pieces: 1 }, { batchReference: "B", usableMetres: 7, pieces: 1 }] }), 12, { now });
  assert.equal(split.internalState, "INSUFFICIENT_SINGLE_BATCH");
  assert.equal(split.customerState, "Availability to be confirmed");
});

test("low, due, stale and discontinued states map safely", () => {
  assert.equal(evaluateStock(record({ batches: [{ batchReference: "A", usableMetres: 13, pieces: 1 }] }), 10, { now }).internalState, "LOW_STOCK");
  assert.equal(evaluateStock(record({ batches: [], nextDueDate: "2026-09-20", nextDueMetres: 30 }), 10, { now }).internalState, "DUE");
  assert.equal(evaluateStock(record({ verifiedAt: "2026-09-04T10:00:00.000Z" }), 10, { now }).internalState, "UNKNOWN");
  assert.equal(evaluateStock(record({ stockState: "DISCONTINUED" }), 10, { now }).customerState, "No longer available");
});

test("unverified colourway price cannot enter calculation", () => {
  const fabric = PRESTIGIOUS_PILOT_FABRICS_BY_ID.get("pt-4269-658")!;
  assert.throws(() => resolveFabricForServerPricing(fabric), /PRICE_REQUIRES_VERIFICATION/);
});

test("official discontinued export transitions without deletion", () => {
  const updated = applyDiscontinuedExport(PRESTIGIOUS_PILOT_FABRICS, "SKU,Description\n4269/147,Escher Mocha\n");
  assert.equal(updated.length, 20);
  assert.equal(updated.find((fabric) => fabric.uniqueSku === "4269/147")?.recordLifecycle, "RETIRED");
  assert.equal(updated.find((fabric) => fabric.uniqueSku === "4269/658")?.recordLifecycle, "ACTIVE");
});

test("real Escher standard and Dali bay configurations use verified cut costs", () => {
  const standard = calculateStagingPrice({ windowSlug: "standard-window", measurementBasis: "TRACK_WIDTH", widthCm: 200, dropCm: 220, fabricId: "pt-4269-147", heading: "PENCIL_PLEAT", lining: "STANDARD", construction: "PAIR", stackDirection: "SPLIT" });
  assert.equal(standard.outcome, "INSTANT_PRICE");
  assert.ok(standard.totalAmountMinor > 0);
  const bay = calculateStagingPrice({ windowSlug: "bay-window", measurementBasis: "TRACK_WIDTH", widthCm: 340, dropCm: 220, baySegmentWidthsCm: [80, 180, 80], bayAnglesDegrees: [135, 135], fabricId: "pt-4270-147", heading: "WAVE", lining: "BLACKOUT", construction: "PAIR", stackDirection: "SPLIT", photoNames: ["bay.jpg"] });
  assert.equal(bay.outcome, "PRICE_WITH_REVIEW");
  assert.equal(bay.technicalReviewRequired, true);
});

test("real Prestigious fabric never bypasses apex technical review", () => {
  const apex = classifySpecialistReview({ windowSlug: "apex-window", measurements: { coverage_width: 300, peak_height: 300, left_vertical: 200, right_vertical: 200, left_slope: 180.28, right_slope: 180.28 }, fabricId: "pt-4271-147", heading: "PENCIL_PLEAT", lining: "STANDARD", fixingPosition: "Wall fixed", stackDirection: "SPLIT", photoNames: ["apex.jpg"] });
  assert.equal(apex.paymentState, "BLOCKED");
  assert.equal(apex.productionState, "BLOCKED");
});

test("customer Shopify payload contains no supplier-commercial or batch fields", () => {
  const serialised = JSON.stringify(buildShopifyCatalogPayload());
  assert.equal(/supplierCost|tradePrice|costingPrice|stockMetres|batchReference|nextDue|pieces/i.test(serialised), false);
  assert.equal(buildShopifyCatalogPayload().fabrics.length, 20);
});
