import "server-only";
import {
  assertEvidenceSetPolicy,
  evidenceRetentionExpiry,
  scanEvidencePayload,
  verifyEvidencePayload,
  type EvidenceKind,
  type EvidenceSecurityState,
} from "./evidence-core";
import { configuredMalwareScanner } from "./malware-scanner";

export interface QuarantinedEvidenceInput {
  kind: EvidenceKind;
  file: File;
}

export interface EvidenceSecurityObservation {
  kind: EvidenceKind;
  fileName: string;
  claimedContentType: string;
  detectedContentType: string;
  sizeBytes: number;
  sha256Hex: string;
  safeExtension: string;
  securityState: EvidenceSecurityState;
  scannerProvider: string;
  scannerReference: string | null;
  scannedAt: string | null;
  retentionExpiresAt: string;
}

export async function inspectEvidenceForQuarantine(
  inputs: readonly QuarantinedEvidenceInput[],
  options: { now?: Date; retentionDays?: number } = {},
): Promise<EvidenceSecurityObservation[]> {
  const now = options.now ?? new Date();
  const verified = await Promise.all(inputs.map(async ({ kind, file }) => verifyEvidencePayload({
    kind,
    fileName: file.name,
    claimedContentType: file.type,
    bytes: new Uint8Array(await file.arrayBuffer()),
  })));
  assertEvidenceSetPolicy(verified);
  const scanner = configuredMalwareScanner();
  return Promise.all(verified.map(async (payload) => {
    const scan = await scanEvidencePayload(scanner, payload);
    return {
      kind: payload.kind,
      fileName: payload.fileName,
      claimedContentType: payload.contentType,
      detectedContentType: payload.detectedContentType,
      sizeBytes: payload.sizeBytes,
      sha256Hex: payload.sha256Hex,
      safeExtension: payload.safeExtension,
      securityState: scan.state,
      scannerProvider: scan.result.provider,
      scannerReference: scan.result.reference,
      scannedAt: scan.result.verdict === "UNAVAILABLE" ? null : now.toISOString(),
      retentionExpiresAt: evidenceRetentionExpiry(now, options.retentionDays ?? 180),
    };
  }));
}
