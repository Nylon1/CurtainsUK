import type { NormalizedSupplierSnapshot, SupplierSyncRunAudit } from "@/lib/supplier-sync/types";

export type PromotionState = "RAW_SHADOW" | "VALIDATED" | "APPROVED_FOR_PROJECTION" | "REJECTED" | "EXPIRED";
export type ValidationStatus = "PENDING" | "VALIDATED" | "FAILED";
export type FreshnessDataType = "STOCK" | "PRICE" | "LIFECYCLE";
export type ApprovalMode = "MANUAL" | "POLICY_BASED";

export interface SupplierFreshnessPolicy {
  policy_id: string;
  supplier_id: string;
  source_type: string;
  data_type: FreshnessDataType;
  freshness_minutes: number;
  effective_from: string;
}

export interface SupplierApprovalPolicy {
  policy_id: string;
  supplier_id: string;
  approval_mode: ApprovalMode;
  required_price_field: SupplierValidationContext["required_price_field"];
  effective_from: string;
}

export interface SupplierValidationPolicy {
  policy_id: string;
  supplier_id: string;
  allowed_currencies: string[];
  allowed_stock_units: string[];
  effective_from: string;
}

export interface SupplierCatalogLink {
  supplier_id: string;
  supplier_sku: string;
  brand_id: string | null;
  fabric_spec_id: string;
  price_verification_status: "VERIFIED" | "PRICE_REQUIRES_VERIFICATION";
}

export interface DurableSupplierSyncRun extends SupplierSyncRunAudit {
  adapter_id: string;
  source_type: string;
  source_name: string;
}

export interface DurableSupplierSnapshot extends NormalizedSupplierSnapshot {
  run_id: string;
  validation_status: ValidationStatus;
  validation_errors: string[];
  initial_promotion_state: "RAW_SHADOW";
  stock_expires_at: string | null;
  price_expires_at: string | null;
  lifecycle_expires_at: string | null;
}

export interface PromotionEvent {
  event_id: string;
  snapshot_id: string;
  promotion_state: PromotionState;
  actor_type: "SYSTEM_VALIDATION" | "MANUAL_STAFF" | "POLICY";
  actor_id: string | null;
  reason: string | null;
  rejection_reason: string | null;
  previous_approved_snapshot_id: string | null;
  created_at: string;
}

export interface SupplierValidationContext {
  known_supplier: boolean;
  known_sku: boolean;
  allowed_currencies: readonly string[];
  allowed_stock_units: readonly string[];
  required_price_field: "STANDARD_TRADE_PRICE" | "CUT_TRADE_PRICE" | null;
  freshness_policies: readonly SupplierFreshnessPolicy[];
}

export interface SupplierValidationResult {
  status: "VALIDATED" | "FAILED";
  errors: string[];
  stock_expires_at: string | null;
  price_expires_at: string | null;
  lifecycle_expires_at: string | null;
}

export type PublicSupplierAvailability =
  | "FABRIC_AVAILABLE"
  | "LIMITED_AVAILABILITY"
  | "AVAILABLE_SOON"
  | "AVAILABILITY_TO_BE_CONFIRMED"
  | "TEMPORARILY_UNAVAILABLE"
  | "NO_LONGER_AVAILABLE";

export interface CustomerSafeSupplierProjection {
  supplier_id: string;
  supplier_sku: string;
  checked_at: string | null;
  availability: PublicSupplierAvailability;
  promotion_state: "APPROVED_FOR_PROJECTION" | "EXPIRED" | "UNAPPROVED";
}

export interface SupplierIntelligenceDataset {
  sync_runs: DurableSupplierSyncRun[];
  snapshots: DurableSupplierSnapshot[];
  promotion_events: PromotionEvent[];
  catalog_links: SupplierCatalogLink[];
}

export interface SupplierChange {
  supplier_id: string;
  supplier_sku: string;
  previous_snapshot_id: string;
  current_snapshot_id: string;
  previous_value: string | number | null;
  current_value: string | number | null;
}

export interface SupplierHealthReport {
  generated_at: string;
  supplier_id: string | null;
  last_successful_run: SupplierSyncRunAudit | null;
  last_failed_run: SupplierSyncRunAudit | null;
  stale_skus: string[];
  expired_skus: string[];
  awaiting_approval_skus: string[];
  awaiting_approval: Array<{ snapshot_id: string; supplier_sku: string; checked_at: string; validation_status: ValidationStatus }>;
  price_verification_required_skus: string[];
  price_increases: SupplierChange[];
  price_decreases: SupplierChange[];
  newly_low_stock: SupplierChange[];
  newly_unavailable: SupplierChange[];
  next_due_changes: SupplierChange[];
  newly_discontinued: SupplierChange[];
  validation_failures: Array<{ snapshot_id: string; supplier_sku: string; errors: string[] }>;
}
