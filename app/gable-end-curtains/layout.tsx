import type { ReactNode } from "react";
import FlagshipAnswerBlocks from "@/components/seo/FlagshipAnswerBlocks";
import { canonicalMetadata } from "@/lib/seo-metadata";

export const metadata = canonicalMetadata("/gable-end-curtains");

const answers = [
  {
    question: "Can curtains be fitted to very tall gable end windows?",
    answer:
      "Yes. Very tall gable glazing can be curtained, but the track specification, curtain weight, fixing points and safe access method all need to be considered early. The taller the room, the more important it is to design the track, heading and installation as one system.",
  },
  {
    question: "What tracks are used for gable end curtains?",
    answer:
      "Large gable-end installations usually need a robust specialist track selected for the span, curtain weight, fixing surface and route around the glazing. The best track is project-specific rather than simply the heaviest available system.",
  },
  {
    question: "Can gable end curtains follow the roof angle?",
    answer:
      "Yes, in many rooms the track can be planned to follow the sloping roof or gable line where suitable fixing points exist. The curtain heading and stack position then need to work with that angled route so the curtains remain practical and visually balanced.",
  },
  {
    question: "Do gable end curtains help with heat and glare?",
    answer:
      "They can. Lined curtains add a substantial fabric layer in front of large areas of glass, which can improve comfort, privacy and glare control. The exact effect depends on the fabric, lining, curtain coverage, window construction and how closely the curtains sit to the glazing.",
  },
  {
    question: "How are double-height curtain installations planned?",
    answer:
      "Planning starts with the glazing dimensions, fixing structure, curtain weight and access requirements. The team also needs to consider how the curtains will operate day to day, where they will stack and whether specialist access equipment is required for installation.",
  },
  {
    question: "What curtain heading suits a gable end window?",
    answer:
      "Wave headings can give tall contemporary rooms a clean architectural finish, while pinch pleats can create more decorative fullness. The correct choice depends on the track route, scale of the room, fabric weight and the amount of stacking space available.",
  },
];

export default function GableEndCurtainsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <FlagshipAnswerBlocks
        eyebrow="Gable end answers"
        title="Straight answers for tall, double-height and gable-end glazing"
        intro="Large gable-end windows are less about choosing a curtain in isolation and more about engineering a complete track, curtain and installation approach around the scale of the room."
        answers={answers}
      />
    </>
  );
}
