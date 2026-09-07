import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import * as XLSX from "xlsx";
import { InMemorySupplierIntelligenceRepository } from "@/lib/supplier-intelligence/memory-repository";
import { SupplierIntelligenceService } from "@/lib/supplier-intelligence/service";
import type { DurableSupplierSyncRun, SupplierApprovalPolicy, SupplierCatalogLink, SupplierFreshnessPolicy } from "@/lib/supplier-intelligence/types";
import { normalizeSupplierSnapshot } from "@/lib/supplier-sync/normalize";
import { PRESTIGIOUS_FILE_MAPPING_V1, PRESTIGIOUS_PORTAL_EXPORT_MAPPING_V1, SANDERSON_FILE_MAPPING_V1 } from "../mapping-profiles";
import { parseSupplierImportMapping } from "../mapping-validation";
import { parseSupplierImportDocument } from "../parse";
import { buildSupplierImportPreview } from "../preview";
import { applySupplierImport } from "../service";
import type { SupplierImportDocument, SupplierImportMapping } from "../types";

const now = new Date("2026-09-07T12:00:00.000Z");
const pt = "prestigious-textiles";
const sdg = "sanderson-design-group";

function fixture(name: string, format?: SupplierImportDocument["format"]): SupplierImportDocument {
  const bytes = readFileSync(path.join(process.cwd(), "lib/supplier-import/__fixtures__", name));
  return { filename: name, mime_type: name.endsWith(".csv") ? "text/csv" : null, bytes: new Uint8Array(bytes), format };
}

function repository() {
  const links: SupplierCatalogLink[] = [
    { supplier_id: pt, supplier_sku: "TEST-PT-001", brand_id: "prestigious-test", fabric_spec_id: "test-pt-1", price_verification_status: "VERIFIED" },
    { supplier_id: pt, supplier_sku: "TEST-PT-002", brand_id: "prestigious-test", fabric_spec_id: "test-pt-2", price_verification_status: "VERIFIED" },
    { supplier_id: sdg, supplier_sku: "TEST-SDG-001", brand_id: "sanderson-test", fabric_spec_id: "test-sdg-1", price_verification_status: "VERIFIED" },
    { supplier_id: sdg, supplier_sku: "TEST-SDG-002", brand_id: "sanderson-test", fabric_spec_id: "test-sdg-2", price_verification_status: "VERIFIED" },
  ];
  const freshness: SupplierFreshnessPolicy[] = [pt, sdg].flatMap((supplier) => ["OFFICIAL_CSV", "MANUAL_PORTAL", "OTHER"].flatMap((source) => [
    { policy_id: `${supplier}-${source}-stock`, supplier_id: supplier, source_type: source, data_type: "STOCK" as const, freshness_minutes: 1440, effective_from: "2026-01-01T00:00:00.000Z" },
    { policy_id: `${supplier}-${source}-price`, supplier_id: supplier, source_type: source, data_type: "PRICE" as const, freshness_minutes: 10080, effective_from: "2026-01-01T00:00:00.000Z" },
    { policy_id: `${supplier}-${source}-lifecycle`, supplier_id: supplier, source_type: source, data_type: "LIFECYCLE" as const, freshness_minutes: 4320, effective_from: "2026-01-01T00:00:00.000Z" },
  ]));
  const approval: SupplierApprovalPolicy[] = [pt, sdg].map((supplier) => ({ policy_id: `${supplier}-manual`, supplier_id: supplier, approval_mode: "MANUAL", required_price_field: "CUT_TRADE_PRICE", effective_from: "2026-01-01T00:00:00.000Z" }));
  return new InMemorySupplierIntelligenceRepository({ suppliers: [pt, sdg], links, freshness, approval });
}

