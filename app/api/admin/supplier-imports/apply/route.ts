import { NextRequest, NextResponse } from "next/server";
import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";
import { SupabaseSupplierIntelligenceRepository } from "@/lib/supplier-intelligence/supabase-repository";
import { applySupplierImport } from "@/lib/supplier-import/service";
import { supplierImportRequest } from "@/lib/supplier-import/server-request";
import { supplierDatabaseConfigured } from "@/lib/supabase/supplier-service";

export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}

export async function POST(request: NextRequest) {
  if (!(await supplierAdminIdentity())) return response({ error: "SUPPLIER_ADMIN_REQUIRED" }, 403);
  if (!supplierDatabaseConfigured()) return response({ error: "SUPPLIER_DATABASE_NOT_CONFIGURED" }, 503);
  try {
    const formData = await request.formData();
    const expectedPreviewHash = formData.get("preview_hash");
    const previewGeneratedAt = formData.get("preview_generated_at");
    if (typeof expectedPreviewHash !== "string" || !/^[a-f0-9]{64}$/.test(expectedPreviewHash) || typeof previewGeneratedAt !== "string") throw new Error("VALID_IMPORT_PREVIEW_REQUIRED");
    const input = await supplierImportRequest(formData);
    const result = await applySupplierImport({
      ...input,
      repository: new SupabaseSupplierIntelligenceRepository(),
      expected_preview_hash: expectedPreviewHash,
      preview_generated_at: previewGeneratedAt,
    });
    return response({ result });
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_:.-]+$/.test(error.message) ? error.message : "SUPPLIER_IMPORT_APPLY_FAILED";
    return response({ error: code }, 409);
  }
}
