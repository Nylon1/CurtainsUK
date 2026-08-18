import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supersedeProjectDocument } from "@/app/professionals/workspace/template-handover-actions";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = { title: "Document Control | Apex Professional", robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  let auth;
  try { auth = await requireProfessionalUser(); } catch { redirect("/professionals/workspace/login"); }
  const { id } = await params;
  const { supabase } = auth;
  const { data: project, error: projectError } = await supabase.from("professional_projects").select("id,reference,name").eq("id", id).single();
  if (projectError || !project) notFound();
  const { data: documents, error } = await supabase
    .from("professional_project_documents")
    .select("id,title,document_type,revision,evidence_status,source_url,issued_at,created_at,superseded_at,retention_status")
    .eq("project_id", id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-6xl">
        <Link href={`/professionals/workspace/live/projects/${id}`} className="text-sm text-[#C8D1D8]">← {project.reference}</Link>
        <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b]">Evidence lifecycle</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">Document control</h1>
            <p className="mt-4 max-w-3xl leading-8 text-[#C8D1D8]">Keep revisions visible and explicitly supersede obsolete evidence. Superseding does not automatically destroy the stored file; retention is deliberate so the project audit trail is preserved.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/professionals/workspace/live/projects/${id}/drawing-review`} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Drawing review</Link>
            <Link href={`/professionals/workspace/live/projects/${id}/documents/upload`} className="rounded-full bg-[#d6b56b] px-5 py-3 text-sm font-semibold text-apex-navy-950">Upload evidence</Link>
            <Link href={`/professionals/workspace/live/projects/${id}/documents/new`} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Register external record</Link>
          </div>
        </div>

        <section className="mt-10 space-y-3">
          {(documents || []).length === 0 ? <p className="text-[#C8D1D8]">No project documents registered.</p> : (documents || []).map((doc) => (
            <article key={doc.id} className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-[#d6b56b]">{doc.document_type.replaceAll("_", " ")} · rev {doc.revision || "—"}</div>
                  <h2 className="mt-1 text-xl font-semibold">{doc.title}</h2>
                  <p className="mt-2 text-sm text-[#C8D1D8]">Evidence: {doc.evidence_status.replaceAll("_", " ")} · retention: {doc.retention_status.replaceAll("_", " ")}</p>
                  {doc.superseded_at ? <p className="mt-1 text-xs text-white/45">Superseded {new Date(doc.superseded_at).toLocaleString("en-GB")}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link target="_blank" href={`/professionals/workspace/live/projects/${id}/documents/${doc.id}/open`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold">Open file ↗</Link>
                  {doc.evidence_status !== "superseded" ? (
                    <form action={supersedeProjectDocument.bind(null, id, doc.id)}>
                      <button className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold">Mark superseded</button>
                    </form>
                  ) : <span className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/45">Retained for audit trail</span>}
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[26px] border border-[#d6b56b]/20 bg-[#d6b56b]/10 p-6 text-sm leading-7 text-[#C8D1D8]">
          Storage-cleanup policy: project evidence should not be physically deleted simply because a new revision is issued. Permanent deletion should be a separate authorised retention action, with project need and audit implications considered first.
        </section>
      </div>
    </main>
  );
}
