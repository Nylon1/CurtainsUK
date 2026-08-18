import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createDrawingMarkup, resolveDrawingMarkup } from "@/app/professionals/workspace/design-actions";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = { title: "Drawing Review | Apex Professional", robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }> };

const markupTypes = [
  ["coordination", "Coordination"],
  ["rfi", "RFI"],
  ["risk", "Risk"],
  ["track_route", "Track route"],
  ["fixing", "Fixing"],
  ["dimension", "Dimension"],
  ["note", "Note"],
];

export default async function Page({ params }: Props) {
  let auth;
  try { auth = await requireProfessionalUser(); } catch { redirect("/professionals/workspace/login"); }
  const { id } = await params;
  const { supabase } = auth;

  const [projectResult, documentsResult, aperturesResult, markupsResult] = await Promise.all([
    supabase.from("professional_projects").select("id,reference,name").eq("id", id).single(),
    supabase.from("professional_project_documents").select("id,title,document_type,revision,evidence_status").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("professional_project_apertures").select("id,reference,room").eq("project_id", id).order("reference"),
    supabase.from("professional_project_markups").select("id,document_id,aperture_id,page_no,markup_type,title,note,status,created_at,resolved_at").eq("project_id", id).order("created_at", { ascending: false }),
  ]);

  if (projectResult.error || !projectResult.data) notFound();
  if (documentsResult.error) throw documentsResult.error;
  if (aperturesResult.error) throw aperturesResult.error;
  if (markupsResult.error) throw markupsResult.error;

  const project = projectResult.data;
  const documents = documentsResult.data || [];
  const apertures = aperturesResult.data || [];
  const markups = markupsResult.data || [];
  const documentMap = new Map(documents.map((doc) => [doc.id, doc]));
  const apertureMap = new Map(apertures.map((aperture) => [aperture.id, aperture]));
  const reviewDocuments = documents.filter((doc) => ["ga_plan", "rcp", "elevation", "section", "window_schedule", "survey", "manufacturer_data", "other"].includes(doc.document_type));

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-7xl">
        <Link href={`/professionals/workspace/live/projects/${id}`} className="text-sm text-[#C8D1D8]">← {project.reference}</Link>
        <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b]">Drawing coordination</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">Drawing review</h1>
            <p className="mt-4 max-w-4xl leading-8 text-[#C8D1D8]">Review controlled project drawings and register page-specific coordination points against the exact document revision and, where relevant, the affected aperture.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/professionals/workspace/live/projects/${id}/documents/upload`} className="rounded-full bg-[#d6b56b] px-5 py-3 text-sm font-semibold text-apex-navy-950">Upload drawing</Link>
            <Link href={`/professionals/workspace/live/projects/${id}/schedule`} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Window schedule</Link>
          </div>
        </div>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1fr_0.82fr]">
          <div className="space-y-6">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Controlled drawings</p><h2 className="mt-2 text-2xl font-semibold">Open the source before commenting</h2></div>
                <span className="text-sm text-white/45">{reviewDocuments.length} records</span>
              </div>
              <div className="mt-6 space-y-3">
                {reviewDocuments.length === 0 ? <p className="text-sm text-[#C8D1D8]">No drawings or schedules are registered yet.</p> : reviewDocuments.map((doc) => (
                  <div key={doc.id} className="rounded-2xl border border-white/10 bg-black/15 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.14em] text-[#d6b56b]">{doc.document_type.replaceAll("_", " ")} · Rev {doc.revision || "—"}</div>
                        <div className="mt-1 font-semibold">{doc.title}</div>
                        <div className="mt-2 text-xs text-white/45">Evidence status: {doc.evidence_status.replaceAll("_", " ")}</div>
                      </div>
                      <Link target="_blank" href={`/professionals/workspace/live/projects/${id}/documents/${doc.id}/open`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold">Open controlled file ↗</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Review register</p><h2 className="mt-2 text-2xl font-semibold">Coordination points & markups</h2></div><span className="text-sm text-white/45">{markups.filter((item) => item.status === "open").length} open</span></div>
              <div className="mt-6 space-y-3">
                {markups.length === 0 ? <p className="text-sm text-[#C8D1D8]">No drawing review points have been recorded.</p> : markups.map((item) => {
                  const doc = documentMap.get(item.document_id);
                  const aperture = item.aperture_id ? apertureMap.get(item.aperture_id) : null;
                  return (
                    <article key={item.id} className="rounded-2xl border border-white/10 bg-black/15 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-[0.14em] text-[#d6b56b]">{item.markup_type.replaceAll("_", " ")} · {item.status}</div>
                          <h3 className="mt-1 font-semibold">{item.title}</h3>
                          <p className="mt-2 text-sm text-[#C8D1D8]">{doc?.title || "Document"}{doc?.revision ? ` · Rev ${doc.revision}` : ""}{item.page_no ? ` · Page ${item.page_no}` : ""}</p>
                          {aperture ? <p className="mt-1 text-xs text-white/45">Aperture {aperture.reference}{aperture.room ? ` · ${aperture.room}` : ""}</p> : null}
                          {item.note ? <p className="mt-3 text-sm leading-7 text-[#C8D1D8]">{item.note}</p> : null}
                        </div>
                        {item.status === "open" ? <form action={resolveDrawingMarkup.bind(null, id, item.id)}><button className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold">Resolve</button></form> : <span className="text-xs text-white/40">Resolved</span>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          <aside>
            <form action={createDrawingMarkup.bind(null, id)} className="sticky top-28 rounded-[30px] border border-[#d6b56b]/25 bg-[#1B405B] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Add review point</p>
              <h2 className="mt-2 text-2xl font-semibold">Link a comment to controlled evidence</h2>
              <div className="mt-6 space-y-4">
                <label className="block"><span className="text-sm font-semibold">Drawing / document</span><select name="document_id" required className="mt-2 w-full rounded-2xl border border-white/10 bg-apex-navy-950 px-4 py-3"><option value="">Select record</option>{reviewDocuments.map((doc) => <option key={doc.id} value={doc.id}>{doc.title} · Rev {doc.revision || "—"}</option>)}</select></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="text-sm font-semibold">Type</span><select name="markup_type" className="mt-2 w-full rounded-2xl border border-white/10 bg-apex-navy-950 px-4 py-3">{markupTypes.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="block"><span className="text-sm font-semibold">Page</span><input name="page_no" type="number" min="1" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3" /></label>
                </div>
                <label className="block"><span className="text-sm font-semibold">Aperture (optional)</span><select name="aperture_id" className="mt-2 w-full rounded-2xl border border-white/10 bg-apex-navy-950 px-4 py-3"><option value="">Project-wide</option>{apertures.map((aperture) => <option key={aperture.id} value={aperture.id}>{aperture.reference}{aperture.room ? ` · ${aperture.room}` : ""}</option>)}</select></label>
                <label className="block"><span className="text-sm font-semibold">Title</span><input name="title" required className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3" placeholder="e.g. Confirm substrate at track centreline" /></label>
                <label className="block"><span className="text-sm font-semibold">Review note</span><textarea name="note" rows={5} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3" placeholder="Record the coordination question, decision needed or drawing observation." /></label>
                <button disabled={reviewDocuments.length === 0} className="w-full rounded-full bg-[#d6b56b] px-5 py-3 text-sm font-semibold text-apex-navy-950 disabled:cursor-not-allowed disabled:opacity-40">Add to review register</button>
              </div>
              <p className="mt-5 text-xs leading-6 text-[#C8D1D8]">This V1 review register links comments to a document revision and page. It does not alter or overwrite the source drawing.</p>
            </form>
          </aside>
        </section>
      </div>
    </main>
  );
}
