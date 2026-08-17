import Link from "next/link";
import { ArrowRight, FileText, Phone } from "lucide-react";

export const metadata = {
  title: "Professional Curtain Project Review | Apex Curtains",
  description:
    "Start a professional project review for complex curtain and track requirements. For architects, interior designers, developers, housebuilders, contractors and fit-out teams.",
  alternates: { canonical: "https://www.apexcurtains.com/professionals/project-review" },
};

const briefItems = [
  "Your role: architect, interior designer, developer, housebuilder, contractor or fit-out team",
  "Project location and current project stage",
  "Window type, aperture geometry and approximate dimensions",
  "Number of openings or plots involved",
  "Available drawings, elevations, sections or window schedules",
  "Preferred heading, face fabric, lining or visual intent if already defined",
  "Proposed track position: ceiling, wall or recess",
  "Known fixing substrate or construction build-up at track level",
  "Required operation, stack-back and clear-opening requirements",
  "Access constraints, double-height areas or working-at-height considerations",
  "Target survey, manufacture and installation dates",
];

export default function Page() {
  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">Professional project review</p>
        <h1 className="mt-5 max-w-5xl text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">Give us the geometry, interfaces and programme. We’ll help define the curtain package.</h1>
        <p className="mt-7 max-w-3xl text-lg leading-8 text-[#C8D1D8]">
          A useful first review does not need a finished specification. We can start from drawings, photographs and project constraints, then identify the information still needed to resolve track route, fixing conditions, curtain stack, heading, fabric/lining implications and installation access.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[32px] border border-white/10 bg-[#1B405B] p-7 sm:p-9">
            <div className="flex items-center gap-3 text-[#d6b56b]"><FileText className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[0.2em]">Recommended project brief</span></div>
            <h2 className="mt-5 text-3xl font-semibold text-[#F4F0E8]">Information that makes the first review faster</h2>
            <div className="mt-7 space-y-3">
              {briefItems.map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4 text-sm leading-6 text-[#C8D1D8]">{item}</div>)}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[30px] border border-[#d6b56b]/25 bg-[#d6b56b]/10 p-7">
              <h2 className="text-2xl font-semibold">Discuss the project</h2>
              <p className="mt-4 leading-7 text-[#C8D1D8]">Use the main contact route and identify your professional role and project stage. We can then establish what drawings, dimensions or site information are needed next.</p>
              <Link href="/contact" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#d6b56b] px-5 py-3 text-sm font-semibold text-apex-navy-950">Contact the project team <ArrowRight className="h-4 w-4" /></Link>
              <a href="tel:08007720367" className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold"><Phone className="h-4 w-4" />0800 772 0367</a>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-xl font-semibold">Useful technical routes</h2>
              <div className="mt-5 space-y-2 text-sm">
                <Link className="block rounded-xl border border-white/10 px-4 py-3 text-[#C8D1D8] hover:text-white" href="/curtain-tracks">Curtain track specification</Link>
                <Link className="block rounded-xl border border-white/10 px-4 py-3 text-[#C8D1D8] hover:text-white" href="/curtain-headings">Heading and fullness options</Link>
                <Link className="block rounded-xl border border-white/10 px-4 py-3 text-[#C8D1D8] hover:text-white" href="/curtain-linings">Lining and interlining</Link>
                <Link className="block rounded-xl border border-white/10 px-4 py-3 text-[#C8D1D8] hover:text-white" href="/services/premium-installation">Installation methodology</Link>
                <Link className="block rounded-xl border border-white/10 px-4 py-3 text-[#C8D1D8] hover:text-white" href="/gallery">Project evidence</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
