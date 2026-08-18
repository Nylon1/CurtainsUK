import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDashed, Sparkles, TriangleAlert } from "lucide-react";

export const metadata = {
  title: "Preliminary Specification Brief | APX-DEMO-001",
  robots: { index: false, follow: false },
};

type Row = {
  item: string;
  value: string;
  state: "confirmed" | "preliminary" | "unresolved";
  source: string;
};

const rows: Row[] = [
  { item: "Project stage", value: "Technical design", state: "confirmed", source: "Project brief" },
  { item: "Primary aperture", value: "A-01 double-height gable-end glazing", state: "confirmed", source: "GA elevation P03" },
  { item: "Curtain intent", value: "Full-height treatment with maximum clear opening when stacked", state: "confirmed", source: "Interior design brief Rev A" },
  { item: "Track route", value: "Shaped route following the gable geometry, subject to fixing review", state: "preliminary", source: "Apex preliminary review" },
  { item: "Fixing interface", value: "Ceiling interface anticipated; substrate/build-up not yet confirmed", state: "unresolved", source: "RCP P02 + RFI-01" },
  { item: "Heading", value: "To be selected after stack-back and textile review", state: "unresolved", source: "Open design decision" },
  { item: "Face fabric", value: "Design-team selection pending", state: "unresolved", source: "Interior designer" },
  { item: "Lining", value: "Performance requirement to be agreed", state: "unresolved", source: "Open design decision" },
  { item: "Final manufacture dimensions", value: "Not available until agreed survey stage", state: "unresolved", source: "Survey required" },
  { item: "Installation access", value: "Working-at-height methodology required", state: "preliminary", source: "Site-context review" },
];

const stateMap = {
  confirmed: { label: "Confirmed input", className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200", Icon: CheckCircle2 },
  preliminary: { label: "Apex preliminary", className: "border-[#d6b56b]/25 bg-[#d6b56b]/10 text-[#e8cf94]", Icon: Sparkles },
  unresolved: { label: "Unresolved", className: "border-rose-400/25 bg-rose-400/10 text-rose-200", Icon: CircleDashed },
};

export default function Page() {
  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-6xl">
        <Link href="/professionals/workspace/projects/apx-demo-001" className="inline-flex items-center gap-2 text-sm text-[#d6b56b]"><ArrowLeft className="h-4 w-4" />Back to project</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">APX-DEMO-001 · Prototype output</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">Preliminary curtain & track specification brief</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#C8D1D8]">The brief keeps confirmed facts, Apex preliminary recommendations and unresolved decisions visibly separate. It is not a manufacture order, structural approval or final technical specification.</p>

        <section className="mt-10 overflow-hidden rounded-[30px] border border-white/10">
          <div className="hidden grid-cols-[1fr_1.5fr_0.75fr_1fr] gap-4 bg-[#1B405B] px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/55 md:grid">
            <div>Item</div><div>Current position</div><div>Status</div><div>Source / provenance</div>
          </div>
          <div className="divide-y divide-white/10 bg-white/[0.04]">
            {rows.map((row) => {
              const state = stateMap[row.state];
              const Icon = state.Icon;
              return (
                <div key={row.item} className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_1.5fr_0.75fr_1fr] md:items-center">
                  <div className="font-semibold text-[#F4F0E8]">{row.item}</div>
                  <div className="text-sm leading-6 text-[#C8D1D8]">{row.value}</div>
                  <div><span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${state.className}`}><Icon className="h-3.5 w-3.5" />{state.label}</span></div>
                  <div className="text-xs leading-5 text-white/50">{row.source}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-10 rounded-[30px] border border-rose-400/20 bg-rose-400/10 p-7">
          <div className="flex items-center gap-3 text-rose-200"><TriangleAlert className="h-5 w-5" /><h2 className="text-xl font-semibold">Information required before design freeze</h2></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {["Confirm fixing substrate/build-up and viable fixing zone.", "Agree heading/fullness after stack-back study.", "Confirm face fabric, lining construction and resulting curtain weight.", "Complete final survey and agree installation access methodology."].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm leading-6 text-[#C8D1D8]">{item}</div>)}
          </div>
        </section>
      </div>
    </main>
  );
}
