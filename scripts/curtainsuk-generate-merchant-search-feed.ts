import "./curtainsuk-server-script-loader.mjs";
import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import type { FabricSearchIntent } from "../lib/fabric-master/fabric-search-intent";

loadEnvConfig(process.cwd());

const HEADERS = [
  "id", "title", "description", "link", "image_link", "availability",
  "price", "brand", "color", "material", "pattern", "product_type",
  "product_detail", "condition",
] as const;
type MerchantExportRow = Record<string, string>;
type ProfileSnapshot = {
  fabricId: string; canonicalUrl: string | null; imageUrl: string | null;
  brand: string | null; samplePrice: string | null;
};
type FeedRow = Record<typeof HEADERS[number], string>;

function argumentsFromProcess() {
  const mode = process.argv.find((arg) => arg.startsWith("--mode="))?.slice(7);
  const reviewDir = process.argv.find((arg) => arg.startsWith("--review-dir="))?.slice(13);
  const exportFile = process.argv.find((arg) => arg.startsWith("--merchant-export="))?.slice(18);
  const canaryArg = process.argv.find((arg) => arg.startsWith("--canary-ids="))?.slice(13);
  if (!["canary", "full"].includes(mode ?? "") || !reviewDir || !exportFile) throw new Error("ARGUMENTS_INVALID");
  const canaryIds = canaryArg?.split(",").filter(Boolean) ?? [];
  if (mode === "canary" && canaryIds.length < 4) throw new Error("CANARY_REQUIRES_FOUR_IDS");
  if (mode === "full" && canaryIds.length) throw new Error("FULL_MODE_REJECTS_CANARY_IDS");
  return { mode, reviewDir: resolve(reviewDir), exportFile: resolve(exportFile), canaryIds };
}

