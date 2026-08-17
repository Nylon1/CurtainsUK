import ProfessionalRolePage from "@/components/professionals/ProfessionalRolePage";

export const metadata = {
  title: "Curtain & Track Packages for Developers and Housebuilders | Apex Curtains",
  description:
    "Curtain and track coordination for developers and housebuilders, including show homes, complex plots, repeated specifications, programme sequencing and installation handover.",
  alternates: { canonical: "https://www.apexcurtains.com/professionals/developers-housebuilders" },
};

export default function Page() {
  return (
    <ProfessionalRolePage
      eyebrow="For developers & housebuilders"
      title="A repeatable curtain package for premium plots and difficult glazing."
      intro="We support developers and housebuilders where feature glazing, double-height spaces or premium interiors require more than a standard curtain package. The aim is a coordinated specification that can be repeated where appropriate, while still allowing plot-specific geometry and site conditions to be resolved correctly."
      roleLabel="Developer and housebuilder"
      sections={[
        { title: "Show homes & feature plots", body: "Statement glazing often carries disproportionate visual importance in a show home. We can coordinate the curtain treatment as part of the presentation brief while keeping the specification buildable and serviceable." },
        { title: "Repeatable specifications", body: "Where multiple plots share a window type, we can help establish a controlled baseline for track, heading, lining and installation approach, then identify where individual plot tolerances or geometry require adjustment." },
        { title: "Programme & handover", body: "Curtain installation needs the right sequence: completed substrates, confirmed finished levels, safe access and protected finishes. We can align survey, manufacture and installation with the wider programme rather than arriving as an unmanaged finishing trade." },
      ]}
      deliverables={[
        "Plot schedules and house-type drawings",
        "Show-home interior design intent",
        "Window schedules and repeated aperture types",
        "Programme dates for survey, manufacture and installation",
        "Site rules, access requirements and handover constraints",
      ]}
      coordination={[
        "Plot-to-plot dimensional tolerance and survey requirement",
        "Responsibility for suitable fixing substrate at track locations",
        "Release dates for manufacture after dimensions are frozen",
        "Protection, access equipment and working-at-height planning",
        "Snagging, final dressing and handover sequencing",
      ]}
    />
  );
}
