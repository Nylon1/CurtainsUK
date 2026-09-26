import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { validatePtSeedItem } from "../lib/fabric-master/pt-ingestion-orchestrator";

const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const required = (name: string) => {
  const value = arg(name);
  if (!value) throw new Error(`PT_ORCHESTRATOR_${name.toUpperCase().replaceAll("-", "_")}_REQUIRED`);
  return value;
};
const stages = new Set(["SOURCE_READY", "MEDIA_READY", "PRICE_APPROVED", "KNOWLEDGE_READY", "STOCK_READY", "RELEASE_READY"]);
function stage() { const value = required("stage"); if (!stages.has(value)) throw new Error("PT_ORCHESTRATOR_STAGE_INVALID"); return value; }
function hash(value: string) { if (!/^[a-f0-9]{64}$/.test(value)) throw new Error("PT_ORCHESTRATOR_HASH_INVALID"); return value; }
async function jsonObject(file: string) { const value = JSON.parse(await readFile(file, "utf8")); if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("PT_ORCHESTRATOR_RESULT_INVALID"); return value; }
async function writeOutput(file: string | undefined, value: unknown) { if (!file) { console.log(JSON.stringify(value)); return; } await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, JSON.stringify(value, null, 2)); console.log(JSON.stringify({ output: file })); }

async function main() {
  const mode = required("mode");
  if (new URL(process.env.SUPABASE_URL ?? "").hostname !== "hqysjumypgeapgmqkcrx.supabase.co") throw new Error("PT_ORCHESTRATOR_DATABASE_TARGET_REJECTED");
  const db = createSupplierServiceClient();
  if (mode === "register") {
    const items = JSON.parse(await readFile(required("items-file"), "utf8"));
    if (!Array.isArray(items)) throw new Error("PT_ORCHESTRATOR_ITEMS_INVALID");
    for (const item of items) {
      if (!item || typeof item !== "object") throw new Error("PT_ORCHESTRATOR_ITEMS_INVALID");
      const value = item as Record<string, unknown>;
      validatePtSeedItem({
        supplierSku: typeof value.supplier_sku === "string" ? value.supplier_sku : "",
        initialStage: typeof value.initial_stage === "string" ? value.initial_stage as never : undefined,
        committedFingerprints: value.committed_fingerprints as never,
        exceptionCode: typeof value.exception_code === "string" ? value.exception_code : undefined,
      });
    }
    const { data, error } = await db.rpc("start_pt_ingestion_run", {
      p_batch_label: required("batch-label"), p_manifest_sha256: hash(required("manifest-sha256")), p_source_bundle_sha256: hash(required("source-bundle-sha256")), p_items: items,
    });
    if (error || !data) throw new Error(`PT_ORCHESTRATOR_REGISTER_FAILED_${error?.code ?? "UNKNOWN"}`);
    await writeOutput(arg("out"), { runId: data }); return;
  }
  const runId = required("run-id"), workerId = required("worker-id");
  if (mode === "claim") {
    const { data, error } = await db.rpc("claim_pt_ingestion_items", { p_run_id: runId, p_stage: stage(), p_worker_id: workerId, p_limit: Number(arg("limit") ?? "50"), p_lease_seconds: Number(arg("lease-seconds") ?? "180") });
    if (error) throw new Error(`PT_ORCHESTRATOR_CLAIM_FAILED_${error.code ?? "UNKNOWN"}`);
    await writeOutput(arg("out"), { runId, stage: stage(), workerId, claims: data ?? [] }); return;
  }
  const itemId = required("item-id"), claimToken = required("claim-token"), currentStage = stage();
  if (mode === "heartbeat") {
    const { data, error } = await db.rpc("heartbeat_pt_ingestion_item", { p_item_id: itemId, p_stage: currentStage, p_claim_token: claimToken, p_worker_id: workerId });
    if (error || data !== true) throw new Error(`PT_ORCHESTRATOR_HEARTBEAT_LOST_${error?.code ?? "UNKNOWN"}`);
    await writeOutput(arg("out"), { itemId, heartbeat: true }); return;
  }
  if (mode === "commit") {
    const { data, error } = await db.rpc("commit_pt_ingestion_stage", { p_item_id: itemId, p_stage: currentStage, p_claim_token: claimToken, p_worker_id: workerId, p_input_sha256: hash(required("input-sha256")), p_result: await jsonObject(required("result-file")) });
    if (error) throw new Error(`PT_ORCHESTRATOR_COMMIT_FAILED_${error.code ?? "UNKNOWN"}`);
    await writeOutput(arg("out"), { itemId, nextStage: data }); return;
  }
  if (mode === "retry") {
    const { data, error } = await db.rpc("retry_pt_ingestion_item", { p_item_id: itemId, p_stage: currentStage, p_claim_token: claimToken, p_worker_id: workerId, p_failure_code: required("failure-code"), p_backoff_seconds: Number(arg("backoff-seconds") ?? "30") });
    if (error || data !== true) throw new Error(`PT_ORCHESTRATOR_RETRY_LOST_${error?.code ?? "UNKNOWN"}`);
    await writeOutput(arg("out"), { itemId, retry: true }); return;
  }
  if (mode === "exception") {
    const detail = arg("detail-file") ? await jsonObject(arg("detail-file")!) : {};
    const { data, error } = await db.rpc("exception_pt_ingestion_item", { p_item_id: itemId, p_stage: currentStage, p_claim_token: claimToken, p_worker_id: workerId, p_failure_code: required("failure-code"), p_detail: detail });
    if (error || data !== true) throw new Error(`PT_ORCHESTRATOR_EXCEPTION_LOST_${error?.code ?? "UNKNOWN"}`);
    await writeOutput(arg("out"), { itemId, exception: true }); return;
  }
  throw new Error("PT_ORCHESTRATOR_MODE_INVALID");
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "PT_ORCHESTRATOR_FAILED"); process.exitCode = 1; });
