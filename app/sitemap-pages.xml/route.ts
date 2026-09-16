import { NextResponse } from "next/server";
import { buildXml, baseUrl } from "@/lib/sitemap-utils";

export async function GET() {
  const urls = [
    { loc: `${baseUrl}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${baseUrl}/configure`, changefreq: "weekly", priority: "0.95" },
    { loc: `${baseUrl}/shop-by-window`, changefreq: "weekly", priority: "0.92" },
    { loc: `${baseUrl}/fabrics`, changefreq: "weekly", priority: "0.92" },
    { loc: `${baseUrl}/samples`, changefreq: "weekly", priority: "0.88" },
    { loc: `${baseUrl}/measure`, changefreq: "monthly", priority: "0.85" },
    { loc: `${baseUrl}/curtain-tracks`, changefreq: "monthly", priority: "0.80" },
    { loc: `${baseUrl}/curtain-linings`, changefreq: "monthly", priority: "0.80" },
    { loc: `${baseUrl}/curtain-headings`, changefreq: "monthly", priority: "0.80" },
    { loc: `${baseUrl}/gallery`, changefreq: "weekly", priority: "0.75" },
    { loc: `${baseUrl}/faq`, changefreq: "monthly", priority: "0.70" },
    { loc: `${baseUrl}/contact`, changefreq: "monthly", priority: "0.70" },
  ];

  return new NextResponse(buildXml(urls), {
    headers: { "Content-Type": "application/xml" },
  });
}
