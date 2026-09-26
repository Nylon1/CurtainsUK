import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

const WORKBOOK_SHA = "aa51f9df01c9de3bfbfefb61e02d2e66defbd1fb6ec35732e65a196f70c522ca";
const PRICE_SHA = "8e1d9d1dc648eed833073136a4f2eb8e05db701fbcf4c37eda50bfec92915108";
const factualFields = ["Qual", "Description", "Status", "Composition", "Wash Care 1", "Wash Care 2", "EAN Code", "HS Code", "Weight/LM", "Width", "Horizontal Ptn/Rpt", "Vertical Ptn/Rpt"] as const;
type Webtex = Record<"sku"|"status"|"description"|"collection"|"composition"|"usableWidth"|"fullWidth"|"horizontalRepeat"|"verticalRepeat"|"standardPrice"|"cutPrice"|"freeStock"|"origin"|"weight"|"martindale"|"imageFull", string> & { exactIdentity: boolean };
type Classification = { supplier_sku: string; supplier_design_code: string; classification: string; master_ids: string[]; price_list_current: boolean; webtex?: Webtex };
type Price = { supplier_design_code: string; printed_price: string; currency: string; pdf_page: number; source_line: string; price_basis: string };

function option(name: string) { return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3); }
function editDistance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const next = [i];
    for (let j = 1; j <= b.length; j += 1) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + Number(a[i - 1] !== b[j - 1]));
    row = next;
  }
  return row[b.length];
}
function exactIdentity(webtex: Webtex, price: Price) {
  const decoded = decodeURIComponent(webtex.imageFull);
  const pathMatch = /\/images\/images\/(\d{4})\s+([^/]+)\//i.exec(decoded);
  if (!pathMatch || pathMatch[1] !== webtex.sku.slice(0, 4)) throw new Error(`PT_COMPLETE_IMAGE_IDENTITY_INVALID:${webtex.sku}`);
  const description = webtex.description.replace(/-+/g, " ").replace(/\s+/g, " ").trim();
  const pathDesign = pathMatch[2].trim();
  const wordCount = pathDesign.split(/\s+/).length;
  const descriptionDesign = description.split(" ").slice(0, wordCount).join(" ");
  const design = descriptionDesign.toLowerCase() === pathDesign.toLowerCase() || editDistance(descriptionDesign.toLowerCase(), pathDesign.toLowerCase()) <= 2 ? descriptionDesign : pathDesign;
  const line = price.source_line.replace(new RegExp(`^${webtex.sku.slice(0, 4)}\\s+`), "").replace("● ", "");
  const factualStart = /\s+[A-Z]{2}\s+\d+(?:\.\d+)?/.exec(line);
  if (!factualStart) throw new Error(`PT_COMPLETE_PRICE_IDENTITY_INVALID:${webtex.sku}`);
  const identityPrefix = line.slice(0, factualStart.index).trim();
  const pdfDesign = identityPrefix.split(/\s+/).slice(0, wordCount).join(" ");
  if (pdfDesign.toLowerCase() !== design.toLowerCase() && editDistance(pdfDesign.toLowerCase(), design.toLowerCase()) > 2) throw new Error(`PT_COMPLETE_DESIGN_CONFLICT:${webtex.sku}`);
  const collection = identityPrefix.split(/\s+/).slice(wordCount).join(" ").trim();
  const colour = description.split(" ").slice(wordCount).join(" ").trim();
  if (!design || !collection || !colour) throw new Error(`PT_COMPLETE_DISPLAY_IDENTITY_MISSING:${webtex.sku}`);
  const imageUrl = new URL(decoded.replace(/^\.\.\/\.\.\/\.\.\//, "/"), "https://www.prestigiousonline.co.uk").toString();
  const filename = decodeURIComponent(new URL(imageUrl).pathname.split("/").at(-1) ?? "").toLowerCase();
  if (!filename.startsWith(webtex.sku.replace("/", "-").toLowerCase())) throw new Error(`PT_COMPLETE_IMAGE_SKU_MISMATCH:${webtex.sku}`);
  return { design, colour: colour.replace(/\s+\(pts\d+\)$/i, ""), collection, imageUrl };
}
function stableValues(values: unknown[]) {
  const map = new Map(values.filter((value) => value !== null && value !== undefined && value !== "").map((value) => [JSON.stringify(value), value]));
  return [...map.values()];
}

async function main() {
  const workbookPath = option("workbook"), pricePath = option("price-index"), reconciliationPath = option("reconciliation"), outputPath = option("out"), exceptionPath = option("exceptions");
  if (!workbookPath || !pricePath || !reconciliationPath || !outputPath || !exceptionPath) throw new Error("PT_COMPLETE_MANIFEST_ARGUMENTS_REQUIRED");
  const workbookBytes = await readFile(workbookPath);
  if (createHash("sha256").update(workbookBytes).digest("hex") !== WORKBOOK_SHA) throw new Error("PT_COMPLETE_WORKBOOK_CHANGED");
  const priceIndex = JSON.parse(await readFile(pricePath, "utf8")) as { metadata: { source_sha256: string }; design_code_index: Price[] };
  if (priceIndex.metadata.source_sha256 !== PRICE_SHA) throw new Error("PT_COMPLETE_PRICE_LIST_CHANGED");
  const prices = new Map(priceIndex.design_code_index.map((item) => [item.supplier_design_code, item]));
  const final = JSON.parse(await readFile(reconciliationPath, "utf8")) as { classifications: Classification[] };
  const missing = final.classifications.filter((item) => item.classification === "GENUINELY_MISSING");
  if (missing.length !== 908) throw new Error("PT_COMPLETE_MISSING_UNIVERSE_CHANGED");
  const workbook = XLSX.read(workbookBytes, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets.SBCLIENT;
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
  const bySku = new Map<string, Array<Record<string, unknown> & { __row: number }>>();
  for (const [index, row] of rows.entries()) {
    const sku = String(row.Code ?? "").trim();
    if (!/^\d{4}\/\d{3}$/.test(sku)) continue;
    bySku.set(sku, [...(bySku.get(sku) ?? []), { ...row, __row: index + 2 }]);
  }
  const ready: unknown[] = [], exceptions: unknown[] = [];
  for (const item of missing) {
    const webtex = item.webtex;
    const price = prices.get(item.supplier_design_code);
    const reasons: string[] = [];
    if (!price || price.source_line.includes("●")) reasons.push("NO_CURRENT_GOVERNED_PRICE");
    if (!webtex?.imageFull) reasons.push("NO_OFFICIAL_WEBTEX_IMAGE");
    if (!webtex || webtex.status !== "DATA" || !webtex.exactIdentity || !/^\d+(?:\.\d+)?\s+Metres$/i.test(webtex.freeStock.trim())) reasons.push("INVALID_WEBTEX_FACTUAL_RECORD");
    if (reasons.length) { exceptions.push({ supplier_sku: item.supplier_sku, reasons }); continue; }
    const sourceRows = bySku.get(item.supplier_sku) ?? [];
    if (!sourceRows.length) throw new Error(`PT_COMPLETE_WORKBOOK_ROW_MISSING:${item.supplier_sku}`);
    const manufacturer: Record<string, unknown> = {};
    for (const field of factualFields) {
      const values = stableValues(sourceRows.map((row) => row[field]));
      if (values.length > 1) throw new Error(`PT_COMPLETE_MANUFACTURER_CONFLICT:${item.supplier_sku}:${field}`);
      manufacturer[field] = values[0] ?? null;
    }
    const identity = exactIdentity(webtex, price!);
    ready.push({
      supplier_id: "prestigious-textiles", supplier_sku: item.supplier_sku, fabric_id: `pt-${item.supplier_sku.replace("/", "-")}`,
      action: item.master_ids.length ? "UPDATE_GOVERNED_MASTER" : "CREATE_GOVERNED_MASTER", existing_master_ids: item.master_ids,
      supplier_design_code: item.supplier_design_code, colourway_code: item.supplier_sku.slice(5), design_name: identity.design,
      colour_name: identity.colour, official_collection_label: identity.collection,
      source_collection_codes: stableValues(sourceRows.map((row) => String(row.Collection ?? "").trim())).map(String), source_rows: sourceRows.map((row) => row.__row),
      manufacturer, webtex, official_image_url: identity.imageUrl, supplier_price_row: price,
      exclusion_checked: true, workbook_commercial_fields_used: [], commercial_authority: "PT_AUGUST_2026_CUT_PRICE_LIST",
    });
  }
  if (ready.length !== 784 || exceptions.length !== 124 || exceptions.filter((item) => (item as { reasons: string[] }).reasons.includes("NO_CURRENT_GOVERNED_PRICE")).length !== 121 ||
      exceptions.filter((item) => (item as { reasons: string[] }).reasons.includes("NO_OFFICIAL_WEBTEX_IMAGE")).length !== 3) throw new Error("PT_COMPLETE_RELEASE_GATE_COUNTS_CHANGED");
  await Promise.all([mkdir(path.dirname(outputPath), { recursive: true }), mkdir(path.dirname(exceptionPath), { recursive: true })]);
  await Promise.all([writeFile(outputPath, JSON.stringify(ready, null, 2) + "\n"), writeFile(exceptionPath, JSON.stringify(exceptions, null, 2) + "\n")]);
  console.log(JSON.stringify({ genuinely_missing: missing.length, ready: ready.length, exceptions: exceptions.length, current_price: 787, official_image: 905, input_mtime: (await stat(reconciliationPath)).mtime.toISOString() }));
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : "PT_COMPLETE_MANIFEST_FAILED"); process.exitCode = 1; });
