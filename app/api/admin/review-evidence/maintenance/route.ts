import { NextResponse } from "next/server";

// Dormant legacy file service. Launch evidence is exchanged by email.
export async function GET() {
  return NextResponse.json({ error: "EVIDENCE_UPLOAD_WORKFLOW_DISABLED" }, { status: 410, headers: { "Cache-Control": "private, no-store" } });
}
export async function POST() {
  return NextResponse.json({ error: "EVIDENCE_UPLOAD_WORKFLOW_DISABLED" }, { status: 410, headers: { "Cache-Control": "private, no-store" } });
}
