import {
  confirmedCushionDispatch,
  customerCushionDispatch,
  type CushionDispatchEstimate,
} from "./dispatch";
import { createHash } from "node:crypto";
import { allocateVatFromGross } from "../storefront/shopify-draft-order-core";
import {
  CUSHION_MAKING_RATE_CARD,
  cushionSize,
  parseCushionSpec,
  type CushionSpec,
  type FabricCuttingFacts,
  type CushionPricingRules,
} from "./domain";
import { buildSetCutPlan, type CushionCutPlan } from "./cutting";

export const CUSHION_FIXED_COSTS = Object.freeze({
  sundriesMinor: 120,
  insertMinor: 500,
  packagingMinor: 100,
  overheadMinor: 300,
});
export type CushionQuoteItem = {
  specId: string;
  quantity: number;
  fixedCostMinor: number;
  materialCostMinor: number | null;
  directCostMinor: number | null;
  allocatedCostMinor: number | null;
  netGoodsMinor: number | null;
  goodsVatMinor: number | null;
  goodsGrossMinor: number | null;
  makingApproval: "confirmed" | "proposed";
};
export type CushionQuote = {
  version: 1;
  quoteId: string;
  currency: "GBP";
  specs: CushionSpec[];
  cutPlan: CushionCutPlan;
  fixedCostMinor: number;
  materialCostMinor: number | null;
  additionCostMinor: number | null;
  supplierCarriageMinor: number | null;
  knownCostMinor: number;
  totalCostMinor: number | null;
  netGoodsMinor: number | null;
  carriageMinor: number | null;
  deliveryGrossMinor: number | null;
  deliveryVatMinor: number | null;
  vatMinor: number | null;
  totalMinor: number | null;
  ready: boolean;
  purchaseReady: boolean;
  dispatchEstimate: CushionDispatchEstimate | null;
  dispatchMessage: string | null;
  status: "priced" | "review-required";
  issues: string[];
  pricingVersion: string;
  costBasis: "supplier-net-cost-plus-making";
  allocationRule: "per-fabric-cut-area-with-largest-remainder-v1";
  items: CushionQuoteItem[];
  staffPricing: {
    targetMarginBasisPoints: number | null;
    resultingMarginBasisPoints: number | null;
    discountNetMinor: number;
    retailBeforeDiscountNetMinor: number | null;
    carrierCostMinor: number | null;
    deliveryContributionMinor: number | null;
  };
  previewMaterials: Record<
    string,
    {
      piping: {
        confirmed: boolean;
        stripWidthMm: number | null;
        cordDiameterMm: number | null;
        segments: {
          lengthMm: number;
          sourceOriginMm: { x: number; y: number };
          axis: "x";
        }[];
      };
    }
  >;
  materials: {
    fabricId: string;
    requiredMetres: number;
    orderedMetres: number | null;
    costedMetres: number;
    rateMinor: number | null;
    costMinor: number | null;
    provisional: boolean;
  }[];
  costLines: { label: string; amountMinor: number }[];
};
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export const cushionHash = (value: unknown) =>
  createHash("sha256").update(canonicalJson(value)).digest("hex");
const validMoney = (n: unknown): n is number =>
  typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
/** Conserves every penny; stable ties use the immutable specification ID. */
export function allocateMinor(
  total: number,
  weights: { id: string; weight: number }[],
): Record<string, number> {
  if (
    !validMoney(total) ||
    !weights.length ||
    weights.some((w) => !Number.isFinite(w.weight) || w.weight < 0)
  )
    throw new Error("CUSHION_ALLOCATION_INVALID");
  const sum = weights.reduce((s, w) => s + w.weight, 0),
    rows = weights.map((w) => {
      const exact = total * (sum ? w.weight / sum : 1 / weights.length);
      return {
        ...w,
        amount: Math.floor(exact),
        fraction: exact - Math.floor(exact),
      };
    });
  let remaining = total - rows.reduce((s, r) => s + r.amount, 0);
  rows.sort((a, b) => b.fraction - a.fraction || a.id.localeCompare(b.id));
  for (let i = 0; remaining > 0; i++, remaining--)
    rows[i % rows.length].amount++;
  return Object.fromEntries(rows.map((r) => [r.id, r.amount]));
}

