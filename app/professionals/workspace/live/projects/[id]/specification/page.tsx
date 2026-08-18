import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProfessionalProject, requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = { title: "Controlled Specification Brief | Apex Professional", robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }> };

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not recorded";
}

export default async function Page({ params }: Props) {
  try { await requireProfessionalUser(); } catch { redirect("/professionals/workspace/login"); }
  const { id } = await params;
  let data;
  try { data = await getProfessionalProject(id); } catch { notFound(); }
  const { project, apertures, specificationItems, risks, actions, documents } = data;
  const openRisks = risks.filter((item) => item.status === "open" || item.status === "monitoring");
  const openActions = actions.filter((item) => item.status !== "completed" && item.status !== "cancelled");

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white print:bg-white print:px-0 print:pt-0 print:text-black sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-6xl">
        <div className="print:hidden"><Link href={`/professionals/workspace/live/projects/${id}`} className="text-sm text-[#C8D1D8]">← Project</Link></div>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b56b] print:mt-0 print:text-black">Controlled preliminary brief</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-6xl print:text-3xl">{project.reference} · {project.name}</h1>
        <p className="mt-4 text-[#C8D1D8] print:text-black">Stage: {label(project.project_stage)} · Status: {label(project.status)} · Location: {project.location || "Not recorded"}</p>

        <section className="mt-8 rounded-[24px] border border-[#d6b56b]/30 bg-[#d6b56b]/10 p-6 print:border-black print:bg-white">
          <h2 className="text-xl font-semibold">Document status and limitation</h2>
          <p className="mt-3 text-sm leading-7 text-[#C8D1D8] print:text-black">This is a controlled project-information brief, not a manufacture release, structural approval or engineering sign-off. Every item retains its recorded provenance and status. Unresolved evidence, design-team preferences and Apex preliminary recommendations must not be read as confirmed project information.</p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold">Aperture register</h2>
          <div className="mt-4 space-y-4">
            {apertures.length === 0 ? <p className="text-[#C8D1D8] print:text-black">No apertures registered.</p> : apertures.map((a) => (
              <article key={a.id} className="rounded-[22px] border border-white/10 bg-[#1B405B] p-5 print:break-inside-avoid print:border-gray-300 print:bg-white">
                <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{a.reference}{a.room ? ` · ${a.room}` : ""}</h3><span className="text-xs text-[#d6b56b] print:text-black">{label(a.provenance)} · {label(a.status)}</span></div>
                <div className="mt-3 grid gap-2 text-sm text-[#C8D1D8] print:text-black md:grid-cols-2">
                  <div>Window type: {a.window_type || "Unresolved"}</div><div>Width: {a.width_mm ?? "—"} mm</div>
                  <div>Left / right / peak: {a.left_height_mm ?? "—"} / {a.right_height_mm ?? "—"} / {a.peak_height_mm ?? "—"} mm</div><div>Fixing: {a.fixing_position || "Unresolved"}</div>
                  <div>Substrate: {a.fixing_substrate || "Unresolved"}</div><div>Track route: {a.track_route || "Unresolved"}</div>
                  <div>Operation: {a.operation || "Unresolved"}</div><div>Stack-back: {a.stack_back_requirement || "Unresolved"}</div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div><h2 className="text-2xl font-semibold">Specification items</h2><div className="mt-4 space-y-3">{specificationItems.length === 0 ? <p className="text-sm text-[#C8D1D8] print:text-black">No specification items recorded.</p> : specificationItems.map((item) => <div key={item.id} className="rounded-xl border border-white/10 p-4 text-sm print:border-gray-300"><div className="font-semibold">{item.category} · {item.item_key}</div><div className="mt-2 text-[#C8D1D8] print:text-black">{item.value_text || "Unresolved"}</div><div className="mt-2 text-xs text-[#d6b56b] print:text-black">{label(item.provenance)} · {label(item.status)}</div></div>)}</div></div>
          <div><h2 className="text-2xl font-semibold">Evidence register</h2><div className="mt-4 space-y-3">{documents.length === 0 ? <p className="text-sm text-[#C8D1D8] print:text-black">No documents registered.</p> : documents.map((doc) => <div key={doc.id} className="rounded-xl border border-white/10 p-4 text-sm print:border-gray-300"><div className="font-semibold">{doc.title}</div><div className="mt-2 text-[#C8D1D8] print:text-black">{label(doc.document_type)} · Revision {doc.revision || "not recorded"} · {label(doc.evidence_status)}</div></div>)}</div></div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div><h2 className="text-2xl font-semibold">Open risks</h2><div className="mt-4 space-y-3">{openRisks.length === 0 ? <p className="text-sm text-[#C8D1D8] print:text-black">No open risks recorded.</p> : openRisks.map((risk) => <div key={risk.id} className="rounded-xl border border-white/10 p-4 text-sm print:border-gray-300"><div className="font-semibold">{risk.title}</div><div className="mt-2 text-[#C8D1D8] print:text-black">Severity: {risk.severity} · {risk.description || "No description"}</div></div>)}</div></div>
          <div><h2 className="text-2xl font-semibold">Open RFIs / actions</h2><div className="mt-4 space-y-3">{openActions.length === 0 ? <p className="text-sm text-[#C8D1D8] print:text-black">No open actions recorded.</p> : openActions.map((item) => <div key={item.id} className="rounded-xl border border-white/10 p-4 text-sm print:border-gray-300"><div className="font-semibold">{label(item.action_type)} · {item.title}</div><div className="mt-2 text-[#C8D1D8] print:text-black">{item.description || "No description"}</div></div>)}</div></div>
        </section>

        <div className="mt-10 print:hidden"><p className="text-sm text-[#C8D1D8]">Use your browser print command to produce a controlled PDF. The export intentionally includes unresolved items and provenance.</p></div>
      </div>
    </main>
  );
}
