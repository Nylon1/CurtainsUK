const PRESTIGIOUS_PRODUCT_THUMBNAIL_BASE = "https://www.prestigious.co.uk/wp-content/uploads/product_images/thumbs";

function normalizedPathPart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Current authorised public product thumbnail convention observed on the
 * Prestigious collection pages. The generated URL is persisted against the
 * supplier SKU; Dawn never contains supplier-specific image URL logic.
 */
export function officialPrestigiousThumbnailUrl(input: { supplierSku: string; design: string; colour: string }) {
  const sku = input.supplierSku.trim().replace(/[\/\\]/g, "-");
  const filename = `${sku} ${normalizedPathPart(input.design)} ${normalizedPathPart(input.colour)}.jpg`;
  return `${PRESTIGIOUS_PRODUCT_THUMBNAIL_BASE}/${encodeURIComponent(filename).replaceAll("%2F", "-")}`;
}

