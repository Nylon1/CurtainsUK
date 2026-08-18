import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const metadata = {
  title: "New Professional Project | Apex Curtains",
  description: "Prototype professional project intake for complex architectural curtain and track projects.",
  alternates: { canonical: "https://www.apexcurtains.com/professionals/workspace/new-project" },
  robots: { index: false, follow: false },
};

const fields = [
  ["Project name / reference", "e.g. North elevation feature glazing"],
  ["Your role", "Architect, interior designer, developer, contractor..."],
  ["Project stage", "Concept, developed design, technical design, tender, construction, fit-out"],
  ["Site location", "Town / city / project address"],
  ["Number of openings / repeated types", "Approximate quantity is enough initially"],
  ["Target installation period", "Known programme date or target month"],
];

export default function Page() {
  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-5xl">
        <Link href="/professionals/workspace" className="inline-flex items-center gap-2 text-sm text-[#C8D1D8] hover:text-white"><ArrowLeft className="h-4 w-4" />Workspace</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">Prototype project intake</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">Start with the project context. Detail comes next.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#C8D1D8]">This prototype shows the information architecture for a future persistent project workspace. No project data is saved from this screen yet.</p>

        <section className="mt-12 rounded-[32px] border border-white/10 bg-[#1B405B] p-7 sm:p-9">
          <div className="grid gap-6 md:grid-cols-2">
            {fields.map(([label, placeholder]) => (
              <label key={label} className="block">
                <span className="text-sm font-semibold text-[#F4F0E8]">{label}</span>
                <input disabled placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white placeholder:text-white/35 disabled:cursor-not-allowed" />
              </label>
            ))}
          </div>
          <label className="mt-6 block">
            <span className="text-sm font-semibold text-[#F4F0E8]">What makes the glazing or curtain package difficult?</span>
            <textarea disabled rows={5} placeholder="Apex geometry, double height, limited fixing zone, large stack-back requirement, access constraints, repeated plots..." className="mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white placeholder:text-white/35 disabled:cursor-not-allowed" />
          </label>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {["1. Create project", "2. Add drawings & photos", "3. Build aperture register"].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-[#C8D1D8]">{item}</div>)}
        </section>

        <Link href="/professionals/project-review" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Use the live professional review route <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </main>
  );
}
