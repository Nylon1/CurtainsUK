import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createControlledProjectExport } from "@/app/professionals/workspace/control-actions";
import { getProjectCollaboration, requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = {
  title: "Controlled Exports | Apex Professional Platform",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  try {
    await requireProfessionalUser();
  } catch {
    redirect("/professionals/workspace/login");
  }

  const { id } = await params;
  let data;
  try {
    data = await getProjectCollaboration(id);
  } catch {
    notFound();
  }

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-6xl">
        <Link href={`/professionals/workspace/live/projects/${id}`} className="text-sm text-[#C8D1D8] hover:text-white">← {data.project.reference}</Link>
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b]">Controlled project record</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Specification export register</h1>
            <p className="mt-4 max-w-3xl text-[#C8D1D8]">Each export freezes a versioned snapshot of the project information visible at that moment. Unresolved risks, RFIs and evidence status remain inside the export rather than being silently omitted.</p>
          </div>
          <form action={createControlledProjectExport.bind(null, id, "preliminary_specification")}>
            <button className="rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Create preliminary export</button>
          </form>
        </div>

        <section className="mt-10 rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
          <div className="grid gap-3">
            {data.exports.length === 0 ? (
              <p className="text-sm leading-7 text-[#C8D1D8]">No controlled exports yet. Create one when the current project state needs to be shared, reviewed or frozen for coordination.</p>
            ) : data.exports.map((item) => (
              <Link key={item.id} href={`/professionals/workspace/live/projects/${id}/exports/${item.id}`} className="rounded-2xl border border-white/10 bg-black/15 p-5 transition hover:border-[#d6b56b]/30">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{item.export_type.replaceAll("_", " ")} · v{item.version}</div>
                    <div className="mt-1 text-sm text-[#C8D1D8]">Created {new Date(item.created_at).toLocaleString("en-GB")}</div>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-white/55">{item.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[26px] border border-[#d6b56b]/20 bg-[#d6b56b]/10 p-6 text-sm leading-7 text-[#C8D1D8]">
          These exports are coordination records. A preliminary export is not manufacture approval, structural confirmation or evidence that site dimensions have been surveyed.
        </section>
      </div>
    </main>
  );
}
