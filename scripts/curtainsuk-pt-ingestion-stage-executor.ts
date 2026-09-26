/**
 * Durable adapter around the existing governed PT workers.  It never implements
 * commercial, media, visual, stock or Browse writes itself: it claims a precise
 * durable scope, runs an allow-listed existing worker, and advances only the
 * item IDs that the worker's exact result file proves.
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { buildPtReleaseGroups, type PtIngestionStage } from "../lib/fabric-master/pt-ingestion-orchestrator";
import { runPtStageCohort, type PtClaim, type PtCheckpointPort, type PtStageResult } from "../lib/fabric-master/pt-ingestion-stage-runner";

const runFile = promisify(execFile);
const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const required = (name: string) => {
  const value = arg(name);
  if (!value) throw new Error(`PT_STAGE_EXECUTOR_${name.toUpperCase().replaceAll("-", "_")}_REQUIRED`);
  return value;
};
const stageNames = new Set(["SOURCE_READY", "MEDIA_READY", "PRICE_APPROVED", "KNOWLEDGE_READY", "STOCK_READY", "RELEASE_READY"]);
const stage = () => {
  const value = required("stage");
  if (!stageNames.has(value)) throw new Error("PT_STAGE_EXECUTOR_STAGE_INVALID");
  return value as Exclude<PtIngestionStage, "RELEASED" | "EXCEPTION">;
};
const exactProject = "hqysjumypgeapgmqkcrx.supabase.co";
const allowedWorker = {
  SOURCE_READY: "scripts/curtainsuk-pt-bounded-prepare.ts",
  MEDIA_READY: "scripts/curtainsuk-import-supplier-media.ts",
  PRICE_APPROVED: "scripts/curtainsuk-hci-record-daily-observation.ts",
  KNOWLEDGE_READY: "scripts/curtainsuk-visual-enrichment.ts",
  STOCK_READY: "scripts/curtainsuk-pt-routine-stock.ts",
  RELEASE_READY: "scripts/curtainsuk-activate-canary.ts",
} as const;
type WorkerFile = { script: string; args?: string[]; env?: Record<string, string>; result_file: string };
type ResultFile = { items: Array<{ item_id: string; status: "SUCCEEDED" | "FAILED"; failure_code?: string; detail?: Record<string, unknown> }> };

function assertTarget() {
  const url = process.env.SUPABASE_URL ?? "";
  if (new URL(url).hostname !== exactProject) throw new Error("PT_STAGE_EXECUTOR_DATABASE_TARGET_REJECTED");
}
function limitFor(value: ReturnType<typeof stage>) {
  if (value === "PRICE_APPROVED") return 1;
  if (value === "STOCK_READY") return 100;
  if (value === "RELEASE_READY") return 1000;
  return 50;
}
async function json<T>(file: string): Promise<T> { return JSON.parse(await readFile(file, "utf8")) as T; }
async function writeJson(file: string, value: unknown) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, JSON.stringify(value, null, 2) + "\n", "utf8"); }
function inputHash(value: string) { if (!/^[a-f0-9]{64}$/.test(value)) throw new Error("PT_STAGE_EXECUTOR_INPUT_HASH_INVALID"); return value; }
function claimsFrom(rows: unknown): PtClaim[] {
  if (!Array.isArray(rows)) throw new Error("PT_STAGE_EXECUTOR_CLAIMS_INVALID");
  return rows.map((row) => {
    const value = row as Record<string, unknown>;
    if (typeof value.item_id !== "string" || typeof value.supplier_sku !== "string" || typeof value.claim_token !== "string" || !Number.isInteger(value.retry_count)) throw new Error("PT_STAGE_EXECUTOR_CLAIMS_INVALID");
    return { itemId: value.item_id, supplierSku: value.supplier_sku, fabricId: typeof value.fabric_id === "string" ? value.fabric_id : null, claimToken: value.claim_token, retryCount: value.retry_count as number };
  });
}
function parseResult(file: ResultFile, claims: readonly PtClaim[]): PtStageResult {
  const valid = new Set(claims.map((claim) => claim.itemId));
  const seen = new Set<string>();
  const succeeded: string[] = [], failures: NonNullable<PtStageResult["failures"]> = [];
  for (const item of file.items) {
    if (!valid.has(item.item_id) || seen.has(item.item_id) || (item.status === "FAILED" && !/^[A-Z0-9_]{1,80}$/.test(item.failure_code ?? ""))) throw new Error("PT_STAGE_EXECUTOR_RESULT_SCOPE_INVALID");
    seen.add(item.item_id);
    if (item.status === "SUCCEEDED") succeeded.push(item.item_id);
    else failures.push({ itemId: item.item_id, code: item.failure_code!, detail: item.detail });
  }
  if (seen.size !== claims.length) throw new Error("PT_STAGE_EXECUTOR_RESULT_INCOMPLETE");
  return { succeeded, failures };
}

async function executeWorker(file: WorkerFile, activeStage: ReturnType<typeof stage>, claims: readonly PtClaim[]) {
  if (file.script !== allowedWorker[activeStage] || !file.result_file || !Array.isArray(file.args) || Object.values(file.env ?? {}).some((value) => typeof value !== "string")) throw new Error("PT_STAGE_EXECUTOR_WORKER_NOT_ALLOWED");
  const workerArgs = file.args;
  // Existing workers receive only the claimed cohort. Secrets remain in their
  // configured environment; this adapter never serialises or prints them.
  const env = { ...process.env, ...(file.env ?? {}) };
  if (activeStage === "STOCK_READY") env.PT_COHORT_SKUS = claims.map((claim) => claim.supplierSku).join(",");
  if (activeStage === "KNOWLEDGE_READY") {
    const ids = claims.map((claim) => claim.fabricId);
    if (ids.some((id) => !id)) throw new Error("PT_STAGE_EXECUTOR_FABRIC_ID_REQUIRED");
    const cohortFile = `${file.result_file}.cohort.json`;
    await writeJson(cohortFile, ids);
    file = { ...file, args: [...workerArgs, `--fabric-ids-file=${cohortFile}`, "--include-prepared"] };
  }
  await runFile(process.execPath, ["node_modules/tsx/dist/cli.mjs", file.script, ...(file.args ?? workerArgs)], { cwd: process.cwd(), env, timeout: activeStage === "MEDIA_READY" ? 180_000 : 900_000, maxBuffer: 1024 * 1024 });
  return parseResult(await json<ResultFile>(file.result_file), claims);
}

async function main() {
  assertTarget();
  const mode = required("mode"), activeStage = stage(), runId = required("run-id"), workerId = required("worker-id");
  const db = createSupplierServiceClient();
  if (mode === "release-plan") {
    if (activeStage !== "RELEASE_READY") throw new Error("PT_STAGE_EXECUTOR_RELEASE_STAGE_REQUIRED");
    const { data, error } = await db.from("pt_ingestion_items").select("item_id,current_stage,work_state").eq("run_id", runId);
    if (error) throw new Error(`PT_STAGE_EXECUTOR_RELEASE_READ_FAILED_${error.code}`);
    const groups = buildPtReleaseGroups((data ?? []).map((item) => ({ itemId: item.item_id, stage: item.current_stage, workState: item.work_state })));
    await writeJson(required("out"), { run_id: runId, groups, policy: "pause scheduler, reconcile once, verify parity, atomically publish, restore scheduler" });
    return;
  }
  if (mode !== "execute-stage") throw new Error("PT_STAGE_EXECUTOR_MODE_INVALID");
  const { data, error } = await db.rpc("claim_pt_ingestion_items", { p_run_id: runId, p_stage: activeStage, p_worker_id: workerId, p_limit: limitFor(activeStage), p_lease_seconds: Number(arg("lease-seconds") ?? "180") });
  if (error) throw new Error(`PT_STAGE_EXECUTOR_CLAIM_FAILED_${error.code ?? "UNKNOWN"}`);
  const claims = claimsFrom(data);
  const out = required("out");
  if (!claims.length) { await writeJson(out, { run_id: runId, stage: activeStage, claimed: 0 }); return; }
  const workerFile = await json<WorkerFile>(required("worker-file"));
  const checkpoints: PtCheckpointPort = {
    commit: async (claim, result) => { const response = await db.rpc("commit_pt_ingestion_stage", { p_item_id: claim.itemId, p_stage: activeStage, p_claim_token: claim.claimToken, p_worker_id: workerId, p_input_sha256: inputHash(required("input-sha256")), p_result: result }); if (response.error) throw new Error(`PT_STAGE_EXECUTOR_COMMIT_FAILED_${response.error.code}`); },
    retry: async (claim, code) => { const response = await db.rpc("retry_pt_ingestion_item", { p_item_id: claim.itemId, p_stage: activeStage, p_claim_token: claim.claimToken, p_worker_id: workerId, p_failure_code: code, p_backoff_seconds: 30 }); if (response.error || response.data !== true) throw new Error("PT_STAGE_EXECUTOR_RETRY_LOST"); },
    exception: async (claim, code, detail) => { const response = await db.rpc("exception_pt_ingestion_item", { p_item_id: claim.itemId, p_stage: activeStage, p_claim_token: claim.claimToken, p_worker_id: workerId, p_failure_code: code, p_detail: detail ?? {} }); if (response.error || response.data !== true) throw new Error("PT_STAGE_EXECUTOR_EXCEPTION_LOST"); },
    stopSystemic: async (code, detail) => { const response = await db.rpc("stop_pt_ingestion_run", { p_run_id: runId, p_failure_code: code, p_detail: detail ?? {} }); if (response.error || response.data !== true) throw new Error("PT_STAGE_EXECUTOR_STOP_LOST"); },
  };
  const summary = await runPtStageCohort(activeStage, claims, async (scope) => executeWorker(workerFile, activeStage, scope), checkpoints);
  await writeJson(out, { run_id: runId, stage: activeStage, claimed: claims.length, summary });
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : "PT_STAGE_EXECUTOR_FAILED"); process.exitCode = 1; });
