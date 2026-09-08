import { WINDOW_TYPES_BY_SLUG } from "@/lib/decision-engine/seed/window-types";
import type { HeadingType, LiningType, WindowTypeMaster } from "@/lib/decision-engine/types";

export type StorefrontJourney = "STANDARD" | "REVIEW" | "SPECIALIST";

export interface StorefrontWindowType {
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  aliases: string[];
  masterSlugs: string[];
  image: string;
  measurementGuidance: string;
  trackGuidance: string;
  headings: HeadingType[];
  linings: LiningType[];
  journey: StorefrontJourney;
  faqs: Array<{ question: string; answer: string }>;
}

const compactHeadings: HeadingType[] = ["PENCIL_PLEAT", "WAVE", "DOUBLE_PINCH", "EYELET"];
const trackHeadings: HeadingType[] = ["PENCIL_PLEAT", "WAVE", "DOUBLE_PINCH"];
const allLinings: LiningType[] = ["UNLINED", "STANDARD", "BLACKOUT", "THERMAL", "BONDED"];

function entry(value: Omit<StorefrontWindowType, "faqs">): StorefrontWindowType {
  const primary = WINDOW_TYPES_BY_SLUG.get(value.masterSlugs[0]);
  if (!primary) throw new Error(`Unknown Window Type Master slug: ${value.masterSlugs[0]}`);
  return {
    ...value,
    faqs: [
      {
        question: `How do I measure for ${value.name.toLowerCase()} curtains?`,
        answer: value.measurementGuidance,
      },
      {
        question: `Which curtain heading works best?`,
        answer: `Available staging choices include ${value.headings.map(formatHeading).join(", ")}. The final recommendation also depends on the track, fabric weight and finished size.`,
      },
      {
        question: `Can I choose blackout or thermal lining?`,
        answer: value.linings.includes("BLACKOUT")
          ? "Yes. Standard, blackout and thermal options can be compared during configuration, subject to fabric and size compatibility."
          : "Lining suitability is confirmed during technical review for this window shape.",
      },
    ],
  };
}

export function formatHeading(value: HeadingType): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatLining(value: LiningType): string {
  if (value === "UNLINED") return "Unlined";
  return value.charAt(0) + value.slice(1).toLowerCase() + " lining";
}

