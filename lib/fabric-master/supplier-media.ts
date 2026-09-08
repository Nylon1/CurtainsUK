import { createHash } from "node:crypto";
import sharp from "sharp";

export const IMAGE_TYPES = ["MAIN", "SWATCH", "DETAIL", "ROOM", "ADDITIONAL"] as const;
export type SupplierImageType = typeof IMAGE_TYPES[number];
export interface MediaCandidate {
  supplier: string; supplierSku: string; fabricId: string; imageType: SupplierImageType;
  /** Opaque product/SKU reference, never an authenticated URL. */
  sourceReference: string;
  rightsState: "APPROVED" | "PENDING" | "REJECTED";
  mappingState: "VERIFIED" | "UNRESOLVED";
}
export interface ImportedMedia extends MediaCandidate {
  contentHash: string; width: number; height: number; importedAt: string;
  shopifyFileId: string; shopifyCdnUrl: string;
}
export function validateMediaCandidate(candidate: MediaCandidate) {
  if (!IMAGE_TYPES.includes(candidate.imageType) || !candidate.supplier || !candidate.supplierSku || !candidate.fabricId) throw new Error("MEDIA_IDENTITY_REQUIRED");
  if (candidate.rightsState !== "APPROVED" || candidate.mappingState !== "VERIFIED") throw new Error("MEDIA_APPROVAL_REQUIRED");
  if (!/^[a-zA-Z0-9 /_.:-]{1,200}$/.test(candidate.sourceReference) || /https?:|token|cookie|password|authorization/i.test(candidate.sourceReference)) throw new Error("MEDIA_SOURCE_REFERENCE_UNSAFE");
}
export function isShopifyCdnUrl(value: string) {
  try { const u = new URL(value); return u.protocol === "https:" && u.hostname === "cdn.shopify.com" && !u.username && !u.password && !u.search && !u.hash; } catch { return false; }
}
export function sourceImageMatchesSku(url: string, supplier: string, sku: string) {
  try {
    const filename = decodeURIComponent(new URL(url).pathname).split("/").pop() ?? "";
    if (supplier === "prestigious-textiles") return filename.toLowerCase().startsWith(sku.replace("/", "-").toLowerCase() + " ");
    if (supplier === "sanderson-design-group") return filename.toUpperCase().startsWith(sku.replaceAll("/", "_").toUpperCase() + "_");
    return false;
  } catch { return false; }
}
export async function prepareSupplierImage(bytes: Uint8Array) {
  if (bytes.length > 20 * 1024 * 1024 || bytes.length < 100) throw new Error("IMAGE_SIZE_INVALID");
  const metadata = await sharp(bytes, { limitInputPixels: 40_000_000, animated: false }).metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || !metadata.width || !metadata.height || Math.min(metadata.width, metadata.height) < 400) throw new Error("IMAGE_QUALITY_REJECTED");
  // Re-encode without EXIF, XMP, comments or other supplier metadata.
  const image = await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });
  return { bytes: image.data, width: image.info.width, height: image.info.height, contentHash: createHash("sha256").update(image.data).digest("hex") };
}

/** Credentials and staged-upload signatures live only in this instance's memory. */
export class ShopifyMediaClient {
  constructor(private readonly token: string, private readonly fetchImpl: typeof fetch = fetch) {}
  private async query(query: string, variables: Record<string, unknown> = {}) {
    const response = await this.fetchImpl("https://carpetup.myshopify.com/admin/api/2026-04/graphql.json", { method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": this.token }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error("SHOPIFY_MEDIA_REQUEST_FAILED");
    const value = await response.json();
    if (value.errors?.length || !value.data) throw new Error("SHOPIFY_MEDIA_GRAPHQL_FAILED");
    return value.data;
  }
  async verifyAccess() {
    const data = await this.query("{currentAppInstallation{accessScopes{handle}}}");
    if (!data.currentAppInstallation.accessScopes.some((s: { handle: string }) => s.handle === "write_files")) throw new Error("SHOPIFY_FILES_PERMISSION_REQUIRED");
  }
  async upload(image: Awaited<ReturnType<typeof prepareSupplierImage>>) {
    const filename = `cuk-fabric-${image.contentHash}.jpg`;
    // Recovery after a crash between remote creation and local checkpoint.
    const existing = await this.query("query($query:String!){files(first:2,query:$query){nodes{id fileStatus ... on MediaImage{image{url width height}}}}}", { query: `filename:${filename}` });
    let file = existing.files.nodes[0];
    if (!file) {
      const staged = await this.query("mutation($input:[StagedUploadInput!]!){stagedUploadsCreate(input:$input){stagedTargets{url resourceUrl parameters{name value}} userErrors{field message}}}", { input: [{ filename, mimeType: "image/jpeg", resource: "IMAGE", httpMethod: "POST", fileSize: String(image.bytes.length) }] });
      if (staged.stagedUploadsCreate.userErrors.length) throw new Error("SHOPIFY_MEDIA_STAGE_FAILED");
      const target = staged.stagedUploadsCreate.stagedTargets[0];
      const form = new FormData();
      for (const parameter of target.parameters) form.append(parameter.name, parameter.value);
      form.append("file", new Blob([new Uint8Array(image.bytes)], { type: "image/jpeg" }), filename);
      const response = await this.fetchImpl(target.url, { method: "POST", body: form, signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error("SHOPIFY_MEDIA_UPLOAD_FAILED");
      const created = await this.query("mutation($files:[FileCreateInput!]!){fileCreate(files:$files){files{id fileStatus} userErrors{field message}}}", { files: [{ originalSource: target.resourceUrl, contentType: "IMAGE", filename, alt: "CurtainsUK fabric" }] });
      if (created.fileCreate.userErrors.length || !created.fileCreate.files[0]) throw new Error("SHOPIFY_MEDIA_CREATE_FAILED");
      file = created.fileCreate.files[0];
    }
    for (let attempt = 0; attempt < 15; attempt++) {
      const data = await this.query("query($id:ID!){node(id:$id){... on MediaImage{id fileStatus image{url width height}}}}", { id: file.id });
      file = data.node;
      if (file?.fileStatus === "FAILED") throw new Error("SHOPIFY_MEDIA_PROCESSING_FAILED");
      if (file?.fileStatus === "READY" && file.image?.url) {
        const url = new URL(file.image.url); url.search = "";
        if (!isShopifyCdnUrl(url.href)) throw new Error("SHOPIFY_CDN_URL_INVALID");
        return { shopifyFileId: String(file.id), shopifyCdnUrl: url.href };
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error("SHOPIFY_MEDIA_PROCESSING_PENDING");
  }
}
