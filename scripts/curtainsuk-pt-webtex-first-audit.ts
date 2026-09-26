import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { verifiedSupplierCostMinor } from "../lib/fabric-master/repository";

type ManifestItem = {
  supplier_sku: string;
  fabric_id: string | null;
  scope: "OLD_METHOD_EXCEPTION" | "UNTOUCHED";
  status: "DATA" | "ERROR";
};

const input = process.argv.find((value) => value.startsWith("--manifest="))?.slice(11)
  ?? "artifacts/pt-webtex-first/webtex-first-resolution-manifest.json";
const output = process.argv.find((value) => value.startsWith("--out="))?.slice(6)
  ?? "artifacts/pt-webtex-first/webtex-first-gate-audit.json";

function assertTarget() {
  const url = process.env.SUPABASE_URL ?? "";
  if (new URL(url).hostname !== "hqysjumypgeapgmqkcrx.supabase.co") throw new Error("PT_WEBTEX_FIRST_TARGET_REJECTED");
}

function groups<T>(values: readonly T[], size = 100) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function queryGroups<T>(values: readonly string[], query: (group: string[]) => Promise<{ data: T[] | null; error: { code?: string } | null }>) {
  const rows: T[] = [];
  for (const group of groups(values)) {
    const result = await query(group);
    if (result.error) throw new Error(`PT_WEBTEX_FIRST_AUDIT_READ_FAILED_${result.error.code ?? "UNKNOWN"}`);
    rows.push(...(result.data ?? []));
  }
  return rows;
}

async function boundedMap<T, R>(values: readonly T[], limit: number, fn: (value: T) => Promise<R>) {
  const result = new Array<R>(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= values.length) return;
      result[index] = await fn(values[index]);
    }
  }));
  return result;
}

