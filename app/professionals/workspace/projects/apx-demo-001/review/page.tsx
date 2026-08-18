import Link from "next/link";
import { ArrowLeft, FileImage, FileText, TriangleAlert } from "lucide-react";

export const metadata = {
  title: "Drawing & Photo Review | APX-DEMO-001",
  robots: { index: false, follow: false },
};

const evidence = [
  { name: "GA elevation - gable wall", type: "Drawing", revision: "P03", status: "Current review set", note: "Shows overall gable geometry and approximate curtain zone." },
  { name: "RCP - living space", type: "Drawing", revision: "P02", status: "Further detail needed", note: "Track interface shown diagrammatically; fixing build-up not confirmed." },
  { name: "Site photo - gable glazing", type: "Photo", revision: "Site image", status: "Reference only", note: "Useful for context, not sufficient for manufacture dimensions." },
  { name: "Interior design window-treatment note", type: "Brief", revision: "Rev A", status: "Design intent", note: "Prefers full-height curtains with maximum clear opening when stacked." },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-6xl">
        <Link href="/professionals/workspace/projects/apx-demo-001" className="inline-flex items-center gap-2 text-sm text-[#d6b56b]"><ArrowLeft className="h-4 w-4" />Back to project</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">APX-DEMO-001 · Evidence review</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">Drawings, photos and design-team information</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#C8D1D8]">This prototype treats source evidence as evidence, not as automatic truth. Revision, provenance and suitability for the decision being made are recorded separately.</p>

        <section className="mt-10 space-y-4">
          {evidence.map((item) => (
            <article key={item.name} className="grid gap-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className="rounded-2xl border border-white/10 bg-[#1B405B] p-4">{item.type === "Photo" ? <FileImage className="h-6 w-6 text-[#d6b56b]" /> : <FileText className="h-6 w-6 text-[#d6b56b]" />}</div>
              <div><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-semibold">{item.name}</h2><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">{item.revision}</span></div><p className="mt-2 text-sm leading-6 text-[#C8D1D8]">{item.note}</p></div>
              <span className="rounded-full border border-[#d6b56b]/25 bg-[#d6b56b]/10 px-3 py-2 text-xs font-semibold text-[#e8cf94]">{item.status}</span>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-[30px] border border-rose-400/20 bg-rose-400/10 p-7">
          <div className="flex items-center gap-3 text-rose-200"><TriangleAlert className="h-5 w-5" /><h2 className="text-xl font-semibold">Review gaps before specification freeze</h2></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {["No confirmed section through the track fixing zone.", "No final survey dimensions for A-01/A-02/A-03.", "No confirmed curtain weight or final textile construction.", "Access methodology not yet agreed with site team."].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm leading-6 text-[#C8D1D8]">{item}</div>)}
          </div>
        </section>
      </div>
    </main>
  );
}
