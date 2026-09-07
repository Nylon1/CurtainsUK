import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type { ExistingCatalogueRecord } from "@/lib/fabric-master/catalogue-protection";
import { previewSandersonAllBrandsCatalogue } from "@/lib/fabric-master/sanderson-catalogue-import";

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

async function existingRecords(): Promise<{ provided: boolean; records: ExistingCatalogueRecord[] }> {
  const path = argument("existing-json");
  if (!path) return { provided: false, records: [] };
  const parsed = JSON.parse(await readFile(resolve(path), "utf8")) as ExistingCatalogueRecord[] | { records: ExistingCatalogueRecord[] };
  return { provided: true, records: Array.isArray(parsed) ? parsed : parsed.records };
}

async function main() {
  const sourceArgument = process.argv.slice(2).find((value) => !value.startsWith("--"));
  if (!sourceArgument) {
    throw new Error("USAGE: npm run fabric:preview:sanderson -- <authorised-all-brands.xlsx> [--existing-json=<safe-master-export.json>]");
  }
  const sourcePath = resolve(sourceArgument);
  const bytes = new Uint8Array(await readFile(sourcePath));
  const existing = await existingRecords();
  const preview = await previewSandersonAllBrandsCatalogue({
    document: {
      filename: basename(sourcePath),
      mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bytes,
      format: "XLSX",
    },
    existing_records: existing.provided ? existing.records : undefined,
  });
  const byBrand = Object.fromEntries([...new Set(preview.records.map((record) => record.brand_name))]
    .sort()
    .map((brand) => [brand, preview.records.filter((record) => record.brand_name === brand).length]));
  const rejectedReasons = preview.rejected_rows.reduce<Record<string, number>>((counts, row) => {
    for (const reason of row.reasons) counts[reason] = (counts[reason] ?? 0) + 1;
    return counts;
  }, {});

  console.log(JSON.stringify({
    mode: "DRY_RUN_PREVIEW_ONLY",
    supplier: preview.supplier_id,
    source: preview.source,
    summary: preview.summary,
    by_brand: byBrand,
    rejected_reasons: rejectedReasons,
    ignored_operational_headers: preview.ignored_operational_headers,
    records_to_apply_after_protection: preview.records_to_apply.length,
    existing_master_compared: preview.source.existing_master_compared,
    apply_enabled: false,
    database_writes: 0,
    shopify_writes: 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "SANDERSON_CATALOGUE_PREVIEW_FAILED");
  process.exitCode = 1;
});
