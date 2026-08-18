import Link from "next/link";
import { redirect } from "next/navigation";
import { createProjectFromTemplate, savePresetTemplate } from "@/app/professionals/workspace/template-handover-actions";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = { title: "Project Templates | Apex Professional", robots: { index: false, follow: false } };

const presets = [
  ["housebuilder_plot", "Housebuilder repeated plot", "Seed repeatable opening references and a close-out checklist for multi-plot work."],
  ["architect_feature_glazing", "Architect feature glazing", "Start with a feature-opening record and design/evidence handover controls."],
  ["fit_out_package", "Contractor / fit-out package", "Create an installation-led record with site, operation, snagging and handover controls."],
] as const;

export default async function Page() {
  let auth;
  try { auth = await requireProfessionalUser(); } catch { redirect("/professionals/workspace/login"); }
  const { supabase, user } = auth;
  const { data: templates, error } = await supabase
    .from("professional_project_templates")
    .select("id,name,template_type,description,created_at")
    .eq("created_by", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const input = "mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none";

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-7xl">
        <Link href="/professionals/workspace/live" className="text-sm text-[#C8D1D8]">← Workspace</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b]">Repeat-project control</p>
        <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight sm:text-6xl">Reusable project templates without pretending every plot is identical.</h1>
        <p className="mt-5 max-w-4xl leading-8 text-[#C8D1D8]">Templates seed structure only. Geometry, fixing conditions, evidence, product selection and site constraints must still be confirmed for the actual project.</p>

        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          {presets.map(([key, title, text]) => (
            <form action={savePresetTemplate.bind(null, key)} key={key} className="rounded-[28px] border border-white/10 bg-[#1B405B] p-6">
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#C8D1D8]">{text}</p>
              <button className="mt-6 rounded-full border border-[#d6b56b]/30 px-4 py-2 text-sm font-semibold text-[#d6b56b]">Save template</button>
            </form>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="text-3xl font-semibold">Your saved templates</h2>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {(templates || []).length === 0 ? <p className="text-[#C8D1D8]">No templates saved yet.</p> : (templates || []).map((template) => (
              <div key={template.id} className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
                <div className="text-xs uppercase tracking-[0.15em] text-[#d6b56b]">{template.template_type.replaceAll("_", " ")}</div>
                <h3 className="mt-2 text-2xl font-semibold">{template.name}</h3>
                <p className="mt-3 text-sm leading-7 text-[#C8D1D8]">{template.description}</p>
                <form action={createProjectFromTemplate.bind(null, template.id)} className="mt-6 grid gap-4 md:grid-cols-2">
                  <label className="md:col-span-2"><span className="text-sm font-semibold">New project name *</span><input name="name" required className={input} /></label>
                  <label><span className="text-sm font-semibold">Client / organisation</span><input name="client_name" className={input} /></label>
                  <label><span className="text-sm font-semibold">Location</span><input name="location" className={input} /></label>
                  <button className="md:col-span-2 rounded-full bg-[#d6b56b] px-5 py-3 text-sm font-semibold text-apex-navy-950">Create project from template</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
