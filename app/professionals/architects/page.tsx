import ProfessionalRolePage from "@/components/professionals/ProfessionalRolePage";

export const metadata = {
  title: "Architectural Curtain & Track Specification Support for Architects | Apex Curtains",
  description:
    "Specialist curtain and track coordination for architects designing apex, gable-end, triangular, double-height and other complex glazed spaces.",
  alternates: { canonical: "https://www.apexcurtains.com/professionals/architects" },
};

export default function Page() {
  return (
    <ProfessionalRolePage
      eyebrow="For architects"
      title="Resolve the curtain interface before it becomes a late-stage compromise."
      intro="Complex glazing often needs the curtain system considered alongside the architecture. We can review geometry, track route, recess depth, fixing zones, stack-back, operation and installer access so the eventual window treatment is coordinated rather than forced into the completed space."
      roleLabel="Architect"
      sections={[
        { title: "Aperture geometry", body: "Apex, triangular and gable-end openings can require non-horizontal track routes, shaped curtain planning and multiple finished drops. Early review helps establish what is physically achievable before finishes are closed up." },
        { title: "Recess and fixing interface", body: "Ceiling, wall and recess-mounted systems place different demands on the surrounding construction. We review the intended track position, fixing substrate, available depth and clearance around glazing, services and trims." },
        { title: "Operation and access", body: "Large drops and elevated track positions affect operation, maintenance and installation methodology. We can flag access constraints and coordination points before specialist access equipment or completed finishes become an issue." },
      ]}
      deliverables={[
        "GA plans, elevations, sections and relevant details",
        "Window schedules and aperture dimensions",
        "Ceiling/recess details and intended fixing zones",
        "Material build-ups around the proposed track location",
        "Site photographs or coordinated model views where available",
      ]}
      coordination={[
        "Track route, bend geometry and available straight runs",
        "Recess depth, curtain clearance and glazing interface",
        "Load path into suitable substrate rather than decorative finishes alone",
        "Stack-back allowance relative to clear opening and sightlines",
        "Installation access before ceilings, joinery or finishes restrict working space",
      ]}
    />
  );
}
