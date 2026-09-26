import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { buildCatalogueImport, stableSlug } from "../lib/fabric-master/catalogue-normalization";
import { ptComposition } from "../lib/fabric-master/pt-workbook-batch";
import type { FabricMasterRecord } from "../lib/fabric-master/types";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";

type Webtex = Record<"description"|"collection"|"composition"|"usableWidth"|"fullWidth"|"horizontalRepeat"|"verticalRepeat"|"freeStock"|"origin"|"weight"|"martindale"|"imageFull", string>;
type ManifestItem = {
  supplier_id: string; supplier_sku: string; fabric_id: string; action: string; existing_master_ids: string[];
  supplier_design_code: string; colourway_code: string; design_name: string; colour_name: string; official_collection_label: string;
  source_collection_codes: string[]; source_rows: number[]; manufacturer: Record<string, unknown>; webtex: Webtex;
  official_image_url: string; exclusion_checked: boolean; workbook_commercial_fields_used: unknown[];
};
type ExistingColourway = { fabric_id: string; supplier_sku: string; updated_at: string; imagery: string[]; price_verification_status: string; storefront_selectable: boolean; staging_catalog_visible: boolean; lifecycle_state: string };
type ExistingDesign = { design_id: string; supplier_design_code: string; display_name: string; collection_id: string };
type ExistingCollection = { collection_id: string; display_name: string; supplier_collection_code: string | null };

