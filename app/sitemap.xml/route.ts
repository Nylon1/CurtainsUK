import { baseUrl } from "@/lib/sitemap-utils";

export async function GET() {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${baseUrl}/sitemap-pages.xml</loc></sitemap>
  <sitemap><loc>${baseUrl}/sitemap-gallery.xml</loc></sitemap>
  <sitemap><loc>${baseUrl}/sitemap-areas.xml</loc></sitemap>
  <sitemap><loc>${baseUrl}/sitemap-advice.xml</loc></sitemap>
</sitemapindex>`, {
    headers: { "Content-Type": "application/xml" },
  });
}