function encodeSubattribute(value: string) {
  const plain = value.replace(/[\r\n\t]+/g, " ").trim();
  return /[,:"\\]/.test(plain) ? `"${plain.replace(/"/g, '""')}"` : plain;
}

function productDetail(details: FabricSearchIntent["merchant"]["product_detail"]) {
  return details.map(({ section, name, value }) =>
    [section, name, value].map(encodeSubattribute).join(":")).join(",");
}

function tsvCell(value: string) {
  if (/[\r\n\t]/.test(value)) throw new Error("MERCHANT_TSV_CELL_MULTILINE");
  return value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value;
}

function toTsv(rows: FeedRow[]) {
  return [HEADERS.join("\t"), ...rows.map((row) => HEADERS.map((header) => tsvCell(row[header])).join("\t"))].join("\n") + "\n";
}

function duplicateCount(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count, 0);
}

async function main() {
  const args = argumentsFromProcess();
  const summary = JSON.parse(readFileSync(resolve(args.reviewDir, "summary.json"), "utf8")) as {
    profileManifestCount: number;
    merchantEligibility: {
      browseGeneration: string; eligibleProfileCount: number;
      exclusions: Array<{ fabricId: string; reason: string }>;
    };
    merchantSource: {
      sha256: string; rows: number; expectedMerchantCount: number;
      eligibleMissingFromMerchant: string[]; sourceItemsNoLongerEligible: string[];
    };
  };
  const rawExport = readFileSync(args.exportFile);
  if (createHash("sha256").update(rawExport).digest("hex") !== summary.merchantSource.sha256) {
    throw new Error("MERCHANT_EXPORT_DIGEST_MISMATCH");
  }
  const oldRows = parse(rawExport, {
    bom: true, columns: true, delimiter: "\t", relax_quotes: true, skip_empty_lines: true,
  }) as MerchantExportRow[];
  if (oldRows.length !== summary.merchantSource.rows) throw new Error("MERCHANT_EXPORT_COUNT_MISMATCH");
  const oldById = new Map(oldRows.map((row) => [row.id, row]));
  if (oldById.size !== oldRows.length) throw new Error("MERCHANT_EXPORT_DUPLICATE_ID");
  const intents = JSON.parse(readFileSync(resolve(args.reviewDir, "generated-intents.json"), "utf8")) as FabricSearchIntent[];
  const intentById = new Map(intents.map((intent) => [intent.merchant.id, intent]));
  const profiles = JSON.parse(readFileSync(resolve(args.reviewDir, "shopify-profile-snapshot.json"), "utf8")) as ProfileSnapshot[];
  const profileById = new Map(profiles.map((profile) => [profile.fabricId, profile]));
  if (intents.length !== summary.profileManifestCount || intentById.size !== intents.length
    || profiles.length !== intents.length || profileById.size !== profiles.length) {
    throw new Error("INTENT_OR_SHOPIFY_SNAPSHOT_COUNT_MISMATCH");
  }
  const db = createSupplierServiceClient();
  const { data: control, error } = await db.from("browse_projection_control").select("active_generation").limit(1);
  if (error || String(control?.[0]?.active_generation) !== summary.merchantEligibility.browseGeneration) {
    throw new Error("BROWSE_GENERATION_MOVED");
  }
  const excluded = new Set(summary.merchantEligibility.exclusions.map((entry) => `cuk-sample:${entry.fabricId}`));
  const eligibleIds = new Set(intents.map((intent) => intent.merchant.id).filter((id) => !excluded.has(id)));
  if (eligibleIds.size !== summary.merchantEligibility.eligibleProfileCount) throw new Error("MERCHANT_ELIGIBILITY_MISMATCH");
  const canary = new Set(args.canaryIds.map((id) => id.startsWith("cuk-sample:") ? id : `cuk-sample:${id}`));
  if (canary.size !== args.canaryIds.length) throw new Error("CANARY_ID_DUPLICATE");
  if (args.mode === "canary") {
    for (const id of canary) if (!eligibleIds.has(id)) throw new Error(`CANARY_ID_NOT_ELIGIBLE:${id}`);
    const existing = [...canary].filter((id) => oldById.has(id)).length;
    if (existing < 2 || canary.size - existing < 2) throw new Error("CANARY_REQUIRES_EXISTING_AND_NEW");
  }
  const selected = args.mode === "full" ? eligibleIds : canary;
  const rows: FeedRow[] = [];
  for (const intent of intents) {
    const id = intent.merchant.id;
    if (!eligibleIds.has(id)) continue;
    const old = oldById.get(id);
    if (args.mode === "canary" && !old && !selected.has(id)) continue;
    const profile = profileById.get(intent.fabricId);
    if (!profile || profile.canonicalUrl !== intent.canonicalUrl || profile.samplePrice !== "2.50"
      || profile.brand !== intent.merchant.brand
      || !/^https:\/\/cdn\.shopify\.com\//.test(profile.imageUrl ?? "")) {
      throw new Error(`MERCHANT_PROFILE_IDENTITY_MISMATCH:${id}`);
    }
    if (old && (old.link !== intent.canonicalUrl || old.price !== "2.50 GBP" || old.id !== id)) {
      throw new Error(`MERCHANT_SOURCE_IDENTITY_OR_PRICE_DRIFT:${id}`);
    }
    const enrich = selected.has(id);
    const row: FeedRow = {
      id,
      title: enrich ? intent.merchant.title : old!.title,
      description: enrich ? intent.merchant.description : old!.description,
      link: intent.canonicalUrl,
      image_link: enrich ? profile.imageUrl! : old!["image link"],
      availability: "in stock",
      price: "2.50 GBP",
      brand: intent.merchant.brand,
      color: enrich ? intent.merchant.color : old!.color,
      material: enrich ? intent.merchant.material ?? "" : "",
      pattern: enrich ? intent.merchant.pattern ?? "" : "",
      product_type: enrich ? intent.merchant.product_type : "",
      product_detail: enrich ? productDetail(intent.merchant.product_detail) : "",
      condition: "new",
    };
    if (!row.title || !row.description || !row.image_link) throw new Error(`MERCHANT_ROW_INCOMPLETE:${id}`);
    rows.push(row);
  }
  const ids = new Set(rows.map((row) => row.id));
  if (ids.size !== rows.length) throw new Error("MERCHANT_FEED_DUPLICATE_ID");
  const expected = args.mode === "full"
    ? summary.merchantSource.expectedMerchantCount
    : oldRows.length - summary.merchantSource.sourceItemsNoLongerEligible.length
      + [...canary].filter((id) => !oldById.has(id)).length;
  if (rows.length !== expected) throw new Error(`MERCHANT_FEED_COUNT_MISMATCH:${rows.length}:${expected}`);
  if (args.mode === "full" && (duplicateCount(rows.map((row) => row.title))
    || duplicateCount(rows.map((row) => row.description))
    || rows.some((row) => /not made-to-measure curtains/i.test(row.description)))) {
    throw new Error("MERCHANT_FEED_DUPLICATE_OR_LEGACY_COPY");
  }
  const body = toTsv(rows);
  const output = resolve(args.reviewDir, `merchant-${args.mode}.tsv`);
  writeFileSync(output, body);
  console.log(JSON.stringify({
    mode: args.mode, sourceId: "10741855241", sourceRows: oldRows.length,
    selectedEnrichments: selected.size, newProducts: rows.filter((row) => !oldById.has(row.id)).length,
    exclusions: excluded.size, feedRows: rows.length,
    duplicateTitles: duplicateCount(rows.map((row) => row.title)),
    duplicateDescriptions: duplicateCount(rows.map((row) => row.description)),
    legacyNegativeCopyRows: rows.filter((row) => /not (?:fabric by the metre or )?made-to-measure curtains/i.test(row.description)).length,
    sha256: createHash("sha256").update(body).digest("hex"), output, merchantWrites: 0,
  }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
