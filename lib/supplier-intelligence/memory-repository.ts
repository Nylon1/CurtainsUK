import type { NormalizedSupplierSnapshot } from "@/lib/supplier-sync/types";
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
  SupplierValidationResult,
} from "./types";

export class InMemorySupplierIntelligenceRepository implements SupplierIntelligenceRepository {
  readonly #supplierIds: Set<string>;
  readonly #links: SupplierCatalogLink[];
  readonly #freshness: SupplierFreshnessPolicy[];
  readonly #approval: SupplierApprovalPolicy[];
  readonly #runs: DurableSupplierSyncRun[] = [];
  readonly #snapshots: DurableSupplierSnapshot[] = [];
  readonly #events: PromotionEvent[] = [];

  constructor(input: { suppliers: string[]; links: SupplierCatalogLink[]; freshness: SupplierFreshnessPolicy[]; approval: SupplierApprovalPolicy[] }) {
    this.#supplierIds = new Set(input.suppliers);
    this.#links = structuredClone(input.links);
    this.#freshness = structuredClone(input.freshness);
    this.#approval = structuredClone(input.approval);
  }

  async appendSyncRun(run: DurableSupplierSyncRun) {
    if (this.#runs.some((item) => item.run_id === run.run_id)) throw new Error("APPEND_ONLY_CONFLICT");
    this.#runs.push(structuredClone(run));
  }

  async validationContext(input: { supplierId: string; supplierSku: string; sourceType: string; requiredPriceField: SupplierValidationContext["required_price_field"] }) {
    return {
      known_supplier: this.#supplierIds.has(input.supplierId),
      known_sku: this.#links.some((link) => link.supplier_id === input.supplierId && link.supplier_sku === input.supplierSku),
      allowed_currencies: ["GBP"],
      allowed_stock_units: ["METRE"],
      required_price_field: input.requiredPriceField,
      freshness_policies: this.#freshness.filter((policy) => policy.supplier_id === input.supplierId && policy.source_type === input.sourceType),
    };
  }

  async appendValidatedSnapshot(input: { run: DurableSupplierSyncRun; snapshot: NormalizedSupplierSnapshot; validation: SupplierValidationResult; validationEvent: PromotionEvent }) {
    if (this.#runs.some((run) => run.run_id === input.run.run_id) || this.#snapshots.some((snapshot) => snapshot.snapshot_id === input.snapshot.snapshot_id)) throw new Error("APPEND_ONLY_CONFLICT");
    this.#runs.push(structuredClone(input.run));
    this.#snapshots.push({
      ...structuredClone(input.snapshot),
      run_id: input.run.run_id,
      validation_status: input.validation.status,
      validation_errors: [...input.validation.errors],
      initial_promotion_state: "RAW_SHADOW",
      stock_expires_at: input.validation.stock_expires_at,
      price_expires_at: input.validation.price_expires_at,
      lifecycle_expires_at: input.validation.lifecycle_expires_at,
    });
    this.#events.push(structuredClone(input.validationEvent));
  }

  async appendPromotionEvent(event: PromotionEvent) {
    if (this.#events.some((item) => item.event_id === event.event_id)) throw new Error("APPEND_ONLY_CONFLICT");
    this.#events.push(structuredClone(event));
  }

  async snapshot(snapshotId: string) {
    const item = this.#snapshots.find((snapshot) => snapshot.snapshot_id === snapshotId);
    return item ? structuredClone(item) : null;
  }

  async promotionEvents(snapshotId?: string) {
    return this.#events.filter((event) => !snapshotId || event.snapshot_id === snapshotId).map((event) => structuredClone(event));
  }

  async previousApprovedSnapshotId(snapshot: DurableSupplierSnapshot) {
    const snapshotIds = new Set(this.#snapshots.filter((item) => item.supplier_id === snapshot.supplier_id && item.supplier_sku === snapshot.supplier_sku && item.snapshot_id !== snapshot.snapshot_id).map((item) => item.snapshot_id));
    return this.#events.filter((event) => event.promotion_state === "APPROVED_FOR_PROJECTION" && snapshotIds.has(event.snapshot_id)).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]?.snapshot_id ?? null;
  }

  async approvalPolicy(supplierId: string) {
    return structuredClone(this.#approval.filter((policy) => policy.supplier_id === supplierId).sort((a, b) => Date.parse(b.effective_from) - Date.parse(a.effective_from))[0] ?? null);
  }

  async dataset(supplierId?: string): Promise<SupplierIntelligenceDataset> {
    const snapshots = this.#snapshots.filter((snapshot) => !supplierId || snapshot.supplier_id === supplierId);
    const snapshotIds = new Set(snapshots.map((snapshot) => snapshot.snapshot_id));
    return structuredClone({
      sync_runs: this.#runs.filter((run) => !supplierId || run.supplier_id === supplierId),
      snapshots,
      promotion_events: this.#events.filter((event) => snapshotIds.has(event.snapshot_id)),
      catalog_links: this.#links.filter((link) => !supplierId || link.supplier_id === supplierId),
    });
  }
}
