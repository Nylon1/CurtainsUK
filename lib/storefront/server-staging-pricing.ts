import "server-only";
import { fabricMasterRecordById, verifiedCutCostMinor } from "@/lib/fabric-master/repository";
import { toDecisionEngineFabric } from "@/lib/fabric-master/decision-engine";
import { SupplierIntelligenceService } from "@/lib/supplier-intelligence/service";
import { SupabaseSupplierIntelligenceRepository } from "@/lib/supplier-intelligence/supabase-repository";
import { calculateStagingPriceForTest, classifySpecialistReview, type SpecialistReviewRequest, type StagingPriceRequest, type StagingPriceResponse } from "./staging-pricing";

/** Server-authoritative staging pricing. Costs and approval history remain in PostgreSQL. */
export async function calculateStagingPrice(input: StagingPriceRequest): Promise<StagingPriceResponse> {
  const record = await fabricMasterRecordById(input.fabricId);
  if (!record || record.lifecycle_state === "DISCONTINUED") throw new Error("Window type or fabric is unavailable");
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
  return { ...provisional, availability: labels[projection.availability] ?? "Availability to be confirmed" };
}

/** Uses the same PostgreSQL Fabric Master as ordinary pricing without exposing cost data. */
export async function classifyServerSpecialistReview(input: SpecialistReviewRequest) {
  const record = await fabricMasterRecordById(input.fabricId);
  if (!record || record.lifecycle_state === "DISCONTINUED") throw new Error("Window type or fabric is unavailable");
  const fabric = toDecisionEngineFabric(record, 0, record.source_effective_date ?? new Date().toISOString().slice(0, 10));
  return classifySpecialistReview(input, fabric);
}
