import Link from "next/link";
import { redirect } from "next/navigation";
import { createProjectAperture } from "@/app/professionals/workspace/actions";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = { title: "Add Aperture | Apex Professional", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  try { await requireProfessionalUser(); } catch { redirect("/professionals/workspace/login"); }
  const { id } = await params;
  const action = createProjectAperture.bind(null, id);
  const input = "mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none";

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-5xl">
        <Link href={`/professionals/workspace/live/projects/${id}`} className="text-sm text-[#C8D1D8]">← Project</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b56b]">Aperture register</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-6xl">Register an opening and its interfaces.</h1>
        <p className="mt-5 max-w-3xl leading-8 text-[#C8D1D8]">Record only what is known. Dimensions, fixing conditions and track strategy retain explicit provenance and do not become manufacture-ready by being entered here.</p>

        <form action={action} className="mt-10 rounded-[32px] border border-white/10 bg-[#1B405B] p-7 sm:p-9">
          <div className="grid gap-5 md:grid-cols-2">
            <label><span className="text-sm font-semibold">Opening reference *</span><input name="reference" required className={input} placeholder="W-01" /></label>
            <label><span className="text-sm font-semibold">Room / zone</span><input name="room" className={input} placeholder="Double-height lounge" /></label>
            <label><span className="text-sm font-semibold">Window type</span><input name="window_type" className={input} placeholder="Gable-end / apex / triangular" /></label>
            <label><span className="text-sm font-semibold">Evidence provenance</span><select name="provenance" className={input} defaultValue="unresolved"><option value="unresolved">Unresolved</option><option value="confirmed_project_information">Confirmed project information</option><option value="design_team_preference">Design-team preference</option><option value="apex_preliminary_recommendation">Apex preliminary recommendation</option></select></label>
            <label><span className="text-sm font-semibold">Width (mm)</span><input name="width_mm" type="number" step="0.1" className={input} /></label>
            <label><span className="text-sm font-semibold">Peak height (mm)</span><input name="peak_height_mm" type="number" step="0.1" className={input} /></label>
            <label><span className="text-sm font-semibold">Left height (mm)</span><input name="left_height_mm" type="number" step="0.1" className={input} /></label>
            <label><span className="text-sm font-semibold">Right height (mm)</span><input name="right_height_mm" type="number" step="0.1" className={input} /></label>
            <label><span className="text-sm font-semibold">Track route</span><input name="track_route" className={input} placeholder="Follow apex / frame aperture / unresolved" /></label>
            <label><span className="text-sm font-semibold">Fixing position</span><input name="fixing_position" className={input} placeholder="Ceiling / wall / recess" /></label>
            <label><span className="text-sm font-semibold">Fixing substrate</span><input name="fixing_substrate" className={input} placeholder="Concrete / timber / steel / unknown" /></label>
            <label><span className="text-sm font-semibold">Operation</span><input name="operation" className={input} placeholder="Hand draw / cord / unresolved" /></label>
            <label><span className="text-sm font-semibold">Stack-back requirement</span><input name="stack_back_requirement" className={input} placeholder="Target or design constraint" /></label>
            <label><span className="text-sm font-semibold">Clear-opening requirement</span><input name="clear_opening_requirement" className={input} placeholder="Minimum clear width / access condition" /></label>
          </div>
          <label className="mt-5 block"><span className="text-sm font-semibold">Notes / unresolved interfaces</span><textarea name="notes" rows={5} className={input} /></label>
          <button className="mt-7 rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Add aperture</button>
        </form>
      </div>
    </main>
  );
}