function option(name: string) { return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3); }
function workbookMm(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value * 10) : null;
}
function mm(value: string, fallback: unknown = null) {
  if (!value.trim() || value.trim() === "-") return workbookMm(fallback);
  const match = /^(\d+(?:\.\d+)?)\s*cm$/i.exec(value.trim());
  if (!match) throw new Error(`PT_COMPLETE_DIMENSION_INVALID:${value}`);
  return Math.round(Number(match[1]) * 10);
}
function repeatMm(value: string, fallback: unknown) {
  if (/^(?:PLAIN|N\/A)$/i.test(value.trim())) return 0;
  return mm(value, fallback);
}
async function allRows<T>(query: (from: number) => PromiseLike<{ data: T[] | null; error: { code?: string } | null }>, code: string) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const result = await query(from);
    if (result.error) throw new Error(`${code}_${result.error.code ?? "UNKNOWN"}`);
    rows.push(...(result.data ?? []));
    if ((result.data ?? []).length < 1000) return rows;
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  const manifestPath = option("manifest"), outputRoot = option("out") ?? "artifacts/pt-complete-catalogue/ingestion";
  const apply = process.argv.includes("--apply"), batchSize = Number(option("batch-size") ?? 100);
  if (!manifestPath || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 200) throw new Error("PT_COMPLETE_INGEST_ARGUMENTS_INVALID");
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (new URL(url).hostname !== "hqysjumypgeapgmqkcrx.supabase.co" || (apply && option("confirm-project") !== "hqysjumypgeapgmqkcrx")) throw new Error("PT_COMPLETE_INGEST_TARGET_REJECTED");
  const raw = await readFile(manifestPath);
  const manifest = JSON.parse(raw.toString("utf8")) as ManifestItem[];
  if (manifest.length !== 784 || new Set(manifest.map((item) => item.supplier_sku)).size !== 784) throw new Error("PT_COMPLETE_INGEST_SCOPE_CHANGED");
  const db = createSupplierServiceClient();
  const [colourways, designs, collections] = await Promise.all([
    allRows<ExistingColourway>((from) => db.from("fabric_colourways").select("fabric_id,supplier_sku,updated_at,imagery,price_verification_status,storefront_selectable,staging_catalog_visible,lifecycle_state").eq("supplier_id", "prestigious-textiles").order("supplier_sku").range(from, from + 999), "PT_COMPLETE_COLOURWAY_READ_FAILED"),
    allRows<ExistingDesign>((from) => db.from("fabric_designs").select("design_id,supplier_design_code,display_name,collection_id").eq("supplier_id", "prestigious-textiles").order("supplier_design_code").range(from, from + 999), "PT_COMPLETE_DESIGN_READ_FAILED"),
    allRows<ExistingCollection>((from) => db.from("fabric_collections").select("collection_id,display_name,supplier_collection_code").eq("supplier_id", "prestigious-textiles").order("display_name").range(from, from + 999), "PT_COMPLETE_COLLECTION_READ_FAILED"),
  ]);
  const colourwayBySku = new Map<string, ExistingColourway>();
  for (const row of colourways) {
    if (colourwayBySku.has(row.supplier_sku)) throw new Error(`PT_COMPLETE_DUPLICATE_MASTER:${row.supplier_sku}`);
    colourwayBySku.set(row.supplier_sku, row);
  }
  const designByCode = new Map(designs.map((row) => [row.supplier_design_code, row]));
  const collectionById = new Map(collections.map((row) => [row.collection_id, row]));
  const collectionByName = new Map(collections.map((row) => [row.display_name.trim().toLowerCase(), row]));
  const now = new Date().toISOString();
  const sourceSha = createHash("sha256").update(raw).digest("hex");
  const records = manifest.map((item) => {
    if (!item.exclusion_checked || item.workbook_commercial_fields_used.length || item.supplier_id !== "prestigious-textiles" || !/^\d{4}\/\d{3}$/.test(item.supplier_sku) ||
        !/^https:\/\/www\.prestigiousonline\.co\.uk\/images\/images\//.test(item.official_image_url)) throw new Error(`PT_COMPLETE_MANIFEST_RECORD_INVALID:${item.supplier_sku}`);
    const existing = colourwayBySku.get(item.supplier_sku);
    if (Boolean(existing) !== Boolean(item.existing_master_ids.length)) throw new Error(`PT_COMPLETE_MASTER_RECONCILIATION_CHANGED:${item.supplier_sku}`);
    if (existing && (item.existing_master_ids.length !== 1 || item.existing_master_ids[0] !== existing.fabric_id)) throw new Error(`PT_COMPLETE_EXISTING_IDENTITY_CHANGED:${item.supplier_sku}`);
    const existingDesign = designByCode.get(item.supplier_design_code);
    const existingCollection = existingDesign ? collectionById.get(existingDesign.collection_id) : collectionByName.get(item.official_collection_label.trim().toLowerCase());
    const collectionName = existingCollection?.display_name ?? item.official_collection_label;
    const designName = existingDesign?.display_name ?? item.design_name;
    const collectionId = existingCollection?.collection_id ?? `pt-collection-${stableSlug(collectionName)}`;
    const designId = existingDesign?.design_id ?? `pt-design-${item.supplier_design_code}`;
    const care = [item.manufacturer["Wash Care 1"], item.manufacturer["Wash Care 2"]].filter((value): value is string => typeof value === "string" && !!value.trim());
    const usage = item.webtex.martindale.trim() ? [`MARTINDALE ${item.webtex.martindale.trim()}`] : [];
    const record: Omit<FabricMasterRecord, "supplier_name"> & { brand_name: string; source_row_number: number; manufacturer_specification: unknown } = {
      fabric_id: existing?.fabric_id ?? item.fabric_id, supplier_id: "prestigious-textiles", brand_id: "prestigious-textiles", brand_name: "Prestigious Textiles",
      collection_id: collectionId, collection_name: collectionName, supplier_collection_code: existingCollection?.supplier_collection_code ?? item.source_collection_codes[0] ?? null,
      design_id: designId, supplier_design_code: item.supplier_design_code, design_name: designName,
      supplier_sku: item.supplier_sku, colourway_code: item.colourway_code, colour_name: item.colour_name,
      full_width_mm: mm(item.webtex.fullWidth, item.manufacturer.Width), usable_width_mm: mm(item.webtex.usableWidth),
      vertical_repeat_mm: repeatMm(item.webtex.verticalRepeat, item.manufacturer["Vertical Ptn/Rpt"]), horizontal_repeat_mm: repeatMm(item.webtex.horizontalRepeat, item.manufacturer["Horizontal Ptn/Rpt"]),
      composition: ptComposition(item.webtex.composition), pattern_match_type: null, weight_gsm: null, care_instructions: care, usage_suitability: usage,
      imagery: existing?.imagery ?? [], sample_available: null, lifecycle_state: "CURRENT",
      price_verification_status: existing?.price_verification_status === "VERIFIED" ? "VERIFIED" : "PRICE_REQUIRES_VERIFICATION",
      storefront_selectable: existing?.storefront_selectable ?? false, staging_catalog_visible: existing?.staging_catalog_visible ?? false,
      source_type: "AUTHENTICATED_SUPPLIER_PORTAL", source_name: "Prestigious Webtex authenticated Product Detail",
      source_reference: `pt:Webtex:PRODUCT_DETAIL:${item.supplier_sku}`, source_effective_date: null, source_row_number: item.source_rows[0],
      manufacturer_specification: { workbook_sha256: "aa51f9df01c9de3bfbfefb61e02d2e66defbd1fb6ec35732e65a196f70c522ca", source_sheet: "SBCLIENT", source_rows: item.source_rows,
        workbook_fields: item.manufacturer, webtex: item.webtex, price_excluded: true, weight_basis: "Supplier Webtex weight retained verbatim; no GSM inference" },
    };
    return record;
  });
  await mkdir(outputRoot, { recursive: true });
  const existingSkus = new Set(manifest.filter((item) => colourwayBySku.has(item.supplier_sku)).map((item) => item.supplier_sku));
  let inserted = 0, updated = 0;
  for (let offset = 0; offset < records.length; offset += batchSize) {
    const cohort = records.slice(offset, offset + batchSize);
    const batch = buildCatalogueImport({ supplierId: "prestigious-textiles", sourceType: "AUTHENTICATED_SUPPLIER_PORTAL", sourceName: "Prestigious Webtex authenticated Product Detail",
      sourceReference: "pt:Webtex:PRODUCT_DETAIL:complete-workbook-remainder", sourceSha256: sourceSha, sourceObservedAt: now,
      existingSupplierSkus: existingSkus, existingSupplierUpdatedAt: new Map(colourways.map((item) => [item.supplier_sku, item.updated_at])),
      protectedFieldsBySku: new Map(cohort.filter((item) => existingSkus.has(item.supplier_sku)).map((item) => [item.supplier_sku, ["imagery", "price_verification_status", "storefront_selectable", "staging_catalog_visible"]])), records: cohort });
    const number = String(Math.floor(offset / batchSize) + 1).padStart(3, "0");
    await writeFile(path.join(outputRoot, `batch-${number}.json`), JSON.stringify(batch, null, 2) + "\n");
    if (apply) {
      const result = await db.rpc("apply_fabric_catalogue_batch", { p_import: batch.metadata, p_items: batch.items });
      if (result.error) throw new Error(`PT_COMPLETE_GOVERNED_INGEST_FAILED_${result.error.code ?? "UNKNOWN"}`);
      await writeFile(path.join(outputRoot, `batch-${number}.result.json`), JSON.stringify(result.data, null, 2) + "\n");
    }
    inserted += batch.metadata.inserted_count;
    updated += batch.metadata.updated_count;
    console.log(JSON.stringify({ batch: number, records: cohort.length, inserted: batch.metadata.inserted_count, updated: batch.metadata.updated_count, applied: apply }));
  }
  if (inserted !== 778 || updated !== 6) throw new Error(`PT_COMPLETE_INGEST_COUNTS_CHANGED:${inserted}:${updated}`);
  console.log(JSON.stringify({ records: records.length, inserted, updated, duplicates: 0, applied: apply }));
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : "PT_COMPLETE_INGEST_FAILED"); process.exitCode = 1; });
