import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProjectExport, requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = {
  title: "Controlled Project Export | Apex Professional Platform",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string; exportId: string }> };

type Snapshot = {
  generated_at?: string;
  purpose?: string;
  project?: Record<string, unknown>;
  apertures?: Array<Record<string, unknown>>;
  documents?: Array<Record<string, unknown>>;
  specification_items?: Array<Record<string, unknown>>;
  risks?: Array<Record<string, unknown>>;
  actions?: Array<Record<string, unknown>>;
};

function value(item: Record<string, unknown>, key: string) {
  const result = item[key];
  return result === null || result === undefined || result === "" ? "—" : String(result);
}

export default async function Page({ params }: Props) {
  try {
    await requireProfessionalUser();
  } catch {
    redirect("/professionals/workspace/login");
  }

  const { id, exportId } = await params;
  let record;
  try {
    record = await getProjectExport(id, exportId);
  } catch {
    notFound();
  }

  const snapshot = record.snapshot as Snapshot;
  const project = snapshot.project || {};
  const apertures = snapshot.apertures || [];
  const documents = snapshot.documents || [];
  const specificationItems = snapshot.specification_items || [];
  const risks = snapshot.risks || [];
  const actions = snapshot.actions || [];

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white print:bg-white print:px-0 print:pt-0 print:text-black sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-6xl">
        <div className="print:hidden">
          <Link href={`/professionals/workspace/live/projects/${id}/exports`} className="text-sm text-[#C8D1D8] hover:text-white">← Export register</Link>
        </div>

        <header className="mt-6 border-b border-white/10 pb-8 print:mt-0 print:border-gray-300">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b] print:text-black">Controlled project export</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight print:text-3xl">{value(project, "reference")} · {value(project, "name")}</h1>
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm text-[#C8D1D8] print:text-black">
            <span>{record.export_type.replaceAll("_", " ")} · version {record.version}</span>
            <span>Status: {record.status}</span>
            <span>Generated: {new Date(record.created_at).toLocaleString("en-GB")}</span>
          </div>
          <div className="mt-6 rounded-2xl border border-[#d6b56b]/30 bg-[#d6b56b]/10 p-5 text-sm font-medium leading-7 text-[#F4F0E8] print:border-black print:bg-white print:text-black">
            {snapshot.purpose || "Preliminary coordination only — not manufacture approval"}
          </div>
        </header>

        <section className="mt-9 grid gap-4 md:grid-cols-4 print:grid-cols-4">
          {[["Apertures", apertures.length],["Documents", documents.length],["Specification items", specificationItems.length],["Open risks / actions", risks.filter((risk) => !["resolved","accepted"].includes(value(risk,"status"))).length + actions.filter((action) => value(action,"status") !== "completed").length]].map(([label,count]) => (
            <div key={String(label)} className="rounded-2xl border border-white/10 bg-[#1B405B] p-5 print:border-gray-300 print:bg-white">
              <div className="text-xs uppercase tracking-[0.14em] text-white/45 print:text-gray-600">{label}</div>
              <div className="mt-2 text-2xl font-semibold">{count}</div>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold">Aperture schedule</h2>
          <div className="mt-5 space-y-4">
            {apertures.length === 0 ? <p className="text-sm text-[#C8D1D8] print:text-black">No aperture records were included in this version.</p> : apertures.map((aperture, index) => (
              <article key={value(aperture,"id") || String(index)} className="break-inside-avoid rounded-[24px] border border-white/10 bg-white/[0.04] p-6 print:rounded-none print:border-gray-300 print:bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">{value(aperture,"reference")} · {value(aperture,"room")}</h3><span className="text-xs uppercase tracking-[0.12em] text-[#d6b56b] print:text-black">{value(aperture,"provenance").replaceAll("_", " ")}</span></div>
                <div className="mt-4 grid gap-2 text-sm text-[#C8D1D8] print:text-black sm:grid-cols-2 lg:grid-cols-4">
                  <span>Type: {value(aperture,"window_type")}</span><span>Width: {value(aperture,"width_mm")} mm</span><span>Peak: {value(aperture,"peak_height_mm")} mm</span><span>Fixing: {value(aperture,"fixing_position")}</span><span>Substrate: {value(aperture,"fixing_substrate")}</span><span>Track route: {value(aperture,"track_route")}</span><span>Operation: {value(aperture,"operation")}</span><span>Status: {value(aperture,"status")}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2 print:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">Specification provenance</h2>
            <div className="mt-5 space-y-3">
              {specificationItems.length === 0 ? <p className="text-sm text-[#C8D1D8] print:text-black">No specification items included.</p> : specificationItems.map((item, index) => (
                <div key={value(item,"id") || String(index)} className="break-inside-avoid rounded-2xl border border-white/10 p-5 print:border-gray-300">
                  <div className="font-semibold">{value(item,"category")} · {value(item,"item_key")}</div>
                  <div className="mt-2 text-sm text-[#C8D1D8] print:text-black">{value(item,"value_text")}</div>
                  <div className="mt-3 text-xs uppercase tracking-[0.1em] text-[#d6b56b] print:text-black">{value(item,"status")} · {value(item,"provenance").replaceAll("_", " ")}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">Unresolved coordination</h2>
            <div className="mt-5 space-y-3">
              {[...risks.filter((risk) => !["resolved","accepted"].includes(value(risk,"status"))), ...actions.filter((action) => value(action,"status") !== "completed")].map((item, index) => (
                <div key={value(item,"id") || String(index)} className="break-inside-avoid rounded-2xl border border-white/10 p-5 print:border-gray-300">
                  <div className="font-semibold">{value(item,"title")}</div>
                  <div className="mt-2 text-sm text-[#C8D1D8] print:text-black">{value(item,"description")}</div>
                  <div className="mt-3 text-xs uppercase tracking-[0.1em] text-white/45 print:text-gray-600">{value(item,"status")}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-12 border-t border-white/10 pt-6 text-xs leading-6 text-white/45 print:border-gray-300 print:text-gray-600">
          Apex Curtains Professional Platform · Controlled project record · This document preserves the project state and provenance captured at the time of export. Final manufacture, fixing and installation decisions require the appropriate survey, approvals and technical evidence.
        </footer>
      </div>
    </main>
  );
}
