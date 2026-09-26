import { setTimeout as sleep } from "node:timers/promises";
import { classifyPtIngestionFailure, type PtFailureAction, type PtIngestionStage } from "./pt-ingestion-orchestrator";

export type PtClaim = { itemId: string; supplierSku: string; fabricId: string | null; claimToken: string; retryCount: number };
export type PtStageFailure = { itemId: string; code: string; detail?: Record<string, unknown> };
export type PtStageResult = { succeeded: string[]; failures?: PtStageFailure[] };
export type PtStageWorker = (claims: readonly PtClaim[]) => Promise<PtStageResult>;
export type PtCheckpointPort = {
  commit(claim: PtClaim, result: Record<string, unknown>): Promise<void>;
  retry(claim: PtClaim, code: string, detail?: Record<string, unknown>): Promise<void>;
  exception(claim: PtClaim, code: string, detail?: Record<string, unknown>): Promise<void>;
  stopSystemic(code: string, detail?: Record<string, unknown>): Promise<void>;
};
export type PtStageRunSummary = { committed: number; retried: number; excepted: number; stoppedSystemic: boolean };

const failureCode = (error: unknown) => {
  const value = error instanceof Error ? error.message : "STAGE_WORKER_FAILED";
  return /^[A-Z0-9_]{1,80}$/.test(value) ? value : "STAGE_WORKER_FAILED";
};

/**
 * Reuses the completed result written by an existing visual worker. Retrying its
 * persistence is safe because that worker's visual ledger is its checkpoint; this
 * runner never asks OpenAI to regenerate a committed lineage result.
 */
export async function runPtStageCohort(stage: Exclude<PtIngestionStage, "RELEASED" | "EXCEPTION">, claims: readonly PtClaim[], worker: PtStageWorker, checkpoints: PtCheckpointPort): Promise<PtStageRunSummary> {
  if (!claims.length) return { committed: 0, retried: 0, excepted: 0, stoppedSystemic: false };
  const resolved = new Map<string, PtStageFailure>();
  let result: PtStageResult;
  try {
    result = stage === "STOCK_READY" ? await runWebtexWithAutomaticSplit(claims, worker) : await worker(claims);
  } catch (error) {
    const code = failureCode(error);
    if (classifyPtIngestionFailure(stage, code, 0) === "STOP_SYSTEMIC") {
      await checkpoints.stopSystemic(code, { stage, scope: claims.length });
      return { committed: 0, retried: 0, excepted: 0, stoppedSystemic: true };
    }
    result = { succeeded: [], failures: claims.map((claim) => ({ itemId: claim.itemId, code })) };
  }
  const expected = new Set(claims.map((claim) => claim.itemId));
  for (const id of result.succeeded) {
    if (!expected.delete(id)) throw new Error("PT_STAGE_RESULT_SCOPE_MISMATCH");
  }
  for (const failure of result.failures ?? []) {
    if (!expected.delete(failure.itemId) || resolved.has(failure.itemId)) throw new Error("PT_STAGE_RESULT_SCOPE_MISMATCH");
    resolved.set(failure.itemId, failure);
  }
  if (expected.size) throw new Error("PT_STAGE_RESULT_INCOMPLETE");

  let committed = 0, retried = 0, excepted = 0;
  for (const claim of claims) {
    const failure = resolved.get(claim.itemId);
    if (!failure) {
      await checkpoints.commit(claim, { worker_stage: stage });
      committed += 1;
      continue;
    }
    const action = classifyPtIngestionFailure(stage, failure.code, claim.retryCount);
    if (action === "STOP_SYSTEMIC") {
      await checkpoints.stopSystemic(failure.code, { stage, item_id: claim.itemId, ...(failure.detail ?? {}) });
      return { committed, retried, excepted, stoppedSystemic: true };
    }
    if (action === "RETRY") {
      await checkpoints.retry(claim, failure.code, failure.detail);
      retried += 1;
    } else {
      await checkpoints.exception(claim, failure.code, failure.detail);
      excepted += 1;
    }
  }
  return { committed, retried, excepted, stoppedSystemic: false };
}

/** A retrievable Webtex cohort is bisected only after a non-systemic cohort error. */
export async function runWebtexWithAutomaticSplit(claims: readonly PtClaim[], worker: PtStageWorker): Promise<PtStageResult> {
  try {
    return await worker(claims);
  } catch (error) {
    const code = failureCode(error);
    if (classifyPtIngestionFailure("STOCK_READY", code, 0) === "STOP_SYSTEMIC") throw error;
    if (claims.length === 1) return { succeeded: [], failures: [{ itemId: claims[0].itemId, code }] };
    const middle = Math.ceil(claims.length / 2);
    const [left, right] = await Promise.all([
      runWebtexWithAutomaticSplit(claims.slice(0, middle), worker),
      runWebtexWithAutomaticSplit(claims.slice(middle), worker),
    ]);
    return { succeeded: [...left.succeeded, ...right.succeeded], failures: [...(left.failures ?? []), ...(right.failures ?? [])] };
  }
}

export type MediaFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type PtMediaFetchOptions = { attempts?: number; timeoutMs?: number; backoffMs?: number; fetcher?: MediaFetch; sleep?: (ms: number) => Promise<void> };

/** Never use an unbounded request for a media cohort. */
export async function fetchPtMediaWithRetry(url: string, options: PtMediaFetchOptions = {}): Promise<Response> {
  const attempts = options.attempts ?? 3, timeoutMs = options.timeoutMs ?? 30_000, backoffMs = options.backoffMs ?? 500;
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 3 || !Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 60_000) throw new Error("PT_MEDIA_RETRY_ARGUMENT_INVALID");
  const fetcher = options.fetcher ?? fetch, delay = options.sleep ?? sleep;
  let lastCode = "MEDIA_IMPORT_FAILED";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetcher(url, { redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok && response.headers.get("content-type")?.startsWith("image/")) return response;
      lastCode = response.status === 429 ? "HTTP_429" : "IMAGE_FETCH_REJECTED";
      if (response.body) await response.body.cancel();
    } catch (error) {
      lastCode = error instanceof DOMException && error.name === "TimeoutError" ? "NETWORK_TIMEOUT" : "MEDIA_IMPORT_FAILED";
    }
    if (attempt < attempts) await delay(backoffMs * attempt);
  }
  throw new Error(lastCode);
}
