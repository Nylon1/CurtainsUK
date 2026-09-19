import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { acceptVisualCandidate, hciVisualModel, reviewState, validateVisual, visualOutputSchema, visualPrompt, visualPromptVersion, visualSchemaVersion, visualVersion, visualVocabularyVersion, type ColourwayVisualFingerprint, type ImageBinding } from "../lib/fabric-master/visual-enrichment";

type ScopeRow = { fabric_id:string; supplier_id:string; supplier_sku:string; brand_id:string; design_id:string; image_type:string; source_image_hash:string; source_image_url:string; source_image_rank:number; useful_image_count:number; already_approved:boolean; };
const args = new Map(process.argv.slice(2).map((arg) => {
  const [k, ...rest] = arg.replace(/^--/, "").split("=");
  return [k, rest.length ? rest.join("=") : "true"];
}));
const scope = args.get("scope") ?? "CANONICAL_APPROVED_IMAGE";
const batchSize = Math.max(1, Math.min(Number(args.get("batch-size") ?? "25"), 100));
const apply = args.has("apply");
const restoreDir = args.get("restore-dir");
const outDir = args.get("out") ?? "artifacts/visual-enrichment";
const runLabel = args.get("run-label") ?? `fabric-master-visual-${new Date().toISOString()}`;

