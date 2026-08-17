import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://www.apexcurtains.com";
const canonicalUrl = `${SITE_URL}/faq`;

export const metadata: Metadata = {
  title: { absolute: "Apex Window Curtain FAQs | Apex Curtains" },
  description:
    "Straight answers about curtains, tracks, blackout, measuring and installation for apex, triangular, gable-end and tall architectural windows.",
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: "Apex Window Curtain FAQs | Apex Curtains",
    description:
      "Practical answers about specialist curtains and tracks for difficult architectural windows.",
    url: canonicalUrl,
    siteName: "Apex Curtains",
    type: "website",
  },
};

const groups = [
  {
    title: "Apex & shaped windows",
    items: [
      {
        q: "Can curtains be fitted to apex windows?",
        a: "Yes. Apex curtains are made to suit sloping, triangular or pointed glazing. The important part is planning the curtain, track route, fixing points and stack position as one system rather than treating the window like a standard rectangle.",
      },
      {
        q: "Can curtains follow a sloping ceiling?",
        a: "Yes, where the geometry and fixing surface allow it. A specialist track can follow an angled line, but the curtain heading, weight and movement also need to be considered so the curtain hangs and operates properly.",
      },
      {
        q: "What is the difference between apex, triangular and gable-end curtains?",
        a: "The terms overlap, but they describe different architectural conditions. Apex curtains usually relate to glazing rising to a peak, triangular windows have sharply angled glazing, and gable-end curtains often deal with much larger or double-height glazed walls. The track and installation approach changes with the scale and geometry.",
      },
    ],
  },
  {
    title: "Tracks & installation",
    items: [
      {
        q: "What curtain track is best for an apex window?",
        a: "There is no single best track for every apex window. The correct system depends on the angles, curtain weight, fixing surface, operating method and where the curtains need to stack when open. Complex windows normally need a specialist track rather than a standard straight domestic track.",
      },
      {
        q: "Can specialist tracks carry blackout or interlined curtains?",
        a: "Yes, provided the track, brackets, fixings and supporting structure are specified for the finished curtain weight. Heavier linings increase the load, which is why the substrate and fixing method matter as much as the track itself.",
      },
      {
        q: "How are very high curtains installed?",
        a: "High installations are planned around safe access, suitable fixing points, curtain weight and the room itself. Access equipment and installation method depend on the building and height, so these details should be considered before manufacture rather than at the end of the project.",
      },
    ],
  },
  {
    title: "Blackout, privacy & comfort",
    items: [
      {
        q: "Can apex curtains be blackout?",
        a: "Yes. Blackout lining can be used, although the final level of darkness also depends on the shape of the window, track position and light gaps around the edges. For bedrooms, these details should be designed into the scheme from the start.",
      },
      {
        q: "Do curtains help with thermal comfort on large glazed windows?",
        a: "Lined and interlined curtains can add a soft insulating layer between the room and large areas of glazing. The practical benefit depends on the fabric, lining, curtain fullness, coverage and how the curtains meet the surrounding surfaces.",
      },
      {
        q: "Can I have voile and main curtains together?",
        a: "Yes. A layered treatment can combine daytime privacy from voile curtains with a heavier main curtain for evening privacy, blackout or thermal comfort. The extra track depth, stacking space and fixing position need to be allowed for during planning.",
      },
    ],
  },
  {
    title: "Measuring, design & cost",
    items: [
      {
        q: "How do you measure an apex window for curtains?",
        a: "Useful measurements include the overall width, peak height, side heights, slope geometry, proposed track line, floor level, fixing surface and available stack space. For complex or very high windows, a professional site measure is normally the safest basis for the final design.",
      },
      {
        q: "How much do apex curtains cost?",
        a: "Cost varies because shaped-window projects combine several variables: window size, fabric quantity, lining, heading, specialist track, access and installation. A reliable quotation therefore needs the window dimensions and project requirements rather than a generic price per metre.",
      },
      {
        q: "Are curtains or blinds better for apex windows?",
        a: "For many large or complex apex windows, curtains are the more flexible option because they can follow the architecture while adding softness, privacy and insulation. Blinds may suit some shapes, but practical limits increase as the glazing becomes taller, wider or more geometrically complex.",
      },
    ],
  },
];

const allQuestions = groups.flatMap((group) => group.items);

export default function FAQPage() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: "Apex Window Curtain FAQs",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        mainEntity: allQuestions.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-apex-navy-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="mx-auto max-w-6xl px-4 pb-14 pt-32 sm:px-6 lg:px-8 lg:pt-40">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">
          Specialist answers
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
          Frequently asked questions about apex and difficult-window curtains
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#C8D1D8]">
          Straight answers about shaped windows, specialist tracks, blackout, measuring and installation. For a deeper explanation, follow the links to our track, solution and window-type guides.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/curtain-tracks" className="rounded-[26px] border border-white/10 bg-[#1B405B] p-6 transition hover:border-[#d6b56b]/35">
            <h2 className="text-xl font-semibold text-[#F4F0E8]">Curtain tracks</h2>
            <p className="mt-3 text-sm leading-7 text-[#C8D1D8]">Track choice, sloping routes, curtain weight and fixing considerations.</p>
          </Link>
          <Link href="/curtain-solutions" className="rounded-[26px] border border-white/10 bg-[#1B405B] p-6 transition hover:border-[#d6b56b]/35">
            <h2 className="text-xl font-semibold text-[#F4F0E8]">Curtain solutions</h2>
            <p className="mt-3 text-sm leading-7 text-[#C8D1D8]">Blackout, privacy, thermal comfort and layered voile solutions.</p>
          </Link>
          <Link href="/window-types" className="rounded-[26px] border border-white/10 bg-[#1B405B] p-6 transition hover:border-[#d6b56b]/35">
            <h2 className="text-xl font-semibold text-[#F4F0E8]">Window types</h2>
            <p className="mt-3 text-sm leading-7 text-[#C8D1D8]">Apex, triangular, gable-end, barn conversion and large-window guidance.</p>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-12 px-4 pb-20 sm:px-6 lg:px-8">
        {groups.map((group) => (
          <div key={group.title}>
            <h2 className="text-3xl font-semibold text-[#F4F0E8]">{group.title}</h2>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {group.items.map((item) => (
                <article key={item.q} className="rounded-[28px] border border-white/10 bg-[#1B405B] p-6 sm:p-7">
                  <h3 className="text-xl font-semibold text-[#F4F0E8]">{item.q}</h3>
                  <p className="mt-4 text-sm leading-7 text-[#C8D1D8] sm:text-base sm:leading-8">{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-[#d6b56b]/25 bg-[#d6b56b]/10 p-7 sm:p-9">
          <h2 className="text-3xl font-semibold">Have a window that does not fit the standard categories?</h2>
          <p className="mt-4 max-w-3xl leading-8 text-[#C8D1D8]">
            Send the shape, approximate dimensions and a clear photo. That gives us a much better basis for discussing the curtain route, track position and installation requirements.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/start-designing" className="rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Start your project</Link>
            <Link href="/gallery" className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold">View real projects</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
