import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { acceptVisualCandidate, colourwayCandidateFrom, colourwayFingerprintInstruction, combinedSingleColourwayInstruction, designCandidateFrom, designFingerprintInstruction, hciVisualModel, resolveFabricFingerprint, reviewState, validateVisual, visualOutputSchema, visualPromptVersion, visualSchemaVersion, visualVersion, visualVocabularyVersion, type AnalysisLevel, type ColourwayVisualFingerprint, type ImageBinding, type VisualCandidate, type VisualFingerprint } from "../lib/fabric-master/visual-enrichment";

type ScopeRow = { fabric_id:string; supplier_id:string; supplier_sku:string; brand_id:string; design_id:string; image_type:string; source_image_hash:string; source_image_url:string; source_image_rank:number; useful_image_count:number; already_approved:boolean; };
type AnalysisAsset = { approvedSourceHash:string; analysisAssetUrl:string; analysisAssetHash:string; contentType:string; byteLength:number; decodedWidth:number|null; decodedHeight:number|null; classification:"EXACT_BYTE_MATCH"|"SHOPIFY_TRANSFORMATION"; urlContainsSourceHash:boolean; };
type DesignScopeRow = ScopeRow & { design_colourway_count:number };
type LedgerRow = { ledger_id:string; run_id?:string|null; analysis_level:AnalysisLevel; fabric_id:string; supplier_id:string; supplier_sku:string; brand_id:string; design_id:string; source_image_hash:string; analysis_asset_hash?:string|null; output:VisualFingerprint; approval_state:string; review_state:string; };

const args = new Map(process.argv.slice(2).map((arg) => {
  const [k, ...rest] = arg.replace(/^--/, "").split("=");
  return [k, rest.length ? rest.join("=") : "true"];
}));
const scope = args.get("scope") ?? "OPTIMISED_CANONICAL_DESIGN_COLOURWAY";
const batchSize = Math.max(1, Math.min(Number(args.get("batch-size") ?? "25"), 100));
const apply = args.has("apply");
const planOnly = args.has("plan-only") || !apply;
const restoreDir = args.get("restore-dir");
const outDir = args.get("out") ?? "artifacts/visual-enrichment";
const runLabel = args.get("run-label") ?? `fabric-master-visual-${new Date().toISOString()}`;
const combineSingleColourway = args.get("single-colourway") !== "separate";
const targetMissing = args.get("target-missing") === "true" || (args.has("target-missing") && !args.has("full-catalogue"));
const targetSeedRunId = args.get("target-seed-run-id");
const expectedProjectRef = "hqysjumypgeapgmqkcrx";
const canonicalHighDetailImageTokens = 20695145;
const designHighDetailImageTokens = 4870018;
const lowDetailTokensPerImage = 70;
const inputUsdPerMillion = 1;