test("CSV mapping merges multiple dye-lot rows into one normalized Prestigious snapshot", async () => {
  const preview = await buildSupplierImportPreview({ document: fixture("prestigious-synthetic.csv"), mapping: PRESTIGIOUS_FILE_MAPPING_V1, repository: repository(), now });
  assert.equal(preview.format, "CSV");
  assert.equal(preview.summary.source_rows, 3);
  assert.equal(preview.summary.candidates, 2);
  assert.equal(preview.summary.new, 2);
  const first = preview.rows.find((row) => row.supplier_sku === "TEST-PT-001")!;
  assert.equal(first.snapshot?.batches?.length, 2);
  assert.equal(first.validation?.status, "VALIDATED");
});

test("portal exports reuse the same normalized mapping pipeline", async () => {
  const preview = await buildSupplierImportPreview({ document: fixture("prestigious-synthetic.csv", "PORTAL_EXPORT"), mapping: PRESTIGIOUS_PORTAL_EXPORT_MAPPING_V1, repository: repository(), now });
  assert.equal(preview.format, "PORTAL_EXPORT");
  assert.equal(preview.rows[0].snapshot?.source.type, "MANUAL_PORTAL");
});

test("XLSX and legacy XLS files parse to the same tabular rows", async () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["SKU", "Value"], ["TEST-1", 12]]), "Data");
  for (const [bookType, format] of [["xlsx", "XLSX"], ["biff8", "XLS"]] as const) {
    const bytes = XLSX.write(workbook, { type: "buffer", bookType });
    const table = await parseSupplierImportDocument({ filename: `test.${format.toLowerCase()}`, mime_type: null, bytes: new Uint8Array(bytes), format });
    assert.deepEqual(table.rows, [{ SKU: "TEST-1", Value: "12" }]);
  }
});

test("text PDFs parse positionally and carry a mandatory review warning", async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([500, 300]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const [y, cells] of [[250, ["SKU", "Cut", "Status"]], [220, ["TEST-PT-001", "22.50", "Current"]]] as const) {
    cells.forEach((cell, index) => page.drawText(cell, { x: 40 + index * 150, y, size: 10, font }));
  }
  const table = await parseSupplierImportDocument({ filename: "supplier.pdf", mime_type: "application/pdf", bytes: await pdf.save(), format: "PDF" });
  assert.equal(table.rows[0].SKU, "TEST-PT-001");
  assert.ok(table.warnings.some((warning) => warning.includes("positional")));
});

test("preview reports private diffs and lifecycle transitions without mutating history", async () => {
  const repo = repository();
  const service = new SupplierIntelligenceService(repo);
  const checkedAt = "2026-09-07T10:00:00.000Z";
  const run: DurableSupplierSyncRun = { run_id: "prior-run", supplier_id: pt, adapter_id: "fixture", mode: "SHADOW", source_type: "OFFICIAL_CSV", source_name: "Fixture", started_at: checkedAt, completed_at: checkedAt, status: "SUCCEEDED", snapshots_received: 1, snapshots_appended: 1, error_code: null, shopify_writes: 0, production_schedule_created: false };
  const prior = normalizeSupplierSnapshot({ snapshot_id: "prior", supplier_id: pt, brand_id: "prestigious-test", supplier_sku: "TEST-PT-001", checked_at: checkedAt, standard_trade_price: "18.00", cut_trade_price: "21.00", currency: "GBP", stock_unit: "METRE", aggregate_available_quantity: 40, batches: [{ batch_reference: "TEST-LOT-A", batch_available_quantity: 40, pieces: 1 }], lifecycle_state: "CURRENT", source: { type: "OFFICIAL_CSV", name: "Fixture", reference: null }, verification_status: "VERIFIED" });
  await service.ingest({ run, snapshot: prior, requiredPriceField: "CUT_TRADE_PRICE", now });
  const csv = "Product Code,Brand,Cut Trade Price,Currency,Unit,Free Stock,Status\nTEST-PT-001,prestigious-test,23.00,GBP,METRE,0,Discontinued\n";
  const mapping: SupplierImportMapping = { ...PRESTIGIOUS_FILE_MAPPING_V1, fields: { supplier_sku: PRESTIGIOUS_FILE_MAPPING_V1.fields.supplier_sku, brand_id: PRESTIGIOUS_FILE_MAPPING_V1.fields.brand_id, cut_trade_price: PRESTIGIOUS_FILE_MAPPING_V1.fields.cut_trade_price, currency: PRESTIGIOUS_FILE_MAPPING_V1.fields.currency, stock_unit: PRESTIGIOUS_FILE_MAPPING_V1.fields.stock_unit, aggregate_available_quantity: PRESTIGIOUS_FILE_MAPPING_V1.fields.aggregate_available_quantity, lifecycle_state: PRESTIGIOUS_FILE_MAPPING_V1.fields.lifecycle_state }, defaults: { verification_status: "VERIFIED" } };
  const preview = await buildSupplierImportPreview({ document: { filename: "change.csv", mime_type: "text/csv", bytes: new TextEncoder().encode(csv) }, mapping, repository: repo, now });
  assert.equal(preview.rows[0].action, "UPDATE");
  assert.equal(preview.rows[0].lifecycle_transition, "CURRENT_TO_DISCONTINUED");
  assert.ok(preview.rows[0].diff.some((item) => item.field === "cut_trade_price" && item.private));
  assert.equal((await repo.dataset(pt)).snapshots.length, 1, "preview must be read-only");
});

