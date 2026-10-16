import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  retainCurtain,
  type HouseReviewRequest,
} from "../../storefront/rooms-core";
import { calculateProductionMtmCustomerPrice } from "../../storefront/production-pricing";
import { STOREFRONT_FABRICS } from "../../storefront/fabrics";
import {
  signReviewSubmissionWithSecret,
  verifyReviewSubmissionWithSecret,
} from "../../storefront/review-token-core";
import type { StagingPriceRequest } from "../../storefront/staging-pricing";
import type { HouseCheckoutServices } from "../../storefront/rooms-checkout";
import { quoteCushion } from "../pricing";
import {
  reviewMixedCheckout,
  executeMixedCheckout,
  type MixedServices,
} from "../mixed-checkout";
import type {
  CushionSpec,
  FabricCuttingFacts,
  CushionPricingRules,
} from "../domain";

// Synthetic authority fixtures: no hosted writes, rates or customer records.
const secret = "mixed-local-fixture-".repeat(4),
  source = STOREFRONT_FABRICS[0],
  now = new Date("2026-10-14T18:00:00Z");
const configuration: StagingPriceRequest = {
  fabricId: source.id,
  windowSlug: "french-doors",
  hardware: "TRACK",
  measurementBasis: "TRACK_WIDTH",
  widthCm: 201,
  dropCm: 236,
  heading: "WAVE",
  lining: "BLACKOUT",
  construction: "PAIR",
  stackDirection: "SPLIT",
  desiredFinish: "FLOOR",
};
const spec: CushionSpec = {
  version: 1,
  id: "cushion-test",
  sizeId: "square-50",
  fabricId: source.id,
  filling: "cover",
  edge: "unpiped",
  quantity: 1,
  placementMm: { x: 50, y: 50 },
};
const fabric: FabricCuttingFacts = {
  id: source.id,
  fullWidthMm: 1400,
  usableWidthMm: null,
  pattern: { kind: "plain", horizontalRepeatMm: 0, verticalRepeatMm: 0 },
  directional: false,
  calibration: {
    imageUrl: "https://example.invalid/test.jpg",
    physicalWidthMm: 1400,
    physicalHeightMm: 1000,
    evidence: "Synthetic only",
    orientation: "upright",
    tileable: false,
  },
  supplierCostMinorPerMetre: 2000,
  orderIncrementMetres: 0.01,
  minimumOrderMetres: 0,
  availableMetres: 100,
};
const rules: CushionPricingRules = {
  version: "synthetic",
  construction: {
    version: "synthetic",
    confirmed: true,
    squareDrapeConfirmed: true,
    seamAllowanceMm: 20,
    pipingStripWidthMm: null,
    pipingJoinAllowanceMm: null,
    pipingCut: null,
    pipingConfirmed: false,
  },
  marginBasisPoints: 5000,
  vatBasisPoints: 2000,
  carriageMinor: null,
  customerDeliveryGrossMinor: 495,
  supplierCarriageMinor: 0,
};
async function fixture() {
  const house: HouseCheckoutServices = {
    secret,
    now: () => now.toISOString(),
    calculate: async (c) => ({
      ...calculateProductionMtmCustomerPrice(c, {
        ...source,
        supplierCostPerMetre: { amountMinor: 1000, currency: "GBP" },
        supplierCostEffectiveFrom: "2026-10-14",
      }),
      stockSnapshotStale: false,
      commercialState: "ORDER_READY",
    }),
    verifyPrice: (configuration, configurationId, price, token) =>
      verifyReviewSubmissionWithSecret(
        {
          configuration,
          configurationId,
          outcome: price.outcome,
          totalAmountMinor: price.totalAmountMinor,
        },
        token,
        secret,
      ),
    fabric: async (id) => ({
      id,
      design: source.design,
      colour: source.colour,
      supplier: source.supplier,
      brand: "Test",
      imageUrl: null,
    }),
    stock: async () => true,
    delivery: async () => ({
      region: "UK_MAINLAND",
      parcelClass: "STANDARD",
      status: "READY",
      grossAmountMinor: 1295,
      currency: "GBP",
      shownSeparately: true,
      countsTowardGoodsMinimum: false,
      message: "Synthetic delivery",
    }),
    productionFabric: async () => ({
      supplierSku: "TEST",
      identity: {
        supplier: source.supplier,
        brand: "Test",
        design: source.design,
        colour: source.colour,
      },
    }),
  };
  const price = await house.calculate(configuration),
    configurationId = randomUUID(),
    token = signReviewSubmissionWithSecret(
      {
        configuration,
        configurationId,
        outcome: price.outcome,
        totalAmountMinor: price.totalAmountMinor,
      },
      secret,
    );
  const retained = await retainCurtain(
    { configuration, configurationId, priceConfirmationToken: token },
    house,
  );
  const request: HouseReviewRequest = {
    house_id: randomUUID(),
    revision: 1,
    postcode: "BB2 3FA",
    rooms: [
      {
        room_id: randomUUID(),
        room_name: "Lounge",
        curtains: [
          {
            configuration_id: retained.configuration_id,
            receipt: retained.receipt,
            window_name: "Main",
          },
        ],
      },
    ],
  };
  const effects: string[] = [],
    stored = new Map<string, any>();
  let seenMetres = 0;
  const services: MixedServices = {
    house,
    stock: async (id, metres) => {
      assert.equal(id, source.id);
      seenMetres = metres;
      return true;
    },
    shipping: async () => ({
      grossMinor: 1295,
      vatMinor: 216,
      title: "Single mixed charge",
    }),
    persistCurtains: async () => {
      effects.push("curtains");
    },
    cushion: {
      now: () => now,
      mode: "REVIEW",
      facts: async () => fabric,
      identity: async () => ({
        id: source.id,
        brand: "Test",
        design: source.design,
        colour: source.colour,
      }),
      rules: async () => rules,
      persist: async (input) => {
        effects.push("cushions");
        stored.set(input.key, input);
      },
      existing: async (key) => stored.get(key) ?? null,
      execute: async () => {
        effects.push("execute");
        return {
          status: "DISABLED",
          shopifyWritePerformed: false,
          checkoutUrl: null,
          draftOrderId: null,
          draftOrderName: null,
          paymentEnabled: false,
        };
      },
    },
  };
  return {
    input: {
      house: request,
      designId: "local-design",
      specs: [spec],
      expectedQuoteId: quoteCushion(spec, fabric, rules).quoteId,
    },
    services,
    effects,
    stored,
    seen: () => seenMetres,
    curtainMetres: price.fabricMetres!,
  };
}
test("mixed review revalidates signed curtains and one cushion plan, sums shared stock and one shipping charge", async () => {
  const f = await fixture(),
    r = await reviewMixedCheckout(f.input, f.services);
  assert.deepEqual(f.effects, []);
  assert.equal(f.seen(), f.curtainMetres + 0.57);
  assert.equal(r.contract.input.lineItems.length, 2);
  assert.equal(r.cushion.contract.expected.shippingGrossAmountMinor, 495);
  assert.equal(r.contract.expected.shippingGrossAmountMinor, 1295);
  assert.equal(
    r.contract.expected.orderGrossAmountMinor,
    r.contract.expected.goodsGrossAmountMinor + 1295,
  );
  assert.equal(
    r.contract.expected.goodsGrossAmountMinor,
    r.house.contract.expected.goodsGrossAmountMinor +
      r.cushion.contract.expected.goodsGrossAmountMinor,
  );
  assert.equal(r.contract.paymentEnabled, false);
});
test("individually sufficient stock cannot pass when combined curtain and cushion requirements exceed it", async () => {
  const f = await fixture();
  f.services.stock = async (_, metres) => metres <= f.curtainMetres;
  await assert.rejects(
    reviewMixedCheckout(f.input, f.services),
    /COMBINED_STOCK/,
  );
  assert.deepEqual(f.effects, []);
});
test("cushion-only fabric in a mixed order uses its cushion stock check without the curtain floor", async () => {
  const f = await fixture();
  const cushionSpec = { ...spec, fabricId: "cushion-only-fabric" };
  const cushionFabric = { ...fabric, id: cushionSpec.fabricId, availableMetres: 28 };
  f.input.specs = [cushionSpec];
  f.input.expectedQuoteId = quoteCushion(cushionSpec, cushionFabric, rules).quoteId;
  f.services.cushion.facts = async () => cushionFabric;
  f.services.cushion.identity = async () => ({
    id: cushionSpec.fabricId, brand: "Test", design: "Cushion only", colour: "Plain",
  });
  const checked: string[] = [];
  f.services.stock = async (id) => {
    checked.push(id);
    return id === source.id;
  };
  const review = await reviewMixedCheckout(f.input, f.services);
  assert.deepEqual(checked, [source.id]);
  assert.equal(review.contract.input.lineItems.length, 2);
  assert.deepEqual(f.effects, []);
  f.services.cushion.facts = async () => ({ ...cushionFabric, availableMetres: 0 });
  await assert.rejects(reviewMixedCheckout(f.input, f.services), /CUSHION_/);
});
test("mixed checkout binds reviewed membership and persists native types; retry reuses original snapshot IDs", async () => {
  const f = await fixture(),
    r = await reviewMixedCheckout(f.input, f.services);
  const input = {
    ...f.input,
    reviewId: r.reviewId,
    houseReviewToken: r.house.review.reviewToken,
    measurementsConfirmed: true,
    acceptedPriceChanges: r.acceptedPriceChanges,
    idempotencyKey: "mixed-test-12345",
  };
  await executeMixedCheckout(input, f.services);
  assert.equal(
    f.stored
      .get(input.idempotencyKey)
      .contract.input.customAttributes.find(
        (a: any) => a.key === "curtainsuk_cushion_checkout_key",
      ).value,
    input.idempotencyKey,
  );
  const ids = f.stored
    .get(input.idempotencyKey)
    .snapshots.map((s: any) => s.id);
  await executeMixedCheckout(input, f.services);
  assert.deepEqual(
    f.stored.get(input.idempotencyKey).snapshots.map((s: any) => s.id),
    ids,
  );
  assert.deepEqual(f.effects, ["curtains", "cushions", "execute", "execute"]);
  await assert.rejects(
    executeMixedCheckout({ ...input, reviewId: "wrong" }, f.services),
    /PRICE_OR_STOCK_CHANGED/,
  );
  await assert.rejects(
    executeMixedCheckout(
      { ...input, measurementsConfirmed: false },
      f.services,
    ),
    /CONFIRMATION/,
  );
});

