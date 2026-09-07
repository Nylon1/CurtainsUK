import type { SupplierSnapshotHistoryStore } from "./history-store";
import { validateSupplierSnapshot } from "./normalize";
import type { SupplierAdapter, SupplierAdapterRequest, SupplierSyncRunAudit } from "./types";

function runId(supplierId: string, startedAt: string) {
  return `${supplierId}:${startedAt}`;
}

export async function runSupplierShadowSync(
  adapter: SupplierAdapter,
  store: SupplierSnapshotHistoryStore,
  request: SupplierAdapterRequest,
  clock: () => Date = () => new Date(),
): Promise<SupplierSyncRunAudit> {
  const startedAt = clock().toISOString();
  const base = {
    run_id: runId(adapter.supplier_id, startedAt),
    supplier_id: adapter.supplier_id,
    mode: "SHADOW" as const,
    started_at: startedAt,
    shopify_writes: 0 as const,
    production_schedule_created: false as const,
  };

  try {
    if (adapter.mode !== "SHADOW") throw new Error("NON_SHADOW_ADAPTER_BLOCKED");
    const adapterResult = await adapter.readSnapshots(request);
    if (adapterResult.status === "FAILED") {
      const failed: SupplierSyncRunAudit = { ...base, completed_at: clock().toISOString(), status: "FAILED", snapshots_received: 0, snapshots_appended: 0, error_code: adapterResult.error_code };
      store.appendRun(failed);
      return failed;
    }
    const validationErrors = adapterResult.snapshots.flatMap((snapshot) => validateSupplierSnapshot(snapshot));
    if (validationErrors.length) throw new Error("INVALID_ADAPTER_SNAPSHOT");
    store.appendMany(adapterResult.snapshots);
    const succeeded: SupplierSyncRunAudit = { ...base, completed_at: clock().toISOString(), status: "SUCCEEDED", snapshots_received: adapterResult.snapshots.length, snapshots_appended: adapterResult.snapshots.length, error_code: null };
    store.appendRun(succeeded);
    return succeeded;
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : "SUPPLIER_SYNC_FAILED";
    const failed: SupplierSyncRunAudit = { ...base, completed_at: clock().toISOString(), status: "FAILED", snapshots_received: 0, snapshots_appended: 0, error_code: code };
    store.appendRun(failed);
    return failed;
  }
}