test("bulk apply verifies the preview hash and atomically appends shadow history", async () => {
  const repo = repository();
  const document = fixture("prestigious-synthetic.csv");
  const preview = await buildSupplierImportPreview({ document, mapping: PRESTIGIOUS_FILE_MAPPING_V1, repository: repo, now });
  await assert.rejects(() => applySupplierImport({ document, mapping: PRESTIGIOUS_FILE_MAPPING_V1, repository: repo, expected_preview_hash: "0".repeat(64), preview_generated_at: preview.generated_at }), /IMPORT_PREVIEW_CHANGED/);
  assert.equal((await repo.dataset(pt)).snapshots.length, 0);
  const result = await applySupplierImport({ document, mapping: PRESTIGIOUS_FILE_MAPPING_V1, repository: repo, expected_preview_hash: preview.preview_hash, preview_generated_at: preview.generated_at });
  assert.equal(result.appended, 2);
  assert.equal(result.shopify_writes, 0);
  assert.equal(result.production_schedule_created, false);
  const data = await repo.dataset(pt);
  assert.equal(data.sync_runs.length, 1);
  assert.equal(data.snapshots.length, 2);
  assert.ok(data.promotion_events.every((event) => event.promotion_state === "VALIDATED"));
});

test("invalid mapped observations are retained as rejected audit records", async () => {
  const repo = repository();
  const csv = "Product Code,Cut Trade Price,Currency,Unit,Free Stock,Status\nTEST-PT-001,22.50,GBP,METRE,-5,Current\n";
  const mapping: SupplierImportMapping = { ...PRESTIGIOUS_FILE_MAPPING_V1, fields: { supplier_sku: PRESTIGIOUS_FILE_MAPPING_V1.fields.supplier_sku, cut_trade_price: PRESTIGIOUS_FILE_MAPPING_V1.fields.cut_trade_price, currency: PRESTIGIOUS_FILE_MAPPING_V1.fields.currency, stock_unit: PRESTIGIOUS_FILE_MAPPING_V1.fields.stock_unit, aggregate_available_quantity: PRESTIGIOUS_FILE_MAPPING_V1.fields.aggregate_available_quantity, lifecycle_state: PRESTIGIOUS_FILE_MAPPING_V1.fields.lifecycle_state } };
  const document = { filename: "invalid.csv", mime_type: "text/csv", bytes: new TextEncoder().encode(csv) };
  const preview = await buildSupplierImportPreview({ document, mapping, repository: repo, now });
  assert.equal(preview.rows[0].action, "INVALID");
  const result = await applySupplierImport({ document, mapping, repository: repo, expected_preview_hash: preview.preview_hash, preview_generated_at: preview.generated_at });
  assert.equal(result.invalid_retained_for_audit, 1);
  const data = await repo.dataset(pt);
  assert.equal(data.snapshots[0].validation_status, "FAILED");
  assert.equal(data.promotion_events[0].promotion_state, "REJECTED");
});

