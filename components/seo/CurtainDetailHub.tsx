import Link from "next/link";

type Item = { title: string; text: string };
type Qa = { question: string; answer: string };

export default function CurtainDetailHub({
  eyebrow,
  title,
  intro,
  items,
  questions,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  items: Item[];
  questions: Qa[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <main className="min-h-screen bg-apex-navy-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-32 sm:px-6 lg:px-8 lg:pt-40">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[#F4F0E8] sm:text-5xl lg:text-7xl">{title}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#C8D1D8]">{intro}</p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-16 sm:px-6 md:grid-cols-2 lg:px-8">
        {items.map((item) => (
          <article key={item.title} className="rounded-[28px] border border-white/10 bg-[#1B405B] p-7">
            <h2 className="text-2xl font-semibold text-[#F4F0E8]">{item.title}</h2>
            <p className="mt-4 leading-8 text-[#C8D1D8]">{item.text}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold text-[#F4F0E8]">Common questions</h2>
        <div className="mt-7 space-y-4">
          {questions.map((item) => (
            <article key={item.question} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
              <h3 className="text-xl font-semibold text-[#F4F0E8]">{item.question}</h3>
              <p className="mt-3 leading-8 text-[#C8D1D8]">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-3">
          <Link href="/services/design-make-curtains" className="rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Design + Make Curtains</Link>
          <Link href="/curtain-headings" className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold">Curtain headings</Link>
          <Link href="/curtain-linings" className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold">Curtain linings</Link>
          <Link href="/curtain-fabrics" className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold">Curtain fabrics</Link>
          <Link href="/curtain-accessories" className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold">Curtain accessories</Link>
        </div>
      </section>
    </main>
  );
}
