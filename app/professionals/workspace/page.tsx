import Link from "next/link";
import { ArrowRight, FileText, FolderKanban, Ruler, ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Apex Professional Project Workspace | Apex Curtains",
  description:
    "Prototype professional workspace for architectural curtain projects: project intake, aperture register, drawings, specification brief, RFIs and installation coordination.",
  alternates: { canonical: "https://www.apexcurtains.com/professionals/workspace" },
  robots: { index: false, follow: false },
};

const demoProjects = [
  {
    name: "Double-height gable glazing",
    ref: "APX-DEMO-001",
    stage: "Technical design",
    role: "Interior designer",
    status: "Information review",
    apertures: 3,
    openItems: 4,
    href: "/professionals/workspace/projects/apx-demo-001",
  },
  {
    name: "Barn conversion feature window",
    ref: "APX-DEMO-002",
    stage: "Developed design",
    role: "Architect",
    status: "Preliminary specification",
    apertures: 2,
    openItems: 3,
    href: null,
  },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">Prototype professional workspace</p>
            <h1 className="mt-5 max-w-5xl text-4xl font-semibold tracking-tight sm:text-6xl">One project record from geometry to handover.</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#C8D1D8]">
              A structured workspace for drawings, aperture data, fixing interfaces, textile decisions, RFIs, preliminary specification and installation coordination. Demo data only at this stage.
            </p>
          </div>
          <Link href="/professionals/workspace/new-project" className="inline-flex items-center gap-2 rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">
            Start a project <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <section className="mt-12 grid gap-4 md:grid-cols-4">
          {[
            [FolderKanban, "Project workspace", "Brief, stage, contacts and programme"],
            [Ruler, "Aperture register", "Geometry, track route and fixing interface"],
            [FileText, "Specification brief", "Confirmed inputs, recommendations and unresolved items"],
            [ShieldAlert, "RFIs & risks", "Missing information, constraints and actions"],
          ].map(([Icon, title, text]) => {
            const IconComponent = Icon as typeof FolderKanban;
            return (
              <div key={String(title)} className="rounded-[28px] border border-white/10 bg-[#1B405B] p-6">
                <IconComponent className="h-5 w-5 text-[#d6b56b]" />
                <h2 className="mt-4 text-xl font-semibold text-[#F4F0E8]">{String(title)}</h2>
                <p className="mt-3 text-sm leading-6 text-[#C8D1D8]">{String(text)}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b]">Demonstration projects</p>
            <h2 className="mt-2 text-3xl font-semibold">How the workspace will operate</h2>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {demoProjects.map((project) => {
              const content = (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full border border-[#d6b56b]/25 bg-[#d6b56b]/10 px-3 py-1 text-xs font-semibold text-[#d6b56b]">{project.stage}</span>
                    <span className="text-xs text-white/45">{project.ref}</span>
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold">{project.name}</h3>
                  <p className="mt-2 text-sm text-[#C8D1D8]">Lead role: {project.role}</p>
                  <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/10 p-4"><div className="text-white/45">Status</div><div className="mt-1 font-medium">{project.status}</div></div>
                    <div className="rounded-2xl border border-white/10 p-4"><div className="text-white/45">Apertures</div><div className="mt-1 text-xl font-semibold">{project.apertures}</div></div>
                    <div className="rounded-2xl border border-white/10 p-4"><div className="text-white/45">Open items</div><div className="mt-1 text-xl font-semibold">{project.openItems}</div></div>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-[#C8D1D8]">
                    {["Drawings", "Apertures", "Specification", "RFIs", "Programme", "Handover"].map((item) => (
                      <span key={item} className="rounded-full border border-white/10 px-3 py-2">{item}</span>
                    ))}
                    {project.href && <span className="ml-auto inline-flex items-center gap-1 font-semibold text-[#d6b56b]">Open project <ArrowRight className="h-3.5 w-3.5" /></span>}
                  </div>
                </>
              );

              if (project.href) {
                return <Link key={project.ref} href={project.href} className="rounded-[32px] border border-white/10 bg-white/[0.04] p-7 transition hover:-translate-y-1 hover:border-[#d6b56b]/30">{content}</Link>;
              }

              return <article key={project.ref} className="rounded-[32px] border border-white/10 bg-white/[0.04] p-7 opacity-80">{content}</article>;
            })}
          </div>
        </section>

        <section className="mt-12 rounded-[32px] border border-[#d6b56b]/25 bg-[#d6b56b]/10 p-7 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b]">Important</p>
          <h2 className="mt-4 text-2xl font-semibold">This is a product prototype, not an automated engineering tool.</h2>
          <p className="mt-4 max-w-4xl leading-8 text-[#C8D1D8]">
            V1 deliberately separates confirmed project information, design-team preferences, Apex preliminary recommendations and unresolved items. Structural suitability, manufacturer limits and manufacture dimensions still require the appropriate project evidence, technical data and agreed survey process.
          </p>
        </section>
      </div>
    </main>
  );
}
