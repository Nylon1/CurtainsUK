import "server-only";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import { normalizeSupplierSnapshot } from "@/lib/supplier-sync/normalize";
import type { NormalizedSupplierSnapshot } from "@/lib/supplier-sync/types";
import type { SupplierBulkAppendItem } from "@/lib/supplier-import/types";
import type { SupplierIntelligenceRepository } from "./repository";
import type {
  DurableSupplierSnapshot,
  DurableSupplierSyncRun,
  PromotionEvent,
  SupplierApprovalPolicy,
  SupplierCatalogLink,
  SupplierFreshnessPolicy,
  SupplierIntelligenceDataset,
  SupplierValidationContext,
  SupplierValidationPolicy,
  SupplierValidationResult,
} from "./types";

type Row = Record<string, unknown>;

function databaseError(error: { message?: string } | null) {
  if (error) throw new Error("SUPPLIER_DATABASE_OPERATION_FAILED");
}

function durableSnapshot(row: Row): DurableSupplierSnapshot {
  const payload = row.normalized_payload as Partial<NormalizedSupplierSnapshot>;
  const normalized = normalizeSupplierSnapshot({
    ...payload,
    snapshot_id: String(row.snapshot_id),
    supplier_id: String(row.supplier_id),
    brand_id: row.brand_id === null ? null : String(row.brand_id),
    supplier_sku: String(row.supplier_sku),
    checked_at: String(row.checked_at),
    source: {
      type: String(row.source_type) as NormalizedSupplierSnapshot["source"]["type"],
      name: String(row.source_name),
      reference: row.source_reference === null ? null : String(row.source_reference),
    },
  });
  return {
    ...normalized,
    run_id: String(row.run_id),
    validation_status: String(row.validation_status) as DurableSupplierSnapshot["validation_status"],
    validation_errors: Array.isArray(row.validation_errors) ? row.validation_errors.map(String) : [],
    initial_promotion_state: "RAW_SHADOW",
    stock_expires_at: row.stock_expires_at === null ? null : String(row.stock_expires_at),
    price_expires_at: row.price_expires_at === null ? null : String(row.price_expires_at),
    lifecycle_expires_at: row.lifecycle_expires_at === null ? null : String(row.lifecycle_expires_at),
  };
}

function promotionEvent(row: Row): PromotionEvent {
  return {
    event_id: String(row.event_id),
    snapshot_id: String(row.snapshot_id),
    promotion_state: String(row.promotion_state) as PromotionEvent["promotion_state"],
    actor_type: String(row.actor_type) as PromotionEvent["actor_type"],
    actor_id: row.actor_id === null ? null : String(row.actor_id),
    reason: row.reason === null ? null : String(row.reason),
    rejection_reason: row.rejection_reason === null ? null : String(row.rejection_reason),
    previous_approved_snapshot_id: row.previous_approved_snapshot_id === null ? null : String(row.previous_approved_snapshot_id),
    created_at: String(row.created_at),
  };
}

export class SupabaseSupplierIntelligenceRepository implements SupplierIntelligenceRepository {
  async appendSyncRun(run: DurableSupplierSyncRun) {
    const { error } = await createSupplierServiceClient().from("supplier_sync_runs").insert(run);
    databaseError(error);
  }

  async validationContext(input: { supplierId: string; supplierSku: string; sourceType: string; requiredPriceField: SupplierValidationContext["required_price_field"] }) {
    const database = createSupplierServiceClient();
    const [supplier, sku, freshnessPolicies, validationPolicy] = await Promise.all([
      database.from("suppliers").select("supplier_id").eq("supplier_id", input.supplierId).maybeSingle(),
      database.from("fabric_supplier_links").select("supplier_sku").eq("supplier_id", input.supplierId).eq("supplier_sku", input.supplierSku).maybeSingle(),
      database.from("supplier_freshness_policies").select("policy_id,supplier_id,source_type,data_type,freshness_minutes,effective_from").eq("supplier_id", input.supplierId).eq("source_type", input.sourceType),
      database.from("supplier_validation_policies").select("policy_id,supplier_id,allowed_currencies,allowed_stock_units,effective_from").eq("supplier_id", input.supplierId).order("effective_from", { ascending: false }).limit(1).maybeSingle(),
    ]);
    databaseError(supplier.error); databaseError(sku.error); databaseError(freshnessPolicies.error); databaseError(validationPolicy.error);
    const policy = validationPolicy.data as SupplierValidationPolicy | null;
    return {
      known_supplier: Boolean(supplier.data),
      known_sku: Boolean(sku.data),
      allowed_currencies: policy?.allowed_currencies ?? [],
      allowed_stock_units: policy?.allowed_stock_units ?? [],
      required_price_field: input.requiredPriceField,
      freshness_policies: (freshnessPolicies.data ?? []) as SupplierFreshnessPolicy[],
    };
  }

