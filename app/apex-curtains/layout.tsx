import type { ReactNode } from "react";
import FlagshipAnswerBlocks from "@/components/seo/FlagshipAnswerBlocks";
import { canonicalMetadata } from "@/lib/seo-metadata";

export const metadata = canonicalMetadata("/apex-curtains");

const answers = [
  {
    question: "What curtains work best on apex windows?",
    answer:
      "Made-to-measure curtains on a track planned around the slope are usually the strongest option. The heading, fullness and lining should be chosen around the window geometry, room use and how much privacy, blackout or thermal comfort is needed.",
  },
  {
    question: "Can curtains follow a sloping ceiling?",
    answer:
      "Yes. A specialist track can be planned to follow an angled or sloping line where the structure and fixing points allow it. The track route, curtain heading and stacking position need to be designed together so the finished curtain hangs cleanly.",
  },
  {
    question: "Can apex curtains be blackout?",
    answer:
      "Yes. Blackout lining can be specified for apex curtains, although the overall result also depends on the window shape, track position and any light gaps around the edges. Bedrooms often need these details considered from the start rather than treating lining as an afterthought.",
  },
  {
    question: "Curtains or blinds for apex windows?",
    answer:
      "Curtains are often the more flexible solution for large, angled and dramatic apex glazing because they can follow the architecture while adding softness, privacy and insulation. Blinds may suit some shapes, but the practical limits increase as the window becomes taller or more complex.",
  },
  {
    question: "How are apex windows measured for curtains?",
    answer:
      "The useful measurements go beyond width and height. The slope, side heights, peak position, proposed track line, fixing surface, floor level and stacking space all matter. For complex or high windows, a site measure is usually the safest basis for the final design.",
  },
  {
    question: "How are very high apex curtains installed?",
    answer:
      "High installations are planned around safe access, suitable fixing points and the weight of the track and curtains. The access method depends on the building and height, so installation planning should happen alongside the curtain and track design rather than after manufacture.",
  },
];

export default function ApexCurtainsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <FlagshipAnswerBlocks
        eyebrow="Apex window answers"
        title="Straight answers to the questions people ask about apex curtains"
        intro="Apex windows combine shape, height and installation constraints, so the best answer usually comes from treating the curtain, track and fixing method as one system."
        answers={answers}
      />
    </>
  );
}
