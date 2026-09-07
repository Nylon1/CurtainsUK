import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prestigiousProductLinks, parsePrestigiousPublicProduct } from "../lib/fabric-master/prestigious-public";

const arg = (name: string) => process.argv.find((v) => v.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const limit = Number(arg("batch-size") ?? 100);
const collection = arg("collection") ?? "rustic-persian";
if (!Number.isInteger(limit) || limit < 100 || limit > 250 || !/^[a-z0-9-]+$/.test(collection)) throw new Error("BATCH_ARGUMENTS_INVALID");
const directory = resolve("artifacts/phase5f/checkpoints");
const path = resolve(directory, `pt-${collection}.json`);
type State = { supplier: string; collection: string; queue: string[]; lastSku: string | null; results: Record<string, ReturnType<typeof parsePrestigiousPublicProduct>>; failures: Record<string, string> };
async function fetchPublic(url: string) {
  if (!/^https:\/\/www\.prestigious\.co\.uk\/(product|fabrics)\/[a-z0-9/-]+\/$/.test(url)) throw new Error("SOURCE_URL_DENIED");
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const text = await response.text();
  if (text.length > 3_000_000) throw new Error("PAGE_TOO_LARGE");
  return text;
}
async function main() {
  await mkdir(directory, { recursive: true });
  let state: State;
  try { state = JSON.parse(await readFile(path, "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; state = { supplier: "prestigious-textiles", collection, queue: prestigiousProductLinks(await fetchPublic(`https://www.prestigious.co.uk/fabrics/${collection}/`)), lastSku: null, results: {}, failures: {} }; }
  const pending = state.queue.filter((url) => !state.results[url] && (process.argv.includes("--retry-failures") || !state.failures[url])).slice(0, limit);
  for (const url of pending) {
    try {
      const html = await fetchPublic(url);
      const result = parsePrestigiousPublicProduct(html, url, new Date().toISOString());
      const collision = Object.entries(state.results).find(([key, value]) => key !== url && value.record.supplier_sku === result.record.supplier_sku);
      if (collision) throw new Error("DUPLICATE_SKU_COLLISION");
      state.results[url] = result; state.lastSku = result.record.supplier_sku; delete state.failures[url];
    } catch (error) {
      const message = error instanceof Error ? error.message : "FETCH_FAILED";
      state.failures[url] = /^[A-Z0-9_]+$/.test(message) ? message : "SOURCE_REQUEST_FAILED";
    }
    await writeFile(path + ".tmp", JSON.stringify(state, null, 2), "utf8"); await rename(path + ".tmp", path);
    if ((Object.keys(state.results).length + Object.keys(state.failures).length) % 10 === 0) console.log(JSON.stringify({ collection, found: Object.keys(state.results).length, failed: Object.keys(state.failures).length, lastSku: state.lastSku }));
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log(JSON.stringify({ collection, discovered: state.queue.length, found: Object.keys(state.results).length, failed: Object.keys(state.failures).length, designs: new Set(Object.values(state.results).map((r) => r.record.design_id)).size, images: Object.values(state.results).reduce((sum, r) => sum + r.images.length, 0), remaining: state.queue.filter((url) => !state.results[url] && !state.failures[url]).length }));
}
main().catch((error) => { console.error("PRESTIGIOUS_COLLECTION_FAILED", (error as NodeJS.ErrnoException).code ?? "UNKNOWN"); process.exitCode = 1; });
