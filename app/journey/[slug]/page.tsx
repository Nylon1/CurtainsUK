import Link from "next/link";
import { notFound } from "next/navigation";
import { getJourneyStep, journeySteps } from "@/lib/journeySteps";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return journeySteps.map((step) => ({
    slug: step.slug,
  }));
}

export default async function JourneyStepPage({ params }: PageProps) {
  const { slug } = await params;
  const step = getJourneyStep(slug);

  if (!step) notFound();

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${step.title} | Apex Curtain Journey | Apex Curtains`,
    description: step.intro,
    url: `https://www.apexcurtains.com/journey/${step.slug}`,
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
      </div>

      <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-sm">
          <Link href="/" className="text-white/45 transition hover:text-white">
            Home
          </Link>
          <span className="text-white/25">/</span>
          <Link href="/" className="text-white/45 transition hover:text-white">
            Apex Journey
          </Link>
          <span className="text-white/25">/</span>
          <span className="text-[#f5d38a]">{step.title}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
              Step {step.number}
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              {step.title}
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-white/68 sm:text-lg">
              {step.intro}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
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

          <div className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] shadow-[0_30px_100px_rgba(0,0,0,0.32)]">
            <img
              src={step.image}
              alt={step.title}
              className="h-full min-h-[420px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <h2 className="text-2xl font-semibold text-white">Why this stage matters</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                {step.body1}
              </p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <h2 className="text-2xl font-semibold text-white">What we focus on</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                {step.body2}
              </p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <h2 className="text-2xl font-semibold text-white">What the client experiences</h2>
              <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                {step.body3}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-[#f5d38a]/20 bg-[#f5d38a]/8 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">
                Continue the journey
              </div>
              <p className="mt-4 text-sm leading-8 text-white/78 sm:text-base">
                Whether you are at the photo stage or ready to move forward, we can guide the
                window properly and help shape the right curtain direction.
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
                Other stages
              </div>

              <div className="mt-5 grid gap-3">
                {journeySteps
                  .filter((item) => item.slug !== step.slug)
                  .map((item) => (
                    <Link
                      key={item.slug}
                      href={`/journey/${item.slug}`}
                      className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 transition hover:border-[#f5d38a]/25 hover:text-[#f5d38a]"
                    >
                      Step {item.number} — {item.title}
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}