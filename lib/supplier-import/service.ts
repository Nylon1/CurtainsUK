import { randomUUID } from "node:crypto";
import type { SupplierIntelligenceRepository } from "@/lib/supplier-intelligence/repository";
import { createValidationEvent } from "@/lib/supplier-intelligence/promotion";
import type { DurableSupplierSyncRun } from "@/lib/supplier-intelligence/types";
import { buildSupplierImportPreview } from "./preview";
import type { SupplierBulkApplyResult, SupplierImportDocument, SupplierImportMapping } from "./types";

export async function applySupplierImport(input: {
  document: SupplierImportDocument;
  mapping: SupplierImportMapping;
  repository: SupplierIntelligenceRepository;
  expected_preview_hash: string;
  preview_generated_at: string;
}): Promise<SupplierBulkApplyResult> {
  const generatedAt = new Date(input.preview_generated_at);
  if (!Number.isFinite(generatedAt.getTime())) throw new Error("VALID_PREVIEW_TIMESTAMP_REQUIRED");
  const preview = await buildSupplierImportPreview({ document: input.document, mapping: input.mapping, repository: input.repository, now: generatedAt });
  if (preview.preview_hash !== input.expected_preview_hash) throw new Error("IMPORT_PREVIEW_CHANGED");
  const unauditable = preview.rows.filter((row) => row.snapshot === null);
  if (unauditable.length) throw new Error("IMPORT_HAS_UNMAPPABLE_ROWS");
  const applicable = preview.rows.filter((row) => row.action !== "UNCHANGED");
  if (!applicable.length) return {
    run_id: null,
    preview_hash: preview.preview_hash,
    appended: 0,
    valid: 0,
    invalid_retained_for_audit: 0,
    unchanged_skipped: preview.summary.unchanged,
    shopify_writes: 0,
    production_schedule_created: false,
  };

  const runId = `supplier-import:${input.mapping.supplier_id}:${generatedAt.toISOString()}:${randomUUID()}`;
  const run: DurableSupplierSyncRun = {
    run_id: runId,
    supplier_id: input.mapping.supplier_id,
    adapter_id: `bulk-import:${preview.format.toLowerCase()}`,
    mode: "SHADOW",
    source_type: input.mapping.source_type,
    source_name: input.mapping.source_name,
    started_at: generatedAt.toISOString(),
    completed_at: generatedAt.toISOString(),
    status: "SUCCEEDED",
    snapshots_received: applicable.length,
    snapshots_appended: applicable.length,
    error_code: null,
    shopify_writes: 0,
    production_schedule_created: false,
  };
  const items = applicable.map((row) => ({
    snapshot: row.snapshot!,
    validation: row.validation!,
    validation_event: createValidationEvent(row.snapshot!.snapshot_id, row.validation!, generatedAt.toISOString()),
  }));
  await input.repository.appendBulkValidatedSnapshots({ run, items });
  return {
    run_id: runId,
    preview_hash: preview.preview_hash,
    appended: items.length,
    valid: items.filter((item) => item.validation.status === "VALIDATED").length,
    invalid_retained_for_audit: items.filter((item) => item.validation.status === "FAILED").length,
    unchanged_skipped: preview.summary.unchanged,
    shopify_writes: 0,
    production_schedule_created: false,
  };
}
