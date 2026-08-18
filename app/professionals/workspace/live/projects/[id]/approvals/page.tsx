import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createDesignApproval, setDesignApprovalStatus } from "@/app/professionals/workspace/design-actions";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = { title: "Design Approvals | Apex Professional", robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }> };

const approvalTypes = [
  ["design", "Design concept"],
  ["track", "Track"],
  ["fabric", "Fabric"],
  ["lining", "Lining"],
  ["heading", "Heading"],
  ["fixing", "Fixing approach"],
  ["sample", "Sample"],
  ["other", "Other"],
];

function statusClass(status: string) {
  if (status === "approved") return "bg-emerald-400/10 text-emerald-200";
  if (status === "revise") return "bg-red-400/10 text-red-200";
  if (status === "submitted") return "bg-[#d6b56b]/10 text-[#d6b56b]";
  return "border border-white/10 text-white/50";
}

export default async function Page({ params }: Props) {
  let auth;
  try { auth = await requireProfessionalUser(); } catch { redirect("/professionals/workspace/login"); }
  const { id } = await params;
  const { supabase } = auth;

  const [projectResult, aperturesResult, specsResult, approvalsResult] = await Promise.all([
    supabase.from("professional_projects").select("id,reference,name").eq("id", id).single(),
    supabase.from("professional_project_apertures").select("id,reference,room").eq("project_id", id).order("reference"),
    supabase.from("professional_project_spec_items").select("id,aperture_id,category,item_key,value_text,status").eq("project_id", id).order("category"),
    supabase.from("professional_project_approvals").select("*").eq("project_id", id).order("created_at", { ascending: false }),
  ]);

  if (projectResult.error || !projectResult.data) notFound();
  if (aperturesResult.error) throw aperturesResult.error;
  if (specsResult.error) throw specsResult.error;
  if (approvalsResult.error) throw approvalsResult.error;

  const project = projectResult.data;
  const apertures = aperturesResult.data || [];
  const specs = specsResult.data || [];
  const approvals = approvalsResult.data || [];
  const apertureMap = new Map(apertures.map((item) => [item.id, item]));
  const specMap = new Map(specs.map((item) => [item.id, item]));

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-7xl">
        <Link href={`/professionals/workspace/live/projects/${id}`} className="text-sm text-[#C8D1D8]">← {project.reference}</Link>
        <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b]">Controlled decisions</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">Design approvals</h1>
            <p className="mt-4 max-w-4xl leading-8 text-[#C8D1D8]">Submit curtain and track decisions for review, record the outcome and keep superseded decisions visible. Approval here is a coordination record, not a substitute for survey or manufacture release controls.</p>
          </div>
          <Link href={`/professionals/workspace/live/projects/${id}/schedule`} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Window schedule</Link>
        </div>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1fr_0.78fr]">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
            <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Approval register</p><h2 className="mt-2 text-2xl font-semibold">Project design decisions</h2></div><span className="text-sm text-white/45">{approvals.length} records</span></div>
            <div className="mt-6 space-y-4">
              {approvals.length === 0 ? <p className="text-sm text-[#C8D1D8]">No approval records yet.</p> : approvals.map((approval) => {
                const aperture = approval.aperture_id ? apertureMap.get(approval.aperture_id) : null;
                const spec = approval.spec_item_id ? specMap.get(approval.spec_item_id) : null;
                return (
                  <article key={approval.id} className="rounded-2xl border border-white/10 bg-black/15 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><span className="text-xs uppercase tracking-[0.14em] text-[#d6b56b]">{approval.approval_type.replaceAll("_", " ")}</span><span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusClass(approval.status)}`}>{approval.status}</span></div>
                        <h3 className="mt-2 text-lg font-semibold">{approval.title}</h3>
                        {aperture ? <p className="mt-2 text-sm text-[#C8D1D8]">Aperture {aperture.reference}{aperture.room ? ` · ${aperture.room}` : ""}</p> : <p className="mt-2 text-sm text-[#C8D1D8]">Project-wide decision</p>}
                        {spec ? <p className="mt-1 text-xs text-white/45">Spec: {spec.category} · {spec.item_key}{spec.value_text ? ` = ${spec.value_text}` : ""}</p> : null}
                        {approval.note ? <p className="mt-3 text-sm leading-7 text-[#C8D1D8]">{approval.note}</p> : null}
                        <div className="mt-3 text-xs text-white/40">Created {new Date(approval.created_at).toLocaleString("en-GB")}{approval.reviewed_at ? ` · reviewed ${new Date(approval.reviewed_at).toLocaleString("en-GB")}` : ""}</div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:max-w-[220px] sm:justify-end">
                        {approval.status === "draft" ? <form action={setDesignApprovalStatus.bind(null, id, approval.id, "submitted")}><button className="rounded-full bg-[#d6b56b] px-4 py-2 text-xs font-semibold text-apex-navy-950">Submit for review</button></form> : null}
                        {approval.status === "submitted" ? <><form action={setDesignApprovalStatus.bind(null, id, approval.id, "approved")}><button className="rounded-full bg-emerald-300 px-4 py-2 text-xs font-semibold text-apex-navy-950">Approve</button></form><form action={setDesignApprovalStatus.bind(null, id, approval.id, "revise")}><button className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold">Request revision</button></form></> : null}
                        {(approval.status === "approved" || approval.status === "revise") ? <form action={setDesignApprovalStatus.bind(null, id, approval.id, "superseded")}><button className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/50">Supersede</button></form> : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside>
            <form action={createDesignApproval.bind(null, id)} className="sticky top-28 rounded-[30px] border border-[#d6b56b]/25 bg-[#1B405B] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">New approval item</p>
              <h2 className="mt-2 text-2xl font-semibold">Prepare a controlled decision</h2>
              <div className="mt-6 space-y-4">
                <label className="block"><span className="text-sm font-semibold">Approval type</span><select name="approval_type" className="mt-2 w-full rounded-2xl border border-white/10 bg-apex-navy-950 px-4 py-3">{approvalTypes.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="block"><span className="text-sm font-semibold">Aperture (optional)</span><select name="aperture_id" className="mt-2 w-full rounded-2xl border border-white/10 bg-apex-navy-950 px-4 py-3"><option value="">Project-wide</option>{apertures.map((aperture) => <option key={aperture.id} value={aperture.id}>{aperture.reference}{aperture.room ? ` · ${aperture.room}` : ""}</option>)}</select></label>
                <label className="block"><span className="text-sm font-semibold">Specification item (optional)</span><select name="spec_item_id" className="mt-2 w-full rounded-2xl border border-white/10 bg-apex-navy-950 px-4 py-3"><option value="">No linked spec item</option>{specs.map((spec) => <option key={spec.id} value={spec.id}>{spec.category} · {spec.item_key}{spec.value_text ? ` · ${spec.value_text}` : ""}</option>)}</select></label>
                <label className="block"><span className="text-sm font-semibold">Decision title</span><input name="title" required className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3" placeholder="e.g. Approve wave heading and ceiling track concept" /></label>
                <label className="block"><span className="text-sm font-semibold">Review note</span><textarea name="note" rows={5} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3" placeholder="Record what is being approved, limits of the decision and any outstanding dependencies." /></label>
                <button className="w-full rounded-full bg-[#d6b56b] px-5 py-3 text-sm font-semibold text-apex-navy-950">Create draft approval</button>
              </div>
            </form>
          </aside>
        </section>
      </div>
    </main>
  );
}
