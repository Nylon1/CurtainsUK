import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildCatalogueImport } from "../lib/fabric-master/catalogue-normalization";
import { applyFabricCatalogueBatch, listExistingCatalogueRecords } from "../lib/fabric-master/repository";

type ManifestItem = {
  supplier_sku: string;
  fabric_id: string | null;
  scope: "OLD_METHOD_EXCEPTION" | "UNTOUCHED";
  status: "DATA" | "ERROR";
  supplier_lifecycle?: "DISCONTINUED";
  price_list_design_code?: string;
  price_list_page?: number;
  webtex?: { exactIdentity?: boolean; description?: string; collection?: string; freeStock?: string; imageFull?: string } | null;
};
type Manifest = {
  generated_at: string;
  authority: string;
  price_list_authority: { name: string; reference: string; sha256: string; price_basis: string };
  items: ManifestItem[];
};

const manifestPath = process.argv.find((value) => value.startsWith("--manifest="))?.slice(11)
  ?? "artifacts/pt-webtex-first/webtex-first-resolution-manifest.json";
const output = process.argv.find((value) => value.startsWith("--out="))?.slice(6)
  ?? "artifacts/pt-webtex-first/webtex-first-resolution-report.json";

function assertTarget() {
  const url = process.env.SUPABASE_URL ?? "";
  if (new URL(url).hostname !== "hqysjumypgeapgmqkcrx.supabase.co") throw new Error("PT_WEBTEX_FIRST_TARGET_REJECTED");
  if (process.env.PT_WEBTEX_FIRST_APPLY !== "CONFIRM_DISCONTINUED_RECONCILIATION") throw new Error("PT_WEBTEX_FIRST_APPLY_CONFIRMATION_REQUIRED");
}

function groups<T>(values: readonly T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function main() {
  assertTarget();
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  if (manifest.items.length !== 960 || manifest.price_list_authority.sha256 !== "8e1d9d1dc648eed833073136a4f2eb8e05db701fbcf4c37eda50bfec92915108") throw new Error("PT_WEBTEX_FIRST_MANIFEST_INVALID");
  const resolved = manifest.items.filter((item) => item.status === "DATA");
  if (resolved.length !== 177 || resolved.some((item) => item.supplier_lifecycle !== "DISCONTINUED" || item.webtex?.exactIdentity !== true || !item.webtex.freeStock || !item.webtex.imageFull || item.price_list_design_code !== item.supplier_sku.split("/")[0])) throw new Error("PT_WEBTEX_FIRST_DISCONTINUED_EVIDENCE_INVALID");

  const current = await listExistingCatalogueRecords("prestigious-textiles");
  const currentBySku = new Map(current.map((item) => [item.record.supplier_sku, item]));
  const existing = resolved.flatMap((item) => {
    const match = currentBySku.get(item.supplier_sku);
    return match ? [{ item, match }] : [];
  });
  const absent = resolved.filter((item) => !currentBySku.has(item.supplier_sku));
  if (existing.length !== 169 || absent.length !== 8) throw new Error("PT_WEBTEX_FIRST_MASTER_COUNTS_CHANGED");
  if (existing.some(({ match }) => match.record.staging_catalog_visible || match.record.storefront_selectable)) throw new Error("PT_WEBTEX_FIRST_RELEASED_RECORD_IN_SCOPE");
  const pending = existing.filter(({ match }) => match.record.lifecycle_state !== "DISCONTINUED");
  const applied: string[] = [];

  for (const cohort of groups(pending, 50)) {
    const records = cohort.map(({ match }) => {
      const { supplier_name: supplierName, ...record } = match.record;
      void supplierName;
      return { ...record, lifecycle_state: "DISCONTINUED" as const, storefront_selectable: false, staging_catalog_visible: false, brand_name: match.record.brand_name };
    });
    const revisions = new Map(cohort.map(({ match }) => [match.record.supplier_sku, match.updated_at]));
    const batch = buildCatalogueImport({
      supplierId: "prestigious-textiles",
      sourceType: "AUTHORISED_PDF_CATALOGUE",
      sourceName: manifest.price_list_authority.name,
      sourceReference: `${manifest.price_list_authority.reference}; ${manifest.authority}`,
      sourceSha256: manifest.price_list_authority.sha256,
      sourceEffectiveDate: "2026-08-01",
      sourceObservedAt: manifest.generated_at,
      existingSupplierSkus: new Set(records.map((record) => record.supplier_sku)),
      existingSupplierUpdatedAt: revisions,
      records,
    });
    // The supplier marker applies to these exact colourways/designs. It must not
    // imply that every other design in the same collection is discontinued.
    for (const item of batch.items) item.collection_lifecycle_state = "UNKNOWN";
    const result = await applyFabricCatalogueBatch(batch.metadata, batch.items);
    if (result.updated !== cohort.length || result.inserted !== 0 || result.rejected !== 0) throw new Error("PT_WEBTEX_FIRST_GOVERNED_UPDATE_MISMATCH");
    applied.push(...cohort.map(({ item }) => item.supplier_sku));
  }

  const after = await listExistingCatalogueRecords("prestigious-textiles");
  const afterBySku = new Map(after.map((item) => [item.record.supplier_sku, item.record]));
  const verified = existing.filter(({ item }) => {
    const row = afterBySku.get(item.supplier_sku);
    return row?.lifecycle_state === "DISCONTINUED" && !row.staging_catalog_visible && !row.storefront_selectable;
  });
  if (verified.length !== existing.length) throw new Error("PT_WEBTEX_FIRST_DISCONTINUED_PARITY_FAILED");
  const report = {
    completed_at: new Date().toISOString(),
    unresolved_input: manifest.items.length,
    webtex_exact_product_records: resolved.length,
    existing_discontinued_resolved: existing.length,
    newly_updated_discontinued: applied.length,
    already_discontinued: existing.length - applied.length,
    discontinued_not_created: absent.length,
    webtex_unsupported_exceptions: manifest.items.filter((item) => item.status === "ERROR").length,
    released: 0,
    duplicates_created: 0,
    unaccounted: manifest.items.length - resolved.length - manifest.items.filter((item) => item.status === "ERROR").length,
    absent_skus: absent.map((item) => item.supplier_sku),
  };
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(report));
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : "PT_WEBTEX_FIRST_RESOLUTION_FAILED"); process.exitCode = 1; });
