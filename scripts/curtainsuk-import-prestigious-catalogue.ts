import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import * as XLSX from "xlsx";
import { buildCatalogueImport, sha256 } from "@/lib/fabric-master/catalogue-normalization";
import { normalizePrestigiousFormationRows, type PrestigiousShopifyRow } from "@/lib/fabric-master/prestigious";
import { applyFabricCatalogueBatch, existingSupplierSkus } from "@/lib/fabric-master/repository";

function requireSourcePath() {
  const value = process.argv[2];
  if (!value) throw new Error("Usage: npm run fabric:import:prestigious -- <authorised-xlsx-path>");
  return resolve(value);
}

async function main() {
  const sourcePath = requireSourcePath();
  const bytes = await readFile(sourcePath);
  const workbook = XLSX.read(bytes, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("PRESTIGIOUS_WORKBOOK_HAS_NO_SHEETS");
  const rows = XLSX.utils.sheet_to_json<PrestigiousShopifyRow>(sheet, { defval: "" });
  const records = normalizePrestigiousFormationRows(rows.filter((row) => row["Variant%20SKU"]));
  const existing = await existingSupplierSkus("prestigious-textiles");
  const batch = buildCatalogueImport({
    supplierId: "prestigious-textiles",
    sourceType: "AUTHORISED_XLSX",
    sourceName: "Prestigious authorised Shopify catalogue export",
    sourceReference: basename(sourcePath),
    sourceSha256: sha256(bytes),
    sourceEffectiveDate: "2026-08-01",
    existingSupplierSkus: existing,
    records,
  });
  const result = await applyFabricCatalogueBatch(batch.metadata, batch.items);
  console.log(JSON.stringify({
    supplier: "prestigious-textiles",
    source: basename(sourcePath),
    colourways: records.length,
    designs: new Set(records.map((record) => record.design_id)).size,
    collections: new Set(records.map((record) => record.collection_id)).size,
    verifiedPrices: records.filter((record) => record.price_verification_status === "VERIFIED").length,
    priceRequiresVerification: records.filter((record) => record.price_verification_status === "PRICE_REQUIRES_VERIFICATION").length,
    database: result,
    shopifyWrites: 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "PRESTIGIOUS_IMPORT_FAILED");
  process.exitCode = 1;
});
