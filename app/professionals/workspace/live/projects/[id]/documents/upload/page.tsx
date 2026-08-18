import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProfessionalProject, requireProfessionalUser } from "@/lib/professional-platform/server";
import { uploadProjectDocument } from "@/app/professionals/workspace/live/operational-actions";

export const metadata = { title: "Upload Project Document | Apex Curtains", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  try { await requireProfessionalUser(); } catch { redirect("/professionals/workspace/login"); }
  const { id } = await params;
  let data;
  try { data = await getProfessionalProject(id); } catch { notFound(); }

  const action = uploadProjectDocument.bind(null, id);

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-4xl">
        <Link href={`/professionals/workspace/live/projects/${id}`} className="text-sm text-[#C8D1D8] hover:text-white">← {data.project.reference}</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b56b]">Controlled project evidence</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Upload a drawing, schedule, survey or project file</h1>
        <p className="mt-5 max-w-3xl leading-8 text-[#C8D1D8]">Files are private and project-scoped. Registration captures revision, evidence status and provenance so later decisions can be traced to the correct source.</p>

        <form action={action} className="mt-10 space-y-6 rounded-[32px] border border-white/10 bg-[#1B405B] p-7 sm:p-9">
          <label className="block"><span className="text-sm font-semibold">File</span><input name="file" type="file" required className="mt-2 block w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm" /></label>
          <div className="grid gap-5 md:grid-cols-2">
            <label><span className="text-sm font-semibold">Document title</span><input name="title" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3" /></label>
            <label><span className="text-sm font-semibold">Revision</span><input name="revision" placeholder="P01 / C01 / Rev A" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3" /></label>
            <label><span className="text-sm font-semibold">Document type</span><select name="document_type" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><option value="ga_plan">GA plan</option><option value="rcp">RCP</option><option value="elevation">Elevation</option><option value="section">Section</option><option value="window_schedule">Window schedule</option><option value="survey">Survey</option><option value="photo">Photo</option><option value="manufacturer_data">Manufacturer data</option><option value="other">Other</option></select></label>
            <label><span className="text-sm font-semibold">Evidence status</span><select name="evidence_status" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><option value="for_review">For review</option><option value="usable">Usable</option><option value="insufficient">Insufficient</option><option value="superseded">Superseded</option></select></label>
            <label><span className="text-sm font-semibold">Issued date</span><input name="issued_at" type="date" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3" /></label>
            <label><span className="text-sm font-semibold">Provenance</span><select name="provenance" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><option value="confirmed_project_information">Confirmed project information</option><option value="design_team_preference">Design-team preference</option><option value="apex_preliminary_recommendation">Apex preliminary recommendation</option><option value="unresolved">Unresolved</option></select></label>
          </div>
          <button className="rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Upload & register revision</button>
        </form>
      </div>
    </main>
  );
}
