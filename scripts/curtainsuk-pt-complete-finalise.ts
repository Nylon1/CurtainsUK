import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type InitialItem = {
  supplier_sku: string;
  supplier_design_code: string;
  classification: string;
  master_ids: string[];
  price_list_current: boolean;
};
type WebtexResult = {
  sku: string;
  status: string;
  exactIdentity: boolean;
  description: string;
  collection: string;
  composition: string;
  usableWidth: string;
  fullWidth: string;
  horizontalRepeat: string;
  verticalRepeat: string;
  standardPrice: string;
  cutPrice: string;
  freeStock: string;
  origin: string;
  weight: string;
  martindale: string;
  imageFull: string;
};

function option(name: string) {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function main() {
  const initialPath = option("initial"), webtexPath = option("webtex"), outputPath = option("out");
  if (!initialPath || !webtexPath || !outputPath) throw new Error("PT_COMPLETE_FINALISE_ARGUMENTS_REQUIRED");
  const initial = JSON.parse(await readFile(initialPath, "utf8")) as {
    source_total: number;
    production_pt_masters: number;
    production_pt_live_masters: number;
    classifications: InitialItem[];
  };
  const scan = JSON.parse(await readFile(webtexPath, "utf8")) as { tested: number; results: WebtexResult[] };
  if (initial.source_total !== 10015 || initial.classifications.length !== 10015 || scan.tested !== 1580 || scan.results.length !== 1580) {
    throw new Error("PT_COMPLETE_FINALISE_INPUT_CHANGED");
  }
  const pending = initial.classifications.filter((item) => item.classification === "PENDING_WEBTEX");
  if (pending.length !== 1948) throw new Error("PT_COMPLETE_PENDING_UNIVERSE_CHANGED");
  const scanBySku = new Map(scan.results.map((item) => [item.sku, item]));
  const supported = new Set<string>();
  for (const item of pending) {
    const result = scanBySku.get(item.supplier_sku);
    if (result) {
      if (result.status === "DATA" && result.exactIdentity && /^\d+(?:\.\d+)?\s+Metres$/i.test(result.freeStock.trim())) supported.add(item.supplier_sku);
      else if (result.status !== "ERROR") throw new Error(`PT_COMPLETE_WEBTEX_RESULT_INVALID:${item.supplier_sku}`);
    }
  }
  if (supported.size !== 908 || scan.results.filter((item) => item.status === "DATA" && item.exactIdentity).length !== 908) {
    throw new Error("PT_COMPLETE_WEBTEX_SUPPORTED_COUNT_CHANGED");
  }
  const classifications = initial.classifications.map((item) => ({
    ...item,
    classification: item.classification !== "PENDING_WEBTEX" ? item.classification
      : supported.has(item.supplier_sku) ? "GENUINELY_MISSING" : "WEBTEX_UNSUPPORTED",
    webtex: supported.has(item.supplier_sku) ? scanBySku.get(item.supplier_sku) : undefined,
  }));
  const count = (value: string) => classifications.filter((item) => item.classification === value).length;
  const summary = {
    source_total: initial.source_total,
    live: count("LIVE"),
    novelty_exclusion: count("NOVELTY_EXCLUSION"),
    pt_contract_exclusion: count("PT_CONTRACT_EXCLUSION"),
    supplier_discontinued: count("SUPPLIER_DISCONTINUED"),
    webtex_unsupported: count("WEBTEX_UNSUPPORTED"),
    genuinely_missing: count("GENUINELY_MISSING"),
    production_pt_masters_at_reconciliation: initial.production_pt_masters,
    production_live_pt_masters_at_reconciliation: initial.production_pt_live_masters,
  };
  const accounted = summary.live + summary.novelty_exclusion + summary.pt_contract_exclusion + summary.supplier_discontinued + summary.webtex_unsupported + summary.genuinely_missing;
  if (accounted !== summary.source_total || summary.live !== 4485 || summary.novelty_exclusion !== 24 || summary.pt_contract_exclusion !== 390 ||
      summary.supplier_discontinued !== 3168 || summary.webtex_unsupported !== 1040 || summary.genuinely_missing !== 908) {
    throw new Error("PT_COMPLETE_FINAL_RECONCILIATION_INTEGRITY_FAILED");
  }
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify({ generated_at: new Date().toISOString(), summary, classifications }, null, 2) + "\n");
  console.log(JSON.stringify(summary));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "PT_COMPLETE_FINALISE_FAILED");
  process.exitCode = 1;
});