export const STOREFRONT_WINDOW_TYPES: StorefrontWindowType[] = [
  entry({ slug: "standard-window", name: "Standard Window", eyebrow: "Straightforward made to measure", description: "A precise, beautifully finished curtain for everyday rectangular windows.", aliases: ["rectangular window", "normal window"], masterSlugs: ["standard-window"], image: "/journey/show-window.jpeg", measurementGuidance: "Measure the full usable track width or pole width, then the finished drop in centimetres.", trackGuidance: "Works with straight tracks and poles. Choose the exact measurement basis before entering width.", headings: compactHeadings, linings: allLinings, journey: "STANDARD" }),
  entry({ slug: "bay-window", name: "Bay Window", eyebrow: "Sections made simple", description: "Bring separate bay sections together as one balanced, made-to-measure curtain scheme.", aliases: ["three-sided bay", "five-sided bay", "splayed bay"], masterSlugs: ["bay-window"], image: "/journey/decode-shape.jpeg", measurementGuidance: "Tell us whether a track or pole is fitted, then record each straight section and the finished drop. A photograph is optional.", trackGuidance: "Curtain coverage is priced from the section widths. Any future track manufacture or fitting is reviewed separately.", headings: trackHeadings, linings: allLinings, journey: "REVIEW" }),
  entry({ slug: "apex-window", name: "Apex Window", eyebrow: "Specialist sloping geometry", description: "Curtains engineered for dramatic pitched glazing and asymmetric rooflines.", aliases: ["peak window", "pitched window", "A-frame window"], masterSlugs: ["apex-window"], image: "/window-types/apex-hero.jpg", measurementGuidance: "Provide base width, peak height, both verticals and both slope lengths, then email photographs separately using your review reference. Angles or a drawing can be added where known.", trackGuidance: "Requires a sloping or specialist track and technical approval before payment or manufacture.", headings: trackHeadings, linings: allLinings, journey: "SPECIALIST" }),
  entry({ slug: "triangular-window", name: "Triangular Window", eyebrow: "Measured point by point", description: "A reviewed curtain solution for triangular and sharply angled glazing.", aliases: ["triangle window", "angled top window", "sloped window"], masterSlugs: ["triangular-window"], image: "/window-types/triangular.jpeg", measurementGuidance: "Measure the base, overall peak, left and right verticals and both sloping sides. Email photographs separately using your review reference.", trackGuidance: "Track position and stack direction must be agreed during technical review.", headings: trackHeadings, linings: allLinings, journey: "SPECIALIST" }),
  entry({ slug: "gable-end-window", name: "Gable End Window", eyebrow: "Curtains for architectural scale", description: "Made-to-measure curtains for full-height gable glazing and feature elevations.", aliases: ["gable window", "gable glazing", "barn gable"], masterSlugs: ["gable-end-window"], image: "/window-types/gable-end.jpeg", measurementGuidance: "Capture the full base, peak height, side verticals and slope lengths. Email a wide room photograph showing access and fixing surfaces using your review reference.", trackGuidance: "Usually combines sloping track sections with carefully planned opening and stack positions.", headings: trackHeadings, linings: allLinings, journey: "SPECIALIST" }),
  entry({ slug: "extra-wide-window", name: "Extra-Wide Window", eyebrow: "Balanced across long spans", description: "A planned curtain specification for wide glazing, large rooms and long tracks.", aliases: ["wide window", "panoramic window", "wall-to-wall curtains"], masterSlugs: ["extra-wide-window"], image: "/window-types/large-feature.jpeg", measurementGuidance: "Measure the complete usable track or pole width and the finished drop. Widths above the instant-price threshold are reviewed.", trackGuidance: "Long spans may need additional brackets, split draw or motorised track assessment.", headings: compactHeadings, linings: allLinings, journey: "REVIEW" }),
  entry({ slug: "tall-floor-to-ceiling-window", name: "Tall / Floor-to-Ceiling Window", eyebrow: "Height with controlled weight", description: "Full-length curtains designed around tall rooms, large drops and architectural glazing.", aliases: ["tall window", "floor-to-ceiling curtains", "double-height window"], masterSlugs: ["tall-window", "floor-to-ceiling-window", "double-height-window"], image: "/images/barn-conversion-apex.jpeg", measurementGuidance: "Measure full coverage width and finished drop in centimetres. Drops above 300 cm are routed for review.", trackGuidance: "Track capacity, fixing height and fabric weight matter more as the drop increases.", headings: trackHeadings, linings: allLinings, journey: "REVIEW" }),
  entry({ slug: "french-doors", name: "French Doors", eyebrow: "Flexible everyday access", description: "Made-to-measure curtains that frame paired doors without obstructing daily use.", aliases: ["double doors", "garden doors", "French windows"], masterSlugs: ["french-doors"], image: "/journey/install-reveal.jpeg", measurementGuidance: "Measure the complete track or usable pole width beyond the door frame and the finished drop.", trackGuidance: "Allow enough stack space to clear the door leaves when open.", headings: compactHeadings, linings: allLinings, journey: "STANDARD" }),
  entry({ slug: "patio-sliding-doors", name: "Patio / Sliding Doors", eyebrow: "Smooth movement for daily living", description: "Wide curtains planned for regular access, privacy and light control.", aliases: ["patio doors", "sliding doors", "glass doors"], masterSlugs: ["patio-doors", "sliding-doors"], image: "/images/apex-curtains-large.jpeg", measurementGuidance: "Measure full track or pole coverage and the finished drop, allowing space beyond the opening for the curtain stack.", trackGuidance: "Wave headings on a suitable track can work especially well across sliding doors.", headings: compactHeadings, linings: allLinings, journey: "STANDARD" }),
  entry({ slug: "bifold-doors", name: "Bifold Doors", eyebrow: "Clear the opening", description: "Curtains designed to stack neatly away from wide folding-door systems.", aliases: ["bi-fold doors", "folding doors", "concertina doors"], masterSlugs: ["bifold-doors"], image: "/journey/make-beautifully.jpeg", measurementGuidance: "Measure the full proposed track width, not only the glass, and record the finished drop.", trackGuidance: "Track extension and stack space are essential so the folded doors remain usable.", headings: compactHeadings, linings: allLinings, journey: "STANDARD" }),
  entry({ slug: "dormer-window", name: "Dormer Window", eyebrow: "A neat answer for compact spaces", description: "Tailored curtains for dormers, reveals and windows beneath sloping ceilings.", aliases: ["loft window", "attic dormer", "roof dormer"], masterSlugs: ["dormer-window"], image: "/window-types/barn-conversion.jpeg", measurementGuidance: "Measure the intended track or pole width and finished drop, then photograph the surrounding ceiling and reveals.", trackGuidance: "Fixing depth and projection often determine whether a compact track or pole is best.", headings: compactHeadings, linings: allLinings, journey: "REVIEW" }),
  entry({ slug: "curved-bow-window", name: "Curved / Bow Window", eyebrow: "Follow the architecture", description: "A continuous curtain treatment shaped around a smooth bow or curved wall.", aliases: ["bow window", "curved bay", "radius window"], masterSlugs: ["curved-window", "bow-window"], image: "/images/apex-curtains - miltonKeynes.jpeg", measurementGuidance: "Record the track arc length and finished drop, with photographs that show the complete curve.", trackGuidance: "A templated or professionally measured curved track is normally required.", headings: trackHeadings, linings: allLinings, journey: "REVIEW" }),
  entry({ slug: "corner-window", name: "Corner Window", eyebrow: "Two elevations, one solution", description: "Curtains coordinated around an internal or external glazed corner.", aliases: ["L-shaped window", "wraparound window", "corner glazing"], masterSlugs: ["corner-window"], image: "/journey/design-direction.jpeg", measurementGuidance: "Measure each straight section, the corner angle and finished drop. A photograph helps confirm the track route.", trackGuidance: "The bend, bracket positions and curtain meeting point require review.", headings: trackHeadings, linings: allLinings, journey: "REVIEW" }),
  entry({ slug: "awkward-unusual-window", name: "Awkward / Unusual Window", eyebrow: "Start with the shape", description: "A guided route for windows that do not fit a standard category.", aliases: ["odd-shaped window", "unusual glazing", "problem window"], masterSlugs: ["awkward-unusual-window"], image: "/journey/decode-shape.jpg", measurementGuidance: "Submit a rough overall width and drop, then email clear photographs and a simple drawing using your review reference. We will identify the geometry before confirming a price.", trackGuidance: "Track and curtain design are reviewed together; specialist fabrication may be required.", headings: trackHeadings, linings: allLinings, journey: "SPECIALIST" }),
];

export const STOREFRONT_WINDOWS_BY_SLUG = new Map(STOREFRONT_WINDOW_TYPES.map((item) => [item.slug, item]));

export function getPrimaryMaster(windowType: StorefrontWindowType): WindowTypeMaster {
  const master = WINDOW_TYPES_BY_SLUG.get(windowType.masterSlugs[0]);
  if (!master) throw new Error(`Missing Window Type Master for ${windowType.slug}`);
  return master;
}
