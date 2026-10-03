export type FabricSitemapEntry = {
  fabricMasterId: string;
  canonicalUrl: string;
};

export const FABRIC_SITEMAP_MAX_URLS = 50_000;
export const FABRIC_SITEMAP_MAX_BYTES = 52_428_800;
const FABRIC_PROFILE_PREFIX = "https://www.curtainsuk.com/pages/fabric/";

export function escapeFabricSitemapXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

export function validateFabricSitemapEntries(entries: readonly FabricSitemapEntry[], expectedCount: number): void {
  if (!Number.isInteger(expectedCount) || expectedCount < 1 || entries.length !== expectedCount) {
    throw new Error("FABRIC_SITEMAP_COUNT_MISMATCH");
  }
  if (entries.length > FABRIC_SITEMAP_MAX_URLS) throw new Error("FABRIC_SITEMAP_URL_LIMIT");
  const ids = new Set<string>();
  const urls = new Set<string>();
  for (const entry of entries) {
    if (!entry.fabricMasterId || ids.has(entry.fabricMasterId)) throw new Error("FABRIC_SITEMAP_DUPLICATE_ID");
    if (!entry.canonicalUrl?.startsWith(FABRIC_PROFILE_PREFIX) || urls.has(entry.canonicalUrl)) {
      throw new Error("FABRIC_SITEMAP_INVALID_OR_DUPLICATE_URL");
    }
    const url = new URL(entry.canonicalUrl);
    if (url.origin !== "https://www.curtainsuk.com" || !url.pathname.startsWith("/pages/fabric/") || url.search || url.hash || url.href !== entry.canonicalUrl) {
      throw new Error("FABRIC_SITEMAP_NONCANONICAL_URL");
    }
    ids.add(entry.fabricMasterId);
    urls.add(entry.canonicalUrl);
  }
}

export function renderFabricSitemapXml(entries: readonly FabricSitemapEntry[], expectedCount: number): string {
  validateFabricSitemapEntries(entries, expectedCount);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((entry) => `  <url><loc>${escapeFabricSitemapXml(entry.canonicalUrl)}</loc></url>`).join("\n")}\n</urlset>\n`;
  if (Buffer.byteLength(xml, "utf8") > FABRIC_SITEMAP_MAX_BYTES) throw new Error("FABRIC_SITEMAP_BYTE_LIMIT");
  return xml;
}