export function quoteCushionSet(
  inputs: {
    spec: CushionSpec;
    facts: FabricCuttingFacts;
    pipingFacts?: FabricCuttingFacts;
  }[],
  rules: CushionPricingRules,
): CushionQuote {
  const specs = inputs.map((i) => parseCushionSpec(i.spec)),
    cutPlan = buildSetCutPlan(inputs, rules.construction),
    issues = [...cutPlan.issues];
  const facts = new Map<string, FabricCuttingFacts>();
  for (const i of inputs) {
    facts.set(i.facts.id, i.facts);
    if (i.pipingFacts) facts.set(i.pipingFacts.id, i.pipingFacts);
  }
  const materialBySpec = Object.fromEntries(specs.map((s) => [s.id, 0]));
  const materials = cutPlan.fabrics.map((plan) => {
    const rate = facts.get(plan.fabricId)?.supplierCostMinorPerMetre ?? null,
      costedMetres = plan.orderedMetres ?? plan.requiredMetres;
    if (!validMoney(rate))
      issues.push(
        `${plan.fabricId}: current supplier net cost per metre is unavailable.`,
      );
    const costMinor = validMoney(rate) ? Math.ceil(costedMetres * rate) : null;
    if (costMinor !== null) {
      const area = new Map<string, number>();
      for (const p of plan.pieces)
        area.set(p.specId, (area.get(p.specId) ?? 0) + p.widthMm * p.heightMm);
      if (area.size) {
        const allocation = allocateMinor(
          costMinor,
          [...area].map(([id, weight]) => ({ id, weight })),
        );
        for (const [id, value] of Object.entries(allocation))
          materialBySpec[id] += value;
      }
    }
    return {
      fabricId: plan.fabricId,
      requiredMetres: plan.requiredMetres,
      orderedMetres: plan.orderedMetres,
      costedMetres,
      rateMinor: validMoney(rate) ? rate : null,
      costMinor,
      provisional: plan.orderedMetres === null,
    };
  });
  const fixedRules = rules.fixedCosts ?? CUSHION_FIXED_COSTS,
    card = rules.makingRateCard ?? CUSHION_MAKING_RATE_CARD;
  if (
    ![
      fixedRules.sundriesMinor,
      fixedRules.insertMinor,
      fixedRules.packagingMinor,
      fixedRules.overheadMinor,
    ].every(validMoney)
  )
    throw new Error("CUSHION_FIXED_COST_RULE_INVALID");
  const costLines: { label: string; amountMinor: number }[] = [];
  let fixedCostMinor = 0,
    complete = true;
  const items: CushionQuoteItem[] = specs.map((spec) => {
    if (spec.edge === "contrast")
      issues.push(`${spec.id}: contrast piping is currently unavailable. Choose unpiped or self-piped.`);
    const rate = card[spec.sizeId]?.[spec.edge],
      size = cushionSize(spec.sizeId);
    let pieceComplete = true;
    if (!rate || !validMoney(rate.amountMinor)) {
      issues.push(`${spec.id}: making rate is not configured.`);
      pieceComplete = false;
    }
    if (rate?.approval !== "confirmed")
      issues.push(
        `${spec.id}: proposed making rate requires workroom approval.`,
      );
    const specialInsert =
      size.shape !== "rectangle" || spec.sizeId.startsWith("bed-square-");
    const insertRecord = rules.compatibleInsertsBySize?.[spec.sizeId];
    const compatible = insertRecord?.confirmed === true && insertRecord.coverSizeId === spec.sizeId &&
      typeof insertRecord.supplierSku === "string" && insertRecord.supplierSku.trim() &&
      typeof insertRecord.approvalReference === "string" && insertRecord.approvalReference.trim() &&
      Array.isArray(insertRecord.dimensionsMm) && insertRecord.dimensionsMm.length >= 1 &&
      insertRecord.dimensionsMm.length <= 3 && insertRecord.dimensionsMm.every(n => Number.isFinite(n) && n > 0) &&
      validMoney(insertRecord.costMinor);
    const insert =
      spec.filling === "cover"
        ? 0
        : spec.manufacturingProfile === "flat-sewn-v1"
          ? compatible ? insertRecord!.costMinor : undefined
        : specialInsert
          ? rules.compatibleInsertCostMinorBySize?.[spec.sizeId]
          : fixedRules.insertMinor;
    if (!validMoney(insert)) {
      issues.push(
        spec.manufacturingProfile === "flat-sewn-v1"
          ? `${spec.id}: a confirmed compatible insert SKU, dimensions and supplier cost are required for this shape and size.`
          : `${spec.id}: a compatible insert supplier cost is required for this shape and size.`,
      );
      pieceComplete = false;
    }
    const fixed =
      ((rate?.amountMinor ?? 0) +
        fixedRules.sundriesMinor +
        (insert ?? 0) +
        fixedRules.packagingMinor +
        fixedRules.overheadMinor) *
      spec.quantity;
    fixedCostMinor += fixed;
    costLines.push({
      label: `${spec.id}: ${spec.quantity} × one making rate + sundries + ${spec.filling === "filled" ? "compatible insert + " : ""}packaging + overhead`,
      amountMinor: fixed,
    });
    const relevant = cutPlan.fabrics.filter((p) =>
      p.pieces.some((piece) => piece.specId === spec.id),
    );
    const materialComplete =
      relevant.length > 0 &&
      relevant.every(
        (p) =>
          materials.find((m) => m.fabricId === p.fabricId)?.costMinor !== null,
      );
    if (
      spec.edge !== "unpiped" &&
      (!rules.construction.pipingConfirmed ||
        !cutPlan.fabrics.some((f) =>
          f.pieces.some((p) => p.specId === spec.id && p.role === "piping"),
        ))
    )
      pieceComplete = false;
    complete &&= pieceComplete && materialComplete;
    return {
      specId: spec.id,
      quantity: spec.quantity,
      fixedCostMinor: fixed,
      materialCostMinor: materialComplete ? materialBySpec[spec.id] : null,
      directCostMinor:
        pieceComplete && materialComplete
          ? fixed + materialBySpec[spec.id]
          : null,
      allocatedCostMinor: null,
      netGoodsMinor: null,
      goodsVatMinor: null,
      goodsGrossMinor: null,
      makingApproval: rate?.approval ?? "proposed",
    };
  });
  const materialCostMinor = materials.every((m) => m.costMinor !== null)
    ? materials.reduce((n, m) => n + m.costMinor!, 0)
    : null;
  const supplierCarriageMinor = validMoney(rules.supplierCarriageMinor)
    ? rules.supplierCarriageMinor
    : null;
  if (supplierCarriageMinor === null)
    issues.push("Supplier carriage cost is not configured.");
  const knownCostMinor =
    fixedCostMinor +
    materials.reduce((n, m) => n + (m.costMinor ?? 0), 0) +
    (supplierCarriageMinor ?? 0);
  const totalCostMinor =
    complete && materialCostMinor !== null && supplierCarriageMinor !== null
      ? fixedCostMinor + materialCostMinor + supplierCarriageMinor
      : null;
  const margin = rules.marginBasisPoints,
    vat = rules.vatBasisPoints;
  const marginReady =
      margin !== null &&
      Number.isInteger(margin) &&
      margin >= 0 &&
      margin < 10000,
    vatReady =
      vat !== null && Number.isInteger(vat) && vat >= 0 && vat <= 10000;
  if (!marginReady) issues.push("Selling margin is not configured.");
  if (!vatReady) issues.push("VAT rate is not configured.");
  if (rules.customerDeliveryGrossMinor != null && rules.carriageMinor != null)
    throw new Error("CUSHION_DELIVERY_AUTHORITY_AMBIGUOUS");
  if (rules.carrierCostMinor != null && !validMoney(rules.carrierCostMinor))
    throw new Error("CUSHION_CARRIER_COST_INVALID");
  const grossAuthority = validMoney(rules.customerDeliveryGrossMinor)
    ? rules.customerDeliveryGrossMinor
    : null;
  const legacyNet = validMoney(rules.carriageMinor)
    ? rules.carriageMinor
    : null;
  const deliveryVatMinor = vatReady
    ? grossAuthority !== null
      ? allocateVatFromGross(grossAuthority, vat)
      : legacyNet !== null
        ? Math.round((legacyNet * vat) / 10000)
        : null
    : null;
  const deliveryGrossMinor =
    grossAuthority ??
    (legacyNet !== null && deliveryVatMinor !== null
      ? legacyNet + deliveryVatMinor
      : null);
  const carriageMinor =
    deliveryGrossMinor !== null && deliveryVatMinor !== null
      ? deliveryGrossMinor - deliveryVatMinor
      : null;
  if (deliveryGrossMinor === null)
    issues.push("Customer delivery charge is not configured.");
  const carrierCostMinor = rules.carrierCostMinor ?? null;
  const retailBeforeDiscountNetMinor =
    totalCostMinor !== null && marginReady
      ? Math.round((totalCostMinor * 10000) / (10000 - margin))
      : null;
  const discountNetMinor = rules.discountNetMinor ?? 0;
  if (!validMoney(discountNetMinor))
    throw new Error("CUSHION_DISCOUNT_INVALID");
  if (
    retailBeforeDiscountNetMinor !== null &&
    discountNetMinor >= retailBeforeDiscountNetMinor
  )
    issues.push("Configured discount leaves no payable goods amount.");
  const netGoodsMinor =
    retailBeforeDiscountNetMinor !== null &&
    discountNetMinor < retailBeforeDiscountNetMinor
      ? retailBeforeDiscountNetMinor - discountNetMinor
      : null;
  const staffPricing = {
    targetMarginBasisPoints: marginReady ? margin : null,
    resultingMarginBasisPoints:
      netGoodsMinor && totalCostMinor !== null
        ? Number(
            (
              ((netGoodsMinor - totalCostMinor) / netGoodsMinor) *
              10000
            ).toFixed(4),
          )
        : null,
    discountNetMinor,
    retailBeforeDiscountNetMinor,
    carrierCostMinor,
    deliveryContributionMinor:
      carriageMinor !== null && carrierCostMinor !== null
        ? carriageMinor - carrierCostMinor
        : null,
  };
  const net =
    netGoodsMinor !== null && carriageMinor !== null
      ? netGoodsMinor + carriageMinor
      : null;
  if (totalCostMinor !== null) {
    const weights = items.map((item) => ({
      id: item.specId,
      weight: item.directCostMinor!,
    }));
    const supplierShare = allocateMinor(supplierCarriageMinor!, weights);
    for (const item of items)
      item.allocatedCostMinor =
        item.directCostMinor! + supplierShare[item.specId];
    if (netGoodsMinor !== null) {
      const allocation = allocateMinor(
        netGoodsMinor,
        items.map((item) => ({
          id: item.specId,
          weight: item.allocatedCostMinor!,
        })),
      );
      for (const item of items) item.netGoodsMinor = allocation[item.specId];
      // Shopify custom lines are tax-inclusive and quantity one. Round each
      // line's VAT before summing; allocating aggregate VAT can disagree by 1p.
      if (vatReady)
        for (const item of items) {
          item.goodsVatMinor = Math.round((item.netGoodsMinor! * vat) / 10000);
          item.goodsGrossMinor = item.netGoodsMinor! + item.goodsVatMinor;
        }
    }
  }
  const vatMinor =
    net !== null && vatReady
      ? items.reduce((sum, item) => sum + item.goodsVatMinor!, 0) +
        deliveryVatMinor!
      : null;
  const dispatchEstimate = confirmedCushionDispatch(rules.dispatchEstimate);
  const ready = issues.length === 0,
    totalMinor = net !== null && vatMinor !== null ? net + vatMinor : null;
  const previewMaterials: CushionQuote["previewMaterials"] = {};
  for (const spec of specs) {
    if (spec.edge === "unpiped") continue;
    const construction = rules.construction,
      join = construction.pipingJoinAllowanceMm ?? 0,
      diameter = construction.pipingCordDiameterMm ?? null;
    const pipeFacts = facts.get(
        spec.edge === "self" ? spec.fabricId : spec.pipingFabricId!,
      ),
      calibration = pipeFacts?.calibration;
    const pieces = cutPlan.fabrics
      .flatMap((f) => f.pieces)
      .filter(
        (p) => p.specId === spec.id && p.role === "piping" && p.unit === 1,
      )
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    const segments = pieces.map((p) => ({
      lengthMm: p.widthMm - 2 * join,
      sourceOriginMm: {
        x: p.sourcePlacementMm.x + join,
        y: p.sourcePlacementMm.y,
      },
      axis: "x" as const,
    }));
    const confirmed =
      construction.pipingConfirmed &&
      construction.pipingCut === "straight" &&
      pieces.length > 0 &&
      diameter !== null &&
      diameter > 0 &&
      diameter <= 20 &&
      calibration !== undefined &&
      calibration !== null &&
      segments.every(
        (s) =>
          s.lengthMm > 0 &&
          s.sourceOriginMm.x + s.lengthMm <= calibration.physicalWidthMm &&
          s.sourceOriginMm.y + (construction.pipingStripWidthMm ?? 0) <=
            calibration.physicalHeightMm,
      );
    previewMaterials[spec.id] = {
      piping: {
        confirmed,
        stripWidthMm: construction.pipingStripWidthMm,
        cordDiameterMm: diameter,
        segments: confirmed ? segments : [],
      },
    };
  }
  return {
    version: 1,
    quoteId: cushionHash({ specs, facts: [...facts.values()], rules, cutPlan }),
    currency: "GBP",
    specs,
    cutPlan,
    fixedCostMinor,
    materialCostMinor,
    additionCostMinor: complete ? 0 : null,
    supplierCarriageMinor,
    knownCostMinor,
    totalCostMinor,
    netGoodsMinor,
    carriageMinor,
    deliveryGrossMinor,
    deliveryVatMinor,
    vatMinor,
    totalMinor,
    ready,
    purchaseReady: ready && dispatchEstimate !== null,
    dispatchEstimate,
    dispatchMessage: customerCushionDispatch(dispatchEstimate)?.message ?? null,
    status: ready ? "priced" : "review-required",
    issues: [...new Set(issues)],
    pricingVersion: rules.version,
    costBasis: "supplier-net-cost-plus-making",
    allocationRule: "per-fabric-cut-area-with-largest-remainder-v1",
    items,
    materials,
    costLines,
    staffPricing,
    previewMaterials,
  };
}
export function quoteCushion(
  spec: CushionSpec,
  facts: FabricCuttingFacts,
  rules: CushionPricingRules,
  pipingFacts?: FabricCuttingFacts,
) {
  return quoteCushionSet([{ spec, facts, pipingFacts }], rules);
}
