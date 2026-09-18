import "server-only";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import { dailyStockDecision, currentDailyStockAvailability, sampleStockAvailable, curtainStockSufficient, type DailyStockInput } from "./daily-stock";
export async function dailyStockPosition(
  supplierId: string,
  supplierSku: string,
) {
  const { data, error } = await createSupplierServiceClient().rpc(
    "daily_stock_position",
    { p_supplier: supplierId, p_sku: supplierSku },
  );
  if (error) throw new Error("DAILY_STOCK_READ_UNAVAILABLE");
  const row = data as ({
    aggregateMetres: number;
    confirmedUsageMetres: number;
    snapshotDate: string;
    checkedAt: string;
    cutPriceMinor: number | null;
    discontinued: boolean;
    refreshFailed: boolean;
  } & DailyStockInput) | null;
  const position: DailyStockInput = row ?? {
    aggregateMetres: null,
    confirmedUsageMetres: 0,
    snapshotDate: null,
    discontinued: false,
  };
  return {
    decision: dailyStockDecision(position),
    position,
    sampleStockAvailable: sampleStockAvailable(position),
    cutPriceMinor: row?.cutPriceMinor ?? null,
    checkedAt: row?.checkedAt ?? null,
  };
}
export async function dailyStockProjection(input: {
  supplierId: string;
  supplierSku: string;
  requirement?: { quantity: number; stock_unit: "METRE" } | null;
}) {
  const result = await dailyStockPosition(input.supplierId, input.supplierSku);
  const curtainSufficient = input.requirement === undefined || input.requirement === null
    ? true
    : input.requirement.stock_unit === "METRE" && curtainStockSufficient(result.position, input.requirement.quantity);
  const availability = currentDailyStockAvailability(result.decision);
  return {
    availability: availability === "FABRIC_AVAILABLE" && !curtainSufficient
      ? "TEMPORARILY_UNAVAILABLE" as const : availability,
    stale: result.decision.stale,
    sampleStockAvailable: result.sampleStockAvailable,
  };
}
