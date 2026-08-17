import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, Hammer, Ruler, ShieldCheck } from "lucide-react";

const SITE_URL = "https://www.apexcurtains.com";

export const metadata: Metadata = {
  title: { absolute: "About Apex Curtains | Architectural Window Specialists" },
  description:
    "Learn how Apex Curtains approaches apex, triangular, gable-end, angled and unusually large windows through specialist measuring, track planning, curtain design and installation.",
  alternates: {
    canonical: `${SITE_URL}/about-apex-curtains`,
  },
  openGraph: {
    title: "About Apex Curtains | Architectural Window Specialists",
    description:
      "Specialist curtain design, track planning and installation for difficult architectural windows across the UK.",
    url: `${SITE_URL}/about-apex-curtains`,
    siteName: "Apex Curtains",
    type: "website",
  },
};

const expertise = [
  {
    icon: Ruler,
    title: "Measure the architecture",
    text: "A shaped-window project starts with the geometry: widths, drops, apex heights, slopes, fixing positions and how the curtains need to stack and operate.",
  },
  {
    icon: Hammer,
    title: "Plan the track and fixing",
    text: "The curtain is only one part of the system. Track route, support, fixing surface, access and installation height all affect the final result.",
  },
  {
    icon: ShieldCheck,
    title: "Design for the room",
    text: "Privacy, blackout, thermal comfort, voile layering, heading style and fabric weight are considered alongside the window shape and daily use of the room.",
  },
];

export default function Page() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${SITE_URL}/about-apex-curtains#webpage`,
        url: `${SITE_URL}/about-apex-curtains`,
        name: "About Apex Curtains",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}/about-apex-curtains#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "About Apex Curtains",
            item: `${SITE_URL}/about-apex-curtains`,
          },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-apex-navy-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="relative overflow-hidden px-4 pb-20 pt-36 sm:px-6 lg:px-8 lg:pb-28 lg:pt-44">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#d6b56b]/15 blur-[130px]" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">
            About Apex Curtains
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
            Specialist thinking for windows that standard curtain advice does not solve.
          </h1>
          <p className="mt-7 max-w-3xl text-base leading-8 text-white/72 sm:text-lg">
            Apex Curtains focuses on apex, triangular, angled, gable-end, double-height and unusually large glazing. These projects need the curtain, track, fixing position, room use and installation method to work as one system.
          </p>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
          {expertise.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.3)]"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d6b56b]/25 bg-[#d6b56b]/10 text-[#d6b56b]">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-6 text-2xl font-semibold">{item.title}</h2>
                <p className="mt-4 text-sm leading-7 text-white/68">{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-[36px] border border-white/10 bg-white/[0.04] p-7 md:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#d6b56b]">
                How we approach a difficult window
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Start with the problem, then design the solution.
              </h2>
              <p className="mt-5 text-base leading-8 text-white/68">
                We do not begin with a generic curtain style and force it onto the window. We begin with the shape, the practical constraints and what the room needs to achieve.
              </p>
            </div>

            <div className="space-y-4">
              {[
                "Identify the window geometry and usable fixing positions.",
                "Decide how the curtains should open, stack and clear the glazing.",
                "Match the track system to the shape, weight and installation conditions.",
                "Choose curtain construction, heading, lining and layering around the room's needs.",
                "Plan access and installation for tall, awkward or double-height spaces.",
              ].map((point) => (
                <div key={point} className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#d6b56b]" />
                  <p className="text-sm leading-7 text-white/72">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Explore the specialist knowledge behind the service
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/68">
            Our authority pages explain the practical systems behind shaped-window curtains, from track routes and fixing considerations to blackout, privacy and thermal comfort.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { href: "/curtain-tracks", title: "Curtain track systems", text: "How specialist tracks work on apex, angled and tall windows." },
              { href: "/curtain-solutions", title: "Curtain solutions", text: "Blackout, privacy, thermal comfort and voile layering." },
              { href: "/gallery", title: "Project case studies", text: "Completed installations and the window challenges behind them." },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[26px] border border-white/10 bg-white/[0.04] p-6 transition hover:border-[#d6b56b]/35 hover:bg-white/[0.07]"
              >
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">{item.text}</p>
                <span className="mt-5 inline-flex items-center text-sm font-semibold text-[#d6b56b]">
                  Explore
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