  async appendValidatedSnapshot(input: { run: DurableSupplierSyncRun; snapshot: NormalizedSupplierSnapshot; validation: SupplierValidationResult; validationEvent: PromotionEvent }) {
    const database = createSupplierServiceClient();
    const payload = {
      ...input.snapshot,
      run_id: input.run.run_id,
      source_type: input.snapshot.source.type,
      source_name: input.snapshot.source.name,
      source_reference: input.snapshot.source.reference,
      validation_status: input.validation.status,
      validation_errors: input.validation.errors,
      stock_expires_at: input.validation.stock_expires_at,
      price_expires_at: input.validation.price_expires_at,
      lifecycle_expires_at: input.validation.lifecycle_expires_at,
      normalized_payload: input.snapshot,
    };
    const { error } = await database.rpc("append_validated_supplier_snapshot", { p_run: input.run, p_snapshot: payload, p_validation_event: input.validationEvent });
    databaseError(error);
  }

  async appendBulkValidatedSnapshots(input: { run: DurableSupplierSyncRun; items: SupplierBulkAppendItem[] }) {
    const items = input.items.map((item) => ({
      snapshot: {
        ...item.snapshot,
        run_id: input.run.run_id,
        source_type: item.snapshot.source.type,
        source_name: item.snapshot.source.name,
        source_reference: item.snapshot.source.reference,
        validation_status: item.validation.status,
        validation_errors: item.validation.errors,
        stock_expires_at: item.validation.stock_expires_at,
        price_expires_at: item.validation.price_expires_at,
        lifecycle_expires_at: item.validation.lifecycle_expires_at,
        normalized_payload: item.snapshot,
      },
      validation_event: item.validation_event,
    }));
    const { error } = await createSupplierServiceClient().rpc("append_supplier_snapshot_batch", { p_run: input.run, p_items: items });
    databaseError(error);
  }

  async appendPromotionEvent(event: PromotionEvent) {
    const { error } = await createSupplierServiceClient().from("supplier_promotion_events").insert(event);
    databaseError(error);
  }

  async snapshot(snapshotId: string) {
    const { data, error } = await createSupplierServiceClient().from("supplier_snapshots").select("*").eq("snapshot_id", snapshotId).maybeSingle();
    databaseError(error);
    return data ? durableSnapshot(data as Row) : null;
  }

  async promotionEvents(snapshotId?: string) {
    let query = createSupplierServiceClient().from("supplier_promotion_events").select("*").order("created_at", { ascending: true });
    if (snapshotId) query = query.eq("snapshot_id", snapshotId);
    const { data, error } = await query;
    databaseError(error);
    return ((data ?? []) as Row[]).map(promotionEvent);
  }

  async previousApprovedSnapshotId(snapshot: DurableSupplierSnapshot) {
    const data = await this.dataset(snapshot.supplier_id);
    const snapshotIds = new Set(data.snapshots.filter((item) => item.supplier_sku === snapshot.supplier_sku && item.snapshot_id !== snapshot.snapshot_id).map((item) => item.snapshot_id));
    return data.promotion_events
      .filter((event) => event.promotion_state === "APPROVED_FOR_PROJECTION" && snapshotIds.has(event.snapshot_id))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]?.snapshot_id ?? null;
  }

  async dataset(supplierId?: string): Promise<SupplierIntelligenceDataset> {
    const database = createSupplierServiceClient();
    let runQuery = database.from("supplier_sync_runs").select("*");
    let snapshotQuery = database.from("supplier_snapshots").select("*");
    let linkQuery = database.from("fabric_supplier_links").select("*");
    if (supplierId) {
      runQuery = runQuery.eq("supplier_id", supplierId);
      snapshotQuery = snapshotQuery.eq("supplier_id", supplierId);
      linkQuery = linkQuery.eq("supplier_id", supplierId);
    }
    const [runs, snapshots, links, events] = await Promise.all([runQuery, snapshotQuery, linkQuery, database.from("supplier_promotion_events").select("*")]);
    databaseError(runs.error); databaseError(snapshots.error); databaseError(links.error); databaseError(events.error);
    return {
      sync_runs: (runs.data ?? []) as DurableSupplierSyncRun[],
      snapshots: ((snapshots.data ?? []) as Row[]).map(durableSnapshot),
      promotion_events: ((events.data ?? []) as Row[]).map(promotionEvent),
      catalog_links: (links.data ?? []) as SupplierCatalogLink[],
    };
  }

  async approvalPolicy(supplierId: string): Promise<SupplierApprovalPolicy | null> {
    const { data, error } = await createSupplierServiceClient().from("supplier_approval_policies").select("*").eq("supplier_id", supplierId).order("effective_from", { ascending: false }).limit(1).maybeSingle();
    databaseError(error);
    return data as SupplierApprovalPolicy | null;
  }
}
