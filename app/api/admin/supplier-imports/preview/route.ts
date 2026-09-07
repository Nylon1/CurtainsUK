import { NextRequest, NextResponse } from "next/server";
import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";
import { SupabaseSupplierIntelligenceRepository } from "@/lib/supplier-intelligence/supabase-repository";
import { buildSupplierImportPreview } from "@/lib/supplier-import/preview";
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
    const input = await supplierImportRequest(await request.formData());
    const preview = await buildSupplierImportPreview({ ...input, repository: new SupabaseSupplierIntelligenceRepository() });
    return response({ preview });
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_:.-]+$/.test(error.message) ? error.message : "SUPPLIER_IMPORT_PREVIEW_FAILED";
    return response({ error: code }, 400);
  }
}
