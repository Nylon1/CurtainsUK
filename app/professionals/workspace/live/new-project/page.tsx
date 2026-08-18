import { redirect } from "next/navigation";
import { createProfessionalProject } from "../../actions";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = {
  title: "Create Professional Project | Apex Curtains",
  robots: { index: false, follow: false },
};

export default async function Page() {
  try {
    await requireProfessionalUser();
  } catch {
    redirect("/professionals/workspace/login");
  }

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">New project</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">Create the project record first.</h1>
        <p className="mt-6 max-w-3xl leading-8 text-[#C8D1D8]">This creates a persistent project and owner membership. Apertures, drawings, specification items, RFIs and actions are added within the project record.</p>

        <form action={createProfessionalProject} className="mt-10 rounded-[32px] border border-white/10 bg-[#1B405B] p-7 sm:p-9">
          <div className="grid gap-6 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-sm font-semibold">Project name</span>
              <input name="name" required placeholder="e.g. North elevation feature glazing" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 outline-none" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Client / project name</span>
              <input name="client_name" placeholder="Optional" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 outline-none" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Your lead role</span>
              <input name="lead_role" placeholder="Architect, interior designer, contractor..." className="mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 outline-none" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Project stage</span>
              <select name="project_stage" defaultValue="concept" className="mt-2 w-full rounded-2xl border border-white/10 bg-apex-navy-950 px-4 py-3 outline-none">
                <option value="concept">Concept</option>
                <option value="developed_design">Developed design</option>
                <option value="technical_design">Technical design</option>
                <option value="tender">Tender</option>
                <option value="construction">Construction</option>
                <option value="fit_out">Fit-out</option>
                <option value="handover">Handover</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Location</span>
              <input name="location" placeholder="Town, city or project address" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 outline-none" />
            </label>
          </div>
          <button className="mt-8 rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Create project record</button>
        </form>
      </div>
    </main>
  );
}
