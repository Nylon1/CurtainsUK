import type {
  MyHomeCheckoutInput,
  MyHomeServices,
} from "../cushion-studio/my-home";
import type { CushionOrderSnapshot } from "../cushion-studio/repository";
import type { SmartTrackSystem } from "./domain";
import type { TrackPackage } from "./package";
import {
  createSmartTrackSnapshot,
  buildSmartTrackOrder,
  type SmartTrackSnapshot,
} from "./commerce";
import type { SmartTrackQuote } from "./pricing";
import type { ShopifyDraftOrderExecutionContract } from "../storefront/shopify-draft-order-core";
import type { ShopifyDraftOrderExecutionResult } from "../storefront/shopify-draft-order-server";
import { prepareHouseCheckout } from "../storefront/rooms-checkout";
import { prepareCushionCheckout } from "../cushion-studio/checkout";
import type { reviewMixedCheckout } from "../cushion-studio/mixed-checkout";
import { cushionWorkroomPacket } from "../cushion-studio/checkout";
import {
  customerMyHomeDispatch,
  type combinedMyHomeDispatch,
} from "../cushion-studio/dispatch";
export type TrackCheckoutGroup = {
  reviewId: string;
  contract: ShopifyDraftOrderExecutionContract;
  snapshots: Readonly<SmartTrackSnapshot>[];
  packets: Record<string, unknown>[];
  cushions: CushionOrderSnapshot[];
};
export interface SmartTrackServices {
  package(system: SmartTrackSystem): Readonly<TrackPackage>;
  purchasesEnabled: boolean;
  fabricWeight?: (
    id: string,
  ) => Promise<{ gsm: number | null; widthCm: number | null } | undefined>;
  existing(key: string): Promise<TrackCheckoutGroup | null>;
  persist(key: string, group: TrackCheckoutGroup): Promise<void>;
  execute(
    key: string,
    contract: ShopifyDraftOrderExecutionContract,
  ): Promise<ShopifyDraftOrderExecutionResult>;
}
export async function checkoutSmartTrackOrder(
  input: MyHomeCheckoutInput,
  services: MyHomeServices,
  review: {
    quotes: SmartTrackQuote[];
    shipping: {
      grossMinor: number;
      vatMinor: number;
      title: string;
      postcode: string;
    };
    dispatch: NonNullable<ReturnType<typeof combinedMyHomeDispatch>>;
    mixed: Awaited<ReturnType<typeof reviewMixedCheckout>> | null;
    expected: {
      goodsMinor: number | null;
      totalMinor: number | null;
      vatMinor: number | null;
    };
  },
) {
  const tracks = services.tracks;
  if (!tracks?.purchasesEnabled || !review.quotes.every((q) => q.purchaseReady))
    throw Error("TRACK_PURCHASE_DISABLED");
  const prior = await tracks.existing(input.idempotencyKey);
  const execute = async (group: TrackCheckoutGroup) => {
    if (
      group.reviewId !== input.reviewId ||
      !group.contract.paymentEnabled ||
      group.snapshots.some((s) => s.designId !== input.id)
    )
      throw Error("TRACK_IDEMPOTENCY_CONFLICT");
    const result = await tracks.execute(input.idempotencyKey, group.contract);
    return {
      checkoutUrl: result.checkoutUrl,
      purchaseEnabled: result.paymentEnabled,
      status: result.status,
    };
  };
  if (prior) return execute(prior);
  let base: ShopifyDraftOrderExecutionContract | undefined;
  let cushions: CushionOrderSnapshot[] = [];
  const packets: Record<string, unknown>[] = [];
  if (input.curtains) {
    const prepared = await prepareHouseCheckout(
      {
        house: input.curtains,
        reviewToken: input.houseReviewToken ?? "",
        measurementsConfirmed: input.measurementsConfirmed,
        acceptedPriceChanges: input.acceptedPriceChanges ?? [],
      },
      services.mixed.house,
    );
    if (!prepared.prepared) throw Error("MY_HOME_REVIEW_CHANGED");
    base = prepared.contract;
    await services.mixed.persistCurtains(prepared.curtains);
    packets.push(
      ...prepared.curtains.map((c) => ({
        productType: "CURTAIN",
        snapshotId: c.handoff.snapshot.snapshotId,
        configurationId: c.handoff.snapshot.configurationId,
        manufacturing: c.handoff.snapshot,
      })),
    );
  }
  if (input.cushions) {
    const cushion =
      review.mixed?.cushion ??
      (await prepareCushionCheckout(
        {
          designId: input.id,
          specs: input.cushions.specs,
          expectedQuoteId: input.cushions.expectedQuoteId ?? "",
          idempotencyKey: input.idempotencyKey,
        },
        {
          ...services.mixed.cushion,
          mode: "REVIEW",
          existing: undefined,
          persist: async () => {},
          execute: async () => ({
            status: "DISABLED",
            paymentEnabled: false,
            checkoutUrl: null,
            draftOrderId: null,
            draftOrderName: null,
            shopifyWritePerformed: false,
          }),
        },
      ));
    base = review.mixed?.contract ?? cushion.contract;
    cushions = cushion.snapshots;
    packets.push(...cushion.snapshots.map(cushionWorkroomPacket));
  }
  const snapshots = review.quotes.map((q) =>
    createSmartTrackSnapshot(
      q,
      input.id,
      tracks.package(q.spec.system),
      review.dispatch,
    ),
  );
  packets.push(
    ...snapshots.map((s) => ({
      version: 1,
      productType: "SMART_TRACK",
      snapshotId: s.id,
      spec: s.spec,
      package: s.package,
      weight: s.weight,
      customerApproved: s.customerApproved,
      priceVersion: s.priceVersion,
      dispatchCommitment: s.dispatchCommitment,
    })),
  );
  const contract = buildSmartTrackOrder({
    snapshots,
    base,
    key: input.idempotencyKey,
    reviewId: input.reviewId,
    shipping: review.shipping,
    production: true,
  });
  contract.input.customAttributes.push({
    key: "curtainsuk_my_home_dispatch",
    value: JSON.stringify(customerMyHomeDispatch(review.dispatch)),
  });
  if (
    contract.expected.goodsGrossAmountMinor !== review.expected.goodsMinor ||
    contract.expected.orderGrossAmountMinor !== review.expected.totalMinor ||
    contract.expected.orderVatAmountMinor !== review.expected.vatMinor
  )
    throw Error("TRACK_RECONCILIATION_FAILED");
  const group = {
    reviewId: input.reviewId,
    contract,
    snapshots,
    packets,
    cushions,
  };
  try {
    await tracks.persist(input.idempotencyKey, group);
  } catch (error) {
    const raced = await tracks.existing(input.idempotencyKey);
    if (raced) return execute(raced);
    throw error;
  }
  return execute(group);
}
