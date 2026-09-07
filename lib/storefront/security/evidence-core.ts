import { createHash } from "node:crypto";
import { extname } from "node:path";

export type EvidenceKind = "PHOTO" | "DRAWING";
export type EvidenceSecurityState = "QUARANTINED" | "CLEAN" | "REJECTED" | "DELETION_REQUESTED" | "DELETED";
export type MalwareVerdict = "CLEAN" | "MALICIOUS" | "UNAVAILABLE";

export interface MalwareScanInput {
  bytes: Uint8Array;
  fileName: string;
  contentType: string;
  sha256Hex: string;
}

export interface MalwareScanResult {
  verdict: MalwareVerdict;
  provider: string;
  reference: string | null;
  failureCode?: "NOT_CONFIGURED" | "TIMEOUT" | "PROVIDER_ERROR" | "INVALID_RESPONSE";
}

export interface MalwareScanner {
  scan(input: MalwareScanInput): Promise<MalwareScanResult>;
}

export interface VerifiedEvidencePayload extends MalwareScanInput {
  kind: EvidenceKind;
  sizeBytes: number;
  detectedContentType: string;
  safeExtension: string;
}

export interface EvidenceValidationPolicy {
  maximumFileBytes: number;
  maximumTotalBytes: number;
  maximumPhotos: number;
}

export const DEFAULT_EVIDENCE_POLICY: EvidenceValidationPolicy = Object.freeze({
  maximumFileBytes: 3 * 1024 * 1024,
  maximumTotalBytes: 3_800_000,
  maximumPhotos: 8,
});

const MIME_EXTENSIONS: Record<string, readonly string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/heic": [".heic"],
  "image/heif": [".heif", ".heic"],
  "application/pdf": [".pdf"],
};

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function normalizedContentType(value: string) {
  return value.split(";", 1)[0].trim().toLowerCase();
}

function safeFileName(value: string) {
  const normalized = value.normalize("NFKC").trim();
  if (!normalized
    || normalized.length > 255
    || /[\u0000-\u001f\u007f]/.test(normalized)
    || normalized.includes("/")
    || normalized.includes("\\")) {
    throw new Error("REVIEW_EVIDENCE_INVALID");
  }
  return normalized;
}

export function detectEvidenceContentType(bytes: Uint8Array) {
  const buffer = Buffer.from(bytes);
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12);
    if (["heic", "heix", "hevc", "hevx"].includes(brand)) return "image/heic";
    if (["mif1", "msf1"].includes(brand)) return "image/heif";
  }
  return null;
}

export function verifyEvidencePayload(input: {
  kind: EvidenceKind;
  fileName: string;
  claimedContentType: string;
  bytes: Uint8Array;
  policy?: EvidenceValidationPolicy;
}): VerifiedEvidencePayload {
  const policy = input.policy ?? DEFAULT_EVIDENCE_POLICY;
  const fileName = safeFileName(input.fileName);
  const claimedContentType = normalizedContentType(input.claimedContentType);
  const detectedContentType = detectEvidenceContentType(input.bytes);
  if (!detectedContentType || detectedContentType !== claimedContentType) throw new Error("REVIEW_EVIDENCE_INVALID");
  if (input.kind === "PHOTO" ? !PHOTO_TYPES.has(detectedContentType) : !(PHOTO_TYPES.has(detectedContentType) || detectedContentType === "application/pdf")) {
    throw new Error("REVIEW_EVIDENCE_INVALID");
  }
  const sizeBytes = input.bytes.byteLength;
  if (sizeBytes <= 0 || sizeBytes > policy.maximumFileBytes) throw new Error("REVIEW_EVIDENCE_INVALID");
  const extension = extname(fileName).toLowerCase();
  const expectedExtensions = MIME_EXTENSIONS[detectedContentType] ?? [];
  if (!expectedExtensions.includes(extension)) throw new Error("REVIEW_EVIDENCE_INVALID");
  return {
    kind: input.kind,
    bytes: input.bytes,
    fileName,
    contentType: claimedContentType,
    detectedContentType,
    sizeBytes,
    safeExtension: expectedExtensions[0],
    sha256Hex: createHash("sha256").update(input.bytes).digest("hex"),
  };
}

