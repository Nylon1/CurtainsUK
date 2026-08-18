import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { initialiseHandoverChecklist, setHandoverItemStatus } from "@/app/professionals/workspace/template-handover-actions";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = { title: "Project Handover | Apex Professional", robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  let auth;
  try { auth = await requireProfessionalUser(); } catch { redirect("/professionals/workspace/login"); }
  const { id } = await params;
  const { supabase } = auth;

  const { data: project, error: projectError } = await supabase.from("professional_projects").select("id,reference,name,status").eq("id", id).single();
  if (projectError || !project) notFound();
  const { data: items, error } = await supabase.from("professional_project_handover_items").select("*").eq("project_id", id).order("created_at");
  if (error) throw error;

  const complete = (items || []).filter((item) => item.status === "completed" || item.status === "not_applicable").length;
  const total = (items || []).length;

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40 print:bg-white print:text-black">
      <div className="mx-auto max-w-6xl">
        <div className="print:hidden"><Link href={`/professionals/workspace/live/projects/${id}`} className="text-sm text-[#C8D1D8]">← {project.reference}</Link></div>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b] print:mt-0 print:text-black">Close-out & handover</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl print:text-3xl">{project.name} · handover control</h1>
        <p className="mt-5 max-w-4xl leading-8 text-[#C8D1D8] print:text-black">A structured close-out record for installation, operation, evidence, snagging and project handover. Completing this checklist does not by itself certify structural, regulatory or manufacturer compliance.</p>

        {total === 0 ? (
          <form action={initialiseHandoverChecklist.bind(null, id)} className="mt-10 rounded-[28px] border border-white/10 bg-[#1B405B] p-7 print:hidden">
            <h2 className="text-2xl font-semibold">Start the project handover checklist</h2>
            <p className="mt-3 text-[#C8D1D8]">Seed a standard close-out structure, then record project-specific completion against each item.</p>
            <button className="mt-6 rounded-full bg-[#d6b56b] px-5 py-3 text-sm font-semibold text-apex-navy-950">Create checklist</button>
          </form>
        ) : (
          <>
            <section className="mt-10 grid gap-4 md:grid-cols-3 print:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#1B405B] p-5 print:border-gray-300 print:bg-white"><div className="text-xs uppercase tracking-[0.14em] text-white/45 print:text-gray-500">Items</div><div className="mt-2 text-3xl font-semibold">{total}</div></div>
              <div className="rounded-2xl border border-white/10 bg-[#1B405B] p-5 print:border-gray-300 print:bg-white"><div className="text-xs uppercase tracking-[0.14em] text-white/45 print:text-gray-500">Closed</div><div className="mt-2 text-3xl font-semibold">{complete}</div></div>
              <div className="rounded-2xl border border-white/10 bg-[#1B405B] p-5 print:border-gray-300 print:bg-white"><div className="text-xs uppercase tracking-[0.14em] text-white/45 print:text-gray-500">Open</div><div className="mt-2 text-3xl font-semibold">{total - complete}</div></div>
            </section>

            <section className="mt-8 space-y-3">
              {(items || []).map((item) => (
                <article key={item.id} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 print:break-inside-avoid print:border-gray-300 print:bg-white">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-[#d6b56b] print:text-gray-600">{item.category.replaceAll("_", " ")}</div>
                      <h2 className="mt-1 font-semibold">{item.title}</h2>
                      <div className="mt-2 text-sm text-[#C8D1D8] print:text-gray-600">Status: {item.status.replaceAll("_", " ")}{item.completed_at ? ` · ${new Date(item.completed_at).toLocaleString("en-GB")}` : ""}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 print:hidden">
                      <form action={setHandoverItemStatus.bind(null, id, item.id, "completed")}><button className="rounded-full bg-[#d6b56b] px-4 py-2 text-xs font-semibold text-apex-navy-950">Complete</button></form>
                      <form action={setHandoverItemStatus.bind(null, id, item.id, "not_applicable")}><button className="rounded-full border border-white/15 px-4 py-2 text-xs">N/A</button></form>
                      <form action={setHandoverItemStatus.bind(null, id, item.id, "open")}><button className="rounded-full border border-white/15 px-4 py-2 text-xs">Reopen</button></form>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <section className="mt-8 rounded-[24px] border border-[#d6b56b]/25 bg-[#d6b56b]/10 p-6 print:border-black print:bg-white">
              <h2 className="text-xl font-semibold">Handover status</h2>
              <p className="mt-3 text-sm leading-7 text-[#C8D1D8] print:text-black">{complete === total ? "All recorded handover items are closed or marked not applicable. Review the project evidence, outstanding risks and controlled export register before final project closure." : "Handover remains open. Outstanding checklist items should stay visible until closed or explicitly marked not applicable."}</p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