function openAiKeyLooksUsable(value: string | undefined) {
  const key = value?.trim() ?? "";
  return key.length >= 20 && !/^\*+$/.test(key) && !/^hidden$/i.test(key) && !/^encrypted$/i.test(key);
}
async function assertOpenAiCredentialReady() {
  if (!openAiKeyLooksUsable(process.env.OPENAI_API_KEY)) throw new Error("OPENAI_API_KEY_UNUSABLE");
  const response = await fetch("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(30_000) });
  if (response.status === 401 || response.status === 403) throw new Error(`OPENAI_CREDENTIAL_REJECTED_${response.status}`);
  if (!response.ok) throw new Error(`OPENAI_CREDENTIAL_PREFLIGHT_${response.status}`);
}
function isSystemicOpenAiFailure(reason: string) { return reason === "OPENAI_RESPONSE_401" || reason === "OPENAI_RESPONSE_403" || reason === "OPENAI_API_KEY_UNUSABLE" || reason.startsWith("OPENAI_CREDENTIAL_REJECTED_"); }

function assertProductionTarget() {
  const projectRef = process.env.CURTAINSUK_SUPABASE_PROJECT_REF;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (projectRef && projectRef !== expectedProjectRef) throw new Error("SUPABASE_PROJECT_REF_REJECTED");
  if (url && new URL(url).hostname !== `${expectedProjectRef}.supabase.co`) throw new Error("SUPABASE_URL_REJECTED");
}
function hashBytes(bytes: Uint8Array) { return createHash("sha256").update(bytes).digest("hex"); }
function binding(row: ScopeRow, asset: Pick<AnalysisAsset,"analysisAssetHash">): ImageBinding { return { fabricId: row.fabric_id, canonicalFabricId: row.fabric_id, supplierId: row.supplier_id, brandId: row.brand_id, designId: row.design_id, sku: row.supplier_sku, imageReference: row.source_image_url, expectedImageHash: `sha256:${asset.analysisAssetHash}`, sourceRecordKey: `fabric-master:${row.fabric_id}:${row.supplier_id}:${row.supplier_sku}:${row.source_image_hash}:${asset.analysisAssetHash}` }; }
function designKey(row: Pick<ScopeRow,"supplier_id"|"brand_id"|"design_id">) { return `${row.supplier_id}|${row.brand_id}|${row.design_id}`; }
function colourwayKey(row: Pick<ScopeRow,"fabric_id"|"source_image_hash">) { return `${row.fabric_id}|${row.source_image_hash}`; }
function lineageKey(level: AnalysisLevel, row: ScopeRow, asset?: Pick<AnalysisAsset,"analysisAssetHash">) { return `${level}|${row.fabric_id}|${row.supplier_id}|${row.supplier_sku}|${row.source_image_hash}|${asset?.analysisAssetHash ?? "pending-analysis-asset"}|${visualVersion}|${visualVocabularyVersion}|${visualPromptVersion}|${visualSchemaVersion}|${hciVisualModel}`; }
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
  const cache = new Map<string, VisualFingerprint>();
  if (!dir) return cache;
  for (const file of await listJsonFiles(dir)) {
    try {
      const parsed = JSON.parse(await readFile(file, "utf8"));
      const candidates = Array.isArray(parsed) ? parsed : [parsed.visual, parsed].filter(Boolean);
      for (const candidate of candidates) {
        validateVisual(candidate);
        const approvedSourceHash = (candidate as any).approvedSourceHash ?? String(candidate.binding.sourceRecordKey).split(":").slice(-2, -1)[0];
        const key = `${candidate.analysisLevel}|${candidate.binding.fabricId}|${candidate.binding.supplierId}|${candidate.binding.sku}|${approvedSourceHash}|${candidate.imageContentHash.replace(/^sha256:/, "")}|${candidate.version}|${candidate.vocabularyVersion}|${candidate.promptVersion}|${candidate.schemaVersion}|${candidate.modelId}`;
        cache.set(key, candidate);
      }
    } catch { /* ignore non-visual JSON */ }
  }
  return cache;
}
async function fetchAnalysisAsset(row: ScopeRow): Promise<AnalysisAsset & { bytes: Uint8Array; mime: string }> {
  const response = await fetch(row.source_image_url, { method: "GET", redirect: "error", credentials: "omit", signal: AbortSignal.timeout(30000) });
  if (!response.ok || response.redirected || response.url !== row.source_image_url) throw new Error("IMAGE_FETCH_REJECTED");
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (!contentType || !["image/jpeg","image/png","image/webp"].includes(contentType)) throw new Error("IMAGE_FORMAT_REJECTED");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error("IMAGE_SIZE_REJECTED");
  const analysisAssetHash = hashBytes(bytes);
  let metadata: { width?: number; height?: number };
  try { metadata = await (await import("sharp")).default(bytes, { limitInputPixels: 40_000_000 }).metadata(); } catch { throw new Error("IMAGE_DECODE_REJECTED"); }
  if (!metadata.width || !metadata.height) throw new Error("IMAGE_DECODE_REJECTED");
  const urlContainsSourceHash = row.source_image_url.includes(row.source_image_hash);
  const classification = analysisAssetHash === row.source_image_hash ? "EXACT_BYTE_MATCH" : urlContainsSourceHash && row.image_type === "MAIN" ? "SHOPIFY_TRANSFORMATION" : undefined;
  if (!classification) throw new Error("IMAGE_PROVENANCE_UNVERIFIED");
  return { bytes, mime: contentType, approvedSourceHash: row.source_image_hash, analysisAssetUrl: row.source_image_url, analysisAssetHash, contentType, byteLength: bytes.length, decodedWidth: metadata.width, decodedHeight: metadata.height, classification, urlContainsSourceHash };
}
function stripUniqueItems(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUniqueItems);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([k]) => k !== "uniqueItems").map(([k, v]) => [k, stripUniqueItems(v)]));
  return value;
}
async function openAiClassify(row: ScopeRow, instruction: string, detail: "low"|"high", asset?: AnalysisAsset & { bytes: Uint8Array; mime: string }): Promise<{ candidate: VisualCandidate; asset: AnalysisAsset }> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_MISSING");
  const image = asset ?? await fetchAnalysisAsset(row);
  const body = {
    model: hciVisualModel,
    store: false,
    max_output_tokens: 4000,
    reasoning: { effort: "medium" },
    instructions: instruction,
    input: [{ role: "user", content: [{ type: "input_text", text: "Classify the exact fabric image using the closed schema." }, { type: "input_image", image_url: `data:${image.mime};base64,${Buffer.from(image.bytes).toString("base64")}`, detail }] }],
    text: { format: { type: "json_schema", name: "hci_colourway_visual_v1", strict: true, schema: stripUniqueItems(visualOutputSchema) } },
  };
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw new Error(`OPENAI_RESPONSE_${response.status}`);
  const raw = await response.json();
  if (raw.model !== hciVisualModel || raw.status !== "completed") throw new Error("OPENAI_MODEL_OR_STATUS_REJECTED");
  const texts = (raw.output ?? []).flatMap((o: any) => (o.content ?? []).filter((c: any) => c.type === "output_text").map((c: any) => c.text));
  if (texts.length !== 1) throw new Error("OPENAI_OUTPUT_TEXT_REJECTED");
  return { candidate: JSON.parse(texts[0]), asset: image };
}
async function fetchAllRpc<T>(db: any, fn: string, params?: Record<string, unknown>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.rpc(fn, params ?? {}).range(from, from + 999);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}
async function fetchAllLedger(db: any) {
  const rows: LedgerRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("fabric_visual_enrichment_ledger").select("ledger_id,run_id,analysis_level,fabric_id,supplier_id,supplier_sku,brand_id,design_id,source_image_hash,analysis_asset_hash,output,approval_state,review_state").is("superseded_at", null).range(from, from + 999);
    if (error) throw error;
    const page = (data ?? []) as LedgerRow[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}
async function insertFingerprint(db: any, runId: string, row: ScopeRow, visual: VisualFingerprint, asset: AnalysisAsset, links: { designId?: string; colourwayId?: string } = {}) {
  const state = reviewState(visual.candidate, visual.analysisLevel);
  const { data, error } = await db.from("fabric_visual_enrichment_ledger").insert({
    run_id: runId, analysis_level: visual.analysisLevel, fabric_id: row.fabric_id, supplier_id: row.supplier_id, supplier_sku: row.supplier_sku, brand_id: row.brand_id, design_id: row.design_id,
    image_type: row.image_type, source_image_hash: row.source_image_hash, source_image_url: row.source_image_url, analysis_asset_hash: asset.analysisAssetHash, analysis_asset_url: asset.analysisAssetUrl, analysis_asset_content_type: asset.contentType, analysis_asset_byte_length: asset.byteLength, analysis_asset_width: asset.decodedWidth, analysis_asset_height: asset.decodedHeight, analysis_asset_classification: asset.classification, analysis_asset_verified_at: visual.analysedAt, source_image_rank: row.source_image_rank, useful_image_count: row.useful_image_count,
    visual_version: visual.version, vocabulary_version: visual.vocabularyVersion, prompt_version: visual.promptVersion, schema_version: visual.schemaVersion, model_id: visual.modelId,
    analysed_at: visual.analysedAt, output: visual, output_hash: visual.outputHash, evidence_id: visual.evidenceId, visual_digest: visual.digest,
    review_state: state, approval_state: state === "AUTO_APPROVED" ? "APPROVED" : "PROPOSED", field_provenance: visual.fieldProvenance,
    design_fingerprint_id: links.designId ?? null, colourway_fingerprint_id: links.colourwayId ?? null,
  }).select("ledger_id").single();
  if (error) throw error;
  return data.ledger_id as string;
}
function estimate(plan: { governed_designs:number; eligible_colourways:number; single_colourway_designs:number }) {
  const reusable = combineSingleColourway ? plan.single_colourway_designs : 0;
  const paidColourwayCalls = plan.eligible_colourways - reusable;
  const lowTokens = paidColourwayCalls * lowDetailTokensPerImage;
  const highTokens = Math.round(designHighDetailImageTokens * plan.governed_designs / 2186);
  const independentTokens = Math.round(canonicalHighDetailImageTokens * plan.eligible_colourways / 9248);
  const imageTokens = highTokens + lowTokens;
  return {
    fullIndependent: { calls: plan.eligible_colourways, highDetailImageTokens: independentTokens, imageInputUsd: +(independentTokens / 1_000_000 * inputUsdPerMillion).toFixed(2) },
    optimisedLogical: { designFingerprints: plan.governed_designs, colourwayFingerprints: plan.eligible_colourways, resolvedFingerprints: plan.eligible_colourways },
    optimisedPaid: { highDetailDesignCalls: plan.governed_designs, lowDetailColourwayCalls: paidColourwayCalls, reusableSingleColourwayCalls: reusable, highDetailImageTokens: highTokens, lowDetailImageTokens: lowTokens, imageInputUsd: +(imageTokens / 1_000_000 * inputUsdPerMillion).toFixed(2) },
  };
}
function flexibleCandidate(raw: VisualCandidate): VisualCandidate {
  const candidate = structuredClone(raw) as any;
  for (const [key, observation] of Object.entries(candidate.observations ?? {}) as [string, any][]) {
    const unknown = observation.value === "unknown" || (Array.isArray(observation.value) && observation.value.length === 0);
    if (unknown) observation.confidence = "REVIEW";
    if (key === "patternScale" && observation.value !== "unknown") { observation.value = "unknown"; observation.confidence = "REVIEW"; }
    if (key === "directionality" && candidate.imageContext !== "REPEAT_VIEW" && observation.value !== "unknown") { observation.value = "unknown"; observation.confidence = "REVIEW"; }
  }
  return candidate;
}
async function main() {
  assertProductionTarget();
  await mkdir(outDir, { recursive: true });
  const db = createSupplierServiceClient();
  let [designRows, colourwayRows, planResult] = await Promise.all([
    fetchAllRpc<DesignScopeRow>(db, "fabric_visual_design_enrichment_scope"),
    fetchAllRpc<ScopeRow>(db, "fabric_visual_enrichment_scope", { p_scope: "CANONICAL_APPROVED_IMAGE" }),
    db.rpc("fabric_visual_optimised_plan"),
  ]);
  if (planResult.error) throw planResult.error;
  let plan = planResult.data as { governed_designs:number; eligible_colourways:number; representative_design_images_selected:number; colourway_images_resolved:number; single_colourway_designs:number; existing_design_fingerprints:number; existing_colourway_fingerprints:number; single_colourway_reusable_colourway_calls:number };
  if (!targetMissing && (designRows.length !== 2186 || colourwayRows.length !== 9248 || plan.governed_designs !== 2186 || plan.eligible_colourways !== 9248 || plan.representative_design_images_selected !== 2186 || plan.colourway_images_resolved !== 9248)) throw new Error(`OPTIMISED_PLAN_RECONCILIATION_FAILED_${JSON.stringify({ designRows: designRows.length, colourwayRows: colourwayRows.length, plan })}`);
  if (targetMissing) {
    const targetLedger = await fetchAllLedger(db);
    const designKeysWithEvidence = new Set(targetLedger.filter((r) => r.analysis_level === "DESIGN").map(designKey));
    const colourwayKeysWithEvidence = new Set(targetLedger.filter((r) => r.analysis_level === "COLOURWAY").map(colourwayKey));
    const seedDesignKeys = new Set(targetLedger.filter((r) => r.analysis_level === "DESIGN" && r.run_id === targetSeedRunId).map(designKey));
    colourwayRows = colourwayRows.filter((row) => !colourwayKeysWithEvidence.has(colourwayKey(row)) && (!designKeysWithEvidence.has(designKey(row)) || seedDesignKeys.has(designKey(row))));
    const targetDesignKeys = new Set(colourwayRows.map(designKey));
    designRows = designRows.filter((row) => targetDesignKeys.has(designKey(row)) && !designKeysWithEvidence.has(designKey(row)));
    if (colourwayRows.length !== 3153) throw new Error(`TARGET_MISSING_SCOPE_RECONCILIATION_FAILED_${colourwayRows.length}`);
    const singleColourwayDesigns = [...targetDesignKeys].filter((key) => !designKeysWithEvidence.has(key) && colourwayRows.filter((r) => designKey(r) === key).length === 1).length;
    plan = { ...plan, governed_designs: designRows.length, eligible_colourways: colourwayRows.length, representative_design_images_selected: designRows.length, colourway_images_resolved: colourwayRows.length, single_colourway_designs: singleColourwayDesigns, single_colourway_reusable_colourway_calls: singleColourwayDesigns, existing_design_fingerprints: 0, existing_colourway_fingerprints: 0 };
  }
  const report = { runLabel, scope, inference: apply, targetMissing, singleColourwayCombined: combineSingleColourway, designCallsPlanned: plan.governed_designs, colourwayFingerprintsPlanned: plan.eligible_colourways, representativeDesignImagesSelected: plan.representative_design_images_selected, colourwayImagesResolved: plan.colourway_images_resolved, duplicateReusableWorkDetected: plan.single_colourway_reusable_colourway_calls, estimates: estimate(plan), ledgerCheckpointReadiness: "NOT_RUN" as "PASS"|"NOT_RUN", recovered: 0, newlyInferredDesigns: 0, newlyInferredColourways: 0, resolved: 0, failed: 0, failures: [] as { level:string; fabric_id:string; supplier_sku:string; reason:string }[] };
  if (planOnly) { await writeFile(path.join(outDir, "visual-enrichment-optimised-plan.json"), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); return; }

  await assertOpenAiCredentialReady();
  const cache = await loadRestoreCache(restoreDir);
  const existing = await fetchAllLedger(db);
  const designByGoverned = new Map(existing.filter((r) => r.analysis_level === "DESIGN" && r.approval_state === "APPROVED").map((r) => [designKey(r), r]));
  const colourwayByFabric = new Map(existing.filter((r) => r.analysis_level === "COLOURWAY" && r.approval_state === "APPROVED").map((r) => [colourwayKey(r), r]));
  const { data: run, error: runError } = await db.from("fabric_visual_enrichment_runs").insert({ run_label: runLabel, scope, visual_version: visualVersion, vocabulary_version: visualVocabularyVersion, prompt_version: visualPromptVersion, schema_version: visualSchemaVersion, model_id: hciVisualModel, checkpoint: { stage: "created", designTotal: designRows.length, colourwayTotal: colourwayRows.length }, summary: report }).select("run_id").single();
  if (runError) throw runError;
  const runId = run.run_id as string;

  const colourwaysByDesign = new Map<string, ScopeRow[]>();
  for (const row of colourwayRows) colourwaysByDesign.set(designKey(row), [...(colourwaysByDesign.get(designKey(row)) ?? []), row]);
  for (let i = 0; i < designRows.length; i += batchSize) {
    const batch = designRows.slice(i, i + batchSize);
    for (const designRow of batch) {
      const governedKey = designKey(designRow);
      try {
        let designLedger = designByGoverned.get(governedKey);
        const siblings = colourwaysByDesign.get(governedKey) ?? [];
        const combined = combineSingleColourway && siblings.length === 1;
        let combinedRaw: VisualCandidate | undefined;
        let designAsset: (AnalysisAsset & { bytes: Uint8Array; mime: string }) | undefined;
        if (!designLedger) {
          designAsset = await fetchAnalysisAsset(designRow);
          const cached = cache.get(lineageKey("DESIGN", designRow, designAsset));
          let designVisual: VisualFingerprint;
          if (cached) { designVisual = cached; report.recovered++; }
          else {
            const classified = await openAiClassify(designRow, combined ? combinedSingleColourwayInstruction : designFingerprintInstruction, "high", designAsset);
            combinedRaw = classified.candidate;
            designVisual = acceptVisualCandidate(designCandidateFrom(flexibleCandidate(classified.candidate)), { binding: binding(designRow, classified.asset), imageContentHash: `sha256:${classified.asset.analysisAssetHash}`, modelId: hciVisualModel, promptVersion: visualPromptVersion, schemaVersion: visualSchemaVersion, analysedAt: new Date().toISOString(), analysisLevel: "DESIGN" });
            report.newlyInferredDesigns++;
          }
          const ledgerId = await insertFingerprint(db, runId, designRow, designVisual, designAsset);
          designLedger = { ledger_id: ledgerId, analysis_level: "DESIGN", fabric_id: designRow.fabric_id, supplier_id: designRow.supplier_id, supplier_sku: designRow.supplier_sku, brand_id: designRow.brand_id, design_id: designRow.design_id, source_image_hash: designRow.source_image_hash, analysis_asset_hash: designAsset.analysisAssetHash, output: designVisual, approval_state: reviewState(designVisual.candidate, "DESIGN") === "AUTO_APPROVED" ? "APPROVED" : "PROPOSED", review_state: reviewState(designVisual.candidate, "DESIGN") };
          designByGoverned.set(governedKey, designLedger);
        }
        for (const row of siblings) {
          if (colourwayByFabric.has(colourwayKey(row))) continue;
          const colourwayAsset = combined && row.fabric_id === designRow.fabric_id && designAsset ? designAsset : await fetchAnalysisAsset(row);
          const cached = cache.get(lineageKey("COLOURWAY", row, colourwayAsset));
          let colourwayVisual: VisualFingerprint;
          if (cached) { colourwayVisual = cached; report.recovered++; }
          else {
            const classified = combined && row.fabric_id === designRow.fabric_id && combinedRaw ? { candidate: combinedRaw, asset: colourwayAsset } : await openAiClassify(row, colourwayFingerprintInstruction, "low", colourwayAsset);
            colourwayVisual = acceptVisualCandidate(colourwayCandidateFrom(flexibleCandidate(classified.candidate)), { binding: binding(row, classified.asset), imageContentHash: `sha256:${classified.asset.analysisAssetHash}`, modelId: hciVisualModel, promptVersion: visualPromptVersion, schemaVersion: visualSchemaVersion, analysedAt: new Date().toISOString(), analysisLevel: "COLOURWAY" });
            report.newlyInferredColourways++;
          }
          const colourwayLedgerId = await insertFingerprint(db, runId, row, colourwayVisual, colourwayAsset);
          colourwayByFabric.set(colourwayKey(row), { ledger_id: colourwayLedgerId, analysis_level: "COLOURWAY", fabric_id: row.fabric_id, supplier_id: row.supplier_id, supplier_sku: row.supplier_sku, brand_id: row.brand_id, design_id: row.design_id, source_image_hash: row.source_image_hash, analysis_asset_hash: colourwayAsset.analysisAssetHash, output: colourwayVisual, approval_state: reviewState(colourwayVisual.candidate, "COLOURWAY") === "AUTO_APPROVED" ? "APPROVED" : "PROPOSED", review_state: reviewState(colourwayVisual.candidate, "COLOURWAY") });
          const designForResolution = { ...designLedger.output, candidate: designCandidateFrom(flexibleCandidate(designLedger.output.candidate)) } as VisualFingerprint;
          const colourwayForResolution = { ...colourwayVisual, candidate: colourwayCandidateFrom(flexibleCandidate(colourwayVisual.candidate)) } as VisualFingerprint;
          const resolved = resolveFabricFingerprint({ design: designForResolution, colourway: colourwayForResolution, analysedAt: new Date().toISOString() });
          await insertFingerprint(db, runId, row, resolved, colourwayAsset, { designId: designLedger.ledger_id, colourwayId: colourwayLedgerId });
          report.resolved++;
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message.replace(/[^A-Z0-9_]/gi, "_").toUpperCase().slice(0, 80) : "UNKNOWN_FAILURE";
        report.failed++; report.failures.push({ level: "DESIGN_GROUP", fabric_id: designRow.fabric_id, supplier_sku: designRow.supplier_sku, reason });
        await db.from("fabric_visual_enrichment_failures").insert({ run_id: runId, fabric_id: designRow.fabric_id, supplier_id: designRow.supplier_id, supplier_sku: designRow.supplier_sku, source_image_hash: designRow.source_image_hash, prompt_version: visualPromptVersion, schema_version: visualSchemaVersion, model_id: hciVisualModel, failure_reason: reason, context: { analysis_level: "DESIGN_GROUP", design_id: designRow.design_id } });
        if (isSystemicOpenAiFailure(reason)) {
          await db.from("fabric_visual_enrichment_runs").update({ status: "FAILED", completed_at: new Date().toISOString(), checkpoint: { stage: "stopped_systemic_openai_failure", reason, processedDesigns: i, totalDesigns: designRows.length, colourwayResolved: report.resolved }, summary: { ...report, stopReason: reason } }).eq("run_id", runId);
          throw new Error(reason);
        }
      }
    }
    report.ledgerCheckpointReadiness = "PASS";
    await db.from("fabric_visual_enrichment_runs").update({ checkpoint: { stage: "running", processedDesigns: Math.min(i + batch.length, designRows.length), totalDesigns: designRows.length, colourwayResolved: report.resolved }, summary: report }).eq("run_id", runId);
    await writeFile(path.join(outDir, "visual-enrichment-progress.json"), JSON.stringify(report, null, 2));
  }
  const finalStatus = report.failed ? (report.resolved ? "PARTIAL" : "FAILED") : "SUCCEEDED";
  await db.from("fabric_visual_enrichment_runs").update({ status: finalStatus, completed_at: new Date().toISOString(), checkpoint: { stage: "closed", processedDesigns: designRows.length, totalDesigns: designRows.length, colourwayResolved: report.resolved }, summary: report }).eq("run_id", runId);
  console.log(JSON.stringify(report, null, 2));
}
main().catch((err) => { console.error(err instanceof Error ? err.message : "VISUAL_ENRICHMENT_FAILED"); process.exitCode = 1; });

