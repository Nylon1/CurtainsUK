import type { Metadata } from "next";
import CurtainDetailHub from "@/components/seo/CurtainDetailHub";

export const metadata: Metadata = {
  title: { absolute: "Curtain Accessories: Tiebacks, Hooks & Finishing Details | Apex Curtains" },
  description: "Guide to curtain accessories including tiebacks, tieback hooks and finishing details, with advice on proportion, positioning, fabric weight and daily use.",
  alternates: { canonical: "https://www.apexcurtains.com/curtain-accessories" },
};

const items = [
  { title: "Tiebacks", text: "Tiebacks can hold curtains away from the glass and create a more dressed, decorative shape when open. Their size, material and position should suit the curtain fullness, fabric weight and overall room style." },
  { title: "Tieback hooks", text: "Tieback hooks provide the fixing point for a traditional tieback. Position matters: too high, low or close to the window can change the curtain shape, so the hook should be placed after considering curtain drop, stack and the intended sweep." },
  { title: "Decorative finishing details", text: "Accessories should support the curtain design rather than compete with it. Their finish, scale and visual weight need to sit comfortably with the heading, fabric and surrounding interior." },
  { title: "Practical use", text: "Accessories also need to work in daily use. Heavy curtains, tall windows and wide stacks can make handling different from a standard domestic curtain, so decorative decisions should remain practical." },
];

const questions = [
  { question: "Do made-to-measure curtains need tiebacks?", answer: "No. Tiebacks are optional. Some rooms benefit from the decorative sweep they create, while cleaner or more architectural schemes may look better without them." },
  { question: "Where should tieback hooks be fitted?", answer: "There is no universal height. The best position depends on curtain drop, fullness, fabric weight, window proportions and the shape you want the open curtain to create." },
  { question: "Can tiebacks be used with heavy curtains?", answer: "They can, provided the tieback and fixing are suitable for the curtain weight and the desired holdback position. Heavy lined or interlined curtains need proportionate accessories and secure fixings." },
  { question: "Should curtain accessories match the room?", answer: "They should feel intentional within the overall scheme. Finish, scale and style should be considered alongside the curtain fabric, heading, track or pole and other interior details." },
];

export default function Page() {
  return <CurtainDetailHub eyebrow="Curtain finishing" title="Curtain accessories, tiebacks and tieback hooks" intro="The final details can change how a curtain looks when open and how it sits within the room. Tiebacks, hooks and other finishing choices should be proportioned to the curtain rather than added as an afterthought." items={items} questions={questions} />;
}
