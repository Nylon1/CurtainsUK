import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileText, Layers3, Ruler, Wrench } from "lucide-react";

export const metadata = {
  title: "Curtain Specifier Resources for Architects & Interior Designers | Apex Curtains",
  description:
    "Professional curtain and track specification resources for architects, interior designers, developers and contractors working with complex architectural glazing.",
  alternates: { canonical: "https://www.apexcurtains.com/professionals/specifier-resources" },
};

const resources = [
  {
    title: "Project information checklist",
    href: "/professionals/specifier-resources/project-information-checklist",
    icon: ClipboardCheck,
    text: "A structured pre-design checklist covering geometry, drawings, fixing interfaces, substrate, operation, stack-back, access and programme.",
  },
  {
    title: "Track specification",
    href: "/curtain-tracks",
    icon: Wrench,
    text: "Track route, bends, fixing position, operation and load-related considerations for apex, triangular, gable-end and large glazing.",
  },
  {
    title: "Curtain construction",
    href: "/curtain-headings",
    icon: Layers3,
    text: "Heading, fullness and finished-drop considerations, with links to fabric, lining and interlining guidance.",
  },
  {
    title: "Measurement & geometry",
    href: "/advice/how-to-measure-for-apex-curtains",
    icon: Ruler,
    text: "Key dimensional information for shaped and sloping apertures before survey and final manufacture.",
  },
  {
    title: "Installation methodology",
    href: "/services/premium-installation",
    icon: FileText,
    text: "Installation planning around fixing conditions, access, working height, sequencing, commissioning and handover.",
  },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">Specifier resources</p>
        <h1 className="mt-5 max-w-5xl text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
          Technical information for the window-treatment package.
        </h1>
        <p className="mt-7 max-w-3xl text-lg leading-8 text-[#C8D1D8]">
          Use these resources to resolve the interface between aperture geometry, curtain track, fixing substrate, textile specification, stack-back, clear opening, access and installation sequencing before the package reaches site.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {resources.map(({ title, href, icon: Icon, text }) => (
            <Link key={href} href={href} className="group rounded-[30px] border border-white/10 bg-[#1B405B] p-7 transition hover:-translate-y-1 hover:border-[#d6b56b]/35">
              <Icon className="h-6 w-6 text-[#d6b56b]" />
              <h2 className="mt-5 text-2xl font-semibold text-[#F4F0E8]">{title}</h2>
              <p className="mt-4 text-sm leading-7 text-[#C8D1D8]">{text}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#d6b56b]">Open resource <ArrowRight className="h-4 w-4" /></span>
            </Link>
          ))}
        </div>

        <section className="mt-12 rounded-[34px] border border-[#d6b56b]/25 bg-[#d6b56b]/10 p-8 sm:p-10">
          <h2 className="text-3xl font-semibold">Need a project-specific review?</h2>
          <p className="mt-4 max-w-3xl leading-8 text-[#C8D1D8]">
            Send the available GA drawings, elevations, sections, window schedule or site photographs. We can identify the missing information needed to progress the curtain and track package without forcing a premature specification.
          </p>
          <Link href="/professionals/project-review" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">
            Start a professional project review <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </main>
  );
}
