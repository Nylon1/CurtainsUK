import Link from "next/link";
import RelatedWindowTypes from "@/components/seo/RelatedWindowTypes";

export const metadata = {
  title: "Triangular Window Curtains | Curtains for Angled Windows",
  description:
    "Specialists in triangular window curtains for angled, pointed and unusual shaped glazing. Bespoke design, made-to-measure curtains and expert guidance across the UK.",
};

const faqs = [
  {
    q: "Can curtains be fitted to triangular windows?",
    a: "Yes. Triangular windows often need a bespoke curtain approach, but with the right planning they can be dressed beautifully and in a way that suits the room.",
  },
  {
    q: "What are triangular window curtains?",
    a: "Triangular window curtains are made-to-measure curtain solutions designed for sharply angled, pointed or unusual shaped windows where standard curtain systems are not suitable.",
  },
  {
    q: "Do triangular window curtains work for privacy and blackout?",
    a: "Yes. Depending on the room and the design direction, triangular window curtains can be made with privacy, blackout or thermal lining options.",
  },
  {
    q: "Are triangular window curtains only for modern homes?",
    a: "No. They can work in both contemporary and traditional spaces. The key is choosing the right curtain style, fabric and overall visual balance for the room.",
  },
];

export default function TriangularWindowCurtainsPage() {
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
    name: "Triangular Window Curtains",
    description:
      "Specialists in triangular window curtains for angled and unusual shaped glazing across the UK.",
    areaServed: "United Kingdom",
    provider: {
      "@type": "Organization",
      name: "Apex Curtains",
      url: "https://www.apexcurtains.com",
    },
    serviceType: "Made to measure curtains for triangular windows",
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
          <span className="text-[#f5d38a]">Triangular Window Curtains</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
              Architectural Fit
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Triangular Window Curtains for
              <span className="bg-gradient-to-r from-[#f5d38a] via-white to-[#f5d38a] bg-clip-text text-transparent">
                {" "}angled glazing
              </span>
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-white/68 sm:text-lg">
              We design triangular window curtains for unusual shaped glazing, pointed architectural windows
              and rooms where standard curtain solutions simply do not work.
            </p>

            <p className="mt-4 max-w-3xl text-base leading-8 text-white/68">
              The right curtain scheme can soften the shape, improve privacy and help the room feel more considered,
              elegant and complete.
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
              src="/window-types/triangular.jpeg"
              alt="Triangular window curtains designed for unusual angled glazing"
              className="h-full min-h-[460px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Best for</div>
            <div className="mt-3 text-xl font-semibold text-white">Pointed & angled windows</div>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Ideal for sharply angled glazing, pointed tops and unusual shaped architectural windows.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Typical direction</div>
            <div className="mt-3 text-xl font-semibold text-white">Tailored track + made-to-measure curtains</div>
            <p className="mt-3 text-sm leading-7 text-white/68">
              The right direction depends on the exact shape, room type and how much softness or control is needed.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">What matters most</div>
            <div className="mt-3 text-xl font-semibold text-white">Shape, balance, elegance</div>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Good triangular window curtains should support the shape rather than make it feel awkward or unresolved.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-2xl font-semibold text-white">Why triangular windows need a specialist curtain solution</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                Triangular windows often look striking in a room, but they are rarely easy to dress. Their shape changes how curtains need
                to hang, stack and frame the glazing.
              </p>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                A standard curtain approach can make the window feel clumsy or unfinished. A more tailored solution helps the shape feel deliberate,
                elegant and integrated into the room.
              </p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-2xl font-semibold text-white">What good triangular window curtains should do</h2>
              <ul className="mt-5 space-y-4 text-sm leading-8 text-white/72 sm:text-base">
                <li>• Respect the pointed or angled shape of the glazing</li>
                <li>• Bring softness to a visually sharp architectural feature</li>
                <li>• Improve privacy, glare control and comfort where needed</li>
                <li>• Feel intentional, not improvised</li>
                <li>• Help the room feel more complete and balanced</li>
              </ul>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-2xl font-semibold text-white">Our approach to triangular window curtains</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                We look at the exact shape, the surrounding walls, the room type and what the curtains need to achieve.
                From there, we guide the curtain style, lining level and overall visual direction.
              </p>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                Some triangular rooms need a calm, tailored direction. Others need more softness, decorative fullness or a stronger luxury feel.
                The aim is always to make the room feel right.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]">
              <img
                src="/window-types/triangular.jpeg"
                alt="Triangular window curtain detail"
                className="h-[280px] w-full object-cover"
              />
              <div className="p-6">
                <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">Recommended direction</div>
                <div className="mt-3 text-xl font-semibold text-white">
                  Made-to-measure curtains designed around the angle and room
                </div>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  Especially effective where unusual glazing needs to feel softer, more elegant and less exposed.
                </p>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#f5d38a]/20 bg-[#f5d38a]/8 p-7">
              <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">
                Need a recommendation?
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-white">
                Tell us about your triangular window
              </h2>
              <p className="mt-4 text-sm leading-8 text-white/78 sm:text-base">
                Upload a photo and let us guide the most suitable curtain direction for your room and glazing shape.
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
            Popular triangular window curtain directions
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold text-white">Architectural calm</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Ideal where you want the curtain scheme to support the shape in a clean and resolved way.
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold text-white">Soft decorative finish</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">
              A stronger option where the room benefits from more softness, folds and luxury presence.
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold text-white">Privacy or blackout lining</h3>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Useful where control of glare, privacy or comfort matters more than a purely decorative treatment.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-7 sm:p-8">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">Frequently asked questions</div>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Triangular window curtain FAQs
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
      <RelatedWindowTypes currentHref="/triangular-window-curtains" />
    </main>
  );
}