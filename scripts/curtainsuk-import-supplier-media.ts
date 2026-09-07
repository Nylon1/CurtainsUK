import { execFile } from "node:child_process";
import { promisify, parseEnv } from "node:util";
import { mkdir, readFile, rename, writeFile, open, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { prepareSupplierImage, ShopifyMediaClient, validateMediaCandidate, type ImportedMedia } from "../lib/fabric-master/supplier-media";
import type { parsePrestigiousPublicProduct } from "../lib/fabric-master/prestigious-public";

const arg = (name: string) => process.argv.find((v) => v.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const limit = Number(arg("batch-size") ?? 100);
const collection = arg("collection") ?? "rustic-persian";
if (!Number.isInteger(limit) || limit < 100 || limit > 250 || !/^[a-z0-9-]+$/.test(collection)) throw new Error("BATCH_ARGUMENTS_INVALID");
const root = resolve("artifacts/phase5f/checkpoints");
const mediaRoot = resolve("artifacts/phase5f/media");
type MediaState = { supplier: string; lastSku: string | null; sources: Record<string, { hash: string; width: number; height: number }>; assets: Record<string, { shopifyFileId: string; shopifyCdnUrl: string }>; mappings: Record<string, ImportedMedia>; failures: Record<string, string>; duplicatesAvoided: number };
async function main() {
  await mkdir(root, { recursive: true }); await mkdir(mediaRoot, { recursive: true });
  const lockPath = resolve(root, "media-import.lock");
  const lock = await open(lockPath, "wx");
  try {
    const path = resolve(root, "supplier-media.json");
    let state: MediaState;
    try { state = JSON.parse(await readFile(path, "utf8")); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; state = { supplier: "prestigious-textiles", lastSku: null, sources: {}, assets: {}, mappings: {}, failures: {}, duplicatesAvoided: 0 }; }
    const source = JSON.parse(await readFile(resolve(root, `pt-${collection}.json`), "utf8")) as { results: Record<string, ReturnType<typeof parsePrestigiousPublicProduct>> };
    let client: ShopifyMediaClient | null = null;
    if (process.argv.includes("--upload")) {
      if (arg("confirm-store") !== "carpetup.myshopify.com") throw new Error("MEDIA_STORE_CONFIRMATION_REQUIRED");
      const { stdout } = await promisify(execFile)("shopify", ["app", "env", "show", "--no-color"], { shell: true, timeout: 45_000 });
      const env = parseEnv(stdout);
      if (!env.SHOPIFY_API_KEY || !env.SHOPIFY_API_SECRET) throw new Error("SHOPIFY_MEDIA_AUTH_FAILED");
      const response = await fetch("https://carpetup.myshopify.com/admin/oauth/access_token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: env.SHOPIFY_API_KEY, client_secret: env.SHOPIFY_API_SECRET }), signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error("SHOPIFY_MEDIA_AUTH_FAILED");
      const token = await response.json();
      if (typeof token.access_token !== "string") throw new Error("SHOPIFY_MEDIA_AUTH_FAILED");
      client = new ShopifyMediaClient(token.access_token); await client.verifyAccess();
    }
    const pending = Object.values(source.results).filter((r) => !state.mappings[r.record.fabric_id] && (!state.failures[r.record.fabric_id] || process.argv.includes("--retry-failures"))).slice(0, limit);
    for (const product of pending) {
      const record = product.record;
      try {
        const candidate = { supplier: record.supplier_id, supplierSku: record.supplier_sku, fabricId: record.fabric_id, imageType: "MAIN" as const, sourceReference: `prestigious-product:${record.supplier_sku}`, rightsState: "APPROVED" as const, mappingState: "VERIFIED" as const };
        validateMediaCandidate(candidate);
        if (product.images.length !== 1) throw new Error(product.images.length ? "MAIN_IMAGE_AMBIGUOUS" : "MAIN_IMAGE_MISSING");
        const url = product.images[0];
        if (!/^https:\/\/www\.prestigious\.co\.uk\/wp-content\/uploads\/product_images\//.test(url) || /placeholder|no-image|default-image/i.test(url)) throw new Error("IMAGE_SOURCE_DENIED");
        let known = state.sources[url];
        if (!known) {
          const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(30_000) });
          if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error("IMAGE_DOWNLOAD_FAILED");
          const chunks: Uint8Array[] = []; let size = 0;
          const reader = response.body!.getReader();
          try { for (;;) { const {done, value: chunk} = await reader.read(); if (done) break; size += chunk.length; if (size > 20 * 1024 * 1024) throw new Error("IMAGE_TOO_LARGE"); chunks.push(chunk); } } finally { await reader.cancel(); }
          const image = await prepareSupplierImage(Buffer.concat(chunks));
          known = { hash: image.contentHash, width: image.width, height: image.height };
          await writeFile(resolve(mediaRoot, `${known.hash}.jpg`), image.bytes, { flag: "w" });
          state.sources[url] = known;
        } else state.duplicatesAvoided++;
        const otherMapping = Object.values(state.mappings).find((m) => m.contentHash === known.hash && m.supplierSku !== record.supplier_sku);
        if (otherMapping) throw new Error("CROSS_COLOURWAY_DUPLICATE_REVIEW_REQUIRED");
        if (client) {
          let asset = state.assets[known.hash];
          if (!asset) asset = state.assets[known.hash] = await client.upload({ bytes: await readFile(resolve(mediaRoot, `${known.hash}.jpg`)), width: known.width, height: known.height, contentHash: known.hash });
          else state.duplicatesAvoided++;
          state.mappings[record.fabric_id] = { ...candidate, contentHash: known.hash, width: known.width, height: known.height, importedAt: new Date().toISOString(), ...asset };
        }
        delete state.failures[record.fabric_id];
      } catch (error) {
        const code = error instanceof Error ? error.message : "MEDIA_IMPORT_FAILED";
        state.failures[record.fabric_id] = /^[A-Z0-9_]+$/.test(code) ? code : "MEDIA_IMPORT_FAILED";
      }
      state.lastSku = record.supplier_sku;
      await writeFile(path + ".tmp", JSON.stringify(state, null, 2), "utf8"); await rename(path + ".tmp", path);
      console.log(JSON.stringify({ sku: state.lastSku, downloaded: Object.keys(state.sources).length, uploaded: Object.keys(state.assets).length, mapped: Object.keys(state.mappings).length, failed: Object.keys(state.failures).length }));
      await new Promise((r) => setTimeout(r, 500));
    }
  } finally { await lock.close(); await unlink(lockPath); }
}
main().catch((error) => { const message = error instanceof Error ? error.message : "MEDIA_IMPORT_FAILED"; console.error(/^[A-Z0-9_]+$/.test(message) ? message : "MEDIA_IMPORT_FAILED"); process.exitCode = 1; });
