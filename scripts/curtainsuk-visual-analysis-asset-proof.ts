import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";

type ScopeRow = {
  fabric_id:string; supplier_id:string; supplier_sku:string; brand_id:string; design_id:string;
  image_type:string; source_image_hash:string; source_image_url:string; source_image_rank:number; useful_image_count:number;
};

type Classification = "EXACT_BYTE_MATCH" | "SHOPIFY_TRANSFORMATION" | "GENUINELY_CHANGED_IMAGE" | "WRONG_MEDIA_MAPPING" | "UNKNOWN";
const outDir = process.argv.find((arg) => arg.startsWith("--out="))?.slice("--out=".length) ?? "artifacts/visual-analysis-assets";
const concurrency = Math.max(1, Math.min(Number(process.argv.find((arg) => arg.startsWith("--concurrency="))?.slice("--concurrency=".length) ?? "16"), 32));
const expectedProjectRef = "hqysjumypgeapgmqkcrx";
function sha(bytes: Uint8Array) { return createHash("sha256").update(bytes).digest("hex"); }
function assertProductionTarget() {
  const projectRef = process.env.CURTAINSUK_SUPABASE_PROJECT_REF;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (projectRef !== expectedProjectRef) throw new Error("SUPABASE_PROJECT_REF_REJECTED");
  if (!url || new URL(url).hostname !== `${expectedProjectRef}.supabase.co`) throw new Error("SUPABASE_URL_REJECTED");
}
async function fetchAllScope(db: any) {
  const rows: ScopeRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.rpc("fabric_visual_enrichment_scope", { p_scope: "CANONICAL_APPROVED_IMAGE" }).range(from, from + 999);
    if (error) throw error;
    const page = (data ?? []) as ScopeRow[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}
async function inspect(row: ScopeRow) {
  try {
    const response = await fetch(row.source_image_url, { redirect: "error", credentials: "omit", signal: AbortSignal.timeout(45_000) });
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!response.ok || response.redirected || !["image/jpeg","image/png","image/webp"].includes(contentType)) {
      return { classification: "UNKNOWN" as Classification, fabricId: row.fabric_id, supplierId: row.supplier_id, sourceImageHash: row.source_image_hash, reason: `FETCH_OR_TYPE_${response.status}_${contentType}` };
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const metadata = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata();
    const cdnSha256 = sha(bytes);
    const urlContainsSourceHash = row.source_image_url.includes(row.source_image_hash);
    const decoded = Boolean(metadata.width && metadata.height);
    let classification: Classification;
    if (cdnSha256 === row.source_image_hash) classification = "EXACT_BYTE_MATCH";
    else if (decoded && urlContainsSourceHash && row.image_type === "MAIN") classification = "SHOPIFY_TRANSFORMATION";
    else if (decoded && !urlContainsSourceHash) classification = "WRONG_MEDIA_MAPPING";
    else if (decoded) classification = "GENUINELY_CHANGED_IMAGE";
    else classification = "UNKNOWN";
    return {
      classification,
      fabricId: row.fabric_id,
      supplierId: row.supplier_id,
      sku: row.supplier_sku,
      sourceImageHash: row.source_image_hash,
      analysisAssetHash: cdnSha256,
      contentType,
      byteLength: bytes.length,
      decodedWidth: metadata.width ?? null,
      decodedHeight: metadata.height ?? null,
      urlContainsSourceHash,
      safeForAnalysis: classification === "EXACT_BYTE_MATCH" || classification === "SHOPIFY_TRANSFORMATION",
    };
  } catch (error) {
    return { classification: "UNKNOWN" as Classification, fabricId: row.fabric_id, supplierId: row.supplier_id, sourceImageHash: row.source_image_hash, reason: error instanceof Error ? error.message : "UNKNOWN_FETCH_ERROR" };
  }
}
async function main() {
  assertProductionTarget();
  await mkdir(outDir, { recursive: true });
  const db = createSupplierServiceClient();
  const rows = await fetchAllScope(db);
  if (rows.length !== 9248) throw new Error(`SCOPE_COUNT_REJECTED_${rows.length}`);
  const results: Awaited<ReturnType<typeof inspect>>[] = [];
  let next = 0;
  async function worker() {
    for (;;) {
      const index = next++;
      if (index >= rows.length) return;
      results[index] = await inspect(rows[index]);
      if ((index + 1) % 500 === 0) console.log(JSON.stringify({ inspected: index + 1, total: rows.length }));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  const byClass = Object.fromEntries(["EXACT_BYTE_MATCH","SHOPIFY_TRANSFORMATION","GENUINELY_CHANGED_IMAGE","WRONG_MEDIA_MAPPING","UNKNOWN"].map((key) => [key, results.filter((r) => r.classification === key).length]));
  const bySupplier = [...new Set(results.map((r) => r.supplierId))].sort().map((supplier) => ({ supplier, total: results.filter((r) => r.supplierId === supplier).length, classifications: Object.fromEntries(Object.keys(byClass).map((key) => [key, results.filter((r) => r.supplierId === supplier && r.classification === key).length])) }));
  const summary = {
    checkedAt: new Date().toISOString(),
    inference: false,
    scopeCount: rows.length,
    exactByteHashMatches: byClass.EXACT_BYTE_MATCH,
    verifiedTransformedEquivalentImages: byClass.SHOPIFY_TRANSFORMATION,
    genuinelyChangedImages: byClass.GENUINELY_CHANGED_IMAGE,
    wrongMappings: byClass.WRONG_MEDIA_MAPPING,
    unresolved: byClass.UNKNOWN,
    analysisAssetsSafelyUsable: results.filter((r) => "safeForAnalysis" in r && r.safeForAnalysis).length,
    bySupplier,
    samples: {
      exactByteHashMatches: results.filter((r) => r.classification === "EXACT_BYTE_MATCH").slice(0, 10),
      transformed: results.filter((r) => r.classification === "SHOPIFY_TRANSFORMATION").slice(0, 10),
      blockers: results.filter((r) => !(("safeForAnalysis" in r) && r.safeForAnalysis)).slice(0, 50),
    },
  };
  await writeFile(path.join(outDir, "visual-analysis-asset-proof-summary.json"), JSON.stringify(summary, null, 2));
  await writeFile(path.join(outDir, "visual-analysis-asset-proof-results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (summary.analysisAssetsSafelyUsable !== rows.length) process.exitCode = 1;
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "VISUAL_ANALYSIS_ASSET_PROOF_FAILED"); process.exitCode = 1; });
