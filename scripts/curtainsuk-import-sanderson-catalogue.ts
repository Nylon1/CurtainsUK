import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { buildCatalogueImport } from "@/lib/fabric-master/catalogue-normalization";
import {
  applyFabricCatalogueBatch,
  listExistingCatalogueRecords,
} from "@/lib/fabric-master/repository";
import { previewSandersonAllBrandsCatalogue } from "@/lib/fabric-master/sanderson-catalogue-import";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";

const CURTAINSUK_DEVELOPMENT_PROJECT_REF = "hqysjumypgeapgmqkcrx";
const DEFAULT_BATCH_SIZE = 250;

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
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
  if (configuredRef !== CURTAINSUK_DEVELOPMENT_PROJECT_REF
    || projectRefFromUrl(url) !== CURTAINSUK_DEVELOPMENT_PROJECT_REF) {
    throw new Error("CURTAINSUK_DEVELOPMENT_DATABASE_TARGET_REQUIRED");
  }
  if (apply && argument("confirm-project") !== CURTAINSUK_DEVELOPMENT_PROJECT_REF) {
    throw new Error(`APPLY_REQUIRES_--confirm-project=${CURTAINSUK_DEVELOPMENT_PROJECT_REF}`);
  }
  return configuredRef;
}

function batchSize() {
  const parsed = Number.parseInt(argument("batch-size") ?? String(DEFAULT_BATCH_SIZE), 10);
  if (!Number.isInteger(parsed) || parsed < 50 || parsed > 500) {
    throw new Error("BATCH_SIZE_MUST_BE_BETWEEN_50_AND_500");
  }
  return parsed;
}

function chunks<T>(values: T[], size: number) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => (
    values.slice(index * size, (index + 1) * size)
  ));
}

function publicFingerprint(record: unknown) {
  return JSON.stringify(record);
}

async function sourceRunCount(sourceSha256: string) {
  const { count, error } = await createSupplierServiceClient()
    .from("fabric_catalogue_import_runs")
    .select("import_id", { count: "exact", head: true })
    .eq("supplier_id", "sanderson-design-group")
    .eq("source_sha256", sourceSha256);
  if (error) throw new Error(`SANDERSON_IMPORT_HISTORY_UNAVAILABLE:${error.code ?? "UNKNOWN"}`);
  return count ?? 0;
}

function changedBusinessFields(incoming: Record<string, unknown>, existing: Record<string, unknown>) {
  const ignored = new Set([
    "supplier_name",
    "source_type",
    "source_name",
    "source_reference",
    "source_effective_date",
    "source_row_number",
  ]);
  return [...new Set([...Object.keys(incoming), ...Object.keys(existing)])]
    .filter((key) => !ignored.has(key))
    .filter((key) => JSON.stringify(incoming[key]) !== JSON.stringify(existing[key]))
    .sort();
}

