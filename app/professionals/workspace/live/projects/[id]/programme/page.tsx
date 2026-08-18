import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProfessionalProject, requireProfessionalUser } from "@/lib/professional-platform/server";
import { updateActionResponsibility, updateProjectProgramme } from "@/app/professionals/workspace/live/programme-actions";

export const metadata = { title: "Project Programme | Apex Professional", robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }> };

function inputDate(value: string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}

export default async function Page({ params }: Props) {
  try { await requireProfessionalUser(); } catch { redirect("/professionals/workspace/login"); }
  const { id } = await params;
  let data;
  try { data = await getProfessionalProject(id); } catch { notFound(); }
  const { project, actions } = data;
  const openActions = actions.filter((item) => item.status !== "completed" && item.status !== "cancelled");
  const input = "mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none";

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-6xl">
        <Link href={`/professionals/workspace/live/projects/${id}`} className="text-sm text-[#C8D1D8]">← Project</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b56b]">Project programme</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-6xl">Design freeze, survey, manufacture release and installation.</h1>
        <p className="mt-5 max-w-3xl leading-8 text-[#C8D1D8]">Programme dates are coordination targets, not automatic approval gates. Open RFIs, unresolved evidence and survey requirements remain controlling dependencies.</p>

        <form action={updateProjectProgramme.bind(null, id)} className="mt-10 rounded-[30px] border border-white/10 bg-[#1B405B] p-7 sm:p-9">
          <div className="grid gap-5 md:grid-cols-2">
            <label><span className="text-sm font-semibold">Survey target</span><input name="survey_target_at" type="datetime-local" defaultValue={inputDate((project as any).survey_target_at)} className={input} /></label>
            <label><span className="text-sm font-semibold">Design freeze target</span><input name="design_freeze_target_at" type="datetime-local" defaultValue={inputDate((project as any).design_freeze_target_at)} className={input} /></label>
            <label><span className="text-sm font-semibold">Manufacture release target</span><input name="manufacture_release_target_at" type="datetime-local" defaultValue={inputDate((project as any).manufacture_release_target_at)} className={input} /></label>
            <label><span className="text-sm font-semibold">Installation target</span><input name="installation_target_at" type="datetime-local" defaultValue={inputDate((project as any).installation_target_at)} className={input} /></label>
          </div>
          <button className="mt-7 rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Update programme</button>
        </form>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Responsibility matrix</p><h2 className="mt-2 text-3xl font-semibold">Open RFIs & actions</h2></div></div>
          <div className="mt-6 space-y-4">
            {openActions.length === 0 ? <p className="text-[#C8D1D8]">No open actions.</p> : openActions.map((item) => (
              <form key={item.id} action={updateActionResponsibility.bind(null, id, item.id)} className="grid gap-4 rounded-[26px] border border-white/10 bg-white/[0.04] p-6 lg:grid-cols-[1.4fr_1fr_0.7fr_1fr_auto] lg:items-end">
                <div><div className="text-xs uppercase tracking-[0.14em] text-[#d6b56b]">{String(item.action_type).replaceAll("_", " ")}</div><div className="mt-2 font-semibold">{item.title}</div><div className="mt-2 text-sm text-[#C8D1D8]">{item.description || "No description"}</div></div>
                <label><span className="text-xs text-white/55">Responsible party</span><input name="responsibility_text" defaultValue={(item as any).responsibility_text || ""} placeholder="Architect / Interior Designer / Apex / Main Contractor" className={input} /></label>
                <label><span className="text-xs text-white/55">Priority</span><select name="priority" defaultValue={(item as any).priority || "normal"} className={input}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                <label><span className="text-xs text-white/55">Due</span><input name="due_at" type="datetime-local" defaultValue={inputDate(item.due_at)} className={input} /></label>
                <button className="rounded-full border border-[#d6b56b]/35 px-5 py-3 text-sm font-semibold text-[#d6b56b]">Save</button>
              </form>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
