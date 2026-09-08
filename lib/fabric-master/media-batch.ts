import { prepareSupplierImage, validateMediaCandidate, type ImportedMedia, type MediaCandidate } from "./supplier-media";

export interface MediaCheckpoint {
  supplier: string; supplierSku: string; fabricId: string; imageType: string; sourceReference: string;
  state: "MISSING" | "DOWNLOADED" | "UPLOADED" | "FAILED";
  contentHash?: string; width?: number; height?: number; failureReason?: string; checkedAt: string;
}
/** Supplier-neutral seam: portal authentication and URLs never enter saved state. */
export interface MediaBatchPorts {
  checkpoint(candidate: MediaCandidate): Promise<MediaCheckpoint | null>;
  saveCheckpoint(checkpoint: MediaCheckpoint): Promise<void>;
  download(candidate: MediaCandidate): Promise<Uint8Array | null>;
  cacheImage(image: Awaited<ReturnType<typeof prepareSupplierImage>>): Promise<void>;
  cachedImage(hash: string): Promise<Awaited<ReturnType<typeof prepareSupplierImage>>>;
  existingAsset(hash: string): Promise<Pick<ImportedMedia, "shopifyFileId" | "shopifyCdnUrl"> | null>;
  upload(image: Awaited<ReturnType<typeof prepareSupplierImage>>): Promise<Pick<ImportedMedia, "shopifyFileId" | "shopifyCdnUrl">>;
  saveMapping(mapping: ImportedMedia): Promise<void>;
}
export async function importSupplierMediaBatch(candidates: MediaCandidate[], ports: MediaBatchPorts, batchSize = 100) {
  if (!Number.isInteger(batchSize) || batchSize < 100 || batchSize > 250) throw new Error("MEDIA_BATCH_SIZE_INVALID");
  let uploaded = 0, duplicatesAvoided = 0, failed = 0;
  const missing = 0; // Only the complete portal-discovery ledger can establish this.
  for (const candidate of candidates.slice(0, batchSize)) {
    validateMediaCandidate(candidate);
    const prior = await ports.checkpoint(candidate);
    if (prior?.state === "UPLOADED") { duplicatesAvoided++; continue; }
    const checkpoint = { supplier: candidate.supplier, supplierSku: candidate.supplierSku, fabricId: candidate.fabricId, imageType: candidate.imageType, sourceReference: candidate.sourceReference, checkedAt: new Date().toISOString() };
    try {
      let image;
      if (prior?.contentHash) { image = await ports.cachedImage(prior.contentHash); duplicatesAvoided++; }
      else {
        const bytes = await ports.download(candidate);
        // An absent asset at one location is not an exhausted portal search.
        if (!bytes) { failed++; await ports.saveCheckpoint({ ...checkpoint, state: "FAILED", failureReason: "DISCOVERY_INCOMPLETE" }); continue; }
        image = await prepareSupplierImage(bytes);
        await ports.cacheImage(image);
      }
      await ports.saveCheckpoint({ ...checkpoint, state: "DOWNLOADED", contentHash: image.contentHash, width: image.width, height: image.height });
      let asset = await ports.existingAsset(image.contentHash);
      if (asset) duplicatesAvoided++; else { asset = await ports.upload(image); uploaded++; }
      await ports.saveMapping({ ...candidate, ...asset, contentHash: image.contentHash, width: image.width, height: image.height, importedAt: checkpoint.checkedAt });
      await ports.saveCheckpoint({ ...checkpoint, state: "UPLOADED", contentHash: image.contentHash, width: image.width, height: image.height });
    } catch {
      failed++;
      // The adapter may throw messages containing authenticated URLs. Never persist them.
      const saved = await ports.checkpoint(candidate);
      await ports.saveCheckpoint({ ...checkpoint, state: "FAILED", ...(saved?.contentHash ? { contentHash: saved.contentHash, width: saved.width, height: saved.height } : {}), failureReason: "MEDIA_IMPORT_FAILED" });
    }
  }
  return { processed: Math.min(batchSize, candidates.length), uploaded, duplicatesAvoided, failed, missing, remaining: Math.max(0, candidates.length - batchSize) };
}
