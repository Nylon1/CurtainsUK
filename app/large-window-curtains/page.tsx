import Link from "next/link";
import RelatedWindowTypes from "@/components/seo/RelatedWindowTypes";

export const metadata = {
  title: "Curtains for Large Windows | Floor to Ceiling & Wide Window Curtains UK",
  description:
    "Specialists in curtains for large windows, floor-to-ceiling glazing, wide patio doors and expansive glass walls. Bespoke design, made-to-measure curtains and expert guidance across the UK.",
};

const faqs = [
  {
    q: "What curtains work best for large windows?",
    a: "Large windows often work best with made-to-measure curtains designed around the width, drop and overall architecture of the room. Popular choices include wave pleat curtains, pinch pleat curtains and ceiling-fixed track systems.",
  },
  {
    q: "Are curtains a good idea for floor-to-ceiling windows?",
    a: "Yes. Curtains are often one of the best ways to soften floor-to-ceiling glazing, improve privacy, reduce glare and make a room feel more balanced and comfortable.",
  },
  {
    q: "Can curtains be fitted across very wide windows or patio doors?",
    a: "Yes. Wide windows and large patio doors usually need a more carefully planned system, but bespoke tracks and made-to-measure curtains can be designed for both practical use and a premium visual finish.",
  },
  {
    q: "Do large window curtains help with warmth and glare?",
    a: "Yes. Depending on the fabric and lining, curtains can help reduce glare, improve privacy and make wide glazed spaces feel warmer and less exposed.",
  },
];

