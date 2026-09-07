import "server-only";
import { randomUUID } from "node:crypto";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import { scanEvidencePayload, type VerifiedEvidencePayload } from "./evidence-core";
import { configuredMalwareScanner } from "./malware-scanner";

export interface UploadedEvidenceSecurityRecord {
  evidenceId: string;
  requestId: string;
  objectPath: string;
  payload: VerifiedEvidencePayload;
  retentionExpiresAt: string;
}

function validActorId(value: string | undefined): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const DEFAULT_SCANNER_ACTOR_ID = "00000000-0000-4000-8000-000000000051";

export function configuredEvidenceRetentionDays() {
  const value = Number.parseInt(process.env.CURTAINSUK_EVIDENCE_RETENTION_DAYS ?? "180", 10);
  return Number.isInteger(value) && value >= 30 && value <= 3_650 ? value : 180;
}

export async function scanUploadedReviewEvidence(records: readonly UploadedEvidenceSecurityRecord[]) {
  const configuredActorId = process.env.CURTAINSUK_EVIDENCE_SCANNER_ACTOR_ID;
  const actorId = validActorId(configuredActorId) ? configuredActorId : DEFAULT_SCANNER_ACTOR_ID;
  const scanner = configuredMalwareScanner();
  for (const record of records) {
    const scan = await scanEvidencePayload(scanner, record.payload);
    const { error } = await createSupplierServiceClient().rpc("record_staging_review_evidence_scan_attempt", {
      p_result: {
        attempt_id: randomUUID(),
        event_id: randomUUID(),
        evidence_id: record.evidenceId,
        actor_id: actorId,
        verdict: scan.result.verdict,
        detected_content_type: record.payload.detectedContentType,
        scanner_provider: scan.result.provider,
        scanner_reference: scan.result.reference,
        failure_code: scan.result.failureCode ?? null,
        rejection_reason: scan.result.verdict === "MALICIOUS" ? "Malware scanner rejected this upload" : null,
      },
    });
    // A scanner/RPC failure deliberately leaves the durable row quarantined.
    // It does not turn an unverified file into a staff-readable object.
    if (error) continue;
  }
}

export function uploadedReviewEvidencePayload(records: readonly UploadedEvidenceSecurityRecord[]) {
  return records.map((record) => ({
    evidence_id: record.evidenceId,
    request_id: record.requestId,
    kind: record.payload.kind,
    file_name: record.payload.fileName,
    object_path: record.objectPath,
    claimed_content_type: record.payload.contentType,
    detected_content_type: record.payload.detectedContentType,
    size_bytes: record.payload.sizeBytes,
    sha256_hex: record.payload.sha256Hex,
    retention_expires_at: record.retentionExpiresAt,
  }));
}
