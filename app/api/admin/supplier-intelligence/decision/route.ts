import { NextRequest, NextResponse } from "next/server";
import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";
import { SupplierIntelligenceService } from "@/lib/supplier-intelligence/service";
import { SupabaseSupplierIntelligenceRepository } from "@/lib/supplier-intelligence/supabase-repository";
import { supplierDatabaseConfigured } from "@/lib/supabase/supplier-service";

export async function POST(request: NextRequest) {
  const admin = await supplierAdminIdentity();
  if (!admin) return NextResponse.json({ error: "SUPPLIER_ADMIN_REQUIRED" }, { status: 403 });
  if (!supplierDatabaseConfigured()) return NextResponse.json({ error: "SUPPLIER_DATABASE_NOT_CONFIGURED" }, { status: 503 });
  const body = await request.json() as { snapshotId?: string; decision?: "APPROVE" | "REJECT"; reason?: string };
  if (!body.snapshotId || !body.decision || !body.reason?.trim()) return NextResponse.json({ error: "SNAPSHOT_DECISION_AND_REASON_REQUIRED" }, { status: 400 });
  const service = new SupplierIntelligenceService(new SupabaseSupplierIntelligenceRepository());
  try {
    const event = body.decision === "APPROVE"
      ? await service.manuallyApprove({ snapshotId: body.snapshotId, approvedBy: admin.id, reason: body.reason })
      : await service.manuallyReject({ snapshotId: body.snapshotId, rejectedBy: admin.id, reason: body.reason });
    return NextResponse.json({ event: { snapshot_id: event.snapshot_id, promotion_state: event.promotion_state, created_at: event.created_at } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : "SUPPLIER_DECISION_FAILED";
    return NextResponse.json({ error: code }, { status: 409 });
  }
}
