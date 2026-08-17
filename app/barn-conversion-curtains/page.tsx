import Link from "next/link";
import RelatedWindowTypes from "@/components/seo/RelatedWindowTypes";

export const metadata = {
  title: "Barn Conversion Curtains | Curtains for Vaulted & Rustic Homes UK",
  description:
    "Specialists in barn conversion curtains for vaulted ceilings, exposed beams, apex glazing and large feature windows. Bespoke design, made-to-measure curtains and expert guidance across the UK.",
};

const faqs = [
  {
    q: "What curtains work best in a barn conversion?",
    a: "Barn conversions often suit fuller, softer curtains that bring warmth and balance into tall or open spaces. The best result depends on the glazing, ceiling height, beams and overall style of the room.",
  },
  {
    q: "Can curtains be fitted in rooms with vaulted ceilings?",
    a: "Yes. Vaulted ceilings and angled walls often need a more specialist curtain approach, but bespoke tracks and made-to-measure curtains can be designed around the architecture.",
  },
  {
    q: "Are curtains a good idea for barn conversions?",
    a: "Yes. Curtains are often one of the best ways to soften large glazed areas, reduce visual harshness, improve privacy and make barn interiors feel warmer and more settled.",
  },
  {
    q: "Do barn conversion curtains help with warmth and privacy?",
    a: "Yes. Depending on the chosen lining and fabric, curtains can improve comfort, reduce glare and increase privacy, especially in large glazed or exposed spaces.",
  },
];

export default function BarnConversionCurtainsPage() {
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Barn Conversion Curtains",
    description:
      "Specialists in curtains for barn conversions, vaulted ceilings, exposed beams and unusual glazed spaces across the UK.",
    areaServed: "United Kingdom",
    provider: {
      "@type": "Organization",
      name: "Apex Curtains",
      url: "https://www.apexcurtains.com",
    },
    serviceType: "Made to measure curtains for barn conversions and vaulted interiors",
    url: "https://www.apexcurtains.com/barn-conversion-curtains",
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
        name: "Barn Conversion Curtains",
        item: "https://www.apexcurtains.com/barn-conversion-curtains",
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
          <span className="text-[#f5d38a]">Barn Conversion Curtains</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
              Character Spaces
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Barn Conversion Curtains for
              <span className="bg-gradient-to-r from-[#f5d38a] via-white to-[#f5d38a] bg-clip-text text-transparent">
                {" "}vaulted & rustic homes
              </span>
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-white/68 sm:text-lg">
              We design bespoke barn conversion curtains for vaulted ceilings, exposed beams,
              apex glazing and large architectural openings that need softness, warmth and proper balance.
            </p>

            <p className="mt-4 max-w-3xl text-base leading-8 text-white/68">
              Barn conversions often combine height, character and dramatic glazing. The right curtains
              do more than cover the glass — they make the room feel complete, warmer and far more resolved.
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
              src="/window-types/barn-conversion.jpeg"
              alt="Barn conversion curtains in a vaulted room with large glazed windows"
              className="h-full min-h-[460px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Best for</div>
            <div className="mt-3 text-xl font-semibold text-white">Vaulted & character spaces</div>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Ideal for converted barns, rustic homes, vaulted rooms and glazed spaces with exposed beams.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Typical direction</div>
            <div className="mt-3 text-xl font-semibold text-white">Full curtains with tailored track planning</div>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Barn spaces often suit fuller curtains, softer textures and a solution built around the room geometry.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">What matters most</div>
            <div className="mt-3 text-xl font-semibold text-white">Warmth, softness, scale</div>
            <p className="mt-3 text-sm leading-7 text-white/68">
              The right curtain scheme should balance the height and glazing while making the room feel warmer and calmer.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-2xl font-semibold text-white">Why barn conversions need a specialist curtain approach</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                Barn conversions are rarely standard rooms. They often combine steep ceiling lines, exposed structural beams,
                large glazed elevations and unusually open layouts. All of that changes how curtains should be planned.
              </p>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                A standard curtain setup can look thin, flat or visually disconnected in a barn space. A more tailored solution
                makes the room feel softer, warmer and much more settled.
              </p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-2xl font-semibold text-white">What good barn conversion curtains should achieve</h2>
              <ul className="mt-5 space-y-4 text-sm leading-8 text-white/72 sm:text-base">
                <li>• Soften hard lines, exposed beams and dramatic glazing</li>
                <li>• Bring warmth into lofty or echo-prone interiors</li>
                <li>• Improve privacy and glare control where glass areas are large</li>
                <li>• Feel sympathetic to the rustic or character-led architecture</li>
                <li>• Make a large open room feel more complete and lived in</li>
              </ul>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-2xl font-semibold text-white">Curtains for vaulted ceilings and apex glazing</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                Many barn conversions include vaulted ceilings or apex-style glazing. These features can look stunning,
                but they often need carefully planned curtains to avoid the room feeling cold or visually hard.
              </p>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                The right curtain scheme can help bridge the gap between architecture and comfort, especially where
                the room has height, exposed materials and strong natural light.
              </p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-2xl font-semibold text-white">Our approach to barn conversion curtains</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                We assess the room shape, the glazing, the height and the interior character before guiding the curtain direction.
                That includes track planning, heading style, lining choice and how much fullness the room really needs.
              </p>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                Some barn conversions suit relaxed, textured curtains in warm tones. Others need a cleaner, more architectural finish.
                The point is to build the curtain solution around the room, not force a generic approach onto it.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]">
              <img
                src="/window-types/barn-conversion.jpeg"
                alt="Barn conversion curtain detail in a vaulted rustic room"
                className="h-[280px] w-full object-cover"
              />
              <div className="p-6">
                <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">Recommended direction</div>
                <div className="mt-3 text-xl font-semibold text-white">
                  Full made-to-measure curtains designed around the ceiling height and glazing
                </div>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  Especially effective where the room needs warmth, visual softness and a more settled finish.
                </p>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#f5d38a]/20 bg-[#f5d38a]/8 p-7">
              <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">
                Need a recommendation?
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-white">
                Tell us about your barn conversion
              </h2>
              <p className="mt-4 text-sm leading-8 text-white/78 sm:text-base">
                Upload a photo and we’ll help guide the most suitable curtain direction for your room, glazing and style.
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
                  href="/large-window-curtains"
                  className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 transition hover:border-[#f5d38a]/25 hover:text-[#f5d38a]"
                >
                  Large Window Curtains
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
            Popular barn conversion curtain directions
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold text-white">Relaxed textured curtains</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">
              A strong fit for rustic interiors where softness, warmth and natural texture matter most.
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold text-white">Tailored architectural finish</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Best where the barn conversion has a cleaner, more contemporary interior direction.
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold text-white">Thermal or blackout lining</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Useful where comfort, temperature control or privacy need to be stronger.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-7 sm:p-8">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">Frequently asked questions</div>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Barn conversion curtain FAQs
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
      <RelatedWindowTypes currentHref="/barn-conversion-curtains" />
    </main>
  );
}