import "server-only";
import { MissingCommercialRuleError } from "@/lib/decision-engine/errors";
import { fabricMasterRecordById, verifiedCutCostMinor } from "@/lib/fabric-master/repository";
import { fabricIsPriceEligible } from "@/lib/fabric-master/projection";
import { toDecisionEngineFabric, toReviewFabricIdentity } from "@/lib/fabric-master/decision-engine";
import { dailyStockProjection } from "./daily-stock-server";
import { calculateStagingPriceForTest, calculatePriceConfirmationReview, classifySpecialistReview, type SpecialistReviewRequest, type StagingPriceRequest, type StagingPriceResponse } from "./staging-pricing";
import { signReviewSubmission } from "./review-token";

/** Server-authoritative staging pricing. Costs and approval history remain in PostgreSQL. */
export async function calculateStagingPrice(input: StagingPriceRequest): Promise<StagingPriceResponse> {
  const record = await fabricMasterRecordById(input.fabricId);
  if (!record || !record.staging_catalog_visible || record.lifecycle_state === "DISCONTINUED") throw new Error("Window type or fabric is unavailable");
  let cutCostMinor: number | null = null;
  if(fabricIsPriceEligible(record)) {
    try { cutCostMinor = await verifiedCutCostMinor(record.supplier_id, record.supplier_sku); }
    catch(error) { if(!(error instanceof Error) || error.message !== "PRICE_REQUIRES_VERIFICATION")throw error; }
  }
  const specificationsKnown = Boolean(record.usable_width_mm && Number.isFinite(record.usable_width_mm) && record.usable_width_mm > 0);
  const priceConfirmation = () => {
    const manufacturingFabric = specificationsKnown ? toDecisionEngineFabric(record, null, record.source_effective_date ?? "") : null;
    const result = calculatePriceConfirmationReview(input, toReviewFabricIdentity(record), manufacturingFabric);
    return {...result, reviewSubmissionToken:signReviewSubmission({configuration:input,configurationId:result.configurationId,outcome:result.outcome,totalAmountMinor:null})};
  };
  if(cutCostMinor === null || !specificationsKnown) return priceConfirmation();
  const pricedFabric = toDecisionEngineFabric(record, cutCostMinor, record.source_effective_date ?? new Date().toISOString().slice(0, 10));
  let provisional: ReturnType<typeof calculateStagingPriceForTest>;
  try { provisional = calculateStagingPriceForTest(input, pricedFabric); }
  catch(error) { if(error instanceof MissingCommercialRuleError) return priceConfirmation(); throw error; }
  const projection = await dailyStockProjection({
    supplierId: record.supplier_id,
    supplierSku: record.supplier_sku,
    requirement: provisional.fabricMetres === null ? null : { quantity: provisional.fabricMetres, stock_unit: "METRE" },
  });
  const labels: Record<string, string> = {
    FABRIC_AVAILABLE: "Fabric available",
    LIMITED_AVAILABILITY: "Limited availability",
    AVAILABLE_SOON: "Available soon",
    AVAILABILITY_TO_BE_CONFIRMED: "Availability to be confirmed",
    TEMPORARILY_UNAVAILABLE: "Currently unavailable",
    NO_LONGER_AVAILABLE: "No longer available",
  };
  return {
    ...provisional,
    stockSnapshotStale: projection.stale,
    commercialState: ["FABRIC_AVAILABLE", "LIMITED_AVAILABILITY"].includes(projection.availability) ? "ORDER_READY" : "PRICE_READY",
    availability: labels[projection.availability] ?? "Availability to be confirmed",
    reviewSubmissionToken: signReviewSubmission({
      configuration: input,
      configurationId: provisional.configurationId,
      outcome: provisional.outcome,
      totalAmountMinor: provisional.totalAmountMinor,
    }),
  };
}

/** Uses the same PostgreSQL Fabric Master as ordinary pricing without exposing cost data. */
export async function classifyServerSpecialistReview(input: SpecialistReviewRequest) {
  const record = await fabricMasterRecordById(input.fabricId);
  if (!record || !record.staging_catalog_visible || record.lifecycle_state === "DISCONTINUED") throw new Error("Window type or fabric is unavailable");
  const result = classifySpecialistReview(input, toReviewFabricIdentity(record));
  if (result.outcome === "INSTANT_PRICE") throw new Error("Specialist shapes require the review journey");
  return {
    ...result,
    reviewSubmissionToken: signReviewSubmission({
      configuration: input,
      configurationId: result.configurationId,
      outcome: result.outcome,
      totalAmountMinor: null,
    }),
  };
}
