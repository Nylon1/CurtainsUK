import { NextRequest, NextResponse } from "next/server";
import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";
import { SupplierIntelligenceService } from "@/lib/supplier-intelligence/service";
import { SupabaseSupplierIntelligenceRepository } from "@/lib/supplier-intelligence/supabase-repository";
import { supplierDatabaseConfigured } from "@/lib/supabase/supplier-service";

export async function GET(request: NextRequest) {
  if (!(await supplierAdminIdentity())) return NextResponse.json({ error: "SUPPLIER_ADMIN_REQUIRED" }, { status: 403 });
  if (!supplierDatabaseConfigured()) return NextResponse.json({ error: "SUPPLIER_DATABASE_NOT_CONFIGURED" }, { status: 503 });
  const supplierId = request.nextUrl.searchParams.get("supplier");
  const supplierSku = request.nextUrl.searchParams.get("sku");
  const quantity = Number(request.nextUrl.searchParams.get("quantity"));
  const stockUnit = request.nextUrl.searchParams.get("unit") || "METRE";
  if (!supplierId || !supplierSku || !Number.isFinite(quantity) || quantity <= 0) return NextResponse.json({ error: "VALID_PROJECTION_REQUIREMENT_REQUIRED" }, { status: 400 });
  try {
    const projection = await new SupplierIntelligenceService(new SupabaseSupplierIntelligenceRepository()).projection({ supplierId, supplierSku, requirement: { quantity, stock_unit: stockUnit } });
    return NextResponse.json({ projection }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch {
    return NextResponse.json({ error: "SUPPLIER_PROJECTION_UNAVAILABLE" }, { status: 503 });
  }
}