function hashBytes(bytes: Uint8Array) { return createHash("sha256").update(bytes).digest("hex"); }
function binding(row: ScopeRow): ImageBinding { return { fabricId: row.fabric_id, canonicalFabricId: row.fabric_id, supplierId: row.supplier_id, brandId: row.brand_id, designId: row.design_id, sku: row.supplier_sku, imageReference: row.source_image_url, expectedImageHash: `sha256:${row.source_image_hash}`, sourceRecordKey: `fabric-master:${row.fabric_id}:${row.supplier_id}:${row.supplier_sku}:${row.source_image_hash}` }; }
async function listJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listJsonFiles(full);
    return entry.isFile() && entry.name.endsWith(".json") ? [full] : [];
  }));
  return nested.flat();
}
async function loadRestoreCache(dir?: string) {
  const cache = new Map<string, ColourwayVisualFingerprint>();
  if (!dir) return cache;
  for (const file of await listJsonFiles(dir)) {
    try {
      const parsed = JSON.parse(await readFile(file, "utf8"));
      const candidates = Array.isArray(parsed) ? parsed : [parsed.visual, parsed].filter(Boolean);
      for (const candidate of candidates) {
        validateVisual(candidate);
        const key = `${candidate.binding.fabricId}|${candidate.binding.sku}|${candidate.imageContentHash}|${candidate.version}|${candidate.vocabularyVersion}|${candidate.promptVersion}|${candidate.schemaVersion}|${candidate.modelId}`;
        cache.set(key, candidate);
      }
    } catch { /* ignore non-visual JSON */ }
  }
  return cache;
}
async function fetchExactImage(row: ScopeRow) {
  const response = await fetch(row.source_image_url, { method: "GET", redirect: "error", credentials: "omit", signal: AbortSignal.timeout(30000) });
  if (!response.ok || response.redirected || response.url !== row.source_image_url) throw new Error("IMAGE_FETCH_REJECTED");
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (!contentType || !["image/jpeg","image/png","image/webp"].includes(contentType)) throw new Error("IMAGE_FORMAT_REJECTED");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error("IMAGE_SIZE_REJECTED");
  if (hashBytes(bytes) !== row.source_image_hash) throw new Error("IMAGE_HASH_MISMATCH");
  return { bytes, mime: contentType };
}
function stripUniqueItems(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUniqueItems);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([k]) => k !== "uniqueItems").map(([k, v]) => [k, stripUniqueItems(v)]));
  return value;
}
async function classify(row: ScopeRow): Promise<ColourwayVisualFingerprint> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_MISSING");
  const image = await fetchExactImage(row);
  const body = {
    model: hciVisualModel,
    store: false,
    max_output_tokens: 4000,
    reasoning: { effort: "medium" },
    instructions: visualPrompt,
    input: [{ role: "user", content: [{ type: "input_text", text: "Classify the exact fabric image using the closed schema." }, { type: "input_image", image_url: `data:${image.mime};base64,${Buffer.from(image.bytes).toString("base64")}`, detail: "high" }] }],
    text: { format: { type: "json_schema", name: "hci_colourway_visual_v1", strict: true, schema: stripUniqueItems(visualOutputSchema) } },
  };
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`OPENAI_RESPONSE_${response.status}`);
  const raw = await response.json();
  if (raw.model !== hciVisualModel || raw.status !== "completed") throw new Error("OPENAI_MODEL_OR_STATUS_REJECTED");
  const texts = (raw.output ?? []).flatMap((o: any) => (o.content ?? []).filter((c: any) => c.type === "output_text").map((c: any) => c.text));
  if (texts.length !== 1) throw new Error("OPENAI_OUTPUT_TEXT_REJECTED");
  return acceptVisualCandidate(JSON.parse(texts[0]), { binding: binding(row), imageContentHash: `sha256:${row.source_image_hash}`, modelId: raw.model, promptVersion: visualPromptVersion, schemaVersion: visualSchemaVersion, analysedAt: new Date().toISOString() });
}
async function main() {
  await mkdir(outDir, { recursive: true });
  const db = createSupplierServiceClient();
  const { data: scopeRows, error } = await db.rpc("fabric_visual_enrichment_scope", { p_scope: scope });
  if (error) throw error;
  const rows = (scopeRows as ScopeRow[]).filter((row) => !row.already_approved);
  const cache = await loadRestoreCache(restoreDir);
  const report = { runLabel, scope, eligible: (scopeRows as ScopeRow[]).length, alreadyApproved: (scopeRows as ScopeRow[]).length - rows.length, recovered: 0, newlyInferred: 0, succeeded: 0, failed: 0, failures: [] as { fabric_id:string; supplier_sku:string; reason:string }[], dryRun: !apply, openAiCredentialPresent: Boolean(process.env.OPENAI_API_KEY) };
  if (!apply) { await writeFile(path.join(outDir, "visual-enrichment-plan.json"), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); return; }
  const { data: run, error: runError } = await db.from("fabric_visual_enrichment_runs").insert({ run_label: runLabel, scope, visual_version: visualVersion, vocabulary_version: visualVocabularyVersion, prompt_version: visualPromptVersion, schema_version: visualSchemaVersion, model_id: hciVisualModel }).select("run_id").single();
  if (runError) throw runError;
  const runId = run.run_id as string;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    for (const row of batch) {
      try {
        const key = `${row.fabric_id}|${row.supplier_sku}|sha256:${row.source_image_hash}|${visualVersion}|${visualVocabularyVersion}|${visualPromptVersion}|${visualSchemaVersion}|${hciVisualModel}`;
        let visual = cache.get(key);
        if (visual) report.recovered++; else { visual = await classify(row); report.newlyInferred++; }
        const state = reviewState(visual.candidate);
        const { error: insertError } = await db.from("fabric_visual_enrichment_ledger").insert({
          run_id: runId, fabric_id: row.fabric_id, supplier_id: row.supplier_id, supplier_sku: row.supplier_sku, brand_id: row.brand_id, design_id: row.design_id,
          image_type: row.image_type, source_image_hash: row.source_image_hash, source_image_url: row.source_image_url, source_image_rank: row.source_image_rank, useful_image_count: row.useful_image_count,
          visual_version: visual.version, vocabulary_version: visual.vocabularyVersion, prompt_version: visual.promptVersion, schema_version: visual.schemaVersion, model_id: visual.modelId,
          analysed_at: visual.analysedAt, output: visual, output_hash: visual.outputHash, evidence_id: visual.evidenceId, visual_digest: visual.digest,
          review_state: state, approval_state: state === "AUTO_APPROVED" ? "APPROVED" : "PROPOSED",
        });
        if (insertError) throw insertError;
        report.succeeded++;
      } catch (err) {
        const reason = err instanceof Error ? err.message.replace(/[^A-Z0-9_]/gi, "_").toUpperCase().slice(0, 80) : "UNKNOWN_FAILURE";
        report.failed++; report.failures.push({ fabric_id: row.fabric_id, supplier_sku: row.supplier_sku, reason });
        await db.from("fabric_visual_enrichment_failures").insert({ run_id: runId, fabric_id: row.fabric_id, supplier_id: row.supplier_id, supplier_sku: row.supplier_sku, source_image_hash: row.source_image_hash, prompt_version: visualPromptVersion, schema_version: visualSchemaVersion, model_id: hciVisualModel, failure_reason: reason, context: { image_type: row.image_type, rank: row.source_image_rank } });
      }
    }
    await db.from("fabric_visual_enrichment_runs").update({ checkpoint: { processed: Math.min(i + batch.length, rows.length), total: rows.length }, summary: report }).eq("run_id", runId);
    await writeFile(path.join(outDir, "visual-enrichment-progress.json"), JSON.stringify(report, null, 2));
  }
  const finalStatus = report.failed ? (report.succeeded ? "PARTIAL" : "FAILED") : "SUCCEEDED";
  await db.from("fabric_visual_enrichment_runs").update({ status: finalStatus, completed_at: new Date().toISOString(), summary: report }).eq("run_id", runId);
  console.log(JSON.stringify(report, null, 2));
}
main().catch((err) => { console.error(err instanceof Error ? err.message : "VISUAL_ENRICHMENT_FAILED"); process.exitCode = 1; });
