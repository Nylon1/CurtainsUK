import { NextRequest, NextResponse } from "next/server";
import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";
import { SupplierIntelligenceService } from "@/lib/supplier-intelligence/service";
import { SupabaseSupplierIntelligenceRepository } from "@/lib/supplier-intelligence/supabase-repository";
import { supplierDatabaseConfigured } from "@/lib/supabase/supplier-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await supplierAdminIdentity())) return NextResponse.json({ error: "SUPPLIER_ADMIN_REQUIRED" }, { status: 403 });
  if (!supplierDatabaseConfigured()) return NextResponse.json({ error: "SUPPLIER_DATABASE_NOT_CONFIGURED" }, { status: 503 });
  const supplierId = request.nextUrl.searchParams.get("supplier") || undefined;
  try {
    const report = await new SupplierIntelligenceService(new SupabaseSupplierIntelligenceRepository()).health(supplierId);
    return NextResponse.json({ report }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch {
    return NextResponse.json({ error: "SUPPLIER_HEALTH_UNAVAILABLE" }, { status: 503 });
  }
}
