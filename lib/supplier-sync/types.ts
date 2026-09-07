export type SupplierSnapshotVerificationStatus = "VERIFIED" | "PARTIALLY_VERIFIED" | "UNVERIFIED";

export type SupplierLifecycleState = "CURRENT" | "DISCONTINUED" | "UNKNOWN";

export type SupplierStockUnit = "METRE" | "YARD" | "ITEM" | "ROLL" | string;

export type SupplierSnapshotSourceType =
  | "MANUAL_PORTAL"
  | "OFFICIAL_API"
  | "OFFICIAL_FEED"
  | "OFFICIAL_CSV"
  | "EDI"
  | "OTHER";

export interface SupplierSnapshotSource {
  type: SupplierSnapshotSourceType;
  name: string;
  reference: string | null;
}

export interface SupplierBatchSnapshot {
  batch_reference: string | null;
  batch_available_quantity: number | null;
  pieces: number | null;
}

/**
 * Supplier-neutral, private server-side contract.
 *
 * Prices are decimal strings in `currency`; quantities are expressed in
 * `stock_unit`. Unknown values are null and must never be inferred by an
 * adapter or downstream consumer.
 */
export interface NormalizedSupplierSnapshot {
  snapshot_id: string;
  supplier_id: string;
  brand_id: string | null;
  supplier_sku: string;
  checked_at: string;
  standard_trade_price: string | null;
  cut_trade_price: string | null;
  currency: string | null;
  stock_unit: SupplierStockUnit | null;
  aggregate_available_quantity: number | null;
  batches: SupplierBatchSnapshot[] | null;
  next_due_date: string | null;
  next_due_quantity: number | null;
  sample_available: boolean | null;
  lifecycle_state: SupplierLifecycleState;
  source: SupplierSnapshotSource;
  verification_status: SupplierSnapshotVerificationStatus;
}

export type SupplierSnapshotInput = Pick<NormalizedSupplierSnapshot,
  "supplier_id" | "supplier_sku" | "checked_at" | "source"
> & Partial<Omit<NormalizedSupplierSnapshot,
  "snapshot_id" | "supplier_id" | "supplier_sku" | "checked_at" | "source"
>> & { snapshot_id?: string };

export type SupplierAdapterMode = "SHADOW";

export interface SupplierAdapterRequest {
  requested_supplier_skus: readonly string[] | null;
  requested_at: string;
}

export type SupplierAdapterResult =
  | { status: "SUCCESS"; snapshots: readonly NormalizedSupplierSnapshot[] }
  | { status: "FAILED"; error_code: string; retryable: boolean };

/** Read-only by design: no ordering, Shopify or scheduling methods belong here. */
export interface SupplierAdapter {
  readonly supplier_id: string;
  readonly mode: SupplierAdapterMode;
  readSnapshots(request: SupplierAdapterRequest): Promise<SupplierAdapterResult>;
}

export type SupplierSyncRunStatus = "SUCCEEDED" | "FAILED";

export interface SupplierSyncRunAudit {
  run_id: string;
  supplier_id: string;
  mode: SupplierAdapterMode;
  started_at: string;
  completed_at: string;
  status: SupplierSyncRunStatus;
  snapshots_received: number;
  snapshots_appended: number;
  error_code: string | null;
  shopify_writes: 0;
  production_schedule_created: false;
}

export type SupplierAvailabilityState =
  | "UNKNOWN"
  | "AVAILABLE"
  | "LOW_STOCK"
  | "INSUFFICIENT_SINGLE_BATCH"
  | "DUE"
  | "TEMPORARILY_UNAVAILABLE"
  | "DISCONTINUED";

export type SupplierCustomerAvailability =
  | "Fabric available"
  | "Limited availability"
  | "Available soon"
  | "Availability to be confirmed"
  | "Temporarily unavailable"
  | "No longer available";

export interface SupplierAvailabilityEvaluation {
  internal_state: SupplierAvailabilityState;
  customer_state: SupplierCustomerAvailability;
  stale: boolean;
  sufficient_single_batch: boolean;
}

export interface SupplierFabricLink {
  fabric_spec_id: string;
  supplier_id: string;
  brand_id: string | null;
  supplier_sku: string;
}
