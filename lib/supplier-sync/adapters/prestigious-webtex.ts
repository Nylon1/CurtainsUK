import { normalizeSupplierSnapshot } from "../normalize";
import type { NormalizedSupplierSnapshot, SupplierAdapter, SupplierAdapterRequest, SupplierAdapterResult } from "../types";

export const PRESTIGIOUS_SUPPLIER_ID = "prestigious-textiles";
export const PRESTIGIOUS_BRAND_ID = "prestigious-textiles";
export const PRESTIGIOUS_PRICE_VERIFIED_MOCHA_SKUS = ["4269/147", "4270/147", "4271/147"] as const;

export interface PrestigiousWebtexManualObservation {
  supplier_sku: string;
  checked_at: string;
  standard_trade_price?: string | null;
  cut_trade_price?: string | null;
  aggregate_available_metres?: number | null;
  batches?: NormalizedSupplierSnapshot["batches"];
  next_due_date?: string | null;
  next_due_quantity?: number | null;
  sample_available?: boolean | null;
  lifecycle_state?: NormalizedSupplierSnapshot["lifecycle_state"];
  verification_status?: NormalizedSupplierSnapshot["verification_status"];
}

const MANUALLY_VERIFIED_OBSERVATIONS: readonly PrestigiousWebtexManualObservation[] = [
  { supplier_sku: "4269/147", checked_at: "2026-09-06T00:00:00.000Z", standard_trade_price: "24.40", cut_trade_price: "30.50", aggregate_available_metres: 508, verification_status: "VERIFIED" },
  { supplier_sku: "4270/147", checked_at: "2026-09-06T00:00:00.000Z", standard_trade_price: "12.16", cut_trade_price: "15.20", aggregate_available_metres: 290, verification_status: "VERIFIED" },
  { supplier_sku: "4271/147", checked_at: "2026-09-06T00:00:00.000Z", standard_trade_price: "21.84", cut_trade_price: "27.30", aggregate_available_metres: 415, verification_status: "VERIFIED" },
];

function snapshots(observations: readonly PrestigiousWebtexManualObservation[]): NormalizedSupplierSnapshot[] {
  return observations.map((observation) => normalizeSupplierSnapshot({
    supplier_id: PRESTIGIOUS_SUPPLIER_ID,
    brand_id: PRESTIGIOUS_BRAND_ID,
    supplier_sku: observation.supplier_sku,
    checked_at: observation.checked_at,
    standard_trade_price: observation.standard_trade_price,
    cut_trade_price: observation.cut_trade_price,
    currency: "GBP",
    stock_unit: "METRE",
    aggregate_available_quantity: observation.aggregate_available_metres,
    batches: observation.batches,
    next_due_date: observation.next_due_date,
    next_due_quantity: observation.next_due_quantity,
    sample_available: observation.sample_available,
    lifecycle_state: observation.lifecycle_state,
    source: { type: "MANUAL_PORTAL", name: "Prestigious Webtex manual verification", reference: null },
    verification_status: observation.verification_status,
  }));
}

/**
 * Adapter #1 consumes authorised manual observations only. It performs no
 * network automation and contains no Webtex endpoint, session or ordering code.
 */
export class PrestigiousWebtexAdapter implements SupplierAdapter {
  readonly supplier_id = PRESTIGIOUS_SUPPLIER_ID;
  readonly mode = "SHADOW" as const;

  constructor(private readonly observations: readonly PrestigiousWebtexManualObservation[] = MANUALLY_VERIFIED_OBSERVATIONS) {}

  async readSnapshots(request: SupplierAdapterRequest): Promise<SupplierAdapterResult> {
    const allowed = new Set<string>(request.requested_supplier_skus ?? PRESTIGIOUS_PRICE_VERIFIED_MOCHA_SKUS);
    return { status: "SUCCESS", snapshots: snapshots(this.observations).filter((snapshot) => allowed.has(snapshot.supplier_sku)) };
  }
}
