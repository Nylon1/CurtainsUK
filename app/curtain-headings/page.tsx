import type { Metadata } from "next";
import CurtainDetailHub from "@/components/seo/CurtainDetailHub";

export const metadata: Metadata = {
  title: { absolute: "Curtain Headings: Wave, Pinch Pleat, Pencil Pleat | Apex Curtains" },
  description: "Guide to curtain headings including wave, double pinch pleat, pencil pleat and single pleat, with advice on fullness, structure, movement and track compatibility.",
  alternates: { canonical: "https://www.apexcurtains.com/curtain-headings" },
};

const items = [
  { title: "Wave curtains", text: "A clean, modern heading with smooth, consistent folds. Wave can work particularly well on wide windows and contemporary interiors where the curtain needs to feel calm and architectural." },
  { title: "Double pinch pleat", text: "A structured, tailored heading with a more formal and luxurious feel. It gives the top of the curtain a defined shape and is often chosen for refined interiors." },
  { title: "Pencil pleat", text: "A flexible traditional heading that can suit many homes and both standard and shaped curtain projects. Its gathered appearance gives a softer, more familiar finish." },
  { title: "Single pleat", text: "A neat tailored heading that sits between minimal and formal. It can give a refined result without the stronger visual weight of a fuller pinch pleat." },
];

const questions = [
  { question: "Which curtain heading is best?", answer: "There is no single best heading. The right choice depends on the room, track or pole, fabric weight, required fullness, window shape and the finished look you want." },
  { question: "Does the heading affect how much fabric is used?", answer: "Yes. Heading choice and fullness are linked, so the design stage should consider both together before the curtains are made." },
  { question: "Can wave curtains be used on large or shaped windows?", answer: "They can be suitable where the track system, room and curtain design support a wave heading. For shaped windows, the heading and track need to be planned as one system." },
  { question: "Does the curtain track affect heading choice?", answer: "Yes. Heading style, runners or gliders, track route and the way the curtain opens all need to be compatible." },
];

export default function Page() {
  return <CurtainDetailHub eyebrow="Curtain design" title="Curtain headings and pleat styles" intro="The heading changes the structure, fullness, movement and overall character of a curtain. We choose it alongside the fabric, track, window shape and the way the finished room should feel." items={items} questions={questions} />;
}
