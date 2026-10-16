import { insertForSpec } from "./domain";
import { randomUUID } from "node:crypto";
import {
  parseCushionSpec,
  type CushionPricingRules,
  type FabricCuttingFacts,
} from "./domain";
import { quoteCushionSet } from "./pricing";
import { buildCushionDraftContract } from "./commerce";
import { specDigest, type CushionOrderSnapshot } from "./repository";
import type { ShopifyDraftOrderExecutionContract } from "../storefront/shopify-draft-order-core";
import type { ShopifyDraftOrderExecutionResult } from "../storefront/shopify-draft-order-server";

export interface CushionCheckoutServices {
  mode?: "REVIEW" | "APPROVED_PRODUCTION";
  /** Always fresh server facts, never the browser quote or saved design copy. */
  facts(id: string): Promise<FabricCuttingFacts>;
  identity(id: string): Promise<CushionOrderSnapshot["fabricIdentity"]>;
  rules(): Promise<CushionPricingRules>;
  /** Atomic immutable group plus idempotency claim; duplicate key must not duplicate snapshots. */
  persist(input: {
    key: string;
    snapshots: CushionOrderSnapshot[];
    contract: ShopifyDraftOrderExecutionContract;
  }): Promise<void>;
  existing?(key: string): Promise<{
    snapshots: CushionOrderSnapshot[];
    contract: ShopifyDraftOrderExecutionContract;
  } | null>;
  execute(
    contract: ShopifyDraftOrderExecutionContract,
  ): Promise<ShopifyDraftOrderExecutionResult>;
  now(): Date;
}