export function assertEvidenceSetPolicy(
  files: readonly Pick<VerifiedEvidencePayload, "kind" | "sizeBytes">[],
  policy: EvidenceValidationPolicy = DEFAULT_EVIDENCE_POLICY,
) {
  if (files.filter((file) => file.kind === "PHOTO").length > policy.maximumPhotos) throw new Error("REVIEW_EVIDENCE_INVALID");
  if (files.reduce((total, file) => total + file.sizeBytes, 0) > policy.maximumTotalBytes) throw new Error("REVIEW_EVIDENCE_INVALID");
}

export async function scanEvidencePayload(
  scanner: MalwareScanner,
  payload: VerifiedEvidencePayload,
): Promise<{ state: EvidenceSecurityState; result: MalwareScanResult }> {
  try {
    const result = await scanner.scan(payload);
    if (result.verdict === "CLEAN") return { state: "CLEAN", result };
    if (result.verdict === "MALICIOUS") return { state: "REJECTED", result };
    return { state: "QUARANTINED", result };
  } catch {
    return {
      state: "QUARANTINED",
      result: {
        verdict: "UNAVAILABLE",
        provider: "unavailable",
        reference: null,
        failureCode: "PROVIDER_ERROR",
      },
    };
  }
}

/** Test-only deterministic scanner. Production configuration never selects it. */
export class DeterministicTestMalwareScanner implements MalwareScanner {
  async scan(input: MalwareScanInput): Promise<MalwareScanResult> {
    const text = Buffer.from(input.bytes).toString("latin1");
    const malicious = text.includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE") || text.includes("TEST-MALWARE-SIGNATURE");
    return {
      verdict: malicious ? "MALICIOUS" : "CLEAN",
      provider: "deterministic-test-scanner",
      reference: `test:${input.sha256Hex.slice(0, 12)}`,
    };
  }
}

export class UnavailableMalwareScanner implements MalwareScanner {
  async scan(): Promise<MalwareScanResult> {
    return {
      verdict: "UNAVAILABLE",
      provider: "not-configured",
      reference: null,
      failureCode: "NOT_CONFIGURED",
    };
  }
}

export interface EvidenceRetentionRecord {
  objectPath: string;
  state: EvidenceSecurityState;
  retentionExpiresAt: string;
  legalHold?: boolean;
}

export function evidenceRetentionExpiry(createdAt: string | Date, retentionDays: number) {
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3_650) {
    throw new Error("EVIDENCE_RETENTION_POLICY_INVALID");
  }
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) throw new Error("EVIDENCE_RETENTION_POLICY_INVALID");
  created.setUTCDate(created.getUTCDate() + retentionDays);
  return created.toISOString();
}

export function planRetentionDeletion(records: readonly EvidenceRetentionRecord[], now = new Date()) {
  return records.filter((record) => !record.legalHold
    && record.state !== "DELETED"
    && new Date(record.retentionExpiresAt).getTime() <= now.getTime());
}

export function planOrphanCleanup(input: {
  objects: readonly { objectPath: string; createdAt: string }[];
  referencedObjectPaths: ReadonlySet<string>;
  now?: Date;
  graceHours?: number;
}) {
  const now = input.now ?? new Date();
  const graceHours = input.graceHours ?? 48;
  if (!Number.isInteger(graceHours) || graceHours < 1 || graceHours > 720) throw new Error("EVIDENCE_ORPHAN_POLICY_INVALID");
  const cutoff = now.getTime() - graceHours * 60 * 60 * 1_000;
  return input.objects.filter((object) => !input.referencedObjectPaths.has(object.objectPath)
    && new Date(object.createdAt).getTime() <= cutoff);
}
