import Link from "next/link";
import { redirect } from "next/navigation";
import { createProjectAction } from "@/app/professionals/workspace/actions";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = { title: "Raise RFI or Action | Apex Professional", robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  try { await requireProfessionalUser(); } catch { redirect("/professionals/workspace/login"); }
  const { id } = await params;
  const action = createProjectAction.bind(null, id);
  const input = "mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none";

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-4xl">
        <Link href={`/professionals/workspace/live/projects/${id}`} className="text-sm text-[#C8D1D8]">← Project</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b56b]">Coordination register</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-6xl">Raise an RFI, approval, survey or project action.</h1>
        <p className="mt-5 max-w-3xl leading-8 text-[#C8D1D8]">Use actions to keep unresolved interfaces visible and owned. Do not bury fixing, geometry, access or specification gaps inside general notes.</p>
        <form action={action} className="mt-10 rounded-[32px] border border-white/10 bg-[#1B405B] p-7 sm:p-9">
          <div className="grid gap-5 md:grid-cols-2">
            <label><span className="text-sm font-semibold">Action type</span><select name="action_type" className={input}><option value="rfi">RFI</option><option value="action">Action</option><option value="approval">Approval</option><option value="survey">Survey</option><option value="installation">Installation</option><option value="handover">Handover</option></select></label>
            <label><span className="text-sm font-semibold">Due date / time</span><input name="due_at" type="datetime-local" className={input} /></label>
          </div>
          <label className="mt-5 block"><span className="text-sm font-semibold">Title *</span><input name="title" required className={input} placeholder="Confirm fixing substrate at W-01 track line" /></label>
          <label className="mt-5 block"><span className="text-sm font-semibold">Description / information required</span><textarea name="description" rows={6} className={input} placeholder="State the exact information, decision or evidence needed to close this item." /></label>
          <button className="mt-7 rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Create item</button>
        </form>
      </div>
    </main>
  );
}
