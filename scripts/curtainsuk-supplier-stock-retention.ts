import { createSupplierServiceClient } from "../lib/supabase/supplier-service";

type SupplierConfig = {
  supplierId: "prestigious-textiles" | "sanderson-design-group";
  batchSize: number;
};

type RetentionResult = {
  supplier?: string;
  supplier_snapshots_deleted?: number;
  current_materialized_protected?: number;
  business_snapshot_refs_protected?: number;
  has_more?: boolean;
};

const configs: SupplierConfig[] = [
  { supplierId: "prestigious-textiles", batchSize: 5000 },
  { supplierId: "sanderson-design-group", batchSize: 3000 },
];

function assertConfiguration() {
  const url = process.env.SUPABASE_URL;
  const ref = process.env.CURTAINSUK_SUPABASE_PROJECT_REF;
  if (!url || ref !== "hqysjumypgeapgmqkcrx" || new URL(url).hostname !== `${ref}.supabase.co` ||
      !process.env.SUPABASE_SECRET_KEY) {
    throw new Error("STOCK_RETENTION_PRODUCTION_CONFIGURATION_REQUIRED");
  }
}

async function compact(config: SupplierConfig) {
  const db = createSupplierServiceClient();
  let deleted = 0;
  let batches = 0;
  let last: RetentionResult | null = null;

  for (; batches < 50; batches += 1) {
    const { data, error } = await db.rpc("compact_supplier_stock_evidence", {
      p_supplier_id: config.supplierId,
      p_limit: config.batchSize,
      p_dry_run: false,
    });

    if (error) {
      const message = String(error.message ?? "");
      if (message.includes("STOCK_RETENTION_CURRENT_SUCCESS_REQUIRED")) {
        console.log(JSON.stringify({
          event: "SUPPLIER_STOCK_RETENTION_SKIPPED",
          supplier: config.supplierId,
          reason: "NO_CURRENT_SUCCESS_WITHIN_VALIDITY_WINDOW",
        }));
        return;
      }
      throw new Error(`STOCK_RETENTION_FAILED:${config.supplierId}:${message}`);
    }

    last = data as RetentionResult | null;
    deleted += Number(last?.supplier_snapshots_deleted ?? 0);
    if (!last?.has_more) {
      console.log(JSON.stringify({
        event: "SUPPLIER_STOCK_RETENTION_COMPLETE",
        supplier: config.supplierId,
        deleted,
        batches: batches + 1,
        currentProtected: Number(last?.current_materialized_protected ?? 0),
        businessProtected: Number(last?.business_snapshot_refs_protected ?? 0),
      }));
      return;
    }
  }

  throw new Error(`STOCK_RETENTION_BATCH_LIMIT:${config.supplierId}`);
}

async function main() {
  assertConfiguration();
  for (const config of configs) await compact(config);
}

void main();
