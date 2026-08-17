export const baseUrl = "https://www.apexcurtains.com";

export type XmlUrlItem = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
  images?: string[];
};

export function buildXml(urls: XmlUrlItem[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${urls
    .map(
      (url) => `
    <url>
      <loc>${url.loc}</loc>
      ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}
      ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ""}
      ${url.priority ? `<priority>${url.priority}</priority>` : ""}
      ${(url.images || [])
        .map(
          (img) => `
      <image:image>
        <image:loc>${img}</image:loc>
      </image:image>`
        )
        .join("")}
    </url>`
    )
    .join("")}
</urlset>`;
}

export function fullUrl(route: string) {
  return `${baseUrl}${route}`;
}

export function fullImageUrl(imagePath: string) {
  if (!imagePath) return "";
  if (imagePath.startsWith("http")) return imagePath;
  return `${baseUrl}${imagePath}`;
}

export function dedupeByLoc<T extends { loc: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.loc || item.loc.includes("undefined") || seen.has(item.loc)) return false;
    seen.add(item.loc);
    return true;
  });
}
