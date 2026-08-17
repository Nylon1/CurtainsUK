import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://www.apexcurtains.com";
const canonicalUrl = `${SITE_URL}/curtain-solutions`;

export const metadata: Metadata = {
  title: { absolute: "Curtain Solutions for Blackout, Thermal & Privacy | Apex Curtains" },
  description:
    "Explore curtain solutions for blackout, thermal comfort, privacy, voile layering and light control on apex, angled, triangular and large windows.",
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: "Curtain Solutions for Blackout, Thermal & Privacy | Apex Curtains",
    description:
      "Practical curtain solutions for architectural windows where privacy, darkness, warmth and light control matter.",
    url: canonicalUrl,
    siteName: "Apex Curtains",
    type: "website",
  },
};

const solutions = [
  {
    title: "Blackout",
    text: "Blackout lining can substantially reduce incoming light, but shaped windows need careful design because light can still enter around edges, angles and track positions. The curtain, lining and installation details all contribute to the final result.",
  },
  {
    title: "Thermal comfort",
    text: "Curtains can help create an additional layer between the room and large areas of glazing. Fabric weight, lining, interlining, fullness and how closely the curtain sits to the window all influence the result.",
  },
  {
    title: "Privacy",
    text: "Privacy can be achieved with full curtains, voiles or layered schemes depending on the room and view. Tall and feature glazing often benefits from a solution that preserves the architecture while controlling visibility.",
  },
  {
    title: "Voile + curtain layering",
    text: "A two-layer arrangement can combine daytime softness and privacy with a heavier main curtain for evening privacy, warmth or blackout. The track spacing and stack positions need to be planned together.",
  },
];

const questions = [
  {
    q: "Can apex window curtains be blackout?",
    a: "Yes. Apex curtains can use blackout lining, but complete darkness depends on the entire installation rather than the lining alone. Light can enter around angled edges, track gaps and curtain joins, so the design needs to account for the window shape and the level of darkness required.",
  },
  {
    q: "Do curtains help insulate large windows?",
    a: "Curtains can add a useful insulating layer in front of large areas of glazing. Heavier fabrics, thermal lining or interlining and generous coverage can improve comfort, although the result depends on the building, glazing and how the curtain is installed.",
  },
  {
    q: "Can you combine voiles and curtains on an apex window?",
    a: "Yes, where the geometry and fixing space allow it. A layered system normally needs separate track positions so the voile and main curtain can operate independently without interfering with each other.",
  },
  {
    q: "Are curtains better than blinds for apex windows?",
    a: "For many large or unusually shaped apex windows, curtains can be more adaptable because they can follow the architecture, soften a large glazed area and offer options for blackout, thermal lining and layered privacy. The right choice still depends on the window and how the room is used.",
  },
];

export default function CurtainSolutionsPage() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: "Curtain Solutions for Blackout, Thermal and Privacy",
        isPartOf: { "@id": `${SITE_URL}/#website` },
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
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">Curtain solutions</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
          Blackout, thermal, privacy and layered curtain solutions
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-white/72">
          Architectural windows can create very different practical needs. Some rooms need darkness, some need privacy, some feel cold beside large glazing, and others need a softer way to control daylight without hiding the architecture.
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 sm:px-6 md:grid-cols-2 lg:px-8">
        {solutions.map((item) => (
          <article key={item.title} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
            <h2 className="text-2xl font-semibold">{item.title}</h2>
            <p className="mt-4 leading-8 text-white/70">{item.text}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-[30px] border border-[#d6b56b]/20 bg-[#d6b56b]/8 p-7 md:p-9">
          <h2 className="text-3xl font-semibold">The solution starts with how the room is used</h2>
          <p className="mt-4 max-w-4xl leading-8 text-white/72">
            A bedroom may prioritise darkness and privacy. A living space may need softness without losing daylight. A large glazed room may need warmth and glare control. We use those practical needs to guide fabric, lining, heading and track decisions rather than treating every difficult window the same way.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold">Common solution questions</h2>
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
          <Link href="/curtain-tracks" className="rounded-full bg-[#d6b56b] px-6 py-3 text-center text-sm font-semibold text-apex-navy-950">Explore track systems</Link>
          <Link href="/apex-curtains" className="rounded-full border border-white/15 px-6 py-3 text-center text-sm font-semibold">Apex curtains</Link>
          <Link href="/start-designing" className="rounded-full border border-white/15 px-6 py-3 text-center text-sm font-semibold">Start your project</Link>
        </div>
      </section>
    </main>
  );
}
