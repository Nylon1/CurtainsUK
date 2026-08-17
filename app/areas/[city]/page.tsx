import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  GalleryVertical,
  MapPin,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { getCityBySlug } from "@/lib/cities";

const SITE_URL = "https://www.apexcurtains.com";

type PageProps = {
  params: Promise<{ city: string }>;
};

const windowTypes = [
  { label: "Apex windows", href: "/apex-curtains" },
  { label: "Triangular windows", href: "/triangular-window-curtains" },
  { label: "Angled windows", href: "/window-types" },
  { label: "Gable end glazing", href: "/gable-end-curtains" },
  { label: "Large feature windows", href: "/large-window-curtains" },
  { label: "Vaulted room glazing", href: "/window-types" },
];

const faqs = [
  {
    q: "Can you help with apex and triangular windows?",
    a: "Yes. We specialise in apex, angled, triangular and other difficult window shapes that need more than a standard off-the-shelf approach.",
  },
  {
    q: "Do you offer blackout options?",
    a: "Yes. Blackout lining can be specified where darkness and light control matter, although the final result also depends on the window shape, track position and edge gaps.",
  },
  {
    q: "Can you advise if I am not sure what will work?",
    a: "Yes. That is exactly where our specialist service is most useful. You can use Ask Arlo or start by uploading a photo of your window.",
  },
  {
    q: "Do you make curtains to suit the shape of the room?",
    a: "Yes. We tailor our advice and recommendations around the glazing, ceiling line, room use and the style you want to achieve.",
  },
];

