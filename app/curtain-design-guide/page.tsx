import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://www.apexcurtains.com";
const canonicalUrl = `${SITE_URL}/curtain-design-guide`;

export const metadata: Metadata = {
  title: { absolute: "Curtain Design Guide | Specify Headings, Linings, Fabrics & Tracks | Apex Curtains" },
  description:
    "Plan a made-to-measure curtain specification from window type and heading through fabric, lining, accessories, track and installation.",
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: "Curtain Design Guide | Apex Curtains",
    description:
      "A practical specification journey for made-to-measure curtains on apex, gable-end, triangular and other difficult windows.",
    url: canonicalUrl,
    siteName: "Apex Curtains",
    type: "website",
  },
};

const steps = [
  {
    number: "01",
    title: "Start with the window",
    text: "The shape, height, fixing surface and available stack space set the boundaries for the whole curtain design.",
    href: "/window-types",
    cta: "Choose your window type",
  },
  {
    number: "02",
    title: "Choose the heading",
    text: "Wave, pinch pleat, pencil pleat and tailored headings change the fullness, structure, movement and finished appearance.",
    href: "/curtain-headings",
    cta: "Compare curtain headings",
  },
  {
    number: "03",
    title: "Choose the fabric",
    text: "Fabric weight, drape, pattern and how the cloth behaves in daylight all affect how the finished curtain looks and moves.",
    href: "/curtain-fabrics",
    cta: "Explore curtain fabrics",
  },
  {
    number: "04",
    title: "Specify the lining",
    text: "Standard lining, blackout, thermal lining and interlining change privacy, light control, weight and the character of the curtain.",
    href: "/curtain-linings",
    cta: "Compare curtain linings",
  },
  {
    number: "05",
    title: "Add finishing details",
    text: "Tiebacks, tieback hooks and other finishing details should support the room and the way the curtains are actually used.",
    href: "/curtain-accessories",
    cta: "View curtain accessories",
  },
  {
    number: "06",
    title: "Match the track",
    text: "The track must suit the route, curtain weight, fixing surface and the way the curtain needs to open and stack.",
    href: "/curtain-tracks",
    cta: "Explore curtain tracks",
  },
  {
    number: "07",
    title: "Plan installation",
    text: "High, angled and double-height windows need fixing and access decisions made before manufacture, not after it.",
    href: "/services/premium-installation",
    cta: "See installation planning",
  },
  {
    number: "08",
    title: "Check real project evidence",
    text: "Use completed projects to see how recorded window types, headings, linings and room requirements have been brought together.",
    href: "/gallery",
    cta: "View real projects",
  },
];

export default function CurtainDesignGuidePage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: "Curtain Design Guide",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
  };

  return (
    <main className="min-h-screen bg-apex-navy-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-32 sm:px-6 lg:px-8 lg:pt-40">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">
          Curtain specification journey
        </p>
        <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight text-[#F4F0E8] sm:text-5xl lg:text-7xl">
          Design the curtain as one complete system
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#C8D1D8]">
          A successful made-to-measure curtain is not just a fabric choice. Window geometry, heading, fabric, lining, accessories, track, fixing and installation all affect one another. This guide connects those decisions in the order they should be considered.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {steps.map((step) => (
            <article key={step.number} className="rounded-[30px] border border-white/10 bg-[#1B405B] p-7">
              <p className="text-sm font-semibold tracking-[0.2em] text-[#d6b56b]">STEP {step.number}</p>
              <h2 className="mt-3 text-2xl font-semibold text-[#F4F0E8]">{step.title}</h2>
              <p className="mt-4 leading-8 text-[#C8D1D8]">{step.text}</p>
              <Link
                href={step.href}
                className="mt-6 inline-flex rounded-full border border-[#d6b56b]/30 bg-[#d6b56b]/10 px-5 py-3 text-sm font-semibold text-[#F4F0E8] transition hover:bg-[#d6b56b]/15"
              >
                {step.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-[34px] border border-[#d6b56b]/25 bg-[#d6b56b]/10 p-7 sm:p-10">
          <h2 className="text-3xl font-semibold text-[#F4F0E8]">Ready to turn the specification into a project?</h2>
          <p className="mt-4 max-w-3xl leading-8 text-[#C8D1D8]">
            Send the window shape, approximate dimensions and a clear photo. We can then discuss the curtain route, heading, lining, track and installation requirements together rather than as isolated choices.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/start-designing" className="rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Start your curtain journey</Link>
            <Link href="/get-curtain-quote" className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold">Get a quote</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
