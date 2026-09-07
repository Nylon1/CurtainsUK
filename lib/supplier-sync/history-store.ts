import { validateSupplierSnapshot } from "./normalize";
import type { NormalizedSupplierSnapshot, SupplierSyncRunAudit } from "./types";

export interface SupplierSnapshotHistoryStore {
  appendMany(snapshots: readonly NormalizedSupplierSnapshot[]): void;
  history(supplierId: string, supplierSku: string): NormalizedSupplierSnapshot[];
  latestVerified(supplierId: string, supplierSku: string): NormalizedSupplierSnapshot | null;
  appendRun(run: SupplierSyncRunAudit): void;
  runs(supplierId?: string): SupplierSyncRunAudit[];
}

/** Staging implementation. Production should implement this interface in an append-only private database. */
export class InMemorySupplierSnapshotHistoryStore implements SupplierSnapshotHistoryStore {
  readonly #snapshots: NormalizedSupplierSnapshot[] = [];
  readonly #runs: SupplierSyncRunAudit[] = [];

  appendMany(snapshots: readonly NormalizedSupplierSnapshot[]) {
    const cloned = snapshots.map((snapshot) => structuredClone(snapshot));
    const errors = cloned.flatMap((snapshot) => validateSupplierSnapshot(snapshot).map((error) => `${snapshot.snapshot_id}: ${error}`));
    if (errors.length) throw new Error(`INVALID_SUPPLIER_SNAPSHOT: ${errors.join("; ")}`);
    const existingIds = new Set(this.#snapshots.map((snapshot) => snapshot.snapshot_id));
    if (cloned.some((snapshot) => existingIds.has(snapshot.snapshot_id))) throw new Error("DUPLICATE_SUPPLIER_SNAPSHOT");
    this.#snapshots.push(...cloned);
  }

  history(supplierId: string, supplierSku: string) {
    return this.#snapshots
      .filter((snapshot) => snapshot.supplier_id === supplierId && snapshot.supplier_sku === supplierSku)
      .map((snapshot) => structuredClone(snapshot));
  }

  latestVerified(supplierId: string, supplierSku: string) {
    const candidates = this.#snapshots
      .filter((snapshot) => snapshot.supplier_id === supplierId && snapshot.supplier_sku === supplierSku && snapshot.verification_status === "VERIFIED")
      .sort((a, b) => Date.parse(b.checked_at) - Date.parse(a.checked_at));
    return candidates[0] ? structuredClone(candidates[0]) : null;
  }

  appendRun(run: SupplierSyncRunAudit) {
    this.#runs.push(structuredClone(run));
  }

  runs(supplierId?: string) {
    return this.#runs.filter((run) => !supplierId || run.supplier_id === supplierId).map((run) => structuredClone(run));
  }
}
