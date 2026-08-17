import type { Metadata } from "next";
import CurtainDetailHub from "@/components/seo/CurtainDetailHub";

export const metadata: Metadata = {
  title: { absolute: "Curtain Fabrics: Weight, Drape, Pattern & Suitability | Apex Curtains" },
  description: "Guide to choosing curtain fabrics by weight, drape, daylight appearance, pattern, room use, lining needs and compatibility with tracks and shaped windows.",
  alternates: { canonical: "https://www.apexcurtains.com/curtain-fabrics" },
};

const items = [
  { title: "Fabric weight", text: "Fabric weight affects how the curtain hangs, how much load reaches the track and how substantial the finished window treatment feels. Heavier fabrics need to be considered alongside lining and support." },
  { title: "Drape and movement", text: "Some fabrics fall in soft fluid folds while others hold more structure. The heading, fullness and room style should be chosen with the natural behaviour of the fabric in mind." },
  { title: "Pattern and scale", text: "Pattern direction and pattern matching matter more on large curtains because joins, drops and shaped tops can make alignment visible. The scale of the pattern also needs to suit the proportions of the room." },
  { title: "Light and room conditions", text: "A fabric can look different in daylight and evening lighting. Privacy, glare, maintenance, warmth and whether the curtain is mainly decorative or functional should all influence the choice." },
];

const questions = [
  { question: "What fabric is best for large apex curtains?", answer: "The best fabric is one that suits the room, heading, curtain size, lining and track capacity. Large shaped curtains need the fabric weight and drape assessed as part of the whole system." },
  { question: "Does fabric weight matter for curtain tracks?", answer: "Yes. The finished curtain weight includes the face fabric, lining and any interlining, so track and fixing specification should take the total weight into account." },
  { question: "Should curtain fabric be viewed in daylight?", answer: "Yes. Fabric colour, texture and opacity can change under natural and artificial light, so it is useful to consider how the room looks at different times of day." },
  { question: "Can patterned fabrics work on shaped windows?", answer: "Yes, but pattern direction, matching and the geometry of the curtain need careful planning, especially where the top edge follows an angle or the curtain uses multiple fabric widths." },
];

export default function Page() {
  return <CurtainDetailHub eyebrow="Curtain materials" title="Curtain fabrics for shaped and statement windows" intro="Fabric choice affects appearance, movement, weight, light response and how the curtain works with its heading and track. For large or unusual windows, fabric selection is both a design and a practical decision." items={items} questions={questions} />;
}
