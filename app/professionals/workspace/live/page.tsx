import Link from "next/link";
import { redirect } from "next/navigation";
import { listProfessionalProjects, requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = {
  title: "Professional Project Workspace | Apex Curtains",
  robots: { index: false, follow: false },
};

export default async function Page() {
  try {
    await requireProfessionalUser();
  } catch {
    redirect("/professionals/workspace/login");
  }

  const projects = await listProfessionalProjects();

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">Live professional workspace</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">Your project records</h1>
            <p className="mt-5 max-w-3xl leading-8 text-[#C8D1D8]">Projects shown here are returned through authenticated, project-scoped Row Level Security rather than demo data.</p>
          </div>
          <Link href="/professionals/workspace/live/new-project" className="rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Create project</Link>
        </div>

        {projects.length === 0 ? (
          <section className="mt-12 rounded-[32px] border border-white/10 bg-[#1B405B] p-8">
            <h2 className="text-2xl font-semibold">No projects yet</h2>
            <p className="mt-3 text-[#C8D1D8]">Create the first professional project record. Apertures, drawings, specification items, RFIs and actions are added after project creation.</p>
          </section>
        ) : (
          <section className="mt-12 grid gap-5 lg:grid-cols-2">
            {projects.map((project) => (
              <Link key={project.id} href={`/professionals/workspace/live/projects/${project.id}`} className="rounded-[30px] border border-white/10 bg-[#1B405B] p-7 transition hover:border-[#d6b56b]/40">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full border border-[#d6b56b]/25 bg-[#d6b56b]/10 px-3 py-1 text-xs font-semibold text-[#d6b56b]">{project.project_stage.replaceAll("_", " ")}</span>
                  <span className="text-xs text-white/45">{project.reference}</span>
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-[#F4F0E8]">{project.name}</h2>
                <p className="mt-2 text-sm text-[#C8D1D8]">{project.location || "Location not yet set"}</p>
                <p className="mt-5 text-xs uppercase tracking-[0.16em] text-white/45">{project.status.replaceAll("_", " ")}</p>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
