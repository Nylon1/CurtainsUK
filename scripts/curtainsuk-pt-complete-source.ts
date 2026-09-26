import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

const EXPECTED_WORKBOOK_SHA256 = "aa51f9df01c9de3bfbfefb61e02d2e66defbd1fb6ec35732e65a196f70c522ca";
const EXPECTED_PRICE_LIST_SHA256 = "8e1d9d1dc648eed833073136a4f2eb8e05db701fbcf4c37eda50bfec92915108";
const factualFields = [
  "Qual", "Description", "Status", "Composition", "Wash Care 1", "Wash Care 2",
  "EAN Code", "HS Code", "Weight/LM", "Width", "Horizontal Ptn/Rpt", "Vertical Ptn/Rpt",
] as const;

type WorkbookRow = Record<string, unknown>;
type PriceRow = { supplier_design_code: string; printed_price: string; pdf_page: number; source_line: string };
type SourceItem = {
  supplier_sku: string;
  supplier_design_code: string;
  colourway_code: string;
  source_rows: number[];
  source_collection_codes: string[];
  manufacturer: Record<string, unknown>;
  manufacturer_conflicts: Record<string, unknown[]>;
  scope_classification: "ELIGIBLE" | "NOVELTY_EXCLUSION" | "PT_CONTRACT_EXCLUSION";
  price_list: null | { printed_cut_price: string; pdf_page: number; supplier_discontinued: boolean };
};

function arg(name: string) {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}
function stableValues(values: unknown[]) {
  const keyed = new Map(values.filter((value) => value !== null && value !== undefined && value !== "")
    .map((value) => [JSON.stringify(value), value]));
  return [...keyed.values()];
}
async function main() {
  const workbookPath = arg("workbook"), priceIndexPath = arg("price-index"), exclusionsPath = arg("exclusions"), outputPath = arg("out");
  if (!workbookPath || !priceIndexPath || !exclusionsPath || !outputPath) throw new Error("PT_COMPLETE_SOURCE_ARGUMENTS_REQUIRED");
  const workbookBytes = await readFile(workbookPath);
  const workbookSha256 = createHash("sha256").update(workbookBytes).digest("hex");
  if (workbookSha256 !== EXPECTED_WORKBOOK_SHA256) throw new Error("PT_COMPLETE_SOURCE_WORKBOOK_CHANGED");
  const workbook = XLSX.read(workbookBytes, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets.SBCLIENT;
  if (!sheet) throw new Error("PT_COMPLETE_SOURCE_SHEET_MISSING");
  const rows = XLSX.utils.sheet_to_json<WorkbookRow>(sheet, { defval: null, raw: true });
  const grouped = new Map<string, Array<WorkbookRow & { __row: number }>>();
  for (const [index, row] of rows.entries()) {
    const sku = String(row.Code ?? "").trim();
    if (!/^\d{4}\/\d{3}$/.test(sku)) continue;
    const values = grouped.get(sku) ?? [];
    values.push({ ...row, __row: index + 2 });
    grouped.set(sku, values);
  }
  const excluded = JSON.parse(await readFile(exclusionsPath, "utf8")) as { excluded: Array<{ supplier_sku: string }> };
  const excludedSkus = new Set(excluded.excluded.map((item) => item.supplier_sku));
  if (excludedSkus.size !== 414) throw new Error("PT_COMPLETE_SOURCE_EXCLUSION_UNIVERSE_CHANGED");
  const priceIndex = JSON.parse(await readFile(priceIndexPath, "utf8")) as {
    metadata: { source_sha256: string };
    design_code_index: PriceRow[];
  };
  if (priceIndex.metadata.source_sha256 !== EXPECTED_PRICE_LIST_SHA256) throw new Error("PT_COMPLETE_SOURCE_PRICE_LIST_CHANGED");
  const prices = new Map(priceIndex.design_code_index.map((item) => [item.supplier_design_code, item]));
  if (prices.size !== priceIndex.design_code_index.length) throw new Error("PT_COMPLETE_SOURCE_PRICE_INDEX_AMBIGUOUS");

  const items: SourceItem[] = [];
  for (const [supplierSku, sourceRows] of grouped) {
    const [design, colour] = supplierSku.split("/");
    const collections = stableValues(sourceRows.map((row) => String(row.Collection ?? "").trim())).map(String).sort();
    let scope: SourceItem["scope_classification"] = "ELIGIBLE";
    if (excludedSkus.has(supplierSku)) {
      scope = collections.some((collection) => /NOVELTY/i.test(collection)) ? "NOVELTY_EXCLUSION" : "PT_CONTRACT_EXCLUSION";
    }
    const manufacturer: Record<string, unknown> = {};
    const conflicts: Record<string, unknown[]> = {};
    for (const field of factualFields) {
      const values = stableValues(sourceRows.map((row) => row[field]));
      manufacturer[field] = values[0] ?? null;
      if (values.length > 1) conflicts[field] = values;
    }
    const price = prices.get(design);
    items.push({
      supplier_sku: supplierSku,
      supplier_design_code: design,
      colourway_code: colour,
      source_rows: sourceRows.map((row) => row.__row).sort((a, b) => a - b),
      source_collection_codes: collections,
      manufacturer,
      manufacturer_conflicts: conflicts,
      scope_classification: scope,
      price_list: price ? {
        printed_cut_price: price.printed_price,
        pdf_page: price.pdf_page,
        supplier_discontinued: price.source_line.includes("●"),
      } : null,
    });
  }
  items.sort((a, b) => a.supplier_sku.localeCompare(b.supplier_sku));
  const counts = {
    source_skus: items.length,
    novelty_exclusions: items.filter((item) => item.scope_classification === "NOVELTY_EXCLUSION").length,
    pt_contract_exclusions: items.filter((item) => item.scope_classification === "PT_CONTRACT_EXCLUSION").length,
    eligible: items.filter((item) => item.scope_classification === "ELIGIBLE").length,
    price_list_current: items.filter((item) => item.price_list && !item.price_list.supplier_discontinued).length,
    price_list_discontinued: items.filter((item) => item.price_list?.supplier_discontinued).length,
    price_list_absent: items.filter((item) => !item.price_list).length,
    manufacturer_conflicts: items.filter((item) => Object.keys(item.manufacturer_conflicts).length > 0).length,
  };
  if (counts.source_skus !== 10015 || counts.novelty_exclusions + counts.pt_contract_exclusions !== 414) {
    throw new Error("PT_COMPLETE_SOURCE_UNIVERSE_CHANGED");
  }
  await mkdir(path.dirname(outputPath), { recursive: true });
  const reconciliationItems = items.map((item) => ({
    supplier_sku: item.supplier_sku,
    supplier_design_code: item.supplier_design_code,
    colourway_code: item.colourway_code,
    source_rows: item.source_rows,
    source_collection_codes: item.source_collection_codes,
    scope_classification: item.scope_classification,
    price_list: item.price_list,
  }));
  await writeFile(outputPath, JSON.stringify({
    metadata: {
      generated_at: new Date().toISOString(),
      workbook_sha256: workbookSha256,
      workbook_sheet: "SBCLIENT",
      price_list_sha256: priceIndex.metadata.source_sha256,
      exclusion_manifest: exclusionsPath,
      classification_precedence: ["NOVELTY_EXCLUSION", "PT_CONTRACT_EXCLUSION", "LIVE", "SUPPLIER_DISCONTINUED", "WEBTEX_UNSUPPORTED", "GENUINELY_MISSING"],
    },
    counts,
    items: reconciliationItems,
  }, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(counts));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "PT_COMPLETE_SOURCE_FAILED");
  process.exitCode = 1;
});