async function main() {
  assertTarget();
  const parsed = JSON.parse(await readFile(input, "utf8")) as { items: ManifestItem[] };
  if (parsed.items.length !== 960 || new Set(parsed.items.map((item) => item.supplier_sku)).size !== 960) throw new Error("PT_WEBTEX_FIRST_MANIFEST_INVALID");
  const db = createSupplierServiceClient();
  const skus = parsed.items.map((item) => item.supplier_sku);
  const masters = await queryGroups(skus, async (group) => db.from("fabric_colourways")
    .select("fabric_id,supplier_sku,design_id,colour_name,lifecycle_state,staging_catalog_visible,storefront_selectable,imagery,price_verification_status,updated_at")
    .eq("supplier_id", "prestigious-textiles").in("supplier_sku", group));
  const masterBySku = new Map<string, typeof masters>();
  for (const master of masters) {
    const sku = String((master as { supplier_sku: string }).supplier_sku);
    masterBySku.set(sku, [...(masterBySku.get(sku) ?? []), master]);
  }
  const fabricIds = masters.map((master) => String((master as { fabric_id: string }).fabric_id));
  const media = await queryGroups(fabricIds, async (group) => db.from("fabric_media_mappings")
    .select("fabric_id,supplier_sku,image_type,rights_state,mapping_state,fabric_media_assets!inner(shopify_cdn_url,width,height)")
    .eq("supplier_id", "prestigious-textiles").eq("rights_state", "APPROVED").eq("mapping_state", "VERIFIED").in("fabric_id", group));
  const profiles = await queryGroups(fabricIds, async (group) => db.from("fabric_retail_profiles").select("fabric_id,description_validated").in("fabric_id", group));
  const ledger = await queryGroups(fabricIds, async (group) => db.from("fabric_visual_enrichment_ledger")
    .select("fabric_id,supplier_sku,approval_state,review_state,analysed_at")
    .eq("supplier_id", "prestigious-textiles").eq("approval_state", "APPROVED").is("superseded_at", null).in("fabric_id", group));
  const stock = await queryGroups(skus, async (group) => db.from("daily_stock_snapshots")
    .select("supplier_sku,checked_at,aggregate_metres,source_snapshot_id").eq("supplier_id", "prestigious-textiles").in("supplier_sku", group));

  const mediaIds = new Set(media.map((row) => String((row as { fabric_id: string }).fabric_id)));
  const profileIds = new Set(profiles.map((row) => String((row as { fabric_id: string }).fabric_id)));
  const ledgerIds = new Set(ledger.map((row) => String((row as { fabric_id: string }).fabric_id)));
  const latestStock = new Map<string, { checked_at: string; aggregate_metres: number | null; source_snapshot_id: string }>();
  for (const row of stock as Array<{ supplier_sku: string; checked_at: string; aggregate_metres: number | null; source_snapshot_id: string }>) {
    const prior = latestStock.get(row.supplier_sku);
    if (!prior || Date.parse(row.checked_at) > Date.parse(prior.checked_at)) latestStock.set(row.supplier_sku, row);
  }
  const dataItems = parsed.items.filter((item) => item.status === "DATA");
  const prices = await boundedMap(dataItems, 8, async (item) => {
    try { return { sku: item.supplier_sku, ready: (await verifiedSupplierCostMinor("prestigious-textiles", item.supplier_sku)) > 0 }; }
    catch (error) { return { sku: item.supplier_sku, ready: false, code: error instanceof Error ? error.message : "PRICE_READ_FAILED" }; }
  });
  const priceBySku = new Map(prices.map((item) => [item.sku, item]));
  const now = Date.now();
  const rows = parsed.items.map((item) => {
    const matches = masterBySku.get(item.supplier_sku) ?? [];
    const master = matches.length === 1 ? matches[0] as Record<string, unknown> : null;
    const fabricId = master ? String(master.fabric_id) : null;
    const latest = latestStock.get(item.supplier_sku);
    return {
      supplier_sku: item.supplier_sku,
      scope: item.scope,
      webtex_status: item.status,
      master_count: matches.length,
      fabric_id: fabricId,
      visible: master?.staging_catalog_visible === true,
      lifecycle_state: master?.lifecycle_state ?? null,
      media_ready: fabricId ? mediaIds.has(fabricId) : false,
      price_ready: priceBySku.get(item.supplier_sku)?.ready ?? false,
      fabric_knowledge_ready: fabricId ? profileIds.has(fabricId) : false,
      enrichment_ready: fabricId ? ledgerIds.has(fabricId) : false,
      stock_current: Boolean(latest && Date.parse(latest.checked_at) >= now - 96 * 60 * 60 * 1000),
      latest_stock_checked_at: latest?.checked_at ?? null,
    };
  });
  const dataRows = rows.filter((row) => row.webtex_status === "DATA");
  const releaseableAfterStock = dataRows.filter((row) => row.master_count === 1 && row.media_ready && row.price_ready && row.fabric_knowledge_ready && row.enrichment_ready && row.lifecycle_state !== "DISCONTINUED");
  const report = {
    checked_at: new Date().toISOString(),
    unresolved: rows.length,
    webtex_data: dataRows.length,
    webtex_error: rows.filter((row) => row.webtex_status === "ERROR").length,
    masters: rows.filter((row) => row.master_count === 1).length,
    missing_masters: rows.filter((row) => row.master_count === 0).length,
    duplicate_master_skus: rows.filter((row) => row.master_count > 1).length,
    data_with_master: dataRows.filter((row) => row.master_count === 1).length,
    data_media_ready: dataRows.filter((row) => row.media_ready).length,
    data_price_ready: dataRows.filter((row) => row.price_ready).length,
    data_knowledge_ready: dataRows.filter((row) => row.fabric_knowledge_ready).length,
    data_enrichment_ready: dataRows.filter((row) => row.enrichment_ready).length,
    releaseable_after_webtex_stock: releaseableAfterStock.length,
    rows,
  };
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ ...report, rows: undefined }));
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : "PT_WEBTEX_FIRST_AUDIT_FAILED"); process.exitCode = 1; });
