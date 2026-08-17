import Link from "next/link";
import { ArrowRight, Building2, DraftingCompass, Hammer, Palette } from "lucide-react";

export const metadata = {
  title: "Architectural Curtain Specialists for Designers, Architects & Developers | Apex Curtains",
  description:
    "Professional curtain and track specification support for interior designers, architects, developers, housebuilders and fit-out teams working with complex architectural glazing.",
  alternates: { canonical: "https://www.apexcurtains.com/professionals" },
};

const roles = [
  {
    title: "Interior Designers",
    href: "/professionals/interior-designers",
    icon: Palette,
    text: "Window-treatment specification, heading and fullness decisions, face fabric and lining coordination, stack-back planning and installation interface support.",
  },
  {
    title: "Architects",
    href: "/professionals/architects",
    icon: DraftingCompass,
    text: "Early-stage feasibility for apex, triangular, gable-end and double-height glazing, including track route, recess conditions, fixing zones, access and curtain stack.",
  },
  {
    title: "Developers & Housebuilders",
    href: "/professionals/developers-housebuilders",
    icon: Building2,
    text: "Repeatable specification, show-home and plot coordination, programme sequencing, site access, installation planning and handover support.",
  },
  {
    title: "Contractors & Fit-out Teams",
    href: "/professionals/contractors-fit-out",
    icon: Hammer,
    text: "Substrate verification, fixing coordination, track installation, access methodology, sequencing and interface management around specialist curtain systems.",
  },
];

export default function ProfessionalsPage() {
  return (
    <main className="min-h-screen bg-apex-navy-950 text-white">
      <section className="px-4 pb-16 pt-32 sm:px-6 lg:px-8 lg:pt-40">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">Professional & specifier support</p>
          <h1 className="mt-5 max-w-5xl text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Specialist curtain and track solutions for complex architectural glazing.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-[#C8D1D8]">
            Apex Curtains supports project teams where window geometry, curtain weight, stack-back, fixing conditions, track routing or installation access make a standard window-treatment package unsuitable. We coordinate the curtain specification with the architecture rather than treating it as a late-stage decorative add-on.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/professionals/project-review" className="inline-flex items-center gap-2 rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Discuss a project <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/commercial-curtain-track-installation" className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold">Commercial installation</Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2">
          {roles.map(({ title, href, icon: Icon, text }) => (
            <Link key={href} href={href} className="group rounded-[32px] border border-white/10 bg-[#1B405B] p-7 transition hover:-translate-y-1 hover:border-[#d6b56b]/35">
              <Icon className="h-6 w-6 text-[#d6b56b]" />
              <h2 className="mt-5 text-3xl font-semibold text-[#F4F0E8]">{title}</h2>
              <p className="mt-4 leading-8 text-[#C8D1D8]">{text}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#d6b56b]">Professional pathway <ArrowRight className="h-4 w-4" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[34px] border border-white/10 bg-white/[0.04] p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b]">Typical coordination scope</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              "Aperture geometry and finished dimensions",
              "Track type, route, bends and operating method",
              "Ceiling, wall or recess fixing interface",
              "Substrate and fixing-zone suitability",
              "Curtain stack-back and clear-opening requirement",
              "Heading, fullness and finished drop",
              "Face fabric, lining and interlining specification",
              "Curtain weight and track-load implications",
              "Access equipment and installation methodology",
              "Programme sequencing and site readiness",
              "Snagging, commissioning and handover",
              "Project photography and case-study record where agreed",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4 text-sm leading-6 text-[#C8D1D8]">{item}</div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
