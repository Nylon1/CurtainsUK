import { confirmedCushionDispatch } from "./dispatch";
import { createHash } from "node:crypto";
import {
  prepareHouseCheckout,
  type HouseCheckoutInput,
  type HouseCheckoutServices,
} from "../storefront/rooms-checkout";
import { reviewHouse, type HouseReviewRequest } from "../storefront/rooms-core";
import {
  prepareCushionCheckout,
  type CushionCheckoutServices,
} from "./checkout";
import { buildMixedDraftContract } from "./commerce";
import type { ShopifyDraftOrderExecutionContract } from "../storefront/shopify-draft-order-core";
import type { CushionCutPlan } from "./cutting";

export type MixedInput = {
  house: HouseReviewRequest;
  designId: string;
  specs: unknown[];
  expectedQuoteId: string;
};
export type MixedServices = {
  house: HouseCheckoutServices;
  cushion: CushionCheckoutServices;
  /** One owner-approved combined parcel charge, never the sum of two deliveries. */
  shipping(input: {
    house: HouseReviewRequest;
    requirements: Map<string, number>;
  }): Promise<{ grossMinor: number; vatMinor: number; title: string }>;
  stock(id: string, combinedMetres: number): Promise<boolean>;
  persistCurtains(
    curtains: Extract<
      Awaited<ReturnType<typeof prepareHouseCheckout>>,
      { prepared: true }
    >["curtains"],
  ): Promise<void>;
};
const disabled = {
  status: "DISABLED",
  shopifyWritePerformed: false,
  checkoutUrl: null,
  draftOrderId: null,
  draftOrderName: null,
  paymentEnabled: false,
} as const;

/** Real server revalidation of both product authorities; no effects during review. */
export async function reviewMixedCheckout(
  input: MixedInput,
  services: MixedServices,
) {
  const houseReview = await reviewHouse(input.house, services.house);
  if (!houseReview.ready) throw Error("MIXED_CURTAIN_REVIEW_REQUIRED");
  const acceptedPriceChanges = houseReview.lines
    .filter((line) => line.status === "PRICE_CHANGED")
    .map((line) => ({
      configuration_id: line.configuration_id,
      currentPrice: line.currentPrice!,
    }));
  const house = await prepareHouseCheckout(
    {
      house: input.house,
      reviewToken: houseReview.reviewToken!,
      measurementsConfirmed: true,
      acceptedPriceChanges,
    },
    services.house,
  );
  if (!house.prepared) throw Error("MIXED_CURTAIN_REVIEW_CHANGED");
  const cushion = await prepareCushionCheckout(
    { ...input, idempotencyKey: "mixed-review-only" },
    {
      ...services.cushion,
      mode: "REVIEW",
      persist: async () => {},
      existing: undefined,
      execute: async () => disabled,
    },
  );
  const requirements = new Map<string, number>();
  const curtainFabricIds = new Set(
    house.curtains.map((curtain) => curtain.handoff.snapshot.fabricMasterId),
  );
  const add = (id: string, metres: number) =>
    requirements.set(id, (requirements.get(id) ?? 0) + metres);
  for (const curtain of house.curtains)
    add(
      curtain.handoff.snapshot.fabricMasterId,
      curtain.handoff.snapshot.calculatedFabricMetres,
    );
  // Every cushion snapshot references the same set plan. Count the plan exactly once.
  for (const cloth of (
    cushion.snapshots[0].manufacturing.cutPlan as CushionCutPlan
  ).fabrics) {
    if (cloth.orderedMetres === null) throw Error("MIXED_CUT_PLAN_REQUIRED");
    add(cloth.fabricId, cloth.orderedMetres);
  }
  // The cushion set was already checked against its current governed stock.
  // Apply the curtain stock floor only where curtains use the fabric, with
  // cushion consumption included when both products share that fabric.
  for (const [id, metres] of requirements)
    if (curtainFabricIds.has(id) && !(await services.stock(id, metres)))
      throw Error("MIXED_COMBINED_STOCK_CHANGED");
  const shipping = await services.shipping({
    house: input.house,
    requirements,
  });
  const contract = buildMixedDraftContract({
    curtain: house.contract,
    cushion: cushion.contract,
    idempotencyKey: "mixed-review-only",
    shipping,
  });
  contract.input.shippingAddress = house.contract.input.shippingAddress;
  const reviewId = createHash("sha256")
    .update(
      JSON.stringify({
        version: 1,
        house: input.house,
        cushionQuote: input.expectedQuoteId,
        expected: contract.expected,
        requirements: [...requirements].sort(),
        shipping,
      }),
    )
    .digest("hex");
  return { house, cushion, contract, reviewId, acceptedPriceChanges, shipping };
}

