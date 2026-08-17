import Link from "next/link";

type FAQ = {
  q: string;
  a: string;
};

type InfoPageTemplateProps = {
  title: string;
  breadcrumb: string;
  intro: string;
  section1Title: string;
  section1Text: string;
  section2Title: string;
  section2Text: string;
  section3Title?: string;
  section3Text?: string;
  faqs?: FAQ[];
};

export default function InfoPageTemplate({
  title,
  breadcrumb,
  intro,
  section1Title,
  section1Text,
  section2Title,
  section2Text,
  section3Title,
  section3Text,
  faqs = [],
}: InfoPageTemplateProps) {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: `${title} | Apex Curtains`,
        description: intro,
      },
      ...(faqs.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: faqs.map((faq) => ({
                "@type": "Question",
                name: faq.q,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.a,
                },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <main className="min-h-screen overflow-hidden bg-apex-navy-900 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[8%] top-[10%] h-[320px] w-[320px] rounded-full bg-[#f5d38a]/10 blur-[120px]" />
        <div className="absolute right-[10%] top-[22%] h-[260px] w-[260px] rounded-full bg-sky-400/10 blur-[120px]" />
        <div className="absolute bottom-[10%] left-[35%] h-[240px] w-[240px] rounded-full bg-[#f5d38a]/8 blur-[120px]" />
      </div>

      <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-sm">
          <Link href="/" className="text-white/45 transition hover:text-white">
            Home
          </Link>
          <span className="text-white/25">/</span>
          <span className="text-[#f5d38a]">{breadcrumb}</span>
        </nav>

        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
            Apex Curtains
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            {title}
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-8 text-white/68 sm:text-lg">
            {intro}
          </p>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <h2 className="text-2xl font-semibold text-white">{section1Title}</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                {section1Text}
              </p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <h2 className="text-2xl font-semibold text-white">{section2Title}</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                {section2Text}
              </p>
            </div>

            {section3Title && section3Text && (
              <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                <h2 className="text-2xl font-semibold text-white">{section3Title}</h2>
                <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                  {section3Text}
                </p>
              </div>
            )}

            {faqs.length > 0 && (
              <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                <h2 className="text-2xl font-semibold text-white">Frequently asked questions</h2>

                <div className="mt-6 space-y-4">
                  {faqs.map((faq) => (
                    <div
                      key={faq.q}
                      className="rounded-[22px] border border-white/10 bg-black/20 p-5"
                    >
                      <div className="text-lg font-medium text-white">{faq.q}</div>
                      <p className="mt-3 text-sm leading-8 text-white/70 sm:text-base">
                        {faq.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-[#f5d38a]/20 bg-[#f5d38a]/8 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">
                Need guidance?
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-white">
                Tell us about your window
              </h2>
              <p className="mt-4 text-sm leading-8 text-white/78 sm:text-base">
                If your window is apex, angled or architecturally unusual, the best next
                step is to send us a photo and let us guide you towards the right curtain
                direction.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/start-designing"
                  className="inline-flex items-center rounded-full bg-[#f5d38a] px-5 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
                >
                  Start Designing
                </Link>

                <Link
                  href="/arlo-curtain-advisor"
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white transition hover:bg-white/10"
                >
                  Ask Arlo
                </Link>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                Related pages
              </div>

              <div className="mt-5 grid gap-3">
                <Link
                  href="/window-types"
                  className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 transition hover:border-[#f5d38a]/25 hover:text-[#f5d38a]"
                >
                  Window Types
                </Link>
                <Link
                  href="/gallery"
                  className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 transition hover:border-[#f5d38a]/25 hover:text-[#f5d38a]"
                >
                  Gallery
                </Link>
                <Link
                  href="/areas"
                  className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 transition hover:border-[#f5d38a]/25 hover:text-[#f5d38a]"
                >
                  Areas We Cover
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}