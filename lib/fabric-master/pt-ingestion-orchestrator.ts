export const ptIngestionStages = ["SOURCE_READY", "MEDIA_READY", "PRICE_APPROVED", "KNOWLEDGE_READY", "STOCK_READY", "RELEASE_READY", "RELEASED", "EXCEPTION"] as const;
export type PtIngestionStage = typeof ptIngestionStages[number];
export type PtFailureAction = "RETRY" | "EXCEPTION" | "STOP_SYSTEMIC";

const retryableMediaFailures = new Set(["MEDIA_IMPORT_FAILED", "IMAGE_FETCH_REJECTED", "IMAGE_DECODE_REJECTED", "HTTP_429", "NETWORK_TIMEOUT"]);
const systemicFailures = /^(AUTH_|SCHEMA_|SOURCE_CORRUPTION$|RELEASE_INTEGRITY|DATABASE_UNAVAILABLE$|DATABASE_SCHEMA_)/;

export function nextPtIngestionStage(stage: Exclude<PtIngestionStage, "RELEASED" | "EXCEPTION">): PtIngestionStage {
  const index = ptIngestionStages.indexOf(stage);
  return ptIngestionStages[index + 1];
}

/** Isolated supplier/media/AI errors must not halt the rest of a cohort. */
export function classifyPtIngestionFailure(stage: PtIngestionStage, code: string, retryCount: number): PtFailureAction {
  if (systemicFailures.test(code)) return "STOP_SYSTEMIC";
  if (stage === "MEDIA_READY") return retryableMediaFailures.has(code) && retryCount < 3 ? "RETRY" : "EXCEPTION";
  if (stage === "STOCK_READY" && (code === "WEBTEX_UNSUPPORTED_SKU" || code === "WEBTEX_NO_NUMERIC_STOCK")) return "EXCEPTION";
  if ((stage === "KNOWLEDGE_READY" || stage === "PRICE_APPROVED" || stage === "STOCK_READY") && retryCount < 3) return "RETRY";
  return "EXCEPTION";
}

export type ReleaseCandidate = { itemId: string; stage: PtIngestionStage; workState: "READY" | "CLAIMED" | "RELEASED" | "EXCEPTION" };
export type ReleaseGroup = { itemIds: string[]; phases: readonly ["PAUSE_BROWSE_REFRESH", "WRITE_KNOWLEDGE_AND_STOCK", "RECONCILE_ONCE", "VERIFY_PARITY", "ATOMIC_PUBLISH", "RESTORE_BROWSE_REFRESH"] };

/** Only clean, committed items enter a release group; exceptions remain out of band. */
export function buildPtReleaseGroups(candidates: ReleaseCandidate[], maximum = 1000): ReleaseGroup[] {
  if (!Number.isInteger(maximum) || maximum < 1 || maximum > 1000) throw new Error("PT_RELEASE_GROUP_SIZE_INVALID");
  const eligible = candidates.filter((item) => item.stage === "RELEASE_READY" && item.workState === "READY").map((item) => item.itemId);
  const phases: ReleaseGroup["phases"] = ["PAUSE_BROWSE_REFRESH", "WRITE_KNOWLEDGE_AND_STOCK", "RECONCILE_ONCE", "VERIFY_PARITY", "ATOMIC_PUBLISH", "RESTORE_BROWSE_REFRESH"];
  const groups: ReleaseGroup[] = [];
  for (let index = 0; index < eligible.length; index += maximum) groups.push({ itemIds: eligible.slice(index, index + maximum), phases });
  return groups;
}

/** A committed stage is skipped only when its governed input is byte-identical. */
export function stageNeedsRequeue(committedFingerprint: string | undefined, governedFingerprint: string) {
  if (!/^[a-f0-9]{64}$/.test(governedFingerprint)) throw new Error("PT_STAGE_FINGERPRINT_INVALID");
  return committedFingerprint !== governedFingerprint;
}

export type PtSeedItem = { supplierSku: string; initialStage?: PtIngestionStage; committedFingerprints?: Partial<Record<Exclude<PtIngestionStage, "EXCEPTION">, string>>; exceptionCode?: string };
const seedRequiredStages: Record<Exclude<PtIngestionStage, "EXCEPTION">, readonly Exclude<PtIngestionStage, "RELEASED" | "EXCEPTION">[]> = {
  SOURCE_READY: [],
  MEDIA_READY: ["SOURCE_READY"],
  PRICE_APPROVED: ["SOURCE_READY", "MEDIA_READY"],
  KNOWLEDGE_READY: ["SOURCE_READY", "MEDIA_READY", "PRICE_APPROVED"],
  STOCK_READY: ["SOURCE_READY", "MEDIA_READY", "PRICE_APPROVED", "KNOWLEDGE_READY"],
  RELEASE_READY: ["SOURCE_READY", "MEDIA_READY", "PRICE_APPROVED", "KNOWLEDGE_READY", "STOCK_READY"],
  RELEASED: ["SOURCE_READY", "MEDIA_READY", "PRICE_APPROVED", "KNOWLEDGE_READY", "STOCK_READY", "RELEASE_READY"],
};

/** Validate imported durable checkpoints before they can suppress a stage replay. */
export function validatePtSeedItem(item: PtSeedItem) {
  const stage = item.initialStage ?? "SOURCE_READY";
  if (!item.supplierSku.trim() || !ptIngestionStages.includes(stage)) throw new Error("PT_SEED_ITEM_INVALID");
  if (stage === "EXCEPTION") {
    if (!/^[A-Z0-9_]{1,80}$/.test(item.exceptionCode ?? "")) throw new Error("PT_SEED_EXCEPTION_EVIDENCE_REQUIRED");
    return;
  }
  const fingerprints = item.committedFingerprints ?? {};
  for (const predecessor of seedRequiredStages[stage]) {
    if (!/^[a-f0-9]{64}$/.test(fingerprints[predecessor] ?? "")) throw new Error("PT_SEED_COMMITTED_EVIDENCE_REQUIRED");
  }
}
