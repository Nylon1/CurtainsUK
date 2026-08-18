import Link from "next/link";
import { ArrowRight, FileText, ImageIcon, Ruler, ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Demo Project APX-DEMO-001 | Apex Professional Workspace",
  robots: { index: false, follow: false },
};

const apertures = [
  {
    ref: "A-01",
    location: "Double-height living space",
    type: "Gable-end glazing",
    geometry: "Peak + two raking heads",
    status: "Geometry partially confirmed",
    fixing: "Ceiling interface requires substrate confirmation",
    track: "Preliminary shaped-track route",
    provenance: "Drawing + design-team brief",
  },
  {
    ref: "A-02",
    location: "Upper landing",
    type: "Tall rectangular glazing",
    geometry: "Rectangular opening",
    status: "Dimensions awaiting survey",
    fixing: "Wall fixing under review",
    track: "Straight track under review",
    provenance: "Design-team preference",
  },
  {
    ref: "A-03",
    location: "Side return",
    type: "Triangular glazing",
    geometry: "Single rake",
    status: "Photo evidence only",
    fixing: "Not yet confirmed",
    track: "Not yet recommended",
    provenance: "Site photo",
  },
];

const statusStyles: Record<string, string> = {
  confirmed: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  preliminary: "border-[#d6b56b]/25 bg-[#d6b56b]/10 text-[#e8cf94]",
  unresolved: "border-rose-400/25 bg-rose-400/10 text-rose-200",
};

export default function Page() {
  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">APX-DEMO-001 · Technical design</p>
            <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight sm:text-6xl">Double-height gable glazing</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#C8D1D8]">Prototype project record showing how drawings, apertures, specification decisions, risks and programme can sit in one professional workspace.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/professionals/workspace/projects/apx-demo-001/review" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Review drawings & photos <ImageIcon className="h-4 w-4" /></Link>
            <Link href="/professionals/workspace/projects/apx-demo-001/specification" className="inline-flex items-center gap-2 rounded-full bg-[#d6b56b] px-5 py-3 text-sm font-semibold text-apex-navy-950">Open preliminary brief <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            ["Lead role", "Interior designer"],
            ["Project stage", "Technical design"],
            ["Apertures", "3"],
            ["Open items", "4"],
          ].map(([label, value]) => <div key={label} className="rounded-[24px] border border-white/10 bg-[#1B405B] p-5"><div className="text-xs uppercase tracking-[0.16em] text-white/45">{label}</div><div className="mt-2 text-xl font-semibold text-[#F4F0E8]">{value}</div></div>)}
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b]">Aperture register</p><h2 className="mt-2 text-3xl font-semibold">One record per opening</h2></div>
            <Ruler className="h-6 w-6 text-[#d6b56b]" />
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {apertures.map((aperture) => (
              <article key={aperture.ref} className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold">{aperture.ref}</span><span className="text-xs text-white/45">{aperture.location}</span></div>
                <h3 className="mt-5 text-2xl font-semibold">{aperture.type}</h3>
                <dl className="mt-5 space-y-4 text-sm">
                  <div><dt className="text-white/45">Geometry</dt><dd className="mt-1 text-[#C8D1D8]">{aperture.geometry}</dd></div>
                  <div><dt className="text-white/45">Current status</dt><dd className="mt-1 text-[#C8D1D8]">{aperture.status}</dd></div>
                  <div><dt className="text-white/45">Fixing interface</dt><dd className="mt-1 text-[#C8D1D8]">{aperture.fixing}</dd></div>
                  <div><dt className="text-white/45">Track strategy</dt><dd className="mt-1 text-[#C8D1D8]">{aperture.track}</dd></div>
                  <div><dt className="text-white/45">Provenance</dt><dd className="mt-1 text-[#d6b56b]">{aperture.provenance}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-3">
          <div className="rounded-[30px] border border-white/10 bg-[#1B405B] p-7">
            <FileText className="h-5 w-5 text-[#d6b56b]" /><h2 className="mt-4 text-2xl font-semibold">Information state</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className={`rounded-2xl border px-4 py-3 ${statusStyles.confirmed}`}>Confirmed · project location and design stage</div>
              <div className={`rounded-2xl border px-4 py-3 ${statusStyles.preliminary}`}>Preliminary · shaped-track strategy at A-01</div>
              <div className={`rounded-2xl border px-4 py-3 ${statusStyles.unresolved}`}>Unresolved · substrate build-up and final survey dimensions</div>
            </div>
          </div>
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7 lg:col-span-2">
            <ShieldAlert className="h-5 w-5 text-[#d6b56b]" /><h2 className="mt-4 text-2xl font-semibold">Current RFIs / risks</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {["Confirm ceiling build-up and viable fixing zone at A-01.", "Issue latest reflected ceiling plan / section through gable.", "Confirm minimum clear opening required when curtains are stacked.", "Confirm access route and working-at-height constraints for final installation."].map((item, index) => <div key={item} className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-6 text-[#C8D1D8]"><span className="mr-2 text-[#d6b56b]">RFI-{String(index + 1).padStart(2, "0")}</span>{item}</div>)}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
