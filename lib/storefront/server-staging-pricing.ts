import "server-only";
import { fabricMasterRecordById, verifiedCutCostMinor } from "@/lib/fabric-master/repository";
import { fabricIsConfigurationEligible } from "@/lib/fabric-master/projection";
import { toDecisionEngineFabric } from "@/lib/fabric-master/decision-engine";
import { SupplierIntelligenceService } from "@/lib/supplier-intelligence/service";
import { SupabaseSupplierIntelligenceRepository } from "@/lib/supplier-intelligence/supabase-repository";
import { calculateStagingPriceForTest, classifySpecialistReview, type SpecialistReviewRequest, type StagingPriceRequest, type StagingPriceResponse } from "./staging-pricing";
import { signReviewSubmission } from "./review-token";

/** Server-authoritative staging pricing. Costs and approval history remain in PostgreSQL. */
export async function calculateStagingPrice(input: StagingPriceRequest): Promise<StagingPriceResponse> {
  const record = await fabricMasterRecordById(input.fabricId);
  if (!record) throw new Error("Window type or fabric is unavailable");
  if (!fabricIsConfigurationEligible(record)) throw new Error("PRICE_REQUIRES_VERIFICATION");
  const cutCostMinor = await verifiedCutCostMinor(record.supplier_id, record.supplier_sku);
  const pricedFabric = toDecisionEngineFabric(record, cutCostMinor, record.source_effective_date ?? new Date().toISOString().slice(0, 10));
  const provisional = calculateStagingPriceForTest(input, pricedFabric);
  const projection = await new SupplierIntelligenceService(new SupabaseSupplierIntelligenceRepository()).projection({
    supplierId: record.supplier_id,
    supplierSku: record.supplier_sku,
    requirement: { quantity: provisional.fabricMetres, stock_unit: "METRE" },
  });
  const labels: Record<string, string> = {
    FABRIC_AVAILABLE: "Fabric available",
    LIMITED_AVAILABILITY: "Limited availability",
    AVAILABLE_SOON: "Available soon",
    AVAILABILITY_TO_BE_CONFIRMED: "Availability to be confirmed",
    TEMPORARILY_UNAVAILABLE: "Temporarily unavailable",
    NO_LONGER_AVAILABLE: "No longer available",
  };
  return {
    ...provisional,
    availability: labels[projection.availability] ?? "Availability to be confirmed",
    reviewSubmissionToken: provisional.outcome === "INSTANT_PRICE" ? null : signReviewSubmission({
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
  if (!record) throw new Error("Window type or fabric is unavailable");
  if (!fabricIsConfigurationEligible(record)) throw new Error("PRICE_REQUIRES_VERIFICATION");
  await verifiedCutCostMinor(record.supplier_id, record.supplier_sku);
  const fabric = toDecisionEngineFabric(record, 0, record.source_effective_date ?? new Date().toISOString().slice(0, 10));
  const result = classifySpecialistReview(input, fabric);
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
