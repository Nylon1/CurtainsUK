import { loadEnvConfig } from "@next/env";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import { dailyStockPosition } from "../lib/storefront/daily-stock-server";
import { writeFile } from "node:fs/promises";
async function main() {
  loadEnvConfig(process.cwd());
  const db = createSupplierServiceClient();
  if (process.argv.includes("--materialize")) {
    const { data, error } = await db.rpc("materialize_daily_stock");
    if (error) throw new Error(error.message);
    console.log(JSON.stringify(data));
  }
  const { data, error } = await db
    .from("daily_stock_runs")
    .select("supplier_id,snapshot_date,status,imported,error_code")
    .order("snapshot_date", { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);
  const position = await dailyStockPosition(
    "sanderson-design-group",
    "DAPGPA203",
  );
  assert.equal(position.decision.status, "AVAILABLE");
  assert.ok(
    position.cutPriceMinor !== null,
    "Daily price retained where present",
  );
  const { data: usage, error: usageError } = await db
    .from("daily_stock_usage")
    .select("configuration_id");
  assert.equal(usageError, null);
  assert.equal(
    usage?.length,
    0,
    "Only rollback tests performed; no confirmed orders",
  );
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "curtainsuk_private" }, auth: { persistSession: false } },
  );
  const hidden = await anon.from("daily_stock_snapshots").select("*").limit(1);
  assert.ok(hidden.error, "Private stock must not be accessible anonymously");
  await writeFile(
    "artifacts/phase5m/phase5n-daily-status.json",
    JSON.stringify(
      {
        privateRls: "PASS",
        confirmedUsageRows: usage.length,
        pilotState: position.decision.status,
        checkedAt: new Date().toISOString(),
        runs: data,
        upstreamRefresh:
          "BLOCKED: unattended supplier stock sources not configured",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(data));
}
void main();
