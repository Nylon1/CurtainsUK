import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { cityPages } from "@/lib/cities";

const SITE_URL = "https://www.apexcurtains.com";
const canonicalUrl = `${SITE_URL}/areas`;

export const metadata: Metadata = {
  title: { absolute: "Areas We Cover | Apex Curtains" },
  description:
    "Explore UK service areas for specialist curtains for apex, angled, triangular, gable-end and unusual architectural windows.",
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: "Areas We Cover | Apex Curtains",
    description:
      "Find Apex Curtains service areas and local specialist guidance for difficult architectural windows across the UK.",
    url: canonicalUrl,
    siteName: "Apex Curtains",
    type: "website",
  },
};

const regionGroups = Array.from(
  cityPages.reduce((groups, city) => {
    const existing = groups.get(city.region) || [];
    existing.push(city);
    groups.set(city.region, existing);
    return groups;
  }, new Map<string, typeof cityPages>())
).sort(([a], [b]) => a.localeCompare(b));

export default function AreasPage() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: "Areas We Cover",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "ItemList",
        "@id": `${canonicalUrl}#areas`,
        itemListElement: cityPages.map((city, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: city.name,
          url: `${SITE_URL}/areas/${city.slug}`,
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen overflow-hidden bg-apex-navy-900 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pt-36">
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm">
          <Link href="/" className="text-white/45 transition hover:text-white">
            Home
          </Link>
          <span className="text-white/25">/</span>
          <span className="text-[#d6b56b]">Areas</span>
        </nav>

        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d6b56b]/25 bg-[#d6b56b]/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#d6b56b]">
            <MapPin className="h-4 w-4" />
            UK service areas
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
            Specialist curtains for difficult windows across the UK
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-8 text-[#C8D1D8] sm:text-lg">
            Our area pages connect local enquiries to the same specialist process used across Apex Curtains: identify the window shape, build the curtain specification, plan the track and installation, then review relevant project evidence where it is actually recorded.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["/window-types", "Start with the window", "Apex, triangular, gable-end, barn conversion and large glazing."],
            ["/curtain-design-guide", "Build the specification", "Heading, fabric, lining, accessories and practical design choices."],
            ["/curtain-tracks", "Plan the track", "Track route, fixing surface, curtain weight and operation."],
            ["/gallery", "See recorded projects", "Use real case studies where the stored project data supports the comparison."],
          ].map(([href, title, text]) => (
            <Link
              key={href}
              href={href}
              className="rounded-[26px] border border-white/10 bg-[#1B405B] p-6 transition hover:-translate-y-0.5 hover:border-[#d6b56b]/35"
            >
              <h2 className="text-xl font-semibold text-[#F4F0E8]">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#C8D1D8]">{text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-12 px-4 pb-24 sm:px-6 lg:px-8">
        {regionGroups.map(([region, cities]) => (
          <div key={region}>
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b56b]">
                  Service region
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-[#F4F0E8]">{region}</h2>
              </div>
              <p className="text-sm text-[#C8D1D8]">
                {cities.length} {cities.length === 1 ? "area" : "areas"}
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/areas/${city.slug}`}
                  className="group rounded-[26px] border border-white/10 bg-white/[0.04] p-6 transition hover:border-[#d6b56b]/35 hover:bg-white/[0.06]"
                >
                  <h3 className="text-2xl font-semibold text-[#F4F0E8]">{city.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#C8D1D8]">{city.seoBlurb}</p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#d6b56b]">
                    View local guidance
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