export async function generateStaticParams() {
  const { cityPages } = await import("@/lib/cities");
  return cityPages.map((city) => ({ city: city.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params;
  const cityData = getCityBySlug(city);

  if (!cityData) {
    return {
      title: { absolute: "Area Not Found | Apex Curtains" },
      robots: { index: false, follow: true },
    };
  }

  const canonicalUrl = `${SITE_URL}/areas/${cityData.slug}`;
  const title = `Apex Window Curtains in ${cityData.name} | Apex Curtains`;
  const description = `Bespoke curtains for apex, angled, triangular and unusual windows in ${cityData.name}. Specialist advice, elegant solutions and tailored installations.`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Apex Curtains",
      type: "website",
    },
  };
}

export default async function AreaCityPage({ params }: PageProps) {
  const { city } = await params;
  const cityData = getCityBySlug(city);

  if (!cityData) notFound();

  const canonicalUrl = `${SITE_URL}/areas/${cityData.slug}`;
  const localRepresentativeId = `${canonicalUrl}#local-representative`;
  const serviceId = `${canonicalUrl}#service`;
  const webpageId = `${canonicalUrl}#webpage`;
  const breadcrumbId = `${canonicalUrl}#breadcrumb`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": localRepresentativeId,
        name: `Apex Curtains – ${cityData.name}`,
        url: canonicalUrl,
        parentOrganization: { "@id": `${SITE_URL}/#organization` },
        brand: { "@type": "Brand", name: "Apex Curtains" },
        areaServed: { "@type": "City", name: cityData.name },
        address: {
          "@type": "PostalAddress",
          addressLocality: cityData.name,
          addressRegion: cityData.region,
          addressCountry: "GB",
        },
      },
      {
        "@type": "Service",
        "@id": serviceId,
        name: `Apex Window Curtains in ${cityData.name}`,
        serviceType: "Bespoke curtains for apex and unusual windows",
        provider: { "@id": localRepresentativeId },
        areaServed: { "@type": "City", name: cityData.name },
        description: `Specialist curtains for apex, angled, triangular and gable end windows in ${cityData.name}.`,
        url: canonicalUrl,
      },
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: canonicalUrl,
        name: `Apex Window Curtains in ${cityData.name}`,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": serviceId },
        breadcrumb: { "@id": breadcrumbId },
      },
      {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Areas",
            item: `${SITE_URL}/areas`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: cityData.name,
            item: canonicalUrl,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
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

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[8%] top-[8%] h-[320px] w-[320px] rounded-full bg-[#f5d38a]/10 blur-[120px]" />
        <div className="absolute right-[10%] top-[22%] h-[280px] w-[280px] rounded-full bg-sky-400/10 blur-[120px]" />
        <div className="absolute bottom-[8%] left-[35%] h-[260px] w-[260px] rounded-full bg-[#f5d38a]/8 blur-[120px]" />
      </div>

      <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-sm">
            <Link href="/" className="text-white/45 transition hover:text-white">
              Home
            </Link>
            <span className="text-white/25">/</span>
            <Link href="/areas" className="text-white/45 transition hover:text-white">
              Areas
            </Link>
            <span className="text-white/25">/</span>
            <span className="text-[#f5d38a]">{cityData.name}</span>
          </nav>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#f5d38a]">
            <MapPin className="h-4 w-4" />
            {cityData.name}
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
            Apex window curtains in {cityData.name}
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-8 text-white/65 sm:text-lg">
            {cityData.intro}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/arlo-curtain-advisor"
              className="inline-flex items-center gap-2 rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
            >
              Ask Arlo
              <Sparkles className="h-4 w-4" />
            </Link>
            <Link
              href="/start-designing"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white/85 transition hover:bg-white/10"
            >
              Start Designing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <h2 className="text-2xl font-semibold text-white">
                Specialist curtain advice in {cityData.name}
              </h2>
              <p className="mt-4 text-sm leading-8 text-white/72">{cityData.propertyFocus}</p>
              <p className="mt-4 text-sm leading-8 text-white/72">{cityData.styleFocus}</p>
              <p className="mt-4 text-sm leading-8 text-white/72">
                Whether your priority is privacy, blackout, warmth or a more elegant finish, the curtain specification needs to work with the architecture, track route and daily use of the room.
              </p>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <h2 className="text-2xl font-semibold text-white">
                Window types we can plan for in {cityData.name}
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {windowTypes.map((item) => (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className="rounded-[20px] border border-white/10 bg-black/20 p-4 text-sm text-white/80 transition hover:border-[#f5d38a]/25 hover:text-[#f5d38a]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <h2 className="text-2xl font-semibold text-white">Frequently asked questions</h2>
              <div className="mt-6 space-y-4">
                {faqs.map((faq) => (
                  <article key={faq.q} className="rounded-[22px] border border-white/10 bg-black/20 p-5">
                    <h3 className="text-lg font-medium text-white">{faq.q}</h3>
                    <p className="mt-3 text-sm leading-8 text-white/72">{faq.a}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">
                What the design needs to solve
              </div>
              <ul className="mt-5 space-y-4 text-sm leading-8 text-white/75">
                <li>• Difficult apex or angled geometry</li>
                <li>• Privacy without hiding the architecture</li>
                <li>• Blackout requirements where appropriate</li>
                <li>• Thermal comfort around large areas of glazing</li>
                <li>• Track, stack and installation constraints</li>
              </ul>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">Next step</div>
              <p className="mt-4 text-sm leading-8 text-white/72">
                Start with a clear photo, approximate dimensions and how the room is used. From there you can explore the full curtain specification or send the project details for specialist advice.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/curtain-design-guide"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
                >
                  Build the curtain specification
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/start-designing"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white/85 transition hover:bg-white/10"
                >
                  Start Designing
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/arlo-curtain-advisor"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white/85 transition hover:bg-white/10"
                >
                  <MessageSquare className="h-4 w-4" />
                  Ask Arlo
                </Link>
                <Link
                  href="/gallery"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white/85 transition hover:bg-white/10"
                >
                  <GalleryVertical className="h-4 w-4" />
                  View Gallery
                </Link>
              </div>
            </section>

            <section className="rounded-[30px] border border-[#f5d38a]/20 bg-[#f5d38a]/8 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">
                Service-area relationships
              </div>
              <p className="mt-4 text-sm leading-8 text-white/72">
                Other service-area links are shown below only when they share the same recorded region. We do not label arbitrary cities as nearby when geographical proximity is not encoded in the site data.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