test("mixed review remains nonbinding without cushion dispatch and production execution requires confirmed immutable evidence", async () => {
  const f = await fixture();
  const first = await reviewMixedCheckout(f.input, f.services);
  assert.equal(first.cushion.snapshots[0].manufacturing.dispatchEstimate, null);
  const checkoutInput = (review: typeof first) => ({
    ...f.input,
    reviewId: review.reviewId,
    houseReviewToken: review.house.review.reviewToken!,
    measurementsConfirmed: true,
    acceptedPriceChanges: review.acceptedPriceChanges,
    idempotencyKey: "mixed-dispatch-test",
  });
  f.services.cushion.mode = "APPROVED_PRODUCTION";
  await assert.rejects(
    executeMixedCheckout(checkoutInput(first), f.services),
    /DISPATCH_ESTIMATE_REQUIRED/,
  );
  assert.deepEqual(f.effects, []);
  const confirmedRules: CushionPricingRules = {
    ...rules,
    dispatchEstimate: {
      version: "synthetic-mixed-dispatch",
      status: "confirmed",
      minimumWorkingDays: 12,
      maximumWorkingDays: 17,
      startsFrom: "order-confirmation",
      confirmedAt: now.toISOString(),
      approvalReference: "SYNTHETIC-TEST-ONLY",
    },
  };
  f.services.cushion.rules = async () => confirmedRules;
  f.input.expectedQuoteId = quoteCushion(spec, fabric, confirmedRules).quoteId;
  const second = await reviewMixedCheckout(f.input, f.services);
  assert.notEqual(second.reviewId, first.reviewId);
  await executeMixedCheckout(checkoutInput(second), f.services);
  const saved = f.stored.get("mixed-dispatch-test");
  assert.deepEqual(
    saved.snapshots[0].manufacturing.dispatchEstimate,
    confirmedRules.dispatchEstimate,
  );
  assert.equal(saved.contract.expected.shippingGrossAmountMinor, 1295);
  assert.deepEqual(f.effects, ["curtains", "cushions", "execute"]);
});
