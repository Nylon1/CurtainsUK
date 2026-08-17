import Link from "next/link";

export const metadata = {
  title: "Curtain Project Information Checklist | Apex Curtains",
  description:
    "A professional project information checklist for architects, interior designers, developers and contractors specifying curtains and tracks for complex architectural glazing.",
  alternates: {
    canonical: "https://www.apexcurtains.com/professionals/specifier-resources/project-information-checklist",
  },
};

const sections = [
  {
    title: "1. Project & package status",
    items: [
      "Professional role and project contact",
      "Project stage: concept, developed design, technical design, tender, construction or fit-out",
      "Project address and site contact",
      "Number of apertures, rooms, plots or repeated window types",
      "Target survey, approval, manufacture and installation dates",
    ],
  },
  {
    title: "2. Drawings & geometry",
    items: [
      "Latest GA plans, reflected ceiling plans where relevant, elevations and sections",
      "Window schedule or opening references",
      "Finished aperture width, side heights, apex/peak height and relevant angled dimensions",
      "Ceiling line, recess depth, wall returns and adjacent joinery",
      "Any known dimensional tolerances or construction still subject to change",
    ],
  },
  {
    title: "3. Track & fixing interface",
    items: [
      "Proposed track route and whether the design follows the aperture, frames it, or uses another arrangement",
      "Ceiling, wall or recess fixing preference",
      "Known substrate/build-up at track level",
      "Available fixing zones and any services or obstructions",
      "Required operation and any limits on draw direction",
      "Expected curtain weight or textile specification if already known",
    ],
  },
  {
    title: "4. Curtain specification",
    items: [
      "Heading type and fullness if defined",
      "Face fabric, pattern repeat and orientation if defined",
      "Lining, blackout lining, thermal lining or interlining requirement",
      "Finished drop, floor relationship and sill/obstruction conditions",
      "Stack-back target and minimum clear-opening requirement",
      "Tieback or hold position only where part of the confirmed design intent",
    ],
  },
  {
    title: "5. Access, installation & handover",
    items: [
      "Finished floor level and installation height",
      "Working-at-height or access-equipment constraints",
      "Site access, delivery route and protection requirements",
      "Programme sequencing around ceilings, decoration, flooring and joinery",
      "Power or control interfaces only where relevant to the agreed system",
      "Snagging, commissioning and handover requirements",
    ],
  },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white print:bg-white print:px-0 print:pt-0 print:text-black sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-5xl">
        <div className="print:hidden">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">Specifier resource</p>
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl print:mt-0 print:text-3xl">
          Curtain & Track Project Information Checklist
        </h1>
        <p className="mt-6 max-w-3xl leading-8 text-[#C8D1D8] print:text-black">
          Use this checklist before professional project review. It is designed to identify the information needed to coordinate aperture geometry, track route, fixing interface, curtain construction, stack-back, access and programme. Final survey and specification remain project-specific.
        </p>

        <div className="mt-10 space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="rounded-[28px] border border-white/10 bg-[#1B405B] p-7 print:break-inside-avoid print:rounded-none print:border-gray-300 print:bg-white print:p-5">
              <h2 className="text-2xl font-semibold text-[#F4F0E8] print:text-black">{section.title}</h2>
              <ul className="mt-5 space-y-3">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-[#C8D1D8] print:text-black">
                    <span aria-hidden="true" className="mt-1 inline-block h-4 w-4 shrink-0 border border-[#d6b56b] print:border-black" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 print:hidden">
          <Link href="/professionals/project-review" className="rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Discuss this project</Link>
          <Link href="/professionals/specifier-resources" className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold">Back to specifier resources</Link>
          <button type="button" onClick={undefined} className="hidden">Print</button>
        </div>

        <p className="mt-12 text-xs leading-6 text-white/45 print:text-gray-600">
          Apex Curtains · Specialist curtain and track solutions for complex architectural glazing · www.apexcurtains.com
        </p>
      </div>
    </main>
  );
}
