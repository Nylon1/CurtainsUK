import "server-only";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import { dailyStockDecision } from "./daily-stock";
export async function dailyStockPosition(
  supplierId: string,
  supplierSku: string,
) {
  const { data, error } = await createSupplierServiceClient().rpc(
    "daily_stock_position",
    { p_supplier: supplierId, p_sku: supplierSku },
  );
  if (error) throw new Error("DAILY_STOCK_READ_UNAVAILABLE");
  const row = data as {
    aggregateMetres: number;
    confirmedUsageMetres: number;
    snapshotDate: string;
    checkedAt: string;
    cutPriceMinor: number | null;
    discontinued: boolean;
    refreshFailed: boolean;
  } | null;
  return {
    decision: dailyStockDecision(
      row ?? {
        aggregateMetres: null,
        confirmedUsageMetres: 0,
        snapshotDate: null,
        discontinued: false,
      },
    ),
    cutPriceMinor: row?.cutPriceMinor ?? null,
    checkedAt: row?.checkedAt ?? null,
  };
}
export async function dailyStockProjection(input: {
  supplierId: string;
  supplierSku: string;
  requirement?: unknown;
}) {
  const result = await dailyStockPosition(input.supplierId, input.supplierSku);
  return {
    availability: result.decision.availability,
    stale: result.decision.stale,
  };
}
