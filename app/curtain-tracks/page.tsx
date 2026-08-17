import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://www.apexcurtains.com";
const canonicalUrl = `${SITE_URL}/curtain-tracks`;

export const metadata: Metadata = {
  title: { absolute: "Curtain Tracks for Apex & Angled Windows | Apex Curtains" },
  description:
    "Expert guide to curtain tracks for apex, angled, triangular, gable-end and tall windows, including track choice, fixing, operation and installation considerations.",
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: "Curtain Tracks for Apex & Angled Windows | Apex Curtains",
    description:
      "How specialist curtain tracks are selected, shaped and installed for difficult architectural windows.",
    url: canonicalUrl,
    siteName: "Apex Curtains",
    type: "website",
  },
};

const questions = [
  {
    q: "What curtain track is best for an apex window?",
    a: "The best track depends on the exact angles, curtain weight, fixing surface and how the curtain needs to operate. For shaped apex windows, a specialist track that can follow the architecture and remain securely fixed is usually required rather than a standard straight domestic track.",
  },
  {
    q: "Can a curtain track follow a sloping ceiling?",
    a: "Yes. A track can be planned to follow a sloping or angled line, but the geometry, fixing points and curtain movement need to be considered together. The track should not simply copy the shape without checking how the curtain will stack, hang and move in daily use.",
  },
  {
    q: "Can apex curtain tracks carry heavy curtains?",
    a: "They can, provided the track, brackets, fixings and substrate are specified for the finished curtain weight. Heavy interlined or blackout curtains place more load on the system, so the structure above the track matters as much as the track itself.",
  },
  {
    q: "Do tall windows need a different track system?",
    a: "Often, yes. Very tall or double-height windows increase curtain weight, operating distance and installation complexity. Track choice must account for safe fixing, smooth movement and how the curtains will be opened and closed once installed.",
  },
];

export default function CurtainTracksPage() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: "Curtain Tracks for Apex & Angled Windows",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${canonicalUrl}#service` },
      },
      {
        "@type": "Service",
        "@id": `${canonicalUrl}#service`,
        name: "Specialist Curtain Track Design and Installation",
        serviceType: "Curtain track systems for apex, angled, triangular, gable-end and tall windows",
        provider: { "@id": `${SITE_URL}/#organization` },
        url: canonicalUrl,
      },
      {
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        mainEntity: questions.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-apex-navy-900 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pt-36">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">Track systems</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
          Curtain tracks for apex, angled and difficult windows
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-white/72">
          Specialist windows usually need more than a standard straight track. The right system has to work with the shape of the glazing, the finished curtain weight, the fixing surface and the way the curtains need to open and stack.
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 sm:px-6 md:grid-cols-2 lg:px-8">
        {[
          ["Apex and triangular windows", "Tracks can be planned around sloping lines and shaped glazing, with the geometry checked against curtain movement and stack position."],
          ["Gable-end glazing", "Large gable spaces often need long runs, strong fixing points and careful decisions about where the curtains finish when open."],
          ["Double-height windows", "Height adds weight, installation difficulty and operating distance, so the whole system must be considered rather than the track alone."],
          ["Heavy blackout or interlined curtains", "Heavier curtain specifications demand stronger track, brackets and fixings, especially on long or angled runs."],
        ].map(([title, text]) => (
          <article key={title} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="mt-4 leading-8 text-white/70">{text}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-[30px] border border-[#d6b56b]/20 bg-[#d6b56b]/8 p-7 md:p-9">
          <h2 className="text-3xl font-semibold">How we approach track specification</h2>
          <p className="mt-4 max-w-4xl leading-8 text-white/72">
            We look at the window shape, ceiling or wall construction, curtain weight, desired heading, lining, opening direction, stack position and installation access. The objective is not just to make a track fit the window, but to make the finished curtain system work reliably in the room.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold">Common curtain-track questions</h2>
        <div className="mt-8 space-y-5">
          {questions.map((item) => (
            <article key={item.q} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
              <h3 className="text-xl font-semibold">{item.q}</h3>
              <p className="mt-3 leading-8 text-white/70">{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/services/premium-installation" className="rounded-full bg-[#d6b56b] px-6 py-3 text-center text-sm font-semibold text-apex-navy-950">Installation service</Link>
          <Link href="/gallery" className="rounded-full border border-white/15 px-6 py-3 text-center text-sm font-semibold">View projects</Link>
          <Link href="/start-designing" className="rounded-full border border-white/15 px-6 py-3 text-center text-sm font-semibold">Start your project</Link>
        </div>
      </section>
    </main>
  );
}
