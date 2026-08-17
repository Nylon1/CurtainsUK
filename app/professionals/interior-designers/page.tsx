import ProfessionalRolePage from "@/components/professionals/ProfessionalRolePage";

export const metadata = {
  title: "Curtain Specification Support for Interior Designers | Apex Curtains",
  description:
    "Specialist support for interior designers specifying curtains and tracks for apex, gable-end, triangular, double-height and other complex architectural glazing.",
  alternates: { canonical: "https://www.apexcurtains.com/professionals/interior-designers" },
};

export default function Page() {
  return (
    <ProfessionalRolePage
      eyebrow="For interior designers"
      title="Curtain specification support that protects the design intent."
      intro="We work with interior designers on complex glazing where the treatment needs to resolve both the visual scheme and the technical constraints. That means coordinating heading, fullness, face fabric, lining, track profile, stack-back, finished drop and installation interface as one package."
      roleLabel="Interior designer"
      sections={[
        { title: "Window-treatment schedules", body: "We can review room-by-room requirements and help translate the concept into a buildable curtain and track specification, particularly where shaped or double-height glazing makes standard schedules too generic." },
        { title: "Heading, fullness & stack", body: "Wave, pencil pleat and pinch pleat each affect fullness, stack-back, visual rhythm and track compatibility. We help resolve the trade-offs before fabric quantities and track lengths are fixed." },
        { title: "Fabric and lining coordination", body: "Face fabric weight, drape, pattern placement, lining choice and interlining can all change the finished behaviour of a large curtain. We coordinate these decisions with the required operation, privacy and light-control brief." },
      ]}
      deliverables={[
        "GA drawings, elevations or marked-up room plans",
        "Window-treatment schedules and FF&E information",
        "Fabric references, memos or supplier specifications",
        "Target heading, fullness and lining requirements",
        "Site photographs and approximate finished dimensions",
      ]}
      coordination={[
        "Available stack-back relative to glazing and furniture layout",
        "Track visibility, recess detail and ceiling interface",
        "Fabric weight relative to proposed track system",
        "Finished floor level, drop and pooling/clearance preference",
        "Installer access, tall glazing and protection of finished interiors",
      ]}
    />
  );
}