test("unmappable rows block bulk apply and declarative mappings reject executable kinds", async () => {
  const repo = repository();
  const document = { filename: "missing-sku.csv", mime_type: "text/csv", bytes: new TextEncoder().encode("Wrong Header,Cut Trade Price\nTEST-PT-001,22.50\n") };
  const mapping: SupplierImportMapping = { ...PRESTIGIOUS_FILE_MAPPING_V1, fields: { supplier_sku: PRESTIGIOUS_FILE_MAPPING_V1.fields.supplier_sku, cut_trade_price: PRESTIGIOUS_FILE_MAPPING_V1.fields.cut_trade_price }, defaults: { currency: "GBP" } };
  const preview = await buildSupplierImportPreview({ document, mapping, repository: repo, now });
  assert.equal(preview.rows[0].snapshot, null);
  await assert.rejects(() => applySupplierImport({ document, mapping, repository: repo, expected_preview_hash: preview.preview_hash, preview_generated_at: preview.generated_at }), /IMPORT_HAS_UNMAPPABLE_ROWS/);
  assert.throws(() => parseSupplierImportMapping({ ...mapping, fields: { supplier_sku: { column: "SKU", kind: "EVAL" } } }), /IMPORT_MAPPING_RULE_INVALID/);
  assert.throws(() => parseSupplierImportMapping({ ...mapping, defaults: { currency: { executable: true } } }), /IMPORT_MAPPING_DEFAULT_VALUE_INVALID/);
  assert.equal((await repo.dataset(pt)).snapshots.length, 0);
});

test("Sanderson uses identical parser, preview, validation and bulk storage contracts", async () => {
  const repo = repository();
  const document = fixture("sanderson-synthetic.csv");
  const preview = await buildSupplierImportPreview({ document, mapping: SANDERSON_FILE_MAPPING_V1, repository: repo, now });
  assert.equal(preview.supplier_id, sdg);
  assert.equal(preview.summary.new, 2);
  const result = await applySupplierImport({ document, mapping: SANDERSON_FILE_MAPPING_V1, repository: repo, expected_preview_hash: preview.preview_hash, preview_generated_at: preview.generated_at });
  assert.equal(result.appended, 2);
  assert.ok((await repo.dataset(sdg)).snapshots.every((snapshot) => snapshot.supplier_id === sdg));
});

test("bulk import remains private and disconnected from Shopify", () => {
  const previewRoute = readFileSync(path.join(process.cwd(), "app/api/admin/supplier-imports/preview/route.ts"), "utf8");
  const applyRoute = readFileSync(path.join(process.cwd(), "app/api/admin/supplier-imports/apply/route.ts"), "utf8");
  const service = readFileSync(path.join(process.cwd(), "lib/supplier-import/service.ts"), "utf8");
  const migration = readFileSync(path.join(process.cwd(), "supabase/migrations/20260907143000_supplier_bulk_import.sql"), "utf8");
  assert.match(previewRoute, /supplierAdminIdentity/);
  assert.match(applyRoute, /supplierAdminIdentity/);
  assert.doesNotMatch(`${previewRoute}\n${applyRoute}\n${migration}`, /shopify-admin|metafield|productCreate/i);
  assert.match(service, /shopify_writes:\s*0/);
  assert.match(migration, /revoke execute .* from public, anon, authenticated/i);
  assert.match(migration, /snapshot->>'supplier_id' <> p_run->>'supplier_id'/);
  assert.match(migration, /validation_event->>'snapshot_id' <> snapshot->>'snapshot_id'/);
  assert.doesNotMatch(migration, /create table/i, "Phase 4F must reuse the Phase 4E tables");
});