export default function LargeWindowCurtainsPage() {
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Large Window Curtains",
    description:
      "Specialists in curtains for large windows, floor-to-ceiling glazing and wide architectural openings across the UK.",
    areaServed: "United Kingdom",
    provider: {
      "@type": "Organization",
      name: "Apex Curtains",
      url: "https://www.apexcurtains.com",
    },
    serviceType: "Made to measure curtains for large windows and wide glazed spaces",
    url: "https://www.apexcurtains.com/large-window-curtains",
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.apexcurtains.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Window Types",
        item: "https://www.apexcurtains.com/window-types",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Large Window Curtains",
        item: "https://www.apexcurtains.com/large-window-curtains",
      },
    ],
  };

  return (
    <main className="min-h-screen overflow-hidden bg-apex-navy-900 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[8%] top-[8%] h-[280px] w-[280px] rounded-full bg-[#f5d38a]/10 blur-[130px]" />
        <div className="absolute right-[10%] top-[18%] h-[220px] w-[220px] rounded-full bg-sky-400/8 blur-[130px]" />
        <div className="absolute bottom-[8%] left-[35%] h-[220px] w-[220px] rounded-full bg-[#f5d38a]/8 blur-[130px]" />
      </div>

      <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-sm">
          <Link href="/" className="text-white/45 transition hover:text-white">
            Home
          </Link>
          <span className="text-white/25">/</span>
          <Link href="/window-types" className="text-white/45 transition hover:text-white">
            Window Types
          </Link>
          <span className="text-white/25">/</span>
          <span className="text-[#f5d38a]">Large Window Curtains</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
              Grand Glazing
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Curtains for
              <span className="bg-gradient-to-r from-[#f5d38a] via-white to-[#f5d38a] bg-clip-text text-transparent">
                {" "}large windows
              </span>
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-white/68 sm:text-lg">
              We design bespoke curtains for large windows, floor-to-ceiling glazing,
              wide patio doors and expansive glass walls that need softness, proportion and a more complete finish.
            </p>

            <p className="mt-4 max-w-3xl text-base leading-8 text-white/68">
              Large windows can look stunning, but they also need careful curtain planning.
              The right solution should enhance the room, control the light and make the glazing feel elegant rather than overwhelming.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex flex-col items-start">
                <Link
                  href="/start-designing"
                  className="inline-flex items-center gap-2 rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black transition duration-300 hover:bg-[#e6c476]"
                >
                  Start Your Curtain Journey
                </Link>
                <span className="mt-2 text-xs text-white/50">
                  Takes less than a minute • No obligation
                </span>
              </div>

              <Link
                href="/arlo-curtain-advisor"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white transition duration-300 hover:bg-white/10"
              >
                Ask Arlo First
              </Link>

              <a
                href="tel:08007720367"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white transition duration-300 hover:bg-white/10"
              >
                0800 772 0367
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] shadow-[0_30px_100px_rgba(0,0,0,0.32)]">
            <img
              src="/window-types/large-window.jpeg"
              alt="Large window curtains fitted across a wide glazed opening"
              className="h-full min-h-[460px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Best for</div>
            <div className="mt-3 text-xl font-semibold text-white">Wide glazing & patio doors</div>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Ideal for large windows, sliding doors, wide glazed openings and open-plan rooms.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Typical direction</div>
            <div className="mt-3 text-xl font-semibold text-white">Wave or pinch pleat on tailored track</div>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Large glazed spaces usually need a system that feels balanced, smooth and visually premium across the width.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">What matters most</div>
            <div className="mt-3 text-xl font-semibold text-white">Flow, scale, control</div>
            <p className="mt-3 text-sm leading-7 text-white/68">
              The curtain scheme needs to feel proportional to the glazing and help the room feel softer and more resolved.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-2xl font-semibold text-white">Why large windows need a specialist curtain approach</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                Large windows create light, openness and impact, but they also introduce scale problems.
                Without the right curtain treatment, a room can feel exposed, cold or visually unbalanced.
              </p>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                A standard off-the-shelf curtain solution rarely feels good across a wide glazed opening.
                The width, drop and visual weight all need proper planning if the result is going to feel elegant.
              </p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-2xl font-semibold text-white">Curtains for floor-to-ceiling windows</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                Floor-to-ceiling glazing often needs curtains that can soften the height and bring a more finished feel into the room.
                This is especially important where the glass dominates the architecture.
              </p>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                The right curtain scheme should support the scale of the room, improve privacy and help the glazing feel like part of a balanced interior rather than a hard architectural edge.
              </p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-2xl font-semibold text-white">What good large window curtains should achieve</h2>
              <ul className="mt-5 space-y-4 text-sm leading-8 text-white/72 sm:text-base">
                <li>• Bring softness and flow across wide glazed openings</li>
                <li>• Improve privacy without making the room feel heavy</li>
                <li>• Reduce glare and help with comfort where glazing is extensive</li>
                <li>• Feel proportionate to the width and height of the room</li>
                <li>• Create a premium finish rather than a flat or underdressed look</li>
              </ul>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-2xl font-semibold text-white">Our approach to curtains for large windows</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                We assess the width of the glazing, the height of the room and the overall look you want to achieve.
                Then we guide the track choice, heading style, fullness and lining based on what will actually suit the space.
              </p>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                Some large windows suit a cleaner wave pleat direction. Others need fuller pinch pleat curtains for a richer finish.
                The aim is always to make the glazing feel intentional, elegant and properly dressed.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]">
              <img
                src="/window-types/large-window.jpeg"
                alt="Large window curtain detail across a wide glazed wall"
                className="h-[280px] w-full object-cover"
              />
              <div className="p-6">
                <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">Recommended direction</div>
                <div className="mt-3 text-xl font-semibold text-white">
                  Made-to-measure curtains with the right fullness and track system for the width
                </div>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  Especially effective where the glazing needs softness, elegance and better visual balance.
                </p>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#f5d38a]/20 bg-[#f5d38a]/8 p-7">
              <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">
                Need a recommendation?
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-white">
                Tell us about your large window
              </h2>
              <p className="mt-4 text-sm leading-8 text-white/78 sm:text-base">
                Upload a photo and we’ll help guide the most suitable curtain direction for your glazing, room and style.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/start-designing"
                  className="inline-flex items-center rounded-full bg-[#f5d38a] px-5 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
                >
                  Start Your Curtain Journey
                </Link>

                <Link
                  href="/arlo-curtain-advisor"
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white transition hover:bg-white/10"
                >
                  Ask Arlo
                </Link>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                Explore related window types
              </div>

              <div className="mt-5 grid gap-3">
                <Link
                  href="/apex-curtains"
                  className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 transition hover:border-[#f5d38a]/25 hover:text-[#f5d38a]"
                >
                  Apex Curtains
                </Link>
                <Link
                  href="/gable-end-curtains"
                  className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 transition hover:border-[#f5d38a]/25 hover:text-[#f5d38a]"
                >
                  Gable End Curtains
                </Link>
                <Link
                  href="/triangular-window-curtains"
                  className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 transition hover:border-[#f5d38a]/25 hover:text-[#f5d38a]"
                >
                  Triangular Window Curtains
                </Link>
                <Link
                  href="/barn-conversion-curtains"
                  className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 transition hover:border-[#f5d38a]/25 hover:text-[#f5d38a]"
                >
                  Barn Conversion Curtains
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">Style directions</div>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Popular curtain directions for large windows
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold text-white">Wave pleat flow</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Ideal for cleaner, more contemporary spaces where the glazing needs a smooth, elegant finish.
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold text-white">Pinch pleat richness</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">
              A stronger option where the room needs more softness, visual fullness and decorative presence.
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold text-white">Privacy or blackout lining</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Useful where glare, comfort or privacy need to be stronger across a wide glazed elevation.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-7 sm:p-8">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">Frequently asked questions</div>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Large window curtain FAQs
            </h2>
          </div>

          <div className="mt-8 space-y-4">
            {faqs.map((item) => (
              <div key={item.q} className="rounded-[22px] border border-white/10 bg-black/20 p-5">
                <h3 className="text-lg font-medium text-white">{item.q}</h3>
                <p className="mt-3 text-sm leading-8 text-white/70 sm:text-base">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <RelatedWindowTypes currentHref="/large-window-curtains" />
    </main>
  );
}