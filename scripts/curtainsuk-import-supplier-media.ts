import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify, parseEnv } from "node:util";
import { mkdir, readFile, rename, writeFile, open, unlink, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { prepareSupplierImage, ShopifyMediaClient, type ImportedMedia } from "../lib/fabric-master/supplier-media";
import { approvedMediaJob, discoveredMediaKey, legacyMediaJob, mediaJobAlreadyMapped, sharedMediaCanReuse, type DiscoveredImage } from "../lib/fabric-master/discovered-media";
import { newDiscoveryCheckpoint, recordDiscoveryObservation, discoverySummary, type RouteObservation, type DiscoveryIdentity } from "../lib/fabric-master/portal-discovery";
import { PORTAL_MAP_VERSION } from "../lib/fabric-master/portal-discovery-maps";
import type { parsePrestigiousPublicProduct } from "../lib/fabric-master/prestigious-public";

const arg = (name: string) => process.argv.find((v) => v.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const limit = Number(arg("batch-size") ?? 100);
const collection = arg("collection") ?? "rustic-persian";
if (!Number.isInteger(limit) || limit < 50 || limit > 250 || !/^[a-z0-9-]+$/.test(collection)) throw new Error("BATCH_ARGUMENTS_INVALID");
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
    const source = JSON.parse(await readFile(arg("source-file") ? resolve(arg("source-file")!) : resolve(root, `pt-${collection}.json`), "utf8")) as { results: Record<string, ReturnType<typeof parsePrestigiousPublicProduct> & { media?: DiscoveredImage[]; discovery?: RouteObservation[]; verifiedPortalProductId?: string }> };
    const mappedBefore = Object.keys(state.mappings).length;
    let completeSkipped = 0;
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
    // The batch limit counts colourways; a completed MAIN does not skip later gallery images.
    const identityFor = (product: typeof source.results[string]): DiscoveryIdentity => ({supplier:product.record.supplier_id,fabricId:product.record.fabric_id,sku:product.record.supplier_sku,brand:product.record.brand_name,design:product.record.design_name,colour:product.record.colour_name,collection:product.record.collection_name,...(product.verifiedPortalProductId ? {verifiedPortalProductId:product.verifiedPortalProductId} : {})});
    const retryFailures = process.argv.includes("--retry-failures");
    const pending = Object.values(source.results).filter(product => {
      if (!product.media?.length) return !state.mappings[product.record.fabric_id] && (!state.failures[product.record.fabric_id] || retryFailures);
      let incomplete = false;
      for (const input of product.media) {
        if (state.failures[discoveredMediaKey(product.record.fabric_id,input)] && !retryFailures) continue;
        try {
          const job = approvedMediaJob(identityFor(product),input);
          if (mediaJobAlreadyMapped(job,Object.values(state.mappings),state.sources[job.url]?.hash)) completeSkipped++;
          else incomplete = true;
        } catch { incomplete = true; } // Persist a sanitised validation failure below.
      }
      return incomplete;
    }).slice(0, limit);
    for (const product of pending) {
      const record = product.record;
      const identity = identityFor(product);
      let discovery = newDiscoveryCheckpoint(identity,PORTAL_MAP_VERSION);
      const discoveryPath = resolve(root, `discovery-${record.fabric_id}.json`);
      try {
        const prior = JSON.parse(await readFile(discoveryPath,"utf8"));
        if (prior.identityKey === discovery.identityKey && prior.mapVersion === discovery.mapVersion) {
          for (const observation of prior.observations) discovery = recordDiscoveryObservation(discovery,observation);
        }
      } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw new Error("DISCOVERY_CHECKPOINT_INVALID"); }
      for (const observation of product.discovery ?? []) discovery = recordDiscoveryObservation(discovery,observation);
      await writeFile(discoveryPath + ".tmp",JSON.stringify(discovery,null,2)); await rename(discoveryPath + ".tmp",discoveryPath);
      const inputs = product.media?.length ? product.media : [null];
      for (const input of inputs) {
      let jobKey = input ? discoveredMediaKey(record.fabric_id,input) : record.fabric_id;
      try {
        const job = input ? approvedMediaJob(identity,input) : legacyMediaJob(identity,product.images);
        jobKey = input ? job.key : record.fabric_id;
        if (mediaJobAlreadyMapped(job,Object.values(state.mappings),state.sources[job.url]?.hash)) continue;
        if (state.failures[jobKey] && !retryFailures) continue;
        const { candidate, url } = job;
        let known = state.sources[url];
        if (!known) {
          let bytes: Buffer;
          if (url.startsWith("local-sha256:")) {
            const rawHash = url.slice("local-sha256:".length);
            const localPath = resolve(mediaRoot,"incoming",rawHash);
            if ((await stat(localPath)).size > 20 * 1024 * 1024) throw new Error("IMAGE_TOO_LARGE");
            bytes = await readFile(localPath);
            if (createHash("sha256").update(bytes).digest("hex") !== rawHash) throw new Error("IMAGE_CONTENT_HASH_MISMATCH");
          } else {
          const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(30_000) });
          if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error("IMAGE_DOWNLOAD_FAILED");
          const chunks: Uint8Array[] = []; let size = 0;
          const reader = response.body!.getReader();
          try { for (;;) { const {done, value: chunk} = await reader.read(); if (done) break; size += chunk.length; if (size > 20 * 1024 * 1024) throw new Error("IMAGE_TOO_LARGE"); chunks.push(chunk); } } finally { await reader.cancel(); }
          bytes = Buffer.concat(chunks);
          }
          const image = await prepareSupplierImage(bytes);
          known = { hash: image.contentHash, width: image.width, height: image.height };
          await writeFile(resolve(mediaRoot, `${known.hash}.jpg`), image.bytes, { flag: "w" });
          state.sources[url] = known;
        } else state.duplicatesAvoided++;
        const conflicting = Object.values(state.mappings).some((m) => m.contentHash === known.hash && m.fabricId !== record.fabric_id && !sharedMediaCanReuse(candidate,m));
        if (conflicting) throw new Error("CROSS_COLOURWAY_DUPLICATE_REVIEW_REQUIRED");
        if (client) {
          let asset = state.assets[known.hash];
          if (!asset) asset = state.assets[known.hash] = await client.upload({ bytes: await readFile(resolve(mediaRoot, `${known.hash}.jpg`)), width: known.width, height: known.height, contentHash: known.hash });
          else state.duplicatesAvoided++;
          state.mappings[jobKey] = { ...candidate, contentHash: known.hash, width: known.width, height: known.height, importedAt: new Date().toISOString(), ...asset };
        }
        delete state.failures[jobKey];
      } catch (error) {
        const code = error instanceof Error ? error.message : "MEDIA_IMPORT_FAILED";
        state.failures[jobKey] = code === "DISCOVERY_INCOMPLETE" ? discoverySummary(discovery).status : /^[A-Z0-9_]+$/.test(code) ? code : "MEDIA_IMPORT_FAILED";
      }
      state.supplier = record.supplier_id;
      state.lastSku = record.supplier_sku;
      await writeFile(path + ".tmp", JSON.stringify(state, null, 2), "utf8"); await rename(path + ".tmp", path);
      console.log(JSON.stringify({ sku: state.lastSku, downloaded: Object.keys(state.sources).length, uploaded: Object.keys(state.assets).length, mapped: Object.keys(state.mappings).length, failed: Object.keys(state.failures).length }));
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    console.log(JSON.stringify({ batchComplete: true, processed: pending.length, alreadyMappedSkipped: completeSkipped, newMappings: Object.keys(state.mappings).length - mappedBefore, totalUploadedAssets: Object.keys(state.assets).length }));
  } finally { await lock.close(); await unlink(lockPath); }
}
main().catch((error) => { const message = error instanceof Error ? error.message : "MEDIA_IMPORT_FAILED"; console.error(/^[A-Z0-9_]+$/.test(message) ? message : "MEDIA_IMPORT_FAILED"); process.exitCode = 1; });
