import { NextResponse } from "next/server";
import { buildXml, baseUrl } from "@/lib/sitemap-utils";

export async function GET() {
  const urls = [
    {
      loc: `${baseUrl}/`,
      changefreq: "weekly",
      priority: "1.0",
      images: [`${baseUrl}/window-types/apex-hero.jpg`],
    },
    { loc: `${baseUrl}/about-apex-curtains`, changefreq: "monthly", priority: "0.80" },
    { loc: `${baseUrl}/services`, changefreq: "monthly", priority: "0.92" },
    { loc: `${baseUrl}/services/measure-consultation`, changefreq: "monthly", priority: "0.88" },
    { loc: `${baseUrl}/services/design-make-curtains`, changefreq: "monthly", priority: "0.88" },
    { loc: `${baseUrl}/services/premium-installation`, changefreq: "monthly", priority: "0.90" },
    { loc: `${baseUrl}/curtain-tracks`, changefreq: "monthly", priority: "0.92" },
    { loc: `${baseUrl}/curtain-solutions`, changefreq: "monthly", priority: "0.90" },
    {
      loc: `${baseUrl}/window-types`,
      changefreq: "weekly",
      priority: "0.95",
      images: [
        `${baseUrl}/window-types/apex-hero.jpg`,
        `${baseUrl}/window-types/triangular.jpeg`,
        `${baseUrl}/window-types/gable-end.jpeg`,
        `${baseUrl}/window-types/barn-conversion.jpeg`,
      ],
    },
    { loc: `${baseUrl}/apex-curtains`, changefreq: "weekly", priority: "0.95" },
    { loc: `${baseUrl}/triangular-window-curtains`, changefreq: "weekly", priority: "0.92" },
    { loc: `${baseUrl}/gable-end-curtains`, changefreq: "weekly", priority: "0.92" },
    { loc: `${baseUrl}/barn-conversion-curtains`, changefreq: "weekly", priority: "0.88" },
    { loc: `${baseUrl}/large-window-curtains`, changefreq: "weekly", priority: "0.88" },
    { loc: `${baseUrl}/apex-blinds`, changefreq: "monthly", priority: "0.70" },
    { loc: `${baseUrl}/gallery`, changefreq: "weekly", priority: "0.95" },
    { loc: `${baseUrl}/advice`, changefreq: "weekly", priority: "0.90" },
    { loc: `${baseUrl}/advice/curtain-consultation-questions`, changefreq: "monthly", priority: "0.75" },
    { loc: `${baseUrl}/advice/curtain-measurements-apex-windows`, changefreq: "monthly", priority: "0.80" },
    { loc: `${baseUrl}/advice/curtain-pricing-apex-windows`, changefreq: "monthly", priority: "0.80" },
    { loc: `${baseUrl}/advice/curtains-discussing-fabrics`, changefreq: "monthly", priority: "0.70" },
    { loc: `${baseUrl}/areas`, changefreq: "weekly", priority: "0.88" },
    { loc: `${baseUrl}/commercial-curtain-track-installation`, changefreq: "monthly", priority: "0.90" },
    { loc: `${baseUrl}/contact`, changefreq: "monthly", priority: "0.90" },
    { loc: `${baseUrl}/start-designing`, changefreq: "weekly", priority: "0.75" },
    { loc: `${baseUrl}/faq`, changefreq: "monthly", priority: "0.65" },
    { loc: `${baseUrl}/reviews`, changefreq: "monthly", priority: "0.70" },
    { loc: `${baseUrl}/get-curtain-quote`, changefreq: "monthly", priority: "0.80" },
    { loc: `${baseUrl}/arlo-curtain-advisor`, changefreq: "weekly", priority: "0.75" },
    { loc: `${baseUrl}/made-in-uk-curtains`, changefreq: "monthly", priority: "0.60" },
    { loc: `${baseUrl}/price-promise`, changefreq: "monthly", priority: "0.60" },
    { loc: `${baseUrl}/press`, changefreq: "monthly", priority: "0.40" },
    { loc: `${baseUrl}/seen-on-tv`, changefreq: "monthly", priority: "0.45" },
  ];

  return new NextResponse(buildXml(urls), {
    headers: { "Content-Type": "application/xml" },
  });
}
