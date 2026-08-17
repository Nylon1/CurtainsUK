import Link from "next/link";
import RelatedWindowTypes from "@/components/seo/RelatedWindowTypes";
export const metadata = {
  title: "Apex Curtains | Curtains for Angled & Triangular Windows",
  description:
    "Specialists in apex curtains for angled, triangular and architectural windows. Bespoke design, made-to-measure curtains and expert guidance across the UK.",
};

const faqs = [
  {
    q: "Can curtains be fitted to apex windows?",
    a: "Yes. Apex windows usually need a more specialist approach than standard windows, but bespoke curtain systems can be designed to suit the slope, height and overall architecture of the room.",
  },
  {
    q: "What are apex curtains?",
    a: "Apex curtains are made-to-measure curtain solutions designed for sloped, triangular or sharply angled windows. They are usually paired with a custom track and a tailored heading style.",
  },
  {
    q: "Do apex curtains work for privacy and blackout?",
    a: "Yes. Depending on the room and the shape of the glazing, apex curtains can be designed with privacy linings, blackout linings or thermal interlinings to improve comfort and control light.",
  },
  {
    q: "Are apex curtains suitable for large feature windows?",
    a: "Yes. They are particularly effective in dramatic spaces where the glazing is a major feature. The right curtain scheme helps soften the room while still respecting the architecture.",
  },
];

export default function ApexCurtainsPage() {
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
    name: "Apex Curtains",
    description:
      "Specialists in apex curtains for angled, triangular and architectural windows across the UK.",
    areaServed: "United Kingdom",
    provider: {
      "@type": "Organization",
      name: "Apex Curtains",
      url: "https://www.apexcurtains.com",
    },
    serviceType: "Made to measure curtains for apex and angled windows",
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
        <div className="absolute bottom-[8%] left-[35%] h-[240px] w-[240px] rounded-full bg-[#f5d38a]/8 blur-[130px]" />
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
          <span className="text-[#f5d38a]">Apex Curtains</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
              Specialist Fit
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Apex Curtains for
              <span className="bg-gradient-to-r from-[#f5d38a] via-white to-[#f5d38a] bg-clip-text text-transparent">
                {" "}angled & triangular windows
              </span>
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-white/68 sm:text-lg">
              We design bespoke apex curtains for dramatic roofline glazing, triangular window
              shapes and architectural spaces that need a more considered curtain solution.
            </p>

            <p className="mt-4 max-w-3xl text-base leading-8 text-white/68">
              If your window is too tall, too angled or too unusual for an off-the-shelf answer,
              this is exactly where a specialist approach matters.
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
              src="/window-types/apex-hero.jpg"
              alt="Apex curtains fitted to a large triangular apex window"
              className="h-full min-h-[460px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Best for</div>
            <div className="mt-3 text-xl font-semibold text-white">Apex & vaulted spaces</div>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Ideal for sloped tops, tall glazing, dramatic gable shapes and triangular architectural windows.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Typical direction</div>
            <div className="mt-3 text-xl font-semibold text-white">Custom track + lined drapery</div>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Most apex curtain schemes work best with a custom track and a heading style chosen around the room.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">What matters most</div>
            <div className="mt-3 text-xl font-semibold text-white">Proportion, softness, control</div>
            <p className="mt-3 text-sm leading-7 text-white/68">
              The right curtain scheme should soften the glazing, frame the architecture and feel balanced in the room.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <h2 className="text-2xl font-semibold text-white">Why apex windows need a specialist solution</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                Apex windows are one of the hardest glazing shapes to dress properly. The slope,
                the height and the visual drama of the glass all change how curtains should be designed.
              </p>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                A standard curtain approach often feels wrong on these windows. The proportions can
                feel off, the track can look awkward and the room can lose the elegance it should have.
              </p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <h2 className="text-2xl font-semibold text-white">What a good apex curtain scheme should do</h2>
              <ul className="mt-5 space-y-4 text-sm leading-8 text-white/72 sm:text-base">
                <li>• Respect the slope and overall shape of the glazing</li>
                <li>• Bring softness and warmth into a dramatic room</li>
                <li>• Improve privacy, blackout or thermal comfort where needed</li>
                <li>• Feel architectural rather than improvised</li>
                <li>• Turn a difficult window into a genuine feature</li>
              </ul>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <h2 className="text-2xl font-semibold text-white">Our approach to apex curtains</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                We start by understanding the shape, the room and what you want the curtains to achieve.
                From there, we guide the heading style, lining level, track direction and overall look.
              </p>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                Some apex rooms suit calm, tailored wave pleat curtains. Others need more softness,
                more fullness or a more luxurious visual presence. The point is to design around the
                room, not force a one-size-fits-all answer.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <img
                src="/window-types/apex-detail.jpg"
                alt="Detailed apex curtain installation in a luxury room"
                className="h-[280px] w-full object-cover"
              />
              <div className="p-6">
                <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">Recommended direction</div>
                <div className="mt-3 text-xl font-semibold text-white">
                  Custom track with made-to-measure lined curtains
                </div>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  The exact solution depends on the slope, room type and how much structure or softness the space needs.
                </p>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#f5d38a]/20 bg-[#f5d38a]/8 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">
                Need a recommendation?
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-white">
                Tell us about your apex window
              </h2>
              <p className="mt-4 text-sm leading-8 text-white/78 sm:text-base">
                The easiest way to begin is to upload a photo and tell us a little about the room.
                We’ll guide you toward the most suitable curtain direction.
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
            Popular apex curtain directions
          </h2>
          <p className="mt-4 text-sm leading-8 text-white/68 sm:text-base">
            Different apex rooms need different curtain moods. These are some of the most common directions clients choose.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold text-white">Tailored wave pleat</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Best for cleaner, more architectural spaces where you want the room to feel calm and resolved.
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold text-white">Pinch pleat elegance</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">
              A strong choice where more softness, formality and decorative richness is needed.
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold text-white">Blackout & comfort lining</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Particularly useful in bedrooms or spaces where glare, privacy and thermal comfort matter more.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:p-8">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">Frequently asked questions</div>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Apex curtain FAQs
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

      <section className="relative mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <div className="rounded-[36px] border border-[#f5d38a]/15 bg-[#f5d38a]/6 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">
                Ready to move forward?
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                Start with your window and we’ll guide the rest
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-white/72 sm:text-base">
                Upload a photo, tell us a little about your room and we’ll help shape the right apex curtain direction.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/start-designing"
                className="inline-flex items-center rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
              >
                Start Your Curtain Journey
              </Link>

              <Link
                href="/gallery"
                className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white transition hover:bg-white/10"
              >
                View Our Gallery
              </Link>
            </div>
          </div>
        </div>
      </section>
      <RelatedWindowTypes currentHref="/apex-curtains" />
    </main>
  );
}