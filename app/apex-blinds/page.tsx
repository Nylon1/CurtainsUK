import Link from "next/link";

export const metadata = {
  title: "Apex Blinds vs Curtains | Which Is Better for Apex Windows?",
  description:
    "Compare curtains and blinds for apex, triangular and gable-end windows. See the practical trade-offs around shape, tracks, operation, blackout, servicing and design before choosing a solution.",
  alternates: {
    canonical: "https://www.apexcurtains.com/apex-blinds",
  },
};

const faqItems = [
  {
    question: "Are curtains or blinds better for apex windows?",
    answer:
      "For many difficult apex, triangular and gable-end windows, curtains offer more flexibility around window geometry, fabric, lining, heading, stack-back and future servicing. A shaped blind can still suit some projects, but the right choice depends on the exact window and how the room needs to work.",
  },
  {
    question: "Can apex curtains provide blackout?",
    answer:
      "Blackout lining can substantially reduce incoming light, but the final result depends on the curtain design, track route, overlaps, window geometry and surrounding light gaps. It should be specified for the individual room rather than treated as an automatic guarantee.",
  },
  {
    question: "Do apex curtains need a special track?",
    answer:
      "Often, yes. Architectural windows commonly need a track planned around the angle, fixing surface, curtain weight, desired movement and stack-back. The track and curtain specification should be designed together.",
  },
  {
    question: "Does Apex Curtains still install electric shaped blinds?",
    answer:
      "Electric shaped blinds are not promoted as a standard Apex Curtains service. Our core service is made-to-measure curtains and specialist track systems for difficult architectural glazing.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const comparisonRows = [
  {
    factor: "Architectural shape",
    curtains:
      "Can be planned around angled, triangular, gable-end and very tall glazing using a suitable specialist track route.",
    blinds:
      "Shaped systems can follow complex glazing, but the mechanism and operating method become part of the specification.",
  },
  {
    factor: "Design flexibility",
    curtains:
      "Wide choice of heading, fabric, lining, fullness, layering, tiebacks and stack-back treatment.",
    blinds:
      "Usually a cleaner and more compact visual treatment, with fewer soft-furnishing choices.",
  },
  {
    factor: "Light control",
    curtains:
      "Blackout, privacy and thermal lining options can be specified, with performance depending on the finished design and light gaps.",
    blinds:
      "Can provide direct shading, but shaped edges and system design determine the final level of coverage.",
  },
  {
    factor: "Operation",
    curtains:
      "Can be decorative, regularly operated or designed around how the room is used. The track route is critical.",
    blinds:
      "Manual or motorised operation may be possible depending on the shaped system and access requirements.",
  },
  {
    factor: "Servicing",
    curtains:
      "Curtains, tracks and individual soft-furnishing elements can usually be assessed as separate parts of the installation.",
    blinds:
      "A shaped blind combines fabric and mechanism, so servicing requirements can be more system-specific.",
  },
  {
    factor: "Visual effect",
    curtains:
      "Adds softness, scale and decorative presence to large architectural rooms.",
    blinds:
      "Creates a more minimal treatment where keeping the glazing visually clean is the main priority.",
  },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">
          Apex window comparison guide
        </p>
        <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
          Apex blinds vs curtains: which is better for difficult windows?
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#C8D1D8]">
          For difficult apex, triangular and gable-end glazing, curtains are our preferred solution because they give more flexibility around the window shape, track route, fabric, lining, heading and long-term use of the room. Shaped blinds can still suit some projects, but they are a different technical approach rather than a universally better answer.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/start-designing"
            className="rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950"
          >
            Show us your window
          </Link>
          <Link
            href="/curtain-design-guide"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold"
          >
            Open the design guide
          </Link>
        </div>

        <section className="mt-14">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b]">
              Side-by-side comparison
            </p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Compare the decision factors that actually matter
            </h2>
            <p className="mt-4 leading-8 text-[#C8D1D8]">
              The right answer is not simply “curtain” or “blind”. Architectural glazing needs to be assessed as a whole: shape, scale, access, fixing, movement, light control, stack-back, room use and maintenance all affect the specification.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-[32px] border border-white/10">
            <div className="grid grid-cols-[0.72fr_1.15fr_1.15fr] bg-[#1B405B] px-5 py-4 text-sm font-semibold sm:px-7">
              <div>Decision factor</div>
              <div>Curtains</div>
              <div>Shaped blinds</div>
            </div>
            {comparisonRows.map((row) => (
              <div
                key={row.factor}
                className="grid grid-cols-1 gap-3 border-t border-white/10 bg-white/[0.03] px-5 py-6 sm:grid-cols-[0.72fr_1.15fr_1.15fr] sm:gap-6 sm:px-7"
              >
                <h3 className="font-semibold text-[#F4F0E8]">{row.factor}</h3>
                <p className="leading-7 text-[#C8D1D8]">{row.curtains}</p>
                <p className="leading-7 text-[#C8D1D8]">{row.blinds}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-6 md:grid-cols-2">
          <article className="rounded-[30px] border border-white/10 bg-[#1B405B] p-7 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">
              Why curtains are our core solution
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[#F4F0E8]">
              One specification can solve shape, softness and room performance together
            </h2>
            <p className="mt-4 leading-8 text-[#C8D1D8]">
              On architectural windows, the curtain and track should be planned as one system. That lets the design respond to the slope, the available fixing surface, curtain weight, stack position, heading style and how much light or privacy the room needs.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/curtain-tracks" className="text-sm font-semibold text-[#d6b56b]">
                Curtain track guide →
              </Link>
              <Link href="/curtain-linings" className="text-sm font-semibold text-[#d6b56b]">
                Lining guide →
              </Link>
            </div>
          </article>

          <article className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">
              Our current service position
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Electric shaped blinds are not a standard Apex Curtains service
            </h2>
            <p className="mt-4 leading-8 text-[#C8D1D8]">
              We previously explored electric solutions for shaped glazing. Our current focus is made-to-measure curtains and specialist track systems, where we can guide the full design and installation journey around the architecture of the room.
            </p>
            <p className="mt-4 leading-8 text-[#C8D1D8]">
              If your priority is specifically a shaped blind, the useful first step is still to understand the window geometry and the trade-offs before committing to a system.
            </p>
          </article>
        </section>

        <section className="mt-14 rounded-[32px] border border-[#d6b56b]/25 bg-[#d6b56b]/10 p-7 sm:p-9">
          <h2 className="text-3xl font-semibold">Start with the window, not the product</h2>
          <p className="mt-4 max-w-3xl leading-8 text-[#C8D1D8]">
            A photo and rough dimensions are enough to begin. We can then guide you through the window type, track route, heading, fabric, lining and installation approach before a final specification is agreed.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/start-designing"
              className="rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950"
            >
              Start your curtain journey
            </Link>
            <Link
              href="/gallery"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold"
            >
              View real project case studies
            </Link>
          </div>
        </section>

        <section className="mt-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b]">
            Frequently asked questions
          </p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Questions homeowners ask before choosing
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {faqItems.map((item) => (
              <article
                key={item.question}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6"
              >
                <h3 className="text-xl font-semibold">{item.question}</h3>
                <p className="mt-3 leading-7 text-[#C8D1D8]">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 border-t border-white/10 pt-10">
          <h2 className="text-2xl font-semibold">Continue your research</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/apex-curtains" className="rounded-full border border-white/15 px-5 py-3 text-sm">
              Apex curtains
            </Link>
            <Link href="/gable-end-curtains" className="rounded-full border border-white/15 px-5 py-3 text-sm">
              Gable-end curtains
            </Link>
            <Link href="/triangular-window-curtains" className="rounded-full border border-white/15 px-5 py-3 text-sm">
              Triangular curtains
            </Link>
            <Link href="/curtain-headings" className="rounded-full border border-white/15 px-5 py-3 text-sm">
              Curtain headings
            </Link>
            <Link href="/curtain-fabrics" className="rounded-full border border-white/15 px-5 py-3 text-sm">
              Curtain fabrics
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
