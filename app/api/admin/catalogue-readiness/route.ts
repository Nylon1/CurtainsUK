import { NextResponse } from "next/server";
import { buildSupplierBulkImportReadiness } from "@/lib/fabric-master/bulk-import-readiness-service";
import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";

export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
  });
}

export async function GET() {
  if (!(await supplierAdminIdentity())) return response({ error: "SUPPLIER_ADMIN_REQUIRED" }, 403);
  try {
    return response({ reports: await buildSupplierBulkImportReadiness(), shopifyWrites: 0 });
  } catch {
    return response({ error: "CATALOGUE_READINESS_UNAVAILABLE" }, 503);
  }
}
