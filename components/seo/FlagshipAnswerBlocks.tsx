import Link from "next/link";
import DesignDetailLinks from "@/components/seo/DesignDetailLinks";

type Answer = {
  question: string;
  answer: string;
};

type FlagshipAnswerBlocksProps = {
  eyebrow: string;
  title: string;
  intro: string;
  answers: Answer[];
};

export default function FlagshipAnswerBlocks({
  eyebrow,
  title,
  intro,
  answers,
}: FlagshipAnswerBlocksProps) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: answers.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <section className="bg-apex-navy-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />

        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">
              {eyebrow}
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h2>
            <p className="mt-5 text-base leading-8 text-white/70">{intro}</p>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-2">
            {answers.map((item) => (
              <article
                key={item.question}
                className="rounded-[28px] border border-white/10 bg-[#1B405B] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-7"
              >
                <h3 className="text-xl font-semibold text-[#F4F0E8]">
                  {item.question}
                </h3>
                <p className="mt-4 text-sm leading-7 text-[#C8D1D8] sm:text-base sm:leading-8">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/curtain-tracks"
              className="rounded-full border border-[#d6b56b]/30 bg-[#d6b56b]/10 px-5 py-3 text-sm font-medium text-[#F4F0E8] transition hover:bg-[#d6b56b]/15"
            >
              Explore specialist curtain tracks
            </Link>
            <Link
              href="/curtain-solutions"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-[#F4F0E8] transition hover:bg-white/10"
            >
              Compare blackout, thermal & privacy solutions
            </Link>
            <Link
              href="/gallery"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-[#F4F0E8] transition hover:bg-white/10"
            >
              See real projects
            </Link>
          </div>
        </div>
      </section>
      <DesignDetailLinks />
    </>
  );
}
