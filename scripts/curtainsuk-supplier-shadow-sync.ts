import { PrestigiousWebtexAdapter } from "../lib/supplier-sync/adapters/prestigious-webtex";
import { InMemorySupplierSnapshotHistoryStore } from "../lib/supplier-sync/history-store";
import { PRESTIGIOUS_SHADOW_INITIAL_SKUS, validatePrestigiousPilotExpansion } from "../lib/supplier-sync/prestigious-pilot-gate";
import { runSupplierShadowSync } from "../lib/supplier-sync/orchestrator";

async function main() {
  const store = new InMemorySupplierSnapshotHistoryStore();
  const adapter = new PrestigiousWebtexAdapter();
  const run = await runSupplierShadowSync(adapter, store, {
    requested_supplier_skus: PRESTIGIOUS_SHADOW_INITIAL_SKUS,
    requested_at: new Date().toISOString(),
  });
  const snapshots = PRESTIGIOUS_SHADOW_INITIAL_SKUS.flatMap((sku) => store.history(adapter.supplier_id, sku));
  const expansion = validatePrestigiousPilotExpansion(snapshots);

  console.log(JSON.stringify({
    supplier_id: run.supplier_id,
    mode: run.mode,
    status: run.status,
    snapshots_appended: run.snapshots_appended,
    shopify_writes: run.shopify_writes,
    production_schedule_created: run.production_schedule_created,
    pilot_expansion_eligible: expansion.eligible,
    pilot_skus_remaining: expansion.missing_or_unverified_skus.length,
  }, null, 2));
}

void main();
