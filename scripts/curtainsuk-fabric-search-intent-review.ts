import "./curtainsuk-server-script-loader.mjs";
import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { listFabricMasterRecords } from "../lib/fabric-master/repository";
import { mapVisualKnowledgeRow, type VisualRow } from "../lib/fabric-master/visual-knowledge";
import {
  buildFabricSearchIntent,
  type FabricSearchIntent,
  type GovernedRetailIntent,
} from "../lib/fabric-master/fabric-search-intent";

loadEnvConfig(process.cwd());

type Manifest = { version: number; profileCount: number; profiles: Array<{ fabricMasterId: string; canonicalUrl: string }> };
type MerchantRow = Record<string, string>;
type ReviewRow = {
  group: string;
  fabricId: string;
  oldTitle: string;
  newTitle: string;
  oldDescription: string;
  newDescription: string;
  colourTerms: string[];
  patternTerms: string[];
  roomTerms: string[];
  roomSource?: string;
  styleTerms: string[];
  styleSource?: string;
  structuredMerchantFields: FabricSearchIntent["merchant"];
};

function args() {
  const outputArg = process.argv.find((arg) => arg.startsWith("--out-dir="));
  const merchantArg = process.argv.find((arg) => arg.startsWith("--merchant-tsv="));
  const outDir = resolve(outputArg?.slice("--out-dir=".length) ?? "generated/fabric-search-intent-review");
  const merchantFile = merchantArg ? resolve(merchantArg.slice("--merchant-tsv=".length)) : null;
  return { outDir, merchantFile };
}

function duplicateCounts(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const groups = [...counts.values()].filter((count) => count > 1);
  return { duplicateGroups: groups.length, duplicateRows: groups.reduce((sum, count) => sum + count, 0), unique: counts.size };
}

function merchantRows(file: string | null) {
  if (!file) return null;
  const rows = parse(readFileSync(file, "utf8"), {
    bom: true,
    columns: true,
    delimiter: "\t",
    relax_quotes: true,
    skip_empty_lines: true,
  }) as MerchantRow[];
  for (const name of ["id", "title", "description", "link", "price"]) {
    if (rows.length && !(name in rows[0])) throw new Error(`MERCHANT_SOURCE_COLUMN_MISSING:${name}`);
  }
  const byId = new Map<string, MerchantRow>();
  for (const row of rows) {
    if (!row.id || byId.has(row.id)) throw new Error(`MERCHANT_SOURCE_DUPLICATE_OR_MISSING_ID:${row.id}`);
    byId.set(row.id, row);
  }
  return { rows, byId, sha256: createHash("sha256").update(readFileSync(file)).digest("hex") };
}

function category(intent: FabricSearchIntent, group: string) {
  const pattern = intent.patternClass ?? "";
  if (group === "plains-textured-plains") return pattern === "plain" || pattern === "textured plain";
  if (group === "florals-botanicals") return ["floral", "botanical"].includes(pattern);
  if (group === "stripes-geometric-checks") return ["stripe", "geometric", "check"].includes(pattern);
  if (group === "velvet-luxury") return intent.character.includes("luxurious") || intent.styles.includes("luxury");
  return ["white", "cream", "beige", "taupe", "grey", "neutral"].some((term) =>
    intent.exactColourway.toLowerCase().includes(term) || intent.primaryColourFamily === term)
    || intent.styles.includes("minimalist")
    || intent.character.includes("understated");
}

