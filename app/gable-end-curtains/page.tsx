import Link from "next/link";
import RelatedWindowTypes from "@/components/seo/RelatedWindowTypes";
export const metadata = {
  title: "Gable End Curtains | Curtains for Tall Feature Windows",
  description:
    "Specialists in gable end curtains for tall glazed spaces, double-height rooms and dramatic feature windows. Bespoke design, made-to-measure curtains and expert guidance across the UK.",
};

const faqs = [
  {
    q: "Can curtains be fitted to gable end windows?",
    a: "Yes. Gable end windows often need a bespoke curtain solution because of their height, scale and unusual shape. With the right track planning and made-to-measure curtains, they can be dressed beautifully.",
  },
  {
    q: "What are gable end curtains?",
    a: "Gable end curtains are curtain systems designed for large glazed feature windows, often found in vaulted rooms, barn conversions and double-height spaces.",
  },
  {
    q: "Do gable end curtains work in very tall rooms?",
    a: "Yes. In fact, they are especially useful in tall spaces where glazing can otherwise feel cold, exposed or visually overwhelming. Curtains help soften the room and bring balance.",
  },
  {
    q: "Can gable end curtains improve privacy and warmth?",
    a: "Yes. Depending on the fabric and lining, gable end curtains can improve privacy, reduce glare and help make large glazed rooms feel warmer and more comfortable.",
  },
];

export default function GableEndCurtainsPage() {
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

  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Gable End Curtains",
    description:
      "Specialists in gable end curtains for tall glazed spaces and feature windows across the UK.",
    areaServed: "United Kingdom",
    provider: {
      "@type": "Organization",
      name: "Apex Curtains",
      url: "https://www.apexcurtains.com",
    },
    serviceType: "Made to measure curtains for gable end windows",
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

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[8%] top-[8%] h-[280px] w-[280px] rounded-full bg-[#f5d38a]/10 blur-[130px]" />
        <div className="absolute right-[10%] top-[18%] h-[220px] w-[220px] rounded-full bg-sky-400/8 blur-[130px]" />
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
          <span className="text-[#f5d38a]">Gable End Curtains</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
              Statement Spaces
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Gable End Curtains for
              <span className="bg-gradient-to-r from-[#f5d38a] via-white to-[#f5d38a] bg-clip-text text-transparent">
                {" "}tall feature windows
              </span>
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-white/68 sm:text-lg">
              We design bespoke gable end curtains for large glazed spaces, vaulted interiors
              and dramatic feature windows that need softness, balance and a more resolved finish.
            </p>

            <p className="mt-4 max-w-3xl text-base leading-8 text-white/68">
              If your room has a large triangular glazed wall, a double-height gable end or a
              striking architectural window, a specialist curtain scheme can transform how the space feels.
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
              src="/window-types/gable-end.jpeg"
              alt="Gable end curtains fitted to a large double-height glazed window"
              className="h-full min-h-[460px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Best for</div>
            <div className="mt-3 text-xl font-semibold text-white">Gable end glazing</div>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Ideal for tall feature windows, vaulted rooms and dramatic open-plan glazed spaces.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Typical direction</div>
            <div className="mt-3 text-xl font-semibold text-white">Custom heavy-duty track</div>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Larger glazed walls often need a more robust, well-planned system and carefully balanced drapery.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">What matters most</div>
            <div className="mt-3 text-xl font-semibold text-white">Scale, warmth, softness</div>
            <p className="mt-3 text-sm leading-7 text-white/68">
              The curtains need to soften the glass without making the room feel heavy or badly proportioned.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-2xl font-semibold text-white">Why gable end windows need a tailored curtain scheme</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                Gable end windows are often among the biggest visual features in a room. They bring in impressive light and scale,
                but they can also make a space feel exposed, cold or visually unfinished if left untreated.
              </p>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                A standard curtain setup rarely feels right here. Tall glazing needs proportion, movement and softness that works with
                the room rather than fighting it.
              </p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-2xl font-semibold text-white">What good gable end curtains should achieve</h2>
              <ul className="mt-5 space-y-4 text-sm leading-8 text-white/72 sm:text-base">
                <li>• Soften large glazed walls without losing the sense of space</li>
                <li>• Bring warmth into high-ceiling or open-plan interiors</li>
                <li>• Improve privacy, glare control and room comfort</li>
                <li>• Feel elegant at full height, not awkward or oversized</li>
                <li>• Support the architecture of the room rather than compete with it</li>
              </ul>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-2xl font-semibold text-white">Our approach to gable end curtains</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                We begin by assessing the scale of the glazing, the room type and how the curtains need to behave visually.
                Then we guide track direction, heading choice, fullness and lining level around the space itself.
              </p>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                Some rooms need a more architectural wave pleat finish. Others suit fuller pinch pleat curtains that bring softness
                and a more luxurious presence into the room.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]">
              <img
                src="/window-types/gable-end.jpeg"
                alt="Gable end curtains in a dramatic glazed room"
                className="h-[280px] w-full object-cover"
              />
              <div className="p-6">
                <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">Recommended direction</div>
                <div className="mt-3 text-xl font-semibold text-white">
                  Made-to-measure curtains on a heavy-duty custom track
                </div>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  Especially effective where the room needs softness, visual scale control and a more complete finish.
                </p>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#f5d38a]/20 bg-[#f5d38a]/8 p-7">
              <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">
                Need a recommendation?
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-white">
                Tell us about your gable end window
              </h2>
              <p className="mt-4 text-sm leading-8 text-white/78 sm:text-base">
                Upload a photo, tell us about the room and we’ll help guide the most suitable curtain direction.
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
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">Style directions</div>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Popular gable end curtain directions
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold text-white">Wave pleat elegance</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">
              A strong choice for cleaner, more contemporary rooms where glazing needs calm structure.
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold text-white">Fuller pinch pleat</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Great for bringing more softness and decorative richness into tall spaces.
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold text-white">Thermal or blackout lining</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Helpful where comfort, privacy and glare control matter more.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-7 sm:p-8">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">Frequently asked questions</div>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Gable end curtain FAQs
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
      <RelatedWindowTypes currentHref="/gable-end-curtains" />
    </main>
  );
}