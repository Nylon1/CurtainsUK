import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";

type SourceItem = {
  supplier_sku: string;
  supplier_design_code: string;
  scope_classification: "ELIGIBLE" | "NOVELTY_EXCLUSION" | "PT_CONTRACT_EXCLUSION";
  price_list: null | { supplier_discontinued: boolean };
};
type Master = {
  fabric_id: string;
  supplier_sku: string;
  lifecycle_state: string;
  staging_catalog_visible: boolean;
  storefront_selectable: boolean;
};

const sourcePath = "artifacts/pt-complete-catalogue/source-inventory.json";
const outputPath = "artifacts/pt-complete-catalogue/initial-reconciliation.json";

function assertTarget() {
  const url = process.env.SUPABASE_URL ?? "";
  if (new URL(url).hostname !== "hqysjumypgeapgmqkcrx.supabase.co") throw new Error("PT_COMPLETE_TARGET_REJECTED");
}
async function main() {
  assertTarget();
  const source = JSON.parse(await readFile(sourcePath, "utf8")) as { metadata: Record<string, unknown>; items: SourceItem[] };
  if (source.items.length !== 10015 || new Set(source.items.map((item) => item.supplier_sku)).size !== 10015) {
    throw new Error("PT_COMPLETE_SOURCE_INVALID");
  }
  const db = createSupplierServiceClient();
  const masters: Master[] = [];
  for (let from = 0; ; from += 1000) {
    const result = await db.from("fabric_colourways")
      .select("fabric_id,supplier_sku,lifecycle_state,staging_catalog_visible,storefront_selectable")
      .eq("supplier_id", "prestigious-textiles").order("supplier_sku").range(from, from + 999);
    if (result.error) throw new Error(`PT_COMPLETE_MASTER_READ_FAILED_${result.error.code ?? "UNKNOWN"}`);
    masters.push(...(result.data ?? []) as Master[]);
    if ((result.data ?? []).length < 1000) break;
  }
  const mastersBySku = new Map<string, Master[]>();
  for (const master of masters) {
    const values = mastersBySku.get(master.supplier_sku) ?? [];
    values.push(master);
    mastersBySku.set(master.supplier_sku, values);
  }
  const classifications = source.items.map((item) => {
    const skuMasters = mastersBySku.get(item.supplier_sku) ?? [];
    const live = skuMasters.some((master) => master.staging_catalog_visible && master.lifecycle_state !== "DISCONTINUED");
    const discontinued = skuMasters.some((master) => master.lifecycle_state === "DISCONTINUED") || item.price_list?.supplier_discontinued === true;
    const classification = item.scope_classification === "NOVELTY_EXCLUSION" ? "NOVELTY_EXCLUSION"
      : item.scope_classification === "PT_CONTRACT_EXCLUSION" ? "PT_CONTRACT_EXCLUSION"
        : live ? "LIVE"
          : discontinued ? "SUPPLIER_DISCONTINUED"
            : "PENDING_WEBTEX";
    return {
      supplier_sku: item.supplier_sku,
      supplier_design_code: item.supplier_design_code,
      classification,
      master_ids: skuMasters.map((master) => master.fabric_id),
      price_list_current: item.price_list !== null && !item.price_list.supplier_discontinued,
    };
  });
  const count = (classification: string) => classifications.filter((item) => item.classification === classification).length;
  const liveMasters = masters.filter((master) => master.staging_catalog_visible && master.lifecycle_state !== "DISCONTINUED");
  const liveMasterSkus = new Set(liveMasters.map((master) => master.supplier_sku));
  const sourceSkus = new Set(source.items.map((item) => item.supplier_sku));
  const report = {
    checked_at: new Date().toISOString(),
    source_metadata: source.metadata,
    source_total: source.items.length,
    production_pt_masters: masters.length,
    production_pt_live_masters: liveMasters.length,
    source_live: count("LIVE"),
    novelty_exclusions: count("NOVELTY_EXCLUSION"),
    pt_contract_exclusions: count("PT_CONTRACT_EXCLUSION"),
    supplier_discontinued: count("SUPPLIER_DISCONTINUED"),
    pending_webtex: count("PENDING_WEBTEX"),
    duplicate_master_skus: [...mastersBySku.entries()].filter(([, values]) => values.length > 1).map(([sku]) => sku),
    live_master_skus_outside_workbook: [...liveMasterSkus].filter((sku) => !sourceSkus.has(sku)).sort(),
    excluded_but_live: classifications.filter((item) => ["NOVELTY_EXCLUSION", "PT_CONTRACT_EXCLUSION"].includes(item.classification) && item.master_ids.some((id) => {
      const master = masters.find((candidate) => candidate.fabric_id === id);
      return master?.staging_catalog_visible && master.lifecycle_state !== "DISCONTINUED";
    })).map((item) => item.supplier_sku),
    pending_webtex_items: classifications.filter((item) => item.classification === "PENDING_WEBTEX"),
    classifications,
  };
  const accounted = report.source_live + report.novelty_exclusions + report.pt_contract_exclusions + report.supplier_discontinued + report.pending_webtex;
  if (accounted !== source.items.length || report.production_pt_live_masters !== 4963 || report.duplicate_master_skus.length) {
    throw new Error("PT_COMPLETE_INITIAL_RECONCILIATION_INTEGRITY_FAILED");
  }
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ ...report, classifications: undefined, pending_webtex_items: undefined, live_master_skus_outside_workbook: report.live_master_skus_outside_workbook.length }));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "PT_COMPLETE_RECONCILIATION_FAILED");
  process.exitCode = 1;
});
