import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Ruler, Sparkles, Wrench } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import { STOREFRONT_WINDOW_TYPES, STOREFRONT_WINDOWS_BY_SLUG, formatHeading, formatLining } from "@/lib/storefront/window-catalog";

export function generateStaticParams() {
  return STOREFRONT_WINDOW_TYPES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const windowType = STOREFRONT_WINDOWS_BY_SLUG.get(slug);
  if (!windowType) return {};
  return {
    title: `${windowType.name} Curtains | Made to Measure`,
    description: `${windowType.description} See measurement guidance, suitable headings, linings and the correct price or review journey.`,
    alternates: { canonical: `/shop-by-window/${windowType.slug}` },
  };
}

export default async function WindowTypePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const windowType = STOREFRONT_WINDOWS_BY_SLUG.get(slug);
  if (!windowType) notFound();
  const related = STOREFRONT_WINDOW_TYPES.filter((item) => item.slug !== slug && item.journey === windowType.journey).slice(0, 3);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: windowType.faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
  };
  return (
    <main className="bg-[#f7f3ec] text-[#173c32]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <section className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
        <div className="flex items-center">
          <div className="max-w-xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#996a31]">{windowType.eyebrow}</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">Made-to-measure {windowType.name.toLowerCase()} curtains</h1>
            <p className="mt-5 text-lg leading-8 text-[#587168]">{windowType.description}</p>
            <p className="mt-4 text-sm leading-6 text-[#6d7d77]">Also searched as: {windowType.aliases.join(", ")}.</p>
            <TrackedLink href={`/configure?window=${windowType.slug}`} eventName="configurator_started" eventData={{ window_type: windowType.slug, placement: "window_page" }} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#173c32] px-6 py-3.5 text-sm font-semibold text-white">Start My Curtains <ArrowRight className="h-4 w-4" /></TrackedLink>
          </div>
        </div>
        <div className="relative min-h-[420px] overflow-hidden rounded-[32px]">
          <Image src={windowType.image} alt={`${windowType.name} curtain inspiration`} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
        </div>
      </section>

      <section className="border-y border-[#173c32]/10 bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-5 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
          {[{ icon: Ruler, title: "Measure", text: windowType.measurementGuidance }, { icon: Sparkles, title: "Choose", text: `Suitable headings include ${windowType.headings.map(formatHeading).join(", ")}.` }, { icon: Wrench, title: "Track", text: windowType.trackGuidance }].map(({ icon: Icon, title, text }) => <article key={title} className="rounded-3xl border border-[#173c32]/10 bg-[#f7f3ec] p-6"><Icon className="h-5 w-5 text-[#a36d2d]" /><h2 className="mt-4 text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-[#5a7169]">{text}</p></article>)}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#996a31]">Compatible choices</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">A specification that starts with fit</h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {windowType.headings.map((heading) => <div key={heading} className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm font-medium"><Check className="h-4 w-4 text-[#a36d2d]" />{formatHeading(heading)}</div>)}
            {windowType.linings.map((lining) => <div key={lining} className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm font-medium"><Check className="h-4 w-4 text-[#a36d2d]" />{formatLining(lining)}</div>)}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#996a31]">Common questions</div>
          <div className="mt-4 divide-y divide-[#173c32]/10 rounded-3xl bg-white px-6">
            {windowType.faqs.map((faq) => <details key={faq.question} className="group py-5"><summary className="cursor-pointer list-none pr-6 font-semibold">{faq.question}</summary><p className="mt-3 text-sm leading-6 text-[#5a7169]">{faq.answer}</p></details>)}
          </div>
        </div>
      </section>

      <section className="bg-[#173c32] px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <h2 className="text-3xl font-semibold tracking-[-0.04em]">Related window types</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {related.map((item) => <TrackedLink key={item.slug} href={`/shop-by-window/${item.slug}`} eventName="window_type_selected" eventData={{ window_type: item.slug, placement: "related" }} className="rounded-2xl border border-white/12 bg-white/6 p-5"><div className="text-lg font-semibold">{item.name}</div><p className="mt-2 text-sm leading-6 text-white/65">{item.description}</p></TrackedLink>)}
          </div>
        </div>
      </section>
    </main>
  );
}
