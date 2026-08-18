import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfessionalUser } from "@/lib/professional-platform/server";
import { createSpecificationItem, updateSpecificationItem } from "@/app/professionals/workspace/live/operational-actions";

export const metadata = { title: "Specification Items | Apex Curtains", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  let supabase;
  try { ({ supabase } = await requireProfessionalUser()); } catch { redirect("/professionals/workspace/login"); }

  const [projectResult, itemsResult, revisionsResult, documentsResult] = await Promise.all([
    supabase.from("professional_projects").select("id,reference,name").eq("id", id).single(),
    supabase.from("professional_project_spec_items").select("*").eq("project_id", id).order("category").order("item_key"),
    supabase.from("professional_project_spec_revisions").select("*").eq("project_id", id).order("changed_at", { ascending: false }),
    supabase.from("professional_project_documents").select("id,title,revision").eq("project_id", id).order("created_at", { ascending: false }),
  ]);

  if (projectResult.error) notFound();
  if (itemsResult.error) throw itemsResult.error;
  if (revisionsResult.error) throw revisionsResult.error;
  if (documentsResult.error) throw documentsResult.error;

  const items = itemsResult.data ?? [];
  const revisions = revisionsResult.data ?? [];
  const documents = documentsResult.data ?? [];
  const createAction = createSpecificationItem.bind(null, id);

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-7xl">
        <Link href={`/professionals/workspace/live/projects/${id}`} className="text-sm text-[#C8D1D8] hover:text-white">← {projectResult.data.reference}</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b56b]">Controlled specification register</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">Specification decisions with revision history</h1>
        <p className="mt-5 max-w-3xl leading-8 text-[#C8D1D8]">Each change is snapshotted. Status and provenance stay attached to the item so a preliminary recommendation cannot quietly become confirmed project information.</p>

        <section className="mt-10 rounded-[30px] border border-white/10 bg-[#1B405B] p-7">
          <h2 className="text-2xl font-semibold">Add specification item</h2>
          <form action={createAction} className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <input name="category" placeholder="Category: track / heading / lining" className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3" />
            <input name="item_key" required placeholder="Item key: track_system" className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3" />
            <input name="value_text" placeholder="Current value / requirement" className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3" />
            <select name="status" className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><option value="unresolved">Unresolved</option><option value="preliminary">Preliminary</option><option value="confirmed">Confirmed</option></select>
            <select name="provenance" className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><option value="unresolved">Unresolved</option><option value="confirmed_project_information">Confirmed project information</option><option value="design_team_preference">Design-team preference</option><option value="apex_preliminary_recommendation">Apex preliminary recommendation</option></select>
            <select name="source_document_id" className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><option value="">No source document</option>{documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.title}{doc.revision ? ` · ${doc.revision}` : ""}</option>)}</select>
            <textarea name="notes" placeholder="Notes / constraint / approval context" className="md:col-span-2 lg:col-span-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3" rows={3} />
            <button className="w-fit rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Add controlled item</button>
          </form>
        </section>

        <section className="mt-8 space-y-5">
          {items.length === 0 ? <p className="text-[#C8D1D8]">No specification items yet.</p> : items.map((item) => {
            const itemRevisions = revisions.filter((revision) => revision.spec_item_id === item.id).slice(0, 5);
            const updateAction = updateSpecificationItem.bind(null, id, item.id);
            return (
              <article key={item.id} className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className="text-xs uppercase tracking-[0.16em] text-[#d6b56b]">{item.category}</p><h2 className="mt-2 text-2xl font-semibold">{item.item_key.replaceAll("_", " ")}</h2></div>
                  <div className="text-right text-xs text-[#C8D1D8]"><div>{item.status}</div><div className="mt-1 text-[#d6b56b]">{item.provenance.replaceAll("_", " ")}</div></div>
                </div>
                <form action={updateAction} className="mt-6 grid gap-4 md:grid-cols-2">
                  <input name="value_text" defaultValue={item.value_text ?? ""} placeholder="Value / requirement" className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3" />
                  <select name="status" defaultValue={item.status} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><option value="unresolved">Unresolved</option><option value="preliminary">Preliminary</option><option value="confirmed">Confirmed</option><option value="superseded">Superseded</option></select>
                  <select name="provenance" defaultValue={item.provenance} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><option value="unresolved">Unresolved</option><option value="confirmed_project_information">Confirmed project information</option><option value="design_team_preference">Design-team preference</option><option value="apex_preliminary_recommendation">Apex preliminary recommendation</option></select>
                  <select name="source_document_id" defaultValue={item.source_document_id ?? ""} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><option value="">No source document</option>{documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.title}{doc.revision ? ` · ${doc.revision}` : ""}</option>)}</select>
                  <textarea name="notes" defaultValue={item.notes ?? ""} className="md:col-span-2 rounded-2xl border border-white/10 bg-black/15 px-4 py-3" rows={3} />
                  <button className="w-fit rounded-full border border-[#d6b56b]/40 px-5 py-2.5 text-sm font-semibold text-[#d6b56b]">Save new revision</button>
                </form>
                {itemRevisions.length > 0 ? <div className="mt-6 border-t border-white/10 pt-5"><p className="text-xs uppercase tracking-[0.16em] text-white/45">Recent revision history</p><div className="mt-3 space-y-2">{itemRevisions.map((revision) => <div key={revision.id} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-[#C8D1D8]"><span className="font-semibold text-white">Rev {revision.revision_no}</span> · {revision.value_text || "—"} · {revision.status} · {revision.provenance.replaceAll("_", " ")}</div>)}</div></div> : null}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