export async function executeMixedCheckout(
  input: MixedInput & {
    reviewId: string;
    houseReviewToken: string;
    measurementsConfirmed: boolean;
    acceptedPriceChanges: HouseCheckoutInput["acceptedPriceChanges"];
    idempotencyKey: string;
  },
  services: MixedServices,
) {
  if (
    input.measurementsConfirmed !== true ||
    !/^[a-zA-Z0-9-]{8,100}$/.test(input.idempotencyKey)
  )
    throw Error("MIXED_CONFIRMATION_REQUIRED");
  // Check the exact customer-reviewed native curtain token before the second fresh review.
  const accepted = await prepareHouseCheckout(
    {
      house: input.house,
      reviewToken: input.houseReviewToken,
      measurementsConfirmed: true,
      acceptedPriceChanges: input.acceptedPriceChanges,
    },
    services.house,
  );
  if (!accepted.prepared) throw Error("MIXED_CURTAIN_REVIEW_CHANGED");
  const reviewed = await reviewMixedCheckout(input, services);
  if (reviewed.reviewId !== input.reviewId)
    throw Error("MIXED_PRICE_OR_STOCK_CHANGED");
  if (
    services.cushion.mode === "APPROVED_PRODUCTION" &&
    !confirmedCushionDispatch(
      reviewed.cushion.snapshots[0].manufacturing.dispatchEstimate,
    )
  )
    throw Error("CUSHION_DISPATCH_ESTIMATE_REQUIRED");
  const tag = `mixed-studio-${input.idempotencyKey}`;
  let contract: ShopifyDraftOrderExecutionContract = {
    ...reviewed.contract,
    idempotencyTag: tag,
    input: {
      ...reviewed.contract.input,
      tags: [
        "CURTAINSUK_STAGING",
        "DO_NOT_FULFIL",
        "NO_REAL_PAYMENT",
        "CURTAINSUK_MIXED_REVIEW",
        tag,
      ],
      customAttributes: [
        ...reviewed.contract.input.customAttributes.filter(
          (a) => a.key !== "curtainsuk_cushion_checkout_key",
        ),
        { key: "curtainsuk_cushion_checkout_key", value: input.idempotencyKey },
        { key: "curtainsuk_mixed_review_id", value: reviewed.reviewId },
      ],
    },
  };
  if (services.cushion.mode === "APPROVED_PRODUCTION")
    contract = {
      ...contract,
      environment: "PRODUCTION",
      paymentEnabled: true,
      input: {
        ...contract.input,
        tags: [
          "CURTAINSUK_PRODUCTION",
          "CURTAINSUK_CUSHION",
          "CURTAINSUK_MIXED",
          tag,
        ],
        note: "Mixed made-to-order curtain and cushion order. Use each immutable product workroom packet.",
      },
    };
  const old = await services.cushion.existing?.(input.idempotencyKey);
  if (old) {
    if (
      old.contract.idempotencyTag !== tag ||
      old.contract.input.customAttributes.find(
        (a) => a.key === "curtainsuk_mixed_review_id",
      )?.value !== reviewed.reviewId ||
      old.snapshots.some((s) => s.designId !== input.designId) ||
      old.contract.paymentEnabled !== contract.paymentEnabled
    )
      throw Error("MIXED_IDEMPOTENCY_CONFLICT");
    contract = old.contract;
  } else {
    await services.persistCurtains(accepted.curtains);
    await services.cushion.persist({
      key: input.idempotencyKey,
      snapshots: reviewed.cushion.snapshots,
      contract,
    });
  }
  const execution = await services.cushion.execute(contract);
  if (
    execution.paymentEnabled &&
    services.cushion.mode !== "APPROVED_PRODUCTION"
  )
    throw Error("CUSHION_LIVE_PAYMENT_NOT_AUTHORISED");
  return { execution, reviewId: reviewed.reviewId };
}
