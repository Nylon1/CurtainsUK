import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { validateMediaCandidate, prepareSupplierImage, isShopifyCdnUrl, sourceImageMatchesSku } from "../supplier-media";
import { importSupplierMediaBatch, type MediaCheckpoint } from "../media-batch";
import { retailLaunchBlockers, validTaxonomy } from "../retail";
import { normalizePrestigiousFormationRows } from "../prestigious";

const candidate = { supplier: "sanderson-design-group", supplierSku: "TEST-SKU", fabricId: "sdg-test", imageType: "MAIN" as const, sourceReference: "sdg-product:TEST-SKU", rightsState: "APPROVED" as const, mappingState: "VERIFIED" as const };
test("media requires rights and stable mapping and rejects authentication-bearing provenance", () => {
  assert.doesNotThrow(() => validateMediaCandidate(candidate));
  assert.throws(() => validateMediaCandidate({ ...candidate, rightsState: "PENDING" }), /APPROVAL/);
  assert.throws(() => validateMediaCandidate({ ...candidate, mappingState: "UNRESOLVED" }), /APPROVAL/);
  assert.throws(() => validateMediaCandidate({ ...candidate, sourceReference: "https://portal.invalid/image?token=secret" }), /UNSAFE/);
  assert.equal(isShopifyCdnUrl("https://cdn.shopify.com/s/files/fabric.jpg"), true);
  assert.equal(isShopifyCdnUrl("https://cdn.shopify.com.evil.invalid/f.jpg"), false);
});
test("media strips metadata and rejects tiny images", async () => {
  const tiny = await sharp({ create: { width: 30, height: 30, channels: 3, background: "red" } }).png().toBuffer();
  await assert.rejects(prepareSupplierImage(tiny), /QUALITY/);
  const source = await sharp({ create: { width: 500, height: 500, channels: 3, background: "green" } }).withMetadata({ exif: { IFD0: { Artist: "private metadata" } } }).jpeg().toBuffer();
  const result = await prepareSupplierImage(source);
  assert.equal((await sharp(result.bytes).metadata()).exif, undefined);
  assert.equal(result.contentHash.length, 64);
});
test("interrupted upload resumes cached content without fetching again; credentials never enter failures", async () => {
  const source = await sharp({ create: { width: 500, height: 500, channels: 3, background: "blue" } }).png().toBuffer();
  let checkpoint: MediaCheckpoint | null = null, downloads = 0, attempts = 0;
  let cached: Awaited<ReturnType<typeof prepareSupplierImage>>;
  const ports = {
    checkpoint: async () => checkpoint,
    saveCheckpoint: async (value: MediaCheckpoint) => { checkpoint = value; },
    download: async () => { downloads++; return source; },
    cacheImage: async (image: Awaited<ReturnType<typeof prepareSupplierImage>>) => { cached = image; },
    cachedImage: async () => cached,
    existingAsset: async () => null,
    upload: async () => { if (attempts++ === 0) throw new Error("https://portal.invalid/?token=private"); return { shopifyFileId: "gid://shopify/MediaImage/1", shopifyCdnUrl: "https://cdn.shopify.com/f.jpg" }; },
    saveMapping: async () => {},
  };
  assert.equal((await importSupplierMediaBatch([candidate], ports)).failed, 1);
  assert.doesNotMatch(JSON.stringify(checkpoint), /token|private/);
  assert.equal((await importSupplierMediaBatch([candidate], ports)).uploaded, 1);
  assert.equal(downloads, 1);
  assert.equal((await importSupplierMediaBatch([candidate], ports)).duplicatesAvoided, 1);
});
test("a catalogue record cannot become launch-ready without real approved imagery and validated merchandising", () => {
  const base = normalizePrestigiousFormationRows([{ Title: "Dali", Tags: "Formation", "Option1%20Value": "Mocha", "Variant%20SKU": "4270/147", "Image%20Src": "" }])[0];
  const record = { ...base, supplier_name: "Prestigious Textiles" };
  const profile = { description: "Factual description", description_validated: true, colour_families: ["UNKNOWN"], patterns: ["UNKNOWN"], characters: ["UNKNOWN"], styles: ["UNKNOWN"], rooms: [], window_types: [], headings: [], linings: [] };
  assert.equal(validTaxonomy(profile), true);
  assert.equal(validTaxonomy({ ...profile, patterns: ["acoustic"] }), false);
  assert.ok(retailLaunchBlockers(record, profile, []).includes("APPROVED_MAIN_IMAGE_REQUIRED"));
  assert.ok(retailLaunchBlockers({ ...record, lifecycle_state: "UNKNOWN" }, profile, []).includes("CURRENT_LIFECYCLE_UNCONFIRMED"));
  assert.equal(retailLaunchBlockers(record, profile, [{ imageType: "MAIN", approved: true, width: 800, height: 800, url: "https://cdn.shopify.com/f.jpg" }]).length, 0);
});

test("portal media cannot cross-match adjacent colourway SKUs", () => {
  assert.equal(sourceImageMatchesSku("https://trade.sandersondesigngroup.com/static/media/catalog/product/F/1/F1787_01_314f.jpg", "sanderson-design-group", "F1787/01"), true);
  assert.equal(sourceImageMatchesSku("https://trade.sandersondesigngroup.com/static/media/catalog/product/D/A/DARP222529_hash.jpg", "sanderson-design-group", "DARP222519"), false);
  assert.equal(sourceImageMatchesSku("https://www.prestigious.co.uk/wp-content/uploads/product_images/4270-147%20dali.jpg", "prestigious-textiles", "4270/147"), true);
  assert.equal(sourceImageMatchesSku("https://www.prestigious.co.uk/wp-content/uploads/product_images/4270-147%20dali.jpg", "prestigious-textiles", "4270/217"), false);
});
