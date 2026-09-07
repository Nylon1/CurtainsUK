import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { buildCatalogueImport } from "@/lib/fabric-master/catalogue-normalization";
import { previewPrestigiousFormationCatalogue } from "@/lib/fabric-master/prestigious-catalogue-import";
import { applyFabricCatalogueBatch, listExistingCatalogueRecords } from "@/lib/fabric-master/repository";

const CURTAINSUK_DEVELOPMENT_PROJECT_REF = "hqysjumypgeapgmqkcrx";

function hasFlag(flag: string) {
  return process.argv.includes(`--${flag}`);
}

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function sourcePath() {
  const value = process.argv.slice(2).find((item) => !item.startsWith("--"));
  if (!value) {
    throw new Error("USAGE: npm run fabric:import:prestigious -- <authorised-xlsx-path> --source-observed-at=<ISO> [--apply --confirm-project=hqysjumypgeapgmqkcrx]");
  }
  return resolve(value);
}

function projectRefFromUrl(raw: string) {
  try {
    return new URL(raw).hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

function verifyDevelopmentDatabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const configuredRef = process.env.CURTAINSUK_SUPABASE_PROJECT_REF ?? "";
  if (configuredRef !== CURTAINSUK_DEVELOPMENT_PROJECT_REF
    || projectRefFromUrl(url) !== CURTAINSUK_DEVELOPMENT_PROJECT_REF
    || argument("confirm-project") !== CURTAINSUK_DEVELOPMENT_PROJECT_REF) {
    throw new Error("CURTAINSUK_DEVELOPMENT_DATABASE_TARGET_REQUIRED");
  }
  return configuredRef;
}

async function main() {
  const path = sourcePath();
  const observedAt = argument("source-observed-at");
  if (!observedAt || !Number.isFinite(Date.parse(observedAt))) {
    throw new Error("VALID_--source-observed-at_REQUIRED");
  }
  const apply = hasFlag("apply");
  const bytes = new Uint8Array(await readFile(path));

  let projectRef: string | null = null;
  let existing: Awaited<ReturnType<typeof listExistingCatalogueRecords>> = [];
  if (apply) {
    loadEnvConfig(process.cwd());
    projectRef = verifyDevelopmentDatabase();
    existing = await listExistingCatalogueRecords("prestigious-textiles");
  }
  const preview = await previewPrestigiousFormationCatalogue({
    document: {
      filename: basename(path),
      mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bytes,
      format: "XLSX",
    },
    source_observed_at: observedAt,
    existing_records: apply ? existing : undefined,
  });
  if (apply && preview.rejected_rows.length) {
    throw new Error(`PRESTIGIOUS_IMPORT_HAS_REJECTED_ROWS:${preview.rejected_rows.length}`);
  }

  let database: { writes: number; result: null | Awaited<ReturnType<typeof applyFabricCatalogueBatch>> } = {
    writes: 0,
    result: null,
  };
  if (apply && preview.records_to_apply.length) {
    const existingSkus = new Set(existing.map((entry) => entry.record.supplier_sku));
    const revisions = new Map(existing.map((entry) => [entry.record.supplier_sku, entry.updated_at]));
    const protectedFields = new Map(preview.rows.map((row) => [row.supplier_sku, row.protected_fields]));
    const batch = buildCatalogueImport({
      supplierId: preview.supplier_id,
      sourceType: "AUTHORISED_XLSX_CATALOGUE",
      sourceName: "Prestigious authorised Formation catalogue export",
      sourceReference: basename(path),
      sourceSha256: preview.source.source_sha256,
      sourceEffectiveDate: preview.source.effective_date,
      sourceObservedAt: preview.source.observed_at,
      existingSupplierSkus: existingSkus,
      existingSupplierUpdatedAt: revisions,
      protectedFieldsBySku: protectedFields,
      records: preview.records_to_apply,
    });
    database = {
      writes: batch.items.length,
      result: await applyFabricCatalogueBatch(batch.metadata, batch.items),
    };
  }

  console.log(JSON.stringify({
    mode: apply ? "APPLY" : "DRY_RUN_PREVIEW_ONLY",
    project: apply ? { name: "CurtainsUK", ref: projectRef, environment: "development" } : null,
    source: preview.source,
    summary: preview.summary,
    completion: preview.completion,
    records_to_apply_after_protection: preview.records_to_apply.length,
    rejected_reasons: preview.rejected_rows.reduce<Record<string, number>>((counts, row) => {
      for (const reason of row.reasons) counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    }, {}),
    database,
    shopify_writes: 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "PRESTIGIOUS_IMPORT_FAILED");
  process.exitCode = 1;
});
