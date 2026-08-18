import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = { title: "Project Activity | Apex Curtains", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

type ActivityItem = { id: string; at: string; type: string; title: string; detail: string };

export default async function Page({ params }: Props) {
  const { id } = await params;
  let supabase;
  try { ({ supabase } = await requireProfessionalUser()); } catch { redirect("/professionals/workspace/login"); }

  const [projectResult, aperturesResult, documentsResult, specsResult, actionsResult, risksResult, exportsResult] = await Promise.all([
    supabase.from("professional_projects").select("id,reference,name,created_at,updated_at").eq("id", id).single(),
    supabase.from("professional_project_apertures").select("id,reference,created_at,updated_at,status,provenance").eq("project_id", id),
    supabase.from("professional_project_documents").select("id,title,revision,created_at,evidence_status").eq("project_id", id),
    supabase.from("professional_project_spec_revisions").select("id,item_key,revision_no,changed_at,status,provenance").eq("project_id", id),
    supabase.from("professional_project_actions").select("id,title,action_type,created_at,completed_at,status").eq("project_id", id),
    supabase.from("professional_project_risks").select("id,title,severity,created_at,resolved_at,status").eq("project_id", id),
    supabase.from("professional_project_exports").select("id,version_no,created_at,status").eq("project_id", id),
  ]);

  if (projectResult.error) notFound();
  for (const result of [aperturesResult, documentsResult, specsResult, actionsResult, risksResult, exportsResult]) if (result.error) throw result.error;

  const activity: ActivityItem[] = [
    { id: `project-${id}`, at: projectResult.data.created_at, type: "project", title: "Project created", detail: projectResult.data.reference },
    ...(aperturesResult.data ?? []).map((item) => ({ id: `ap-${item.id}`, at: item.updated_at || item.created_at, type: "aperture", title: `Aperture ${item.reference}`, detail: `${item.status} · ${item.provenance.replaceAll("_", " ")}` })),
    ...(documentsResult.data ?? []).map((item) => ({ id: `doc-${item.id}`, at: item.created_at, type: "document", title: item.title, detail: `Revision ${item.revision || "—"} · ${item.evidence_status.replaceAll("_", " ")}` })),
    ...(specsResult.data ?? []).map((item) => ({ id: `spec-${item.id}`, at: item.changed_at, type: "specification", title: `${item.item_key.replaceAll("_", " ")} · Rev ${item.revision_no}`, detail: `${item.status} · ${item.provenance.replaceAll("_", " ")}` })),
    ...(actionsResult.data ?? []).flatMap((item) => [
      { id: `action-${item.id}`, at: item.created_at, type: item.action_type, title: item.title, detail: item.status },
      ...(item.completed_at ? [{ id: `action-complete-${item.id}`, at: item.completed_at, type: "completion", title: item.title, detail: "completed" }] : []),
    ]),
    ...(risksResult.data ?? []).flatMap((item) => [
      { id: `risk-${item.id}`, at: item.created_at, type: "risk", title: item.title, detail: `${item.severity} · ${item.status}` },
      ...(item.resolved_at ? [{ id: `risk-resolved-${item.id}`, at: item.resolved_at, type: "risk closure", title: item.title, detail: item.status }] : []),
    ]),
    ...(exportsResult.data ?? []).map((item) => ({ id: `export-${item.id}`, at: item.created_at, type: "controlled export", title: `Specification export v${item.version_no}`, detail: item.status })),
  ].filter((item) => item.at).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-5xl">
        <Link href={`/professionals/workspace/live/projects/${id}`} className="text-sm text-[#C8D1D8] hover:text-white">← {projectResult.data.reference}</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b56b]">Audit trail</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">Project activity timeline</h1>
        <p className="mt-5 max-w-3xl leading-8 text-[#C8D1D8]">A chronological view of project evidence, aperture changes, specification revisions, RFIs, risk closures and controlled outputs.</p>

        <div className="mt-10 space-y-3">
          {activity.map((item) => (
            <article key={item.id} className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:grid-cols-[150px_1fr]">
              <div className="text-xs text-white/45">{new Date(item.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</div>
              <div><div className="text-xs uppercase tracking-[0.14em] text-[#d6b56b]">{item.type}</div><h2 className="mt-1 font-semibold">{item.title}</h2><p className="mt-1 text-sm text-[#C8D1D8]">{item.detail}</p></div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
