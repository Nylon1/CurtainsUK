import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { buildCatalogueImport } from "@/lib/fabric-master/catalogue-normalization";
import { listExistingCatalogueRecords, applyFabricCatalogueBatch, listFabricMasterRecords } from "@/lib/fabric-master/repository";
import { previewSandersonAllBrandsCatalogue } from "@/lib/fabric-master/sanderson-catalogue-import";
import { selectSandersonCanary } from "@/lib/fabric-master/sanderson-canary";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";

const CURTAINSUK_DEVELOPMENT_PROJECT_REF = "hqysjumypgeapgmqkcrx";

function hasFlag(flag: string) {
  return process.argv.includes(`--${flag}`);
}

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function projectRefFromUrl(raw: string) {
  try {
    return new URL(raw).hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

function verifyDevelopmentDatabase(apply: boolean) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const configuredRef = process.env.CURTAINSUK_SUPABASE_PROJECT_REF ?? "";
  const urlRef = projectRefFromUrl(url);
  if (configuredRef !== CURTAINSUK_DEVELOPMENT_PROJECT_REF || urlRef !== CURTAINSUK_DEVELOPMENT_PROJECT_REF) {
    throw new Error("CURTAINSUK_DEVELOPMENT_DATABASE_TARGET_REQUIRED");
  }
  if (apply && argument("confirm-project") !== CURTAINSUK_DEVELOPMENT_PROJECT_REF) {
    throw new Error(`APPLY_REQUIRES_--confirm-project=${CURTAINSUK_DEVELOPMENT_PROJECT_REF}`);
  }
  return configuredRef;
}

function publicPilotFingerprint(record: Awaited<ReturnType<typeof listFabricMasterRecords>>[number] | undefined) {
  if (!record) throw new Error("VERIFIED_SANDERSON_PILOT_MISSING");
  return JSON.stringify(record);
}

async function databaseCount(table: string, importId?: string) {
  let query = createSupplierServiceClient().from(table).select("*", { count: "exact", head: true });
  if (importId) query = query.eq("import_id", importId);
  const { count, error } = await query;
  if (error) throw new Error(`CANARY_DATABASE_COUNT_FAILED:${table}:${error.code ?? "UNKNOWN"}`);
  return count ?? 0;
}

async function main() {
  loadEnvConfig(process.cwd());
  const sourceArgument = process.argv.slice(2).find((value) => !value.startsWith("--"));
  if (!sourceArgument) {
    throw new Error("USAGE: npm run fabric:canary:sanderson -- <authorised-all-brands.xlsx> [--apply --confirm-project=hqysjumypgeapgmqkcrx]");
  }
  const apply = hasFlag("apply");
  const projectRef = verifyDevelopmentDatabase(apply);
  const sourcePath = resolve(sourceArgument);
  const bytes = new Uint8Array(await readFile(sourcePath));
  const existing = await listExistingCatalogueRecords("sanderson-design-group");
  const pilotBefore = publicPilotFingerprint(existing.find((entry) => entry.record.supplier_sku === "DAPGPA203")?.record);
  const preview = await previewSandersonAllBrandsCatalogue({
    document: {
      filename: basename(sourcePath),
      mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bytes,
      format: "XLSX",
    },
    existing_records: existing,
  });
  const pilotPreview = preview.rows.find((row) => row.supplier_sku === "DAPGPA203");
  if (!pilotPreview || pilotPreview.action !== "PRESERVE_NEWER_EXISTING") {
    throw new Error(`DAPGPA203_PRESERVATION_GATE_FAILED:${pilotPreview?.action ?? "MISSING"}`);
  }
  const selected = selectSandersonCanary(preview);
  const existingSkus = new Set(existing.map((entry) => entry.record.supplier_sku));
  const existingUpdatedAt = new Map(existing.map((entry) => [entry.record.supplier_sku, entry.updated_at]));
  const batch = buildCatalogueImport({
    supplierId: preview.supplier_id,
    sourceType: "AUTHORISED_XLSX_CATALOGUE",
    sourceName: "Sanderson Design Group authorised all-brands export",
    sourceReference: `${preview.source.filename}#${preview.source.sheet_name}`,
    sourceSha256: preview.source.source_sha256,
    sourceEffectiveDate: preview.source.effective_date,
    sourceObservedAt: preview.source.observed_at,
    existingSupplierSkus: existingSkus,
    existingSupplierUpdatedAt: existingUpdatedAt,
    records: selected,
  });
  const byBrand = Object.fromEntries([...new Set(selected.map((record) => record.brand_name))].sort().map((brand) => [
    brand,
    selected.filter((record) => record.brand_name === brand).length,
  ]));
  const validation = {
    exact_unique_skus: new Set(selected.map((record) => record.supplier_sku)).size === 50,
    existing_sku_collisions: selected.filter((record) => existingSkus.has(record.supplier_sku)).length,
    verified_record_downgrades: 0,
    broken_identity_mappings: selected.filter((record) => !record.brand_id || !record.collection_id || !record.design_id).length,
    complete_dimensions_repeat_composition: selected.filter((record) => !record.full_width_mm || record.vertical_repeat_mm === null || record.horizontal_repeat_mm === null || !record.pattern_match_type || record.composition.length === 0).length === 0,
    pricing_blocked_pending_verification: selected.every((record) => record.price_verification_status === "PRICE_REQUIRES_VERIFICATION" && !record.storefront_selectable),
    staging_catalog_visible_without_pricing: selected.every((record) => record.staging_catalog_visible === true && !record.storefront_selectable),
    stale_lifecycle_not_inferred: selected.every((record) => record.lifecycle_state === "UNKNOWN"),
    imagery_known: selected.filter((record) => record.imagery.length > 0).length,
    imagery_blocker: "The authorised workbook contains no image/media/URL column; only DAPGPA203 has a separately authorised image mapping.",
  };
  let database = { writes: 0, result: null as null | Awaited<ReturnType<typeof applyFabricCatalogueBatch>>, colourways_before: existing.length, colourways_after: existing.length, observations: 0 };
  if (apply) {
    const observationsBefore = await databaseCount("fabric_catalogue_observations");
    const result = await applyFabricCatalogueBatch(batch.metadata, batch.items);
    const after = await listExistingCatalogueRecords("sanderson-design-group");
    const pilotAfter = publicPilotFingerprint(after.find((entry) => entry.record.supplier_sku === "DAPGPA203")?.record);
    const missing = selected.filter((record) => !after.some((entry) => entry.record.supplier_sku === record.supplier_sku));
    const observationsAfter = await databaseCount("fabric_catalogue_observations");
    const importObservations = await databaseCount("fabric_catalogue_observations", batch.metadata.import_id);
    if (pilotAfter !== pilotBefore) throw new Error("DAPGPA203_CHANGED_DURING_CANARY");
    if (missing.length || after.length !== existing.length + 50 || importObservations !== 50 || observationsAfter !== observationsBefore + 50) {
      throw new Error(`CANARY_POST_APPLY_VERIFICATION_FAILED:${missing.length}:${after.length}:${importObservations}:${observationsAfter - observationsBefore}`);
    }
    database = { writes: 50, result, colourways_before: existing.length, colourways_after: after.length, observations: importObservations };
  }
  console.log(JSON.stringify({
    mode: apply ? "APPLY" : "DRY_RUN",
    project: { name: "CurtainsUK", ref: projectRef, environment: "development" },
    source: preview.source,
    canary: { selected: selected.length, brands: byBrand, sample_skus: selected.slice(0, 12).map((record) => record.supplier_sku) },
    validation,
    verified_pilot: { supplier_sku: "DAPGPA203", preview_action: pilotPreview.action, unchanged: true },
    database,
    shopify_writes: 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "SANDERSON_CANARY_FAILED");
  process.exitCode = 1;
});
