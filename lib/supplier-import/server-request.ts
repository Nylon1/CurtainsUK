import "server-only";
import { SUPPLIER_IMPORT_MAPPING_PROFILES } from "./mapping-profiles";
import { parseSupplierImportMapping } from "./mapping-validation";
import type { SupplierImportDocument, SupplierImportFormat, SupplierImportMapping } from "./types";

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const FORMATS = new Set<SupplierImportFormat>(["CSV", "XLS", "XLSX", "PDF", "PORTAL_EXPORT"]);

export async function supplierImportRequest(formData: FormData): Promise<{ document: SupplierImportDocument; mapping: SupplierImportMapping }> {
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name || file.size <= 0) throw new Error("SUPPLIER_IMPORT_FILE_REQUIRED");
  if (file.size > MAX_IMPORT_BYTES) throw new Error("SUPPLIER_IMPORT_FILE_TOO_LARGE");
  const rawFormat = formData.get("format");
  const format = typeof rawFormat === "string" && rawFormat ? rawFormat.toUpperCase() as SupplierImportFormat : undefined;
  if (format && !FORMATS.has(format)) throw new Error("UNSUPPORTED_SUPPLIER_IMPORT_FORMAT");
  const mappingJson = formData.get("mapping_json");
  const profileId = formData.get("mapping_profile");
  let mapping: SupplierImportMapping;
  if (typeof mappingJson === "string" && mappingJson.trim()) {
    if (mappingJson.length > 100_000) throw new Error("IMPORT_MAPPING_TOO_LARGE");
    mapping = parseSupplierImportMapping(JSON.parse(mappingJson));
  } else if (typeof profileId === "string" && SUPPLIER_IMPORT_MAPPING_PROFILES.has(profileId)) {
    mapping = structuredClone(SUPPLIER_IMPORT_MAPPING_PROFILES.get(profileId)!);
  } else {
    throw new Error("SUPPLIER_IMPORT_MAPPING_REQUIRED");
  }
  return {
    document: { filename: file.name, mime_type: file.type || null, bytes: new Uint8Array(await file.arrayBuffer()), format },
    mapping,
  };
}