/** Closed-gate runnable orchestration. Production has no route to invoke this. */
export async function prepareCushionCheckout(
  input: {
    designId: string;
    specs: unknown[];
    expectedQuoteId: string;
    idempotencyKey: string;
  },
  services: CushionCheckoutServices,
) {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,149}$/.test(input.designId) ||
    !/^[a-f0-9]{64}$/.test(input.expectedQuoteId) ||
    !/^[A-Za-z0-9-]{8,100}$/.test(input.idempotencyKey)
  )
    throw new Error("CUSHION_CHECKOUT_INPUT_INVALID");
  const specs = input.specs.map(parseCushionSpec);
  if (
    !specs.length ||
    specs.length > 32 ||
    new Set(specs.map((spec) => spec.id)).size !== specs.length
  )
    throw new Error("CUSHION_CHECKOUT_INPUT_INVALID");
  const ids = [
    ...new Set(
      specs.flatMap((spec) => [
        spec.fabricId,
        ...(spec.pipingFabricId ? [spec.pipingFabricId] : []),
      ]),
    ),
  ];
  const records = await Promise.all(ids.map((id) => services.facts(id)));
  if (
    services.mode === "APPROVED_PRODUCTION" &&
    records.some((record) => !record.supplierId || !record.supplierSku)
  )
    throw new Error("CUSHION_PROCUREMENT_IDENTITY_REQUIRED");
  const facts = new Map(records.map((record) => [record.id, record]));
  if (ids.some((id) => !facts.has(id)))
    throw new Error("CUSHION_FABRIC_CURRENT_RECORD_REQUIRED");
  const rules = await services.rules();
  const quote = quoteCushionSet(
    specs.map((spec) => ({
      spec,
      facts: facts.get(spec.fabricId)!,
      pipingFacts: spec.pipingFabricId
        ? facts.get(spec.pipingFabricId)
        : undefined,
    })),
    rules,
  );
  if (quote.quoteId !== input.expectedQuoteId)
    throw new Error("CUSHION_PRICE_OR_SPEC_CHANGED");
  if (
    !quote.ready ||
    quote.netGoodsMinor === null ||
    quote.deliveryGrossMinor === null ||
    quote.deliveryVatMinor === null ||
    rules.vatBasisPoints === null
  )
    throw new Error("CUSHION_CHECKOUT_REVALIDATION_REQUIRED");
  if (services.mode === "APPROVED_PRODUCTION" && !quote.dispatchEstimate)
    throw new Error("CUSHION_DISPATCH_ESTIMATE_REQUIRED");
  const now = services.now();
  const reuse = async (existing: {
    snapshots: CushionOrderSnapshot[];
    contract: ShopifyDraftOrderExecutionContract;
  }) => {
    if (
      existing.snapshots.length !== specs.length ||
      existing.snapshots.some(
        (snapshot) =>
          snapshot.designId !== input.designId ||
          snapshot.manufacturing.setQuoteId !== quote.quoteId ||
          !specs.some(
            (spec) =>
              spec.id === snapshot.spec.id &&
              specDigest(spec) === snapshot.specSha256,
          ),
      ) ||
      existing.contract.paymentEnabled !==
        (services.mode === "APPROVED_PRODUCTION")
    )
      throw new Error("CUSHION_CHECKOUT_IDEMPOTENCY_CONFLICT");
    const execution = await services.execute(existing.contract);
    if (execution.paymentEnabled && services.mode !== "APPROVED_PRODUCTION")
      throw new Error("CUSHION_LIVE_PAYMENT_NOT_AUTHORISED");
    return {
      ...existing,
      execution,
      purchaseEnabled: services.mode === "APPROVED_PRODUCTION",
    };
  };
  const previous = await services.existing?.(input.idempotencyKey);
  if (previous) return reuse(previous);
  const snapshots: CushionOrderSnapshot[] = [];
  for (const spec of specs) {
    const item = quote.items.find((item) => item.specId === spec.id);
    if (!item || item.goodsGrossMinor === null || item.goodsVatMinor === null)
      throw new Error("CUSHION_CHECKOUT_REVALIDATION_REQUIRED");
    const identity = await services.identity(spec.fabricId);
    if (identity.id !== spec.fabricId)
      throw new Error("CUSHION_FABRIC_IDENTITY_INVALID");
    snapshots.push({
      version: 1,
      productType: "CUSHION",
      id: randomUUID(),
      designId: input.designId,
      createdAt: now.toISOString(),
      spec: structuredClone(spec),
      specSha256: specDigest(spec),
      fabricIdentity: identity,
      rulesVersion: rules.version,
      price: {
        currency: "GBP",
        goodsGrossMinor: item.goodsGrossMinor,
        goodsVatMinor: item.goodsVatMinor,
      },
      manufacturing: {
        dispatchEstimate: structuredClone(quote.dispatchEstimate),
        cutPlan: quote.cutPlan,
        setSpecs: specs,
        setQuoteId: quote.quoteId,
        allocation: quote.allocationRule,
        construction: rules.construction,
        insert: spec.filling === "filled" && insertForSpec(spec, rules)
          ? (() => {
            const record = insertForSpec(spec, rules)!;
            return structuredClone({ supplierSku: record.supplierSku, supplierVariantId: record.supplierVariantId, coverSizeId: record.coverSizeId,
              padDimensionsMm: record.dimensionsMm, finishedCoverDimensionsMm: record.finishedCoverDimensionsMm,
              fillingType: record.fillingType, fitEvidence: record.fitEvidence,
              supplier: record.sourcing?.supplier, productId: record.sourcing?.productId,
              productName: record.sourcing?.productName, sourceUrl: record.sourcing?.sourceUrl });
          })() : null,
        fabricSources: records.map(
          ({
            id,
            supplierId,
            supplierSku,
            fullWidthMm,
            usableWidthMm,
            pattern,
            directional,
            calibration,
            orderIncrementMetres,
            minimumOrderMetres,
            orderingTermsEvidence,
          }) => ({
            id,
            supplierId,
            supplierSku,
            fullWidthMm,
            usableWidthMm,
            pattern,
            directional,
            calibration,
            orderIncrementMetres,
            minimumOrderMetres,
            orderingTermsEvidence,
          }),
        ),
      },
      commercial: {
        rules: structuredClone(rules),
        itemCostAllocation: item,
        delivery: {
          scope: "once-per-cushion-order",
          quoteId: quote.quoteId,
          grossMinor: quote.deliveryGrossMinor,
          vatMinor: quote.deliveryVatMinor,
          netMinor: quote.carriageMinor,
          carrierCostMinor: quote.staffPricing.carrierCostMinor,
        },
        supplierRates: records.map((record) => ({
          id: record.id,
          supplierCostMinorPerMetre: record.supplierCostMinorPerMetre,
        })),
      },
      revalidatedAt: now.toISOString(),
    });
  }
  const contract = buildCushionDraftContract({
    snapshots,
    idempotencyKey: input.idempotencyKey,
    shipping: {
      title: "Confirmed cushion delivery",
      grossMinor: quote.deliveryGrossMinor,
      vatMinor: quote.deliveryVatMinor,
    },
    now,
  });
  if (services.mode === "APPROVED_PRODUCTION") {
    contract.environment = "PRODUCTION";
    contract.paymentEnabled = true;
    contract.input.note =
      "Made-to-order cushion configuration. Manufacture from the immutable Cushion Studio snapshot after staff review.";
    contract.input.tags = [
      "CURTAINSUK_PRODUCTION",
      "CURTAINSUK_CUSHION",
      contract.idempotencyTag,
    ];
  }
  try {
    await services.persist({ key: input.idempotencyKey, snapshots, contract });
  } catch (error) {
    const raced = await services.existing?.(input.idempotencyKey);
    if (raced) return reuse(raced);
    throw error;
  }
  const execution = await services.execute(contract);
  if (execution.paymentEnabled && services.mode !== "APPROVED_PRODUCTION")
    throw new Error("CUSHION_LIVE_PAYMENT_NOT_AUTHORISED");
  return {
    snapshots,
    contract,
    execution,
    purchaseEnabled: services.mode === "APPROVED_PRODUCTION",
  };
}

export function cushionWorkroomPacket(snapshot: CushionOrderSnapshot) {
  if (
    snapshot.specSha256 !== specDigest(snapshot.spec) ||
    snapshot.productType !== "CUSHION"
  )
    throw new Error("CUSHION_SNAPSHOT_INVALID");
  return {
    version: 1,
    productType: "CUSHION" as const,
    snapshotId: snapshot.id,
    designId: snapshot.designId,
    fabric: structuredClone(snapshot.fabricIdentity),
    spec: structuredClone(snapshot.spec),
    manufacturing: structuredClone(snapshot.manufacturing),
    frontBack:
      "Identical upright artwork from the shared placement. Do not mirror either face.",
    rulesVersion: snapshot.rulesVersion,
  };
}