async function main() {
  loadEnvConfig(process.cwd());
  const sourceArgument = process.argv.slice(2).find((value) => !value.startsWith("--"));
  if (!sourceArgument) {
    throw new Error("USAGE: npm run fabric:import:sanderson -- <authorised-all-brands.xlsx> [--apply --confirm-project=hqysjumypgeapgmqkcrx]");
  }
  const apply = hasFlag("apply");
  const projectRef = verifyDevelopmentDatabase(apply);
  const sourcePath = resolve(sourceArgument);
  const bytes = new Uint8Array(await readFile(sourcePath));
  const existing = await listExistingCatalogueRecords("sanderson-design-group");
  const pilotBefore = existing.find((entry) => entry.record.supplier_sku === "DAPGPA203")?.record;
  if (!pilotBefore) throw new Error("VERIFIED_SANDERSON_PILOT_MISSING");

  const preview = await previewSandersonAllBrandsCatalogue({
    document: {
      filename: basename(sourcePath),
      mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bytes,
      format: "XLSX",
    },
    existing_records: existing,
  });
  if (!preview.completion.qa_import.eligible) {
    throw new Error(`SANDERSON_QA_IMPORT_BLOCKED:${preview.completion.qa_import.blockers.join(",")}`);
  }
  const pilotPreview = preview.rows.find((row) => row.supplier_sku === "DAPGPA203");
  if (!pilotPreview || !["PRESERVE_NEWER_EXISTING", "UNCHANGED"].includes(pilotPreview.action)) {
    throw new Error(`DAPGPA203_PRESERVATION_GATE_FAILED:${pilotPreview?.action ?? "MISSING"}`);
  }

  const protectedFields = new Map(preview.rows.map((row) => [row.supplier_sku, row.protected_fields]));
  const existingSkus = new Set(existing.map((entry) => entry.record.supplier_sku));
  const existingUpdatedAt = new Map(existing.map((entry) => [entry.record.supplier_sku, entry.updated_at]));
  const existingBySku = new Map(existing.map((entry) => [entry.record.supplier_sku, entry.record]));
  const priorSourceRuns = await sourceRunCount(preview.source.source_sha256);
  const allAcceptedSkusPresent = preview.records.every((record) => existingSkus.has(record.supplier_sku));
  // A complete prior application of the identical immutable source is a no-op.
  // This prevents source-only/design-join differences from creating audit churn.
  const sourceAlreadyFullyApplied = priorSourceRuns > 0 && allAcceptedSkusPresent;
  const recordsToApply = sourceAlreadyFullyApplied ? [] : preview.records_to_apply;
  const importChunks = chunks(recordsToApply, batchSize());
  const batchResults: Array<{ inserted: number; updated: number; rejected: number; shopify_writes: 0 }> = [];

  if (apply) {
    for (const [index, records] of importChunks.entries()) {
      const batch = buildCatalogueImport({
        supplierId: preview.supplier_id,
        sourceType: "AUTHORISED_XLSX_CATALOGUE",
        sourceName: "Sanderson Design Group authorised all-brands export",
        sourceReference: `${preview.source.filename}#${preview.source.sheet_name};part=${index + 1}/${importChunks.length}`,
        sourceSha256: preview.source.source_sha256,
        sourceEffectiveDate: preview.source.effective_date,
        sourceObservedAt: preview.source.observed_at,
        existingSupplierSkus: existingSkus,
        existingSupplierUpdatedAt: existingUpdatedAt,
        protectedFieldsBySku: protectedFields,
        records,
      });
      batchResults.push(await applyFabricCatalogueBatch(batch.metadata, batch.items));
    }
  }

  let verification: null | {
    expected_colourways: number;
    actual_colourways: number;
    missing_accepted_skus: number;
    verified_pilot_unchanged: boolean;
    customer_launch_eligible: number;
  } = null;
  if (apply) {
    const after = await listExistingCatalogueRecords("sanderson-design-group");
    const expectedSkus = new Set([
      ...existing.map((entry) => entry.record.supplier_sku),
      ...preview.records.map((record) => record.supplier_sku),
    ]);
    const afterSkus = new Set(after.map((entry) => entry.record.supplier_sku));
    const pilotAfter = after.find((entry) => entry.record.supplier_sku === "DAPGPA203")?.record;
    verification = {
      expected_colourways: expectedSkus.size,
      actual_colourways: after.length,
      missing_accepted_skus: [...expectedSkus].filter((sku) => !afterSkus.has(sku)).length,
      verified_pilot_unchanged: publicFingerprint(pilotAfter) === publicFingerprint(pilotBefore),
      customer_launch_eligible: after.filter((entry) => entry.record.storefront_selectable
        && entry.record.price_verification_status === "VERIFIED"
        && entry.record.lifecycle_state === "CURRENT"
        && entry.record.imagery.length > 0).length,
    };
    if (verification.actual_colourways !== verification.expected_colourways
      || verification.missing_accepted_skus !== 0
      || !verification.verified_pilot_unchanged) {
      throw new Error("SANDERSON_POST_APPLY_VERIFICATION_FAILED");
    }
  }

  console.log(JSON.stringify({
    mode: apply ? "PRIVATE_QA_BULK_APPLY" : "DRY_RUN_PREVIEW_ONLY",
    project: { name: "CurtainsUK", ref: projectRef, environment: "development" },
    source: preview.source,
    summary: preview.summary,
    completion: preview.completion,
    sample_merge_changes: preview.records_to_apply.slice(0, 12).map((record) => ({
      supplier_sku: record.supplier_sku,
      fields: changedBusinessFields(
        record as unknown as Record<string, unknown>,
        (existingBySku.get(record.supplier_sku) ?? {}) as unknown as Record<string, unknown>,
      ),
    })),
    rejected_reasons: preview.rejected_rows.reduce<Record<string, number>>((counts, row) => {
      for (const reason of row.reasons) counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    }, {}),
    apply: {
      requested: apply,
      source_already_fully_applied: sourceAlreadyFullyApplied,
      prior_source_runs: priorSourceRuns,
      batches: importChunks.length,
      records: recordsToApply.length,
      inserted: batchResults.reduce((sum, result) => sum + result.inserted, 0),
      updated: batchResults.reduce((sum, result) => sum + result.updated, 0),
      rejected: batchResults.reduce((sum, result) => sum + result.rejected, 0),
      shopify_writes: 0,
    },
    verification,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "SANDERSON_CATALOGUE_IMPORT_FAILED");
  process.exitCode = 1;
});
