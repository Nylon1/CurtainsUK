import Link from "next/link";
import { redirect } from "next/navigation";
import { registerProjectDocument } from "@/app/professionals/workspace/actions";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = { title: "Register Document | Apex Professional", robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  try { await requireProfessionalUser(); } catch { redirect("/professionals/workspace/login"); }
  const { id } = await params;
  const action = registerProjectDocument.bind(null, id);
  const input = "mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none";

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-4xl">
        <Link href={`/professionals/workspace/live/projects/${id}`} className="text-sm text-[#C8D1D8]">← Project</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b56b]">Evidence register</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-6xl">Register or upload a controlled project document.</h1>
        <p className="mt-5 max-w-3xl leading-8 text-[#C8D1D8]">Revision and evidence status matter. Registering or uploading a file does not mean it is suitable for manufacture, fixing approval or final specification.</p>
        <div className="mt-7">
          <Link href={`/professionals/workspace/live/projects/${id}/documents/upload`} className="inline-flex rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Upload private project file</Link>
        </div>
        <form action={action} className="mt-10 rounded-[32px] border border-white/10 bg-[#1B405B] p-7 sm:p-9">
          <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d6b56b]">External / existing source</p><p className="mt-2 text-sm text-[#C8D1D8]">Use this form when the controlled file already lives in a project portal or external document system.</p></div>
          <div className="grid gap-5 md:grid-cols-2">
            <label><span className="text-sm font-semibold">Title *</span><input name="title" required className={input} placeholder="North elevation" /></label>
            <label><span className="text-sm font-semibold">Document type</span><select name="document_type" className={input}><option value="ga_plan">GA plan</option><option value="rcp">Reflected ceiling plan</option><option value="elevation">Elevation</option><option value="section">Section</option><option value="window_schedule">Window schedule</option><option value="photo">Photo set</option><option value="survey">Survey</option><option value="manufacturer_data">Manufacturer data</option><option value="other">Other</option></select></label>
            <label><span className="text-sm font-semibold">Revision</span><input name="revision" className={input} placeholder="P03 / C02 / Rev B" /></label>
            <label><span className="text-sm font-semibold">Issued at</span><input name="issued_at" type="datetime-local" className={input} /></label>
            <label><span className="text-sm font-semibold">Evidence status</span><select name="evidence_status" className={input}><option value="for_review">For review</option><option value="usable">Usable</option><option value="insufficient">Insufficient</option><option value="superseded">Superseded</option></select></label>
            <label><span className="text-sm font-semibold">Provenance</span><select name="provenance" className={input} defaultValue="confirmed_project_information"><option value="confirmed_project_information">Confirmed project information</option><option value="design_team_preference">Design-team preference</option><option value="apex_preliminary_recommendation">Apex preliminary recommendation</option><option value="unresolved">Unresolved</option></select></label>
          </div>
          <label className="mt-5 block"><span className="text-sm font-semibold">Source URL / document location</span><input name="source_url" className={input} placeholder="Project portal, shared link or controlled document URL" /></label>
          <button className="mt-7 rounded-full border border-[#d6b56b]/40 px-6 py-3 text-sm font-semibold text-[#d6b56b]">Register external source</button>
        </form>
      </div>
    </main>
  );
}
