import type { Metadata } from "next";
import CurtainDetailHub from "@/components/seo/CurtainDetailHub";

export const metadata: Metadata = {
  title: { absolute: "Curtain Linings: Blackout, Thermal & Interlining | Apex Curtains" },
  description: "Guide to curtain lining choices for privacy, blackout, thermal comfort, insulation, fabric support and the finished hang of made-to-measure curtains.",
  alternates: { canonical: "https://www.apexcurtains.com/curtain-linings" },
};

const items = [
  { title: "Standard lining", text: "A lining can protect the face fabric, improve the way the curtain hangs and give the finished curtain a more complete appearance. The exact lining should be chosen with the fabric and room use in mind." },
  { title: "Blackout lining", text: "Blackout lining is useful where light control matters, especially in bedrooms. On shaped or apex windows, the lining is only one part of the result because track position and edge gaps also affect how much light enters." },
  { title: "Thermal lining", text: "Thermal lining can be selected where improved room comfort is important. Large glazed areas, tall windows and rooms that feel exposed can benefit from a curtain specification designed with comfort as well as appearance in mind." },
  { title: "Interlining", text: "Interlining adds an extra layer between the face fabric and lining. It can add body, softness and a more substantial finish, but also increases curtain weight, which must be considered when specifying the track and fixings." },
];

const questions = [
  { question: "Do I need blackout lining for apex curtains?", answer: "Only if stronger light control is important for the room. Bedrooms often benefit from blackout lining, but the window geometry and track position also need to be considered." },
  { question: "What is the difference between blackout lining and interlining?", answer: "Blackout lining is primarily selected for light control. Interlining is an additional internal layer used to add body, softness and insulation. They serve different purposes and can affect the finished curtain weight differently." },
  { question: "Can lining make curtains heavier?", answer: "Yes. Blackout, thermal and especially interlined specifications add weight. That weight needs to be considered alongside the track, brackets, fixings and the height of the installation." },
  { question: "Does lining affect how the curtain hangs?", answer: "Yes. Lining choice can change the body, movement and visual weight of the finished curtain, so it should be selected with the face fabric and heading rather than as an afterthought." },
];

export default function Page() {
  return <CurtainDetailHub eyebrow="Curtain performance" title="Curtain linings, blackout and interlining" intro="Lining affects much more than the back of the curtain. It influences light control, privacy, comfort, weight, body and how the finished curtain hangs, so it needs to be part of the original design specification." items={items} questions={questions} />;
}
