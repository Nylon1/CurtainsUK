import { NextResponse } from "next/server";
import { getAdvicePosts } from "@/lib/advice-posts";
import { buildXml, fullImageUrl, fullUrl } from "@/lib/sitemap-utils";

export const dynamic = "force-dynamic";

const redirectedAdviceSlugs = new Set([
  "what-curtain-track-is-best-for-apex-windows",
  "can-you-put-curtains-on-angled-windows",
]);

export async function GET() {
  const posts = await getAdvicePosts();

  const urls = posts
    .filter((post) => !redirectedAdviceSlugs.has(post.slug))
    .map((post) => ({
      loc: fullUrl(`/advice/${post.slug}`),
      lastmod: post.updated_at || post.created_at,
      changefreq: "monthly",
      priority: "0.80",
      images: post.image_url ? [fullImageUrl(post.image_url)] : [],
    }));

  return new NextResponse(buildXml(urls), {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
