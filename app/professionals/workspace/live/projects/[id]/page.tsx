import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProfessionalProject, requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = {
  title: "Professional Project | Apex Curtains",
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
    data = await getProfessionalProject(id);
  } catch {
    notFound();
  }

  const { project, apertures, specificationItems, risks, actions, documents } = data;

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-7xl">
        <Link href="/professionals/workspace/live" className="text-sm text-[#C8D1D8] hover:text-white">← Project workspace</Link>
        <div className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b56b]">{project.reference}</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">{project.name}</h1>
            <p className="mt-4 text-[#C8D1D8]">{project.location || "Location not yet set"} · {project.project_stage.replaceAll("_", " ")}</p>
          </div>
          <div className="rounded-full border border-[#d6b56b]/25 bg-[#d6b56b]/10 px-4 py-2 text-sm font-semibold text-[#d6b56b]">{project.status.replaceAll("_", " ")}</div>
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[
            ["Apertures", apertures.length],
            ["Documents", documents.length],
            ["Spec items", specificationItems.length],
            ["Open risks", risks.filter((risk) => risk.status === "open" || risk.status === "monitoring").length],
            ["Actions", actions.filter((action) => action.status !== "completed" && action.status !== "cancelled").length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-[24px] border border-white/10 bg-[#1B405B] p-5">
              <div className="text-xs uppercase tracking-[0.16em] text-white/45">{label}</div>
              <div className="mt-2 text-3xl font-semibold">{value}</div>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Aperture register</p>
                <h2 className="mt-2 text-2xl font-semibold">Openings and interfaces</h2>
              </div>
            </div>
            {apertures.length === 0 ? (
              <p className="mt-6 text-sm leading-7 text-[#C8D1D8]">No apertures have been registered yet. This is the next operational workflow to wire.</p>
            ) : (
              <div className="mt-6 space-y-3">
                {apertures.map((aperture) => (
                  <div key={aperture.id} className="rounded-2xl border border-white/10 bg-black/15 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-semibold">{aperture.reference} {aperture.room ? `· ${aperture.room}` : ""}</div>
                      <span className="text-xs text-[#d6b56b]">{aperture.provenance.replaceAll("_", " ")}</span>
                    </div>
                    <div className="mt-3 text-sm text-[#C8D1D8]">{aperture.window_type || "Window type unresolved"} · {aperture.fixing_position || "Fixing position unresolved"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-[30px] border border-white/10 bg-[#1B405B] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Design freeze</p>
              <h2 className="mt-3 text-2xl font-semibold">Unresolved evidence stays visible</h2>
              <p className="mt-4 text-sm leading-7 text-[#C8D1D8]">A project is not manufacture-ready merely because fields have been populated. Confirmed project evidence, design-team preference and Apex preliminary recommendations remain separate until the relevant survey, manufacturer data or approval closes the gap.</p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-xl font-semibold">Next operational modules</h2>
              <div className="mt-5 space-y-2 text-sm text-[#C8D1D8]">
                <div className="rounded-xl border border-white/10 px-4 py-3">Add / edit aperture</div>
                <div className="rounded-xl border border-white/10 px-4 py-3">Register drawing revision</div>
                <div className="rounded-xl border border-white/10 px-4 py-3">Raise RFI / assign action</div>
                <div className="rounded-xl border border-white/10 px-4 py-3">Build controlled specification export</div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
