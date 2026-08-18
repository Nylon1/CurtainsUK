import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { closeProjectRisk, completeProjectAction } from "@/app/professionals/workspace/control-actions";
import { getProfessionalProject, requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = {
  title: "Professional Project | Apex Curtains",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  try {
    await requireProfessionalUser();
  } catch {
    redirect("/professionals/workspace/login");
  }

  const { id } = await params;
  let data;
  try {
    data = await getProfessionalProject(id);
  } catch {
    notFound();
  }

  const { project, apertures, specificationItems, risks, actions, documents } = data;
  const openActions = actions.filter((action) => action.status !== "completed" && action.status !== "cancelled");
  const openRisks = risks.filter((risk) => risk.status === "open" || risk.status === "monitoring");

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-7xl">
        <Link href="/professionals/workspace/live" className="text-sm text-[#C8D1D8] hover:text-white">← Project workspace</Link>
        <div className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b56b]">{project.reference}</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">{project.name}</h1>
            <p className="mt-4 text-[#C8D1D8]">{project.location || "Location not yet set"} · {project.project_stage.replaceAll("_", " ")}</p>
          </div>
          <div className="rounded-full border border-[#d6b56b]/25 bg-[#d6b56b]/10 px-4 py-2 text-sm font-semibold text-[#d6b56b]">{project.status.replaceAll("_", " ")}</div>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={`/professionals/workspace/live/projects/${id}/apertures/new`} className="rounded-full bg-[#d6b56b] px-5 py-3 text-sm font-semibold text-apex-navy-950">Add aperture</Link>
          <Link href={`/professionals/workspace/live/projects/${id}/documents/new`} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Register document</Link>
          <Link href={`/professionals/workspace/live/projects/${id}/actions/new`} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Raise RFI / action</Link>
          <Link href={`/professionals/workspace/live/projects/${id}/members`} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Project team</Link>
          <Link href={`/professionals/workspace/live/projects/${id}/exports`} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Export register</Link>
          <Link href={`/professionals/workspace/live/projects/${id}/specification`} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Live specification view</Link>
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[
            ["Apertures", apertures.length],
            ["Documents", documents.length],
            ["Spec items", specificationItems.length],
            ["Open risks", openRisks.length],
            ["Actions", openActions.length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-[24px] border border-white/10 bg-[#1B405B] p-5">
              <div className="text-xs uppercase tracking-[0.16em] text-white/45">{label}</div>
              <div className="mt-2 text-3xl font-semibold">{value}</div>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Aperture register</p><h2 className="mt-2 text-2xl font-semibold">Openings, interfaces & revision history</h2></div>
                <Link href={`/professionals/workspace/live/projects/${id}/apertures/new`} className="text-sm font-semibold text-[#d6b56b]">Add opening →</Link>
              </div>
              {apertures.length === 0 ? (
                <p className="mt-6 text-sm leading-7 text-[#C8D1D8]">No apertures registered. Add each opening separately so geometry, fixing context and provenance remain aperture-specific.</p>
              ) : (
                <div className="mt-6 space-y-3">
                  {apertures.map((aperture) => (
                    <Link href={`/professionals/workspace/live/projects/${id}/apertures/${aperture.id}`} key={aperture.id} className="block rounded-2xl border border-white/10 bg-black/15 p-5 transition hover:border-[#d6b56b]/30">
                      <div className="flex flex-wrap items-center justify-between gap-3"><div className="font-semibold">{aperture.reference} {aperture.room ? `· ${aperture.room}` : ""}</div><span className="text-xs text-[#d6b56b]">{aperture.provenance.replaceAll("_", " ")}</span></div>
                      <div className="mt-3 text-sm text-[#C8D1D8]">{aperture.window_type || "Window type unresolved"} · {aperture.fixing_position || "Fixing position unresolved"}</div>
                      <div className="mt-2 text-xs text-white/45">Width {aperture.width_mm ?? "—"} mm · Peak {aperture.peak_height_mm ?? "—"} mm · {aperture.status.replaceAll("_", " ")} · open history →</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Evidence</p><h2 className="mt-2 text-2xl font-semibold">Drawing & document register</h2></div><Link href={`/professionals/workspace/live/projects/${id}/documents/new`} className="text-sm font-semibold text-[#d6b56b]">Register revision →</Link></div>
              <div className="mt-5 space-y-3">{documents.length === 0 ? <p className="text-sm text-[#C8D1D8]">No evidence registered.</p> : documents.slice(0, 6).map((doc) => <div key={doc.id} className="rounded-2xl border border-white/10 p-4 text-sm"><div className="font-semibold">{doc.title}</div><div className="mt-2 text-[#C8D1D8]">{doc.document_type.replaceAll("_", " ")} · Rev {doc.revision || "—"} · {doc.evidence_status.replaceAll("_", " ")}</div></div>)}</div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[30px] border border-white/10 bg-[#1B405B] p-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Design freeze</p><h2 className="mt-3 text-2xl font-semibold">Unresolved evidence stays visible</h2><p className="mt-4 text-sm leading-7 text-[#C8D1D8]">A project is not manufacture-ready merely because fields have been populated. Confirmed project evidence, design-team preference and Apex preliminary recommendations remain separate until the relevant survey, manufacturer data or approval closes the gap.</p></div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Open RFIs & actions</h2><Link href={`/professionals/workspace/live/projects/${id}/actions/new`} className="text-sm text-[#d6b56b]">Add →</Link></div>
              <div className="mt-5 space-y-3">{openActions.length === 0 ? <p className="text-sm text-[#C8D1D8]">No open actions.</p> : openActions.slice(0, 6).map((item) => <div key={item.id} className="rounded-xl border border-white/10 px-4 py-3 text-sm"><div className="text-xs uppercase tracking-[0.14em] text-[#d6b56b]">{item.action_type.replaceAll("_", " ")}</div><div className="mt-1 font-semibold">{item.title}</div><form action={completeProjectAction.bind(null, id, item.id)}><button className="mt-3 text-xs font-semibold text-[#d6b56b]">Mark complete</button></form></div>)}</div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-xl font-semibold">Open risks</h2>
              <div className="mt-5 space-y-3">{openRisks.length === 0 ? <p className="text-sm text-[#C8D1D8]">No open risks.</p> : openRisks.slice(0, 5).map((risk) => <div key={risk.id} className="rounded-xl border border-white/10 px-4 py-4 text-sm"><div className="text-xs uppercase tracking-[0.14em] text-[#d6b56b]">{risk.severity} · {risk.risk_type.replaceAll("_", " ")}</div><div className="mt-1 font-semibold">{risk.title}</div><div className="mt-3 flex gap-4"><form action={closeProjectRisk.bind(null, id, risk.id, "resolved")}><button className="text-xs font-semibold text-[#d6b56b]">Resolve</button></form><form action={closeProjectRisk.bind(null, id, risk.id, "accepted")}><button className="text-xs text-white/55">Accept risk</button></form></div></div>)}</div>
            </div>

            <Link href={`/professionals/workspace/live/projects/${id}/exports`} className="block rounded-[30px] border border-[#d6b56b]/25 bg-[#d6b56b]/10 p-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Controlled output</p><h2 className="mt-3 text-xl font-semibold">Versioned project exports →</h2><p className="mt-3 text-sm leading-7 text-[#C8D1D8]">Freeze a coordination snapshot that retains provenance, evidence status, unresolved risks and open RFIs.</p></Link>
          </aside>
        </section>
      </div>
    </main>
  );
}
