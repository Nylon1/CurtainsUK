import ProfessionalRolePage from "@/components/professionals/ProfessionalRolePage";

export const metadata = {
  title: "Curtain Track Installation for Contractors & Fit-out Teams | Apex Curtains",
  description:
    "Specialist curtain-track coordination and installation support for contractors and fit-out teams working with complex glazing, tall spaces and architectural interiors.",
  alternates: { canonical: "https://www.apexcurtains.com/professionals/contractors-fit-out" },
};

export default function Page() {
  return (
    <ProfessionalRolePage
      eyebrow="For contractors & fit-out teams"
      title="Coordinate the fixing, access and sequence before the specialist installation arrives on site."
      intro="Specialist curtain systems interface with ceilings, walls, recesses, glazing, joinery, services and finished interiors. We work with contractors and fit-out teams to clarify substrate, fixing zones, access, programme and protection requirements before installation starts."
      roleLabel="Contractor and fit-out"
      sections={[
        { title: "Substrate & fixing zones", body: "Track performance depends on a suitable fixing condition. We can flag where the proposed location needs confirmation of timber, steel, concrete, pattressing or another appropriate substrate rather than relying on decorative finishes alone." },
        { title: "Access methodology", body: "Double-height and difficult-to-reach installations need safe access planned around the finished space. We can coordinate survey and installation requirements so towers, podiums or other access methods are considered in the programme and logistics plan." },
        { title: "Interfaces & sequencing", body: "Track installation can conflict with lighting, sprinklers, ceiling features, joinery and glazing trims. Early coordination reduces late drilling, remedial work and avoidable snagging around completed finishes." },
      ]}
      deliverables={[
        "Relevant construction details and reflected ceiling plans",
        "Confirmation of proposed fixing substrate and build-up",
        "Site logistics and access information",
        "Programme dates and readiness milestones",
        "Site-specific induction, permit or RAMS requirements where applicable",
      ]}
      coordination={[
        "Track centreline relative to glazing, ceiling and wall finishes",
        "Suitable fixing zone and substrate continuity",
        "Services and obstructions along the proposed track route",
        "Access equipment, exclusion zones and protection of finishes",
        "Final survey, manufacture release, installation and snagging sequence",
      ]}
    />
  );
}
