import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateProjectAperture } from "@/app/professionals/workspace/control-actions";
import { getApertureRevisions, getProfessionalProject, requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = {
  title: "Aperture Record | Apex Professional Platform",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string; apertureId: string }> };

export default async function Page({ params }: Props) {
  try {
    await requireProfessionalUser();
  } catch {
    redirect("/professionals/workspace/login");
  }

  const { id, apertureId } = await params;
  let projectData;
  let revisions;
  try {
    projectData = await getProfessionalProject(id);
    revisions = await getApertureRevisions(id, apertureId);
  } catch {
    notFound();
  }

  const aperture = projectData.apertures.find((item) => item.id === apertureId);
  if (!aperture) notFound();

  const inputClass = "mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white";

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-7xl">
        <Link href={`/professionals/workspace/live/projects/${id}`} className="text-sm text-[#C8D1D8] hover:text-white">← {projectData.project.reference}</Link>
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b]">Aperture record</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{aperture.reference}{aperture.room ? ` · ${aperture.room}` : ""}</h1>
            <p className="mt-4 text-[#C8D1D8]">Every save creates an immutable revision snapshot. Revision history is retained so geometry and interface decisions are not silently overwritten.</p>
          </div>
          <span className="rounded-full border border-[#d6b56b]/25 bg-[#d6b56b]/10 px-4 py-2 text-sm text-[#d6b56b]">{aperture.provenance.replaceAll("_", " ")}</span>
        </div>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <form action={updateProjectAperture.bind(null, id, apertureId)} className="rounded-[30px] border border-white/10 bg-[#1B405B] p-7 sm:p-8">
            <h2 className="text-2xl font-semibold">Current aperture data</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="text-sm">Reference<input name="reference" required defaultValue={aperture.reference} className={inputClass} /></label>
              <label className="text-sm">Room<input name="room" defaultValue={aperture.room || ""} className={inputClass} /></label>
              <label className="text-sm">Window type<input name="window_type" defaultValue={aperture.window_type || ""} className={inputClass} /></label>
              <label className="text-sm">Width (mm)<input name="width_mm" type="number" step="0.1" defaultValue={aperture.width_mm ?? ""} className={inputClass} /></label>
              <label className="text-sm">Left height (mm)<input name="left_height_mm" type="number" step="0.1" defaultValue={aperture.left_height_mm ?? ""} className={inputClass} /></label>
              <label className="text-sm">Right height (mm)<input name="right_height_mm" type="number" step="0.1" defaultValue={aperture.right_height_mm ?? ""} className={inputClass} /></label>
              <label className="text-sm">Peak height (mm)<input name="peak_height_mm" type="number" step="0.1" defaultValue={aperture.peak_height_mm ?? ""} className={inputClass} /></label>
              <label className="text-sm">Track route<input name="track_route" defaultValue={aperture.track_route || ""} className={inputClass} /></label>
              <label className="text-sm">Fixing position<input name="fixing_position" defaultValue={aperture.fixing_position || ""} className={inputClass} /></label>
              <label className="text-sm">Fixing substrate<input name="fixing_substrate" defaultValue={aperture.fixing_substrate || ""} className={inputClass} /></label>
              <label className="text-sm">Operation<input name="operation" defaultValue={aperture.operation || ""} className={inputClass} /></label>
              <label className="text-sm">Stack-back requirement<input name="stack_back_requirement" defaultValue={aperture.stack_back_requirement || ""} className={inputClass} /></label>
              <label className="text-sm">Clear-opening requirement<input name="clear_opening_requirement" defaultValue={aperture.clear_opening_requirement || ""} className={inputClass} /></label>
              <label className="text-sm">Provenance<select name="provenance" defaultValue={aperture.provenance} className={inputClass}><option value="confirmed_project_information">Confirmed project information</option><option value="design_team_preference">Design-team preference</option><option value="apex_preliminary_recommendation">Apex preliminary recommendation</option><option value="unresolved">Unresolved</option></select></label>
            </div>
            <label className="mt-5 block text-sm">Notes<textarea name="notes" rows={4} defaultValue={aperture.notes || ""} className={inputClass} /></label>
            <button className="mt-6 rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Save new revision</button>
          </form>

          <aside className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Revision history</p>
            <h2 className="mt-3 text-2xl font-semibold">{revisions.length} recorded revision{revisions.length === 1 ? "" : "s"}</h2>
            <div className="mt-6 space-y-3">
              {revisions.map((revision) => (
                <div key={revision.id} className="rounded-2xl border border-white/10 bg-black/15 p-5">
                  <div className="flex items-center justify-between gap-3"><span className="font-semibold">Revision {revision.revision_no}</span><span className="text-xs text-white/45">{new Date(revision.created_at).toLocaleString("en-GB")}</span></div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#C8D1D8]">
                    <span>Width: {String(revision.snapshot.width_mm ?? "—")}</span>
                    <span>Peak: {String(revision.snapshot.peak_height_mm ?? "—")}</span>
                    <span>Fixing: {String(revision.snapshot.fixing_position ?? "—")}</span>
                    <span>Track: {String(revision.snapshot.track_route ?? "—")}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-[#d6b56b]/20 bg-[#d6b56b]/10 p-5 text-sm leading-7 text-[#C8D1D8]">Revision history records what changed; it does not by itself make a dimension manufacture-ready. Survey status and evidence provenance still govern approval.</div>
          </aside>
        </section>
      </div>
    </main>
  );
}
