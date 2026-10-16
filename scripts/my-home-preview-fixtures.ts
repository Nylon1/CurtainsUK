import { reviewMyHome, checkoutMyHome, type MyHomeInput, type MyHomeServices } from "../lib/cushion-studio/my-home";
import { OWNER_CONFIRMED_CUSHION_DISPATCH, combinedMyHomeDispatch } from "../lib/cushion-studio/dispatch";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  retainCurtain,
  type HouseReviewRequest,
} from "../lib/storefront/rooms-core";
import { calculateProductionMtmCustomerPrice } from "../lib/storefront/production-pricing";
import { STOREFRONT_FABRICS } from "../lib/storefront/fabrics";
import {
  signReviewSubmissionWithSecret,
  verifyReviewSubmissionWithSecret,
} from "../lib/storefront/review-token-core";
import type { StagingPriceRequest } from "../lib/storefront/staging-pricing";
import type { HouseCheckoutServices } from "../lib/storefront/rooms-checkout";
import { quoteCushion } from "../lib/cushion-studio/pricing";
import {
  reviewMixedCheckout,
  executeMixedCheckout,
  type MixedServices,
} from "../lib/cushion-studio/mixed-checkout";
import type {
  CushionSpec,
  FabricCuttingFacts,
  CushionPricingRules,
} from "../lib/cushion-studio/domain";

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

export async function homeFixture() {
  const f = await fixture();
  f.services.cushion.rules = async () => ({...rules,dispatchEstimate:OWNER_CONFIRMED_CUSHION_DISPATCH});
  const input: MyHomeInput = {version:1,id:f.input.house.house_id,revision:1,postcode:f.input.house.postcode,
    curtains:f.input.house,cushions:{designId:f.input.house.house_id,specs:[spec]}};
  const services: MyHomeServices = {mixed:f.services,releases:{curtains:true,cushions:true,mixed:true},
    curtainDispatch:{...OWNER_CONFIRMED_CUSHION_DISPATCH,version:"synthetic-curtain-six-weeks",minimumCalendarWeeks:5,maximumCalendarWeeks:6},
    executeHouse:async prepared=>{f.effects.push("house-execute");assert.equal(prepared.prepared,true);return {checkoutUrl:null,paymentEnabled:false,status:"REVIEW"};}};
  return {...f,input,services};
}

export { source, fabric, rules, configuration };