async function main() {
  const { outDir, merchantFile } = args();
  const manifest = JSON.parse(readFileSync(resolve("generated/fabric-profile-sitemap.json"), "utf8")) as Manifest;
  if (manifest.version !== 1 || manifest.profileCount !== manifest.profiles.length) throw new Error("PROFILE_MANIFEST_INVALID");
  const ids = new Set(manifest.profiles.map((profile) => profile.fabricMasterId));
  const urls = new Set(manifest.profiles.map((profile) => profile.canonicalUrl));
  if (ids.size !== manifest.profileCount || urls.size !== manifest.profileCount) throw new Error("PROFILE_MANIFEST_DUPLICATE");
  const master = new Map((await listFabricMasterRecords()).map((record) => [record.fabric_id, record]));
  const db = createSupplierServiceClient();
  const fi = new Map<string, VisualRow>();
  const manifestIds = [...ids];
  for (let from = 0; from < manifestIds.length; from += 400) {
    const batch = manifestIds.slice(from, from + 400);
    const { data, error } = await db.from("fabric_visual_knowledge_enriched")
      .select("fabric_id,knowledge_state,visual_fields").in("fabric_id", batch);
    if (error) throw new Error(`FI_READ_FAILED:${error.code}`);
    for (const row of (data ?? []) as VisualRow[]) fi.set(row.fabric_id, row);
  }
  const { data: retailRows, error: retailError } = await db.from("fabric_retail_profiles")
    .select("fabric_id,description_validated,rooms,styles,headings,linings").range(0, 999);
  if (retailError) throw new Error(`RETAIL_READ_FAILED:${retailError.code}`);
  const retail = new Map((retailRows ?? []).map((row) => [row.fabric_id, row as GovernedRetailIntent & { fabric_id: string }]));
  const { data: control, error: controlError } = await db.from("browse_projection_control")
    .select("active_generation").limit(1);
  if (controlError || !control?.[0]?.active_generation) throw new Error("BROWSE_GENERATION_UNAVAILABLE");
  const generation = String(control[0].active_generation);
  const sampleCurrentIds = new Set<string>();
  for (let from = 0; ; from += 500) {
    const { data, error } = await db.from("browse_read_projection")
      .select("fabric_id")
      .eq("generation_id", generation)
      .eq("sample_current", true)
      .order("fabric_id")
      .range(from, from + 499);
    if (error) throw new Error(`SAMPLE_CURRENT_READ_FAILED:${error.code}`);
    const page = data ?? [];
    for (const item of page) sampleCurrentIds.add(String(item.fabric_id));
    if (page.length < 500) break;
  }
  const merchant = merchantRows(merchantFile);
  const generated: FabricSearchIntent[] = [];
  const blockers: Array<{ fabricId: string; reason: string }> = [];
  for (const profile of manifest.profiles) {
    const record = master.get(profile.fabricMasterId);
    const row = fi.get(profile.fabricMasterId);
    if (!record || !row || !["COMPLETE", "PARTIAL_GOVERNED"].includes(row.knowledge_state)) {
      blockers.push({ fabricId: profile.fabricMasterId, reason: !record ? "FABRIC_MASTER_MISSING" : !row ? "FI_MISSING" : `FI_${row.knowledge_state}` });
      continue;
    }
    try {
      generated.push(buildFabricSearchIntent(record, mapVisualKnowledgeRow(row), profile.canonicalUrl, retail.get(profile.fabricMasterId)));
    } catch (error) {
      blockers.push({ fabricId: profile.fabricMasterId, reason: error instanceof Error ? error.message : "UNKNOWN" });
    }
  }
  const generatedById = new Map(generated.map((intent) => [intent.merchant.id, intent]));
  if (generatedById.size !== generated.length) throw new Error("GENERATED_MERCHANT_ID_DUPLICATE");
  const sourceIds = new Set(merchant?.rows.map((row) => row.id) ?? []);
  const groups = ["plains-textured-plains", "florals-botanicals", "stripes-geometric-checks", "velvet-luxury", "neutral-minimal"];
  const selected = new Set<string>();
  const review: ReviewRow[] = [];
  for (const group of groups) {
    const pool = generated.filter((intent) => !selected.has(intent.fabricId) && category(intent, group));
    const candidates = merchant
      ? [
        ...pool.filter((intent) => sourceIds.has(intent.merchant.id)).slice(0, 7),
        ...pool.filter((intent) => !sourceIds.has(intent.merchant.id)).slice(0, 3),
      ]
      : pool.slice(0, 10);
    if (candidates.length < 10) {
      for (const intent of pool) {
        if (candidates.length === 10) break;
        if (!candidates.includes(intent)) candidates.push(intent);
      }
    }
    if (candidates.length !== 10) throw new Error(`REVIEW_CATEGORY_INCOMPLETE:${group}:${candidates.length}`);
    for (const intent of candidates) {
      selected.add(intent.fabricId);
      const old = merchant?.byId.get(intent.merchant.id);
      review.push({
        group, fabricId: intent.fabricId,
        oldTitle: old?.title ?? (merchant ? "NOT YET IN MERCHANT" : "UNVERIFIED — Merchant source export required"),
        newTitle: intent.title,
        oldDescription: old?.description ?? (merchant ? "NOT YET IN MERCHANT" : "UNVERIFIED — Merchant source export required"),
        newDescription: intent.description,
        colourTerms: [intent.exactColourway, intent.primaryColourFamily, ...intent.secondaryColours].filter((value): value is string => Boolean(value)),
        patternTerms: [intent.patternClass, ...intent.motif, ...intent.texture].filter((value): value is string => Boolean(value)),
        roomTerms: intent.rooms, roomSource: intent.roomSource,
        styleTerms: intent.styles, styleSource: intent.styleSource,
        structuredMerchantFields: intent.merchant,
      });
    }
  }
  const merchantExclusions = manifest.profiles
    .filter((profile) => !sampleCurrentIds.has(profile.fabricMasterId))
    .map((profile) => ({ fabricId: profile.fabricMasterId, reason: "SAMPLE_NOT_CURRENT_IN_BROWSE" }));
  const eligibleIds = new Set(manifest.profiles
    .filter((profile) => sampleCurrentIds.has(profile.fabricMasterId))
    .map((profile) => `cuk-sample:${profile.fabricMasterId}`));
  const missingFromMerchant = [...generatedById.keys()].filter((id) => !sourceIds.has(id));
  const unknownMerchantIds = [...sourceIds].filter((id) => !generatedById.has(id));
  const eligibleMissingFromMerchant = [...eligibleIds].filter((id) => !sourceIds.has(id));
  const sourceItemsNoLongerEligible = [...sourceIds].filter((id) => !eligibleIds.has(id));
  const summary = {
    mode: "READ_ONLY",
    profileManifestCount: manifest.profileCount,
    generatedCount: generated.length,
    blockers,
    merchantEligibility: {
      browseGeneration: generation,
      browseSampleCurrentCount: sampleCurrentIds.size,
      eligibleProfileCount: eligibleIds.size,
      exclusions: merchantExclusions,
    },
    generatedDuplicateTitles: duplicateCounts(generated.map((intent) => intent.title)),
    generatedDuplicateDescriptions: duplicateCounts(generated.map((intent) => intent.description)),
    merchantSource: merchant ? {
      sha256: merchant.sha256,
      rows: merchant.rows.length,
      duplicateTitles: duplicateCounts(merchant.rows.map((row) => row.title)),
      duplicateDescriptions: duplicateCounts(merchant.rows.map((row) => row.description)),
      legacyNegativePhraseRows: merchant.rows.filter((row) => /not (?:fabric by the metre or )?made-to-measure curtains/i.test(row.description)).length,
      legacyNegativeTemplateTailRows: merchant.rows.filter((row) => row.description.includes("This offer is for one physical fabric sample only, not fabric by the metre or made-to-measure curtains.")).length,
      missingFromMerchant,
      eligibleMissingFromMerchant,
      unknownMerchantIds,
      sourceItemsNoLongerEligible,
      expectedMerchantCount: merchant.rows.length - sourceItemsNoLongerEligible.length + eligibleMissingFromMerchant.length,
    } : null,
    reviewRows: review.length,
    reviewGroups: Object.fromEntries(groups.map((group) => [group, review.filter((row) => row.group === group).length])),
    shopifyWrites: 0,
    merchantWrites: 0,
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "review-50.json"), JSON.stringify(review, null, 2) + "\n");
  writeFileSync(resolve(outDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  writeFileSync(resolve(outDir, "generated-intents.json"), JSON.stringify(generated, null, 2) + "\n");
  console.log(JSON.stringify({ ...summary, blockers: blockers.length, merchantEligibility: { ...summary.merchantEligibility, exclusions: merchantExclusions.length }, merchantSource: merchant ? { ...summary.merchantSource, missingFromMerchant: missingFromMerchant.length, eligibleMissingFromMerchant: eligibleMissingFromMerchant.length, unknownMerchantIds: unknownMerchantIds.length, sourceItemsNoLongerEligible: sourceItemsNoLongerEligible.length } : null }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
