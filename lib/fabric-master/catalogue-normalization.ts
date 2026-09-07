import { createHash, randomUUID } from "node:crypto";
import type { FabricCatalogueImportItem, FabricCatalogueImportMetadata, FabricMasterRecord } from "./types";

export function stableSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

export function publicRecordHash(record: Omit<FabricMasterRecord, "supplier_name">) {
  const sorted = Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
  return sha256(JSON.stringify(sorted));
}

export function buildCatalogueImport(input: {
  supplierId: string;
  sourceType: string;
  sourceName: string;
  sourceReference?: string | null;
  sourceSha256: string;
  sourceEffectiveDate?: string | null;
  existingSupplierSkus: ReadonlySet<string>;
  records: Array<Omit<FabricMasterRecord, "supplier_name"> & { brand_name: string; source_row_number?: number | null }>;
  importedAt?: string;
}) {
  const importedAt = input.importedAt ?? new Date().toISOString();
  const importId = `fabric-catalogue:${input.supplierId}:${importedAt}:${randomUUID()}`;
  const items: FabricCatalogueImportItem[] = input.records.map((record) => ({
    ...record,
    collection_lifecycle_state: record.lifecycle_state,
    observation_id: `fabric-observation:${randomUUID()}`,
    public_record_sha256: publicRecordHash(record),
    source_row_number: record.source_row_number ?? null,
  }));
  const inserted = items.filter((item) => !input.existingSupplierSkus.has(item.supplier_sku)).length;
  const metadata: FabricCatalogueImportMetadata = {
    import_id: importId,
    supplier_id: input.supplierId,
    source_type: input.sourceType,
    source_name: input.sourceName,
    source_reference: input.sourceReference ?? null,
    source_sha256: input.sourceSha256,
    source_effective_date: input.sourceEffectiveDate ?? null,
    imported_at: importedAt,
    row_count: items.length,
    inserted_count: inserted,
    updated_count: items.length - inserted,
    rejected_count: 0,
    shopify_writes: 0,
  };
  return { metadata, items };
}
