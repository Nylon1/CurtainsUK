import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Classification = {
  supplier_sku: string;
  classification: string;
  [key: string]: unknown;
};

function option(name: string) {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function skuSet(value: string | undefined) {
  return new Set((value ?? "").split(",").map((sku) => sku.trim()).filter(Boolean));
}

async function main() {
  const sourcePath = option("source"), manifestPath = option("manifest"), outputPath = option("out");
  if (!sourcePath || !manifestPath || !outputPath) throw new Error("PT_POST_INGESTION_ARGUMENTS_REQUIRED");
  const discontinued = skuSet(option("supplier-discontinued"));
  const source = JSON.parse(await readFile(sourcePath, "utf8")) as { summary: { source_total: number }; classifications: Classification[] };
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Array<{ supplier_sku: string }>;
  const released = new Set(manifest.map((item) => item.supplier_sku).filter((sku) => !discontinued.has(sku)));
  if (source.summary.source_total !== source.classifications.length || manifest.length !== released.size + discontinued.size) {
    throw new Error("PT_POST_INGESTION_INPUT_CHANGED");
  }
  for (const sku of [...released, ...discontinued]) {
    if (!source.classifications.some((item) => item.supplier_sku === sku && item.classification === "GENUINELY_MISSING")) {
      throw new Error(`PT_POST_INGESTION_SCOPE_INVALID:${sku}`);
    }
  }
  const classifications = source.classifications.map((item) => released.has(item.supplier_sku)
    ? { ...item, classification: "LIVE", resolution: "WEBTEX_FIRST_RELEASED" }
    : discontinued.has(item.supplier_sku)
      ? { ...item, classification: "SUPPLIER_DISCONTINUED", resolution: "WEBTEX_CURRENT_DISCONTINUED_FLAG" }
      : item);
  const count = (classification: string) => classifications.filter((item) => item.classification === classification).length;
  const summary = {
    source_total: source.summary.source_total,
    live: count("LIVE"),
    novelty_exclusion: count("NOVELTY_EXCLUSION"),
    pt_contract_exclusion: count("PT_CONTRACT_EXCLUSION"),
    supplier_discontinued: count("SUPPLIER_DISCONTINUED"),
    webtex_unsupported: count("WEBTEX_UNSUPPORTED"),
    genuinely_missing: count("GENUINELY_MISSING"),
    newly_released: released.size,
    newly_supplier_discontinued: discontinued.size,
  };
  const accounted = summary.live + summary.novelty_exclusion + summary.pt_contract_exclusion + summary.supplier_discontinued + summary.webtex_unsupported + summary.genuinely_missing;
  if (accounted !== summary.source_total) throw new Error("PT_POST_INGESTION_ACCOUNTING_FAILED");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify({ generated_at: new Date().toISOString(), summary, classifications }, null, 2) + "\n");
  console.log(JSON.stringify(summary));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "PT_POST_INGESTION_FAILED");
  process.exitCode = 1;
});
