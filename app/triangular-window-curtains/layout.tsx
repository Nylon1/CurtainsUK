import type { ReactNode } from "react";
import FlagshipAnswerBlocks from "@/components/seo/FlagshipAnswerBlocks";
import { canonicalMetadata } from "@/lib/seo-metadata";

export const metadata = canonicalMetadata("/triangular-window-curtains");

const answers = [
  {
    question: "How do you curtain a triangular window?",
    answer:
      "A triangular window normally needs a made-to-measure curtain and a track route designed around the angle. The exact solution depends on the slope, fixing surface, curtain stack position and whether the room needs privacy, blackout, thermal comfort or mainly a decorative finish.",
  },
  {
    question: "Can a curtain track follow a triangular window?",
    answer:
      "Yes, where the structure and fixing points allow it. A specialist track can be planned around an angled line, but the curtain heading and how the curtain opens and stacks must be designed with the track rather than treated as separate decisions.",
  },
  {
    question: "Can triangular window curtains be blackout?",
    answer:
      "Yes. Blackout lining can be used, but the shape of the glazing can create edge gaps that need to be considered. For bedrooms or media rooms, the track position, curtain overlap and surrounding surfaces matter as much as the lining itself.",
  },
  {
    question: "What curtain style works on triangular windows?",
    answer:
      "Wave and pinch-pleat styles can both work, depending on the geometry and the look required. Cleaner architectural rooms may suit a more tailored heading, while softer interiors can take more fullness. The track route and available stacking space should guide the final choice.",
  },
  {
    question: "How are triangular windows measured?",
    answer:
      "The key measurements include the base width, side heights, peak or angle position, slope lengths, proposed track line and available fixing surfaces. The floor and any nearby doors, beams or radiators also need to be checked before manufacture.",
  },
  {
    question: "Are triangular curtains suitable for tall glazing?",
    answer:
      "Yes. They can work very well on tall triangular glazing, but the weight of the curtains, track specification, fixing points and safe installation access become more important as the window height and scale increase.",
  },
];

export default function TriangularCurtainsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <FlagshipAnswerBlocks
        eyebrow="Triangular window answers"
        title="Practical answers for triangular and sharply angled windows"
        intro="Triangular glazing is easiest to solve when the window geometry, track route, curtain heading and installation method are planned together from the beginning."
        answers={answers}
      />
    </>
  );
}
