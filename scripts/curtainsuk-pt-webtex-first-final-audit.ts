import { performance } from "node:perf_hooks";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";

type Row = Record<string, unknown>;
const manifestPath = "artifacts/pt-webtex-first/webtex-first-resolution-manifest.json";
const output = "artifacts/pt-webtex-first/webtex-first-final-audit.json";

function assertTarget() {
  const url = process.env.SUPABASE_URL ?? "";
  if (new URL(url).hostname !== "hqysjumypgeapgmqkcrx.supabase.co") throw new Error("PT_WEBTEX_FIRST_TARGET_REJECTED");
}
function groups<T>(values: readonly T[], size = 100) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}
async function grouped<T>(values: readonly string[], query: (group: string[]) => Promise<{ data: T[] | null; error: { code?: string } | null }>) {
  const rows: T[] = [];
  for (const group of groups(values)) {
    const result = await query(group);
    if (result.error) throw new Error(`PT_FINAL_AUDIT_READ_FAILED_${result.error.code ?? "UNKNOWN"}`);
    rows.push(...(result.data ?? []));
  }
  return rows;
}
async function timedFetch(url: string) {
  const started = performance.now();
  const response = await fetch(url, { redirect: "follow", headers: { "user-agent": "CurtainsUK governed final audit" } });
  const body = await response.text();
  return { url, status: response.status, duration_ms: Math.round(performance.now() - started), bytes: Buffer.byteLength(body), body };
}
async function main() {
  assertTarget();
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { items: Array<{ supplier_sku: string; status: "DATA" | "ERROR"; supplier_lifecycle?: string }> };
  const db = createSupplierServiceClient();
  const masters: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const result = await db.from("fabric_colourways")
      .select("fabric_id,supplier_sku,lifecycle_state,staging_catalog_visible,storefront_selectable,price_verification_status,imagery")
      .eq("supplier_id", "prestigious-textiles").order("supplier_sku").range(from, from + 999);
    if (result.error) throw new Error(`PT_FINAL_AUDIT_MASTER_READ_FAILED_${result.error.code ?? "UNKNOWN"}`);
    masters.push(...(result.data ?? []));
    if ((result.data ?? []).length < 1000) break;
  }
  const skuCounts = new Map<string, number>();
  for (const row of masters) skuCounts.set(String(row.supplier_sku), (skuCounts.get(String(row.supplier_sku)) ?? 0) + 1);
  const visible = masters.filter((row) => row.staging_catalog_visible === true && row.lifecycle_state !== "DISCONTINUED");
  const visibleIds = visible.map((row) => String(row.fabric_id));
  const visibleSkus = visible.map((row) => String(row.supplier_sku));
  const media = await grouped<Row>(visibleIds, async (group) => db.from("fabric_media_mappings")
    .select("fabric_id,supplier_sku,fabric_media_assets!inner(shopify_cdn_url,width,height)")
    .eq("supplier_id", "prestigious-textiles").eq("rights_state", "APPROVED").eq("mapping_state", "VERIFIED").in("fabric_id", group));
  const mediaIds = new Set(media.map((row) => String(row.fabric_id)));
  const knowledge = await grouped<Row>(visibleIds, async (group) => db.from("fabric_visual_knowledge_read_cache")
    .select("fabric_id,knowledge_state").in("fabric_id", group).in("knowledge_state", ["COMPLETE", "PARTIAL_GOVERNED"]));
  const knowledgeIds = new Set(knowledge.map((row) => String(row.fabric_id)));
  const profiles = await grouped<Row>(visibleIds, async (group) => db.from("fabric_retail_profiles").select("fabric_id").in("fabric_id", group));
  const profileIds = new Set(profiles.map((row) => String(row.fabric_id)));
  const stockCutoff = new Date(Date.now() - 92 * 60 * 60 * 1000).toISOString();
  const stockCheckedAt = new Date().toISOString();
  const stocks = await grouped<Row>(visibleSkus, async (group) => db.from("daily_stock_snapshots")
    .select("supplier_sku,checked_at,aggregate_metres,source_snapshot_id")
    .eq("supplier_id", "prestigious-textiles").in("supplier_sku", group)
    .gte("checked_at", stockCutoff).lte("checked_at", stockCheckedAt));
  const latestStock = new Map<string, Row>();
  for (const row of stocks) {
    const sku = String(row.supplier_sku), prior = latestStock.get(sku);
    if (!prior || Date.parse(String(row.checked_at)) > Date.parse(String(prior.checked_at))) latestStock.set(sku, row);
  }
  const stockWithin92Hours = visibleSkus.filter((sku) => {
    const row = latestStock.get(sku);
    return row && Date.parse(String(row.checked_at)) >= Date.now() - 92 * 60 * 60 * 1000 && Date.parse(String(row.checked_at)) <= Date.now();
  });
  const fullRuns = await db.from("supplier_sync_runs").select("run_id,status,started_at,completed_at,error_code,snapshots_received,snapshots_appended")
    .eq("supplier_id", "prestigious-textiles").eq("adapter_id", "pt-webtex-full-refresh").order("completed_at", { ascending: false }).limit(5);
  if (fullRuns.error) throw new Error(`PT_FINAL_AUDIT_RUN_READ_FAILED_${fullRuns.error.code ?? "UNKNOWN"}`);

  const browseTimings: number[] = [];
  let browse: Record<string, unknown> | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const started = performance.now();
    const result = await db.rpc("search_retail_fabrics", { p_filters: { brand: "Prestigious Textiles" }, p_page: 1, p_size: 48, p_guide_min: null, p_guide_max: null });
    browseTimings.push(Math.round(performance.now() - started));
    if (result.error) throw new Error(`PT_FINAL_AUDIT_BROWSE_RPC_FAILED_${result.error.code ?? "UNKNOWN"}`);
    browse = result.data as Record<string, unknown>;
  }
  const sample = visible.slice(0, 5);
  const exactResults = [];
  for (const row of sample) {
    const result = await db.rpc("search_retail_fabrics", { p_filters: { query: row.supplier_sku }, p_page: 1, p_size: 48, p_guide_min: null, p_guide_max: null });
    if (result.error) throw new Error(`PT_FINAL_AUDIT_EXACT_BROWSE_FAILED_${result.error.code ?? "UNKNOWN"}`);
    exactResults.push({ supplier_sku: row.supplier_sku, expected: row.fabric_id, ids: (result.data as { ids?: string[] })?.ids ?? [] });
  }
  const publicBrowse = [];
  const guided = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    publicBrowse.push(await timedFetch("https://www.curtainsuk.com/pages/fabric-library?view=browse-fabrics&page=1"));
    guided.push(await timedFetch("https://www.curtainsuk.com/apps/curtainsuk-decision/consultation?experience=premium&entry=guided"));
  }
  const withoutBody = (row: Awaited<ReturnType<typeof timedFetch>>) => ({
    url: row.url,
    status: row.status,
    duration_ms: row.duration_ms,
    bytes: row.bytes,
  });
  const publicBrowseSafe = publicBrowse.map(withoutBody);
  const guidedSafe = guided.map(withoutBody);
  const guidedContentPass = guided.every((row) => row.status === 200 && /curtainsuk-premium-root|Fabric Intelligence/i.test(row.body));
  const resolved = manifest.items.filter((item) => item.status === "DATA" && item.supplier_lifecycle === "DISCONTINUED").length;
  const exceptions = manifest.items.filter((item) => item.status === "ERROR").length;
  const report = {
    checked_at: new Date().toISOString(),
    total_pt_masters: masters.length,
    total_pt_live: visible.length,
    discontinued_hidden: masters.filter((row) => row.lifecycle_state === "DISCONTINUED" && row.staging_catalog_visible !== true).length,
    duplicates: [...skuCounts.values()].filter((count) => count > 1).length,
    released_from_old_method: 556,
    webtex_first_resolved: resolved,
    true_remaining_exceptions: exceptions,
    unaccounted: 960 - resolved - exceptions,
    live_media: `${visible.filter((row) => mediaIds.has(String(row.fabric_id))).length}/${visible.length}`,
    live_price_flag: `${visible.filter((row) => row.price_verification_status === "VERIFIED").length}/${visible.length}`,
    live_fabric_knowledge: `${visible.filter((row) => profileIds.has(String(row.fabric_id))).length}/${visible.length}`,
    live_visual_knowledge_cache: `${visible.filter((row) => knowledgeIds.has(String(row.fabric_id))).length}/${visible.length}`,
    live_stock_within_92_hours: `${stockWithin92Hours.length}/${visible.length}`,
    latest_full_stock_runs: fullRuns.data ?? [],
    browse_rpc_total: Number(browse?.total ?? -1),
    browse_rpc_timings_ms: browseTimings,
    exact_sku_samples: exactResults,
    public_browse: publicBrowseSafe,
    guided_fi: guidedSafe,
    guided_fi_content_pass: guidedContentPass,
    catalogue_integrity_pass: visible.length === 556 && [...skuCounts.values()].every((count) => count === 1) && visible.every((row) => mediaIds.has(String(row.fabric_id))),
    browse_functionality_pass: Number(browse?.total ?? -1) === visible.length && exactResults.every((row) => row.ids.length === 1 && row.ids[0] === row.expected),
    browse_speed_pass: publicBrowse.every((row) => row.status === 200 && row.duration_ms < 3_000) && browseTimings.every((duration) => duration < 3_000),
    stock_refresh_inclusion_pass: stockWithin92Hours.length === visible.length,
    scheduler_health_basis: "GitHub PT stock workflow state and latest scheduled run are verified outside this database report.",
  };
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ ...report, latest_full_stock_runs: undefined, exact_sku_samples: undefined, public_browse: undefined, guided_fi: undefined }));
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : "PT_WEBTEX_FIRST_FINAL_AUDIT_FAILED"); process.exitCode = 1; });
