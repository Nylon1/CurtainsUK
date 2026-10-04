import { createHash } from "node:crypto";
import type { FabricMasterRecord } from "./types";
import type { FabricVisualIntelligence } from "./visual-knowledge";
import { toReviewFabricIdentity } from "./decision-engine";
import { WINDOW_TYPE_SEEDS } from "../decision-engine/seed/window-types";

/**
 * Search wording is a projection of governed facts. The retail profile is
 * optional because only a small subset has validated room/style assignments.
 */
export type GovernedRetailIntent = {
  description_validated: boolean;
  rooms: string[];
  styles: string[];
  headings: string[];
  linings: string[];
};

export type FabricSearchIntent = {
  fabricId: string;
  canonicalUrl: string;
  sampleId: string;
  exactColourway: string;
  primaryColourFamily?: string;
  secondaryColours: string[];
  patternClass?: string;
  motif: string[];
  texture: string[];
  finish?: string;
  character: string[];
  visualActivity?: string;
  visualPresence?: string;
  rooms: string[];
  roomSource?: "EXPLICIT_RETAIL" | "EDITORIAL_FI";
  styles: string[];
  styleSource?: "EXPLICIT_RETAIL" | "EDITORIAL_FI";
  composition?: string;
  usableWidth?: string;
  fullWidth?: string;
  verticalRepeat?: string;
  horizontalRepeat?: string;
  patternMatch?: string;
  headings: string[];
  linings: string[];
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  merchant: {
    id: string;
    title: string;
    description: string;
    brand: string;
    color: string;
    material?: string;
    pattern?: string;
    product_type: string;
    product_detail: Array<{ section: string; name: string; value: string }>;
    link: string;
    price: "2.50 GBP";
  };
};

export const FABRIC_PROFILE_SEARCH_FIELD_DEFINITIONS = [
  { key: "search_title", name: "Governed search title", type: "single_line_text_field" },
  { key: "search_description", name: "Governed search description", type: "multi_line_text_field" },
  { key: "search_intro", name: "Governed search intro", type: "multi_line_text_field" },
  { key: "search_color", name: "Governed Merchant colour", type: "single_line_text_field" },
  { key: "search_pattern", name: "Governed Merchant pattern", type: "single_line_text_field" },
  { key: "search_material", name: "Supplier material composition", type: "single_line_text_field" },
  { key: "search_revision", name: "Search intent revision", type: "single_line_text_field" },
] as const;
export type FabricProfileSearchField = typeof FABRIC_PROFILE_SEARCH_FIELD_DEFINITIONS[number]["key"]
  | "seo_title" | "seo_description";

export function fabricProfileSearchFields(intent: FabricSearchIntent): Partial<Record<FabricProfileSearchField, string>> {
  const content = {
    search_title: intent.title,
    search_description: intent.description,
    search_intro: intent.intro,
    search_color: intent.merchant.color,
    search_pattern: intent.merchant.pattern,
    search_material: intent.merchant.material,
    seo_title: intent.seoTitle,
    seo_description: intent.seoDescription,
  };
  const revision = "search-v1-" + createHash("sha256").update(JSON.stringify(content)).digest("hex").slice(0, 24);
  return { ...content, search_revision: revision };
}

export function fabricProfileSearchPatch(
  existing: Readonly<Record<string, string | null | undefined>>,
  intent: FabricSearchIntent,
): Array<{ key: FabricProfileSearchField; value: string }> {
  if (existing.fabric_master_id !== intent.fabricId || existing.canonical_url !== intent.canonicalUrl) {
    throw new Error("FABRIC_SEARCH_PROFILE_IDENTITY_MISMATCH");
  }
  const desired = fabricProfileSearchFields(intent);
  return (Object.entries(desired) as Array<[FabricProfileSearchField, string | undefined]>)
    .flatMap(([key, value]) =>
      value && (existing[key]?.replace(/\r\n/g, "\n").trim() ?? "") !== value
        ? [{ key, value }] : []);
}

const ROOM_TERMS: Record<string, string> = {
  "living room": "living room",
  bedroom: "bedroom",
  "dining room": "dining room",
  "home office": "home office",
  "family room": "family room",
};
const STYLE_TERMS = new Set([
  "modern", "contemporary", "traditional", "classic", "luxury",
  "country", "minimalist", "natural",
]);
const PATTERN_TERMS: Record<string, string> = {
  floral: "floral", botanical: "botanical", stripe: "stripe",
  geometric: "geometric", plain: "plain", check: "check",
  abstract: "abstract", damask: "damask",
  "textured-plain": "textured plain",
  "traditional-motif": "traditional motif",
  "subtle-pattern": "subtle pattern",
  statement: "statement pattern",
};
const TEXTURE_TERMS: Record<string, string> = {
  "visible-weave": "visible weave", "subtle-texture": "subtle texture",
  relief: "relief", slub: "slub", smooth: "smooth",
  "linen-look": "linen-look",
};
const TEXTURE_COPY: Record<string, string> = {
  "visible weave": "a visible weave", "subtle texture": "subtle texture",
  relief: "raised relief", slubbed: "slubbed detail", smooth: "a smooth look",
  "linen-look": "a linen-look surface", "pile-like": "a pile-like appearance",
  "boucle-like": "a boucle-like appearance",
};
const HEADING_NAMES: Record<string, string> = {
  WAVE: "wave", PENCIL_PLEAT: "pencil pleat",
  DOUBLE_PINCH: "double pinch pleat", TRIPLE_PINCH: "triple pinch pleat",
  EYELET: "eyelet",
};
const LINING_NAMES: Record<string, string> = {
  STANDARD: "standard", BLACKOUT: "blackout", THERMAL: "thermal",
};

function clean(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() || undefined;
}

function safeTerms(values: string[] | undefined, vocabulary?: Record<string, string>) {
  return [...new Set((values ?? [])
    .map((value) => clean(value)?.toLowerCase())
    .filter((value): value is string => Boolean(value) && value !== "unknown")
    .map((value) => vocabulary?.[value] ?? value))];
}

function cm(value: number | null) {
  if (value === null || !Number.isFinite(value) || value <= 0) return undefined;
  const centimetres = value / 10;
  return `${Number.isInteger(centimetres) ? centimetres.toFixed(0) : centimetres.toFixed(1)} cm`;
}

function label(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function list(values: string[]) {
  if (values.length < 2) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function truncateWords(value: string, max: number) {
  if (value.length <= max) return value;
  const clipped = value.slice(0, max + 1).replace(/\s+\S*$/, "").replace(/[\s,;:.–-]+$/, "");
  return clipped || value.slice(0, max);
}

function composition(record: FabricMasterRecord) {
  const parts = record.composition
    .filter((part) => clean(part.material) && Number.isFinite(part.percentage) && part.percentage > 0)
    .map((part) => ({ name: label(part.material.toLowerCase()), percentage: part.percentage }));
  if (!parts.length) return undefined;
  return parts.map(({ name, percentage }) => `${percentage}% ${name}`).join(", ");
}

function materialKeyword(record: FabricMasterRecord) {
  const part = record.composition
    .filter((entry) => clean(entry.material) && Number.isFinite(entry.percentage))
    .sort((a, b) => b.percentage - a.percentage)[0];
  if (!part || part.percentage < 50) return undefined;
  const material = part.material.toLowerCase();
  if (!["linen", "cotton", "silk", "wool", "polyester", "viscose"].includes(material)) return undefined;
  return `${label(material)}${part.percentage < 100 ? " Blend" : ""}`;
}

function searchColour(exact: string, primary?: string) {
  const colour = exact.toLowerCase();
  if (["linen", "velvet", "silk", "cotton"].includes(colour) && !primary) return `${colour} colourway`;
  if (/\bsage\b/.test(colour) && primary === "green") return "sage green";
  if (/\bnavy\b/.test(colour) && primary === "blue") return "navy blue";
  if (/\bduck egg\b/.test(colour) && primary === "blue") return "duck egg blue";
  if (/\bblush\b/.test(colour) && primary === "pink") return "blush pink";
  if (/\bterracotta\b/.test(colour)) return "terracotta";
  if (/\btaupe\b/.test(colour)) return "taupe";
  if (/\b(beige|cream|grey|gray|gold)\b/.test(colour)) return colour.replace(/gray/g, "grey");
  if (/\bdark\b/.test(colour) && primary === "green") return "dark green";
  if (/\bneutral\b/.test(colour)) return "neutral";
  return primary ?? clean(exact)?.toLowerCase();
}

function detail(section: string, name: string, value: string | undefined) {
  return value ? { section, name, value } : undefined;
}

function editorialRooms(visual: FabricVisualIntelligence, pattern?: string) {
  const character = safeTerms(visual.character);
  const activity = clean(visual.pattern?.activity)?.toLowerCase();
  const weight = clean(visual.visualWeight)?.toLowerCase();
  const texture = safeTerms(visual.texture, TEXTURE_TERMS);
  if (weight === "substantial" || activity === "busy") return ["living room", "dining room"];
  if (activity === "quiet" || character.includes("calm") || character.includes("understated") || (weight === "light" && pattern === "plain")) {
    return ["bedroom", "living room"];
  }
  if (character.includes("graphic") && ["geometric", "stripe", "check"].includes(pattern ?? "")) {
    return ["living room", "home office"];
  }
  if (["floral", "botanical"].includes(pattern ?? "") && activity !== "busy") {
    return ["living room", "bedroom"];
  }
  if (character.includes("natural") && texture.length) return ["living room", "family room"];
  return [];
}

function editorialStyles(visual: FabricVisualIntelligence, pattern?: string) {
  const character = safeTerms(visual.character);
  if (character.includes("luxurious") || character.includes("luxury")) return ["luxury"];
  if (character.includes("natural") && pattern === "botanical") return ["natural", "country"];
  if (character.includes("graphic") && ["geometric", "stripe", "check"].includes(pattern ?? "")) return ["modern"];
  if (character.includes("understated") && pattern === "plain") return ["minimalist"];
  if (character.includes("traditional") && ["floral", "damask"].includes(pattern ?? "")) return ["traditional"];
  return [];
}

function platformOptions(record: FabricMasterRecord, retail?: GovernedRetailIntent | null) {
  const fabric = toReviewFabricIdentity(record);
  const standardWindow = WINDOW_TYPE_SEEDS.find((window) => window.slug === "standard-window");
  if (!standardWindow) throw new Error("FABRIC_SEARCH_WINDOW_RULE_MISSING");
  const headingRestrictions = retail?.description_validated && retail.headings.length
    ? new Set(safeTerms(retail.headings).map((value) => value.replace(/[ -]+/g, "_").toUpperCase()))
    : null;
  const liningRestrictions = retail?.description_validated && retail.linings.length
    ? new Set(safeTerms(retail.linings).map((value) => value.replace(/[ -]+/g, "_").toUpperCase()))
    : null;
  const headings = fabric.allowedHeadings
    .filter((value) => standardWindow.availableCurtainHeadings.includes(value))
    .filter((value) => !headingRestrictions || headingRestrictions.has(value))
    .filter((value) => ["WAVE", "PENCIL_PLEAT", "DOUBLE_PINCH"].includes(value))
    .map((value) => HEADING_NAMES[value]);
  const linings = fabric.allowedLinings
    .filter((value) => standardWindow.allowedLiningOptions.includes(value))
    .filter((value) => !liningRestrictions || liningRestrictions.has(value))
    .filter((value) => ["STANDARD", "BLACKOUT", "THERMAL"].includes(value))
    .map((value) => LINING_NAMES[value]);
  return { headings, linings };
}

export function buildFabricSearchIntent(
  record: FabricMasterRecord,
  visual: FabricVisualIntelligence,
  canonicalUrl: string,
  retail?: GovernedRetailIntent | null,
): FabricSearchIntent {
  if (!/^https:\/\/www\.curtainsuk\.com\/pages\/fabric\/[a-z0-9-]+$/i.test(canonicalUrl)) {
    throw new Error("FABRIC_SEARCH_CANONICAL_INVALID");
  }
  if (!canonicalUrl.split("/").pop()?.startsWith(`${record.fabric_id}-`)) {
    throw new Error("FABRIC_SEARCH_IDENTITY_MISMATCH");
  }
  const exactColourway = clean(record.colour_name);
  if (!exactColourway || !clean(record.design_name) || !clean(record.brand_name)) {
    throw new Error("FABRIC_SEARCH_MASTER_INCOMPLETE");
  }
  const primaryColourFamily = clean(visual.palette?.primary)?.toLowerCase();
  const secondaryColours = safeTerms(visual.palette?.secondary);
  const patternClass = PATTERN_TERMS[clean(visual.pattern?.category)?.toLowerCase() ?? ""];
  const motif = safeTerms(visual.pattern?.motif);
  const texture = safeTerms(visual.texture, TEXTURE_TERMS);
  const character = safeTerms(visual.character);
  const finish = clean(visual.finish)?.toLowerCase();
  const visualActivity = clean(visual.pattern?.activity)?.toLowerCase();
  const visualPresence = clean(visual.visualWeight)?.toLowerCase();
  const explicitRooms = retail?.description_validated
    ? safeTerms(retail.rooms).filter((room) => ROOM_TERMS[room])
    : [];
  const rooms = explicitRooms.length ? explicitRooms : editorialRooms(visual, patternClass);
  const roomSource = explicitRooms.length ? "EXPLICIT_RETAIL" : rooms.length ? "EDITORIAL_FI" : undefined;
  const explicitStyles = retail?.description_validated
    ? safeTerms(retail.styles).filter((style) => STYLE_TERMS.has(style))
    : [];
  const styles = explicitStyles.length ? explicitStyles : editorialStyles(visual, patternClass);
  const styleSource = explicitStyles.length ? "EXPLICIT_RETAIL" : styles.length ? "EDITORIAL_FI" : undefined;
  const { headings, linings } = platformOptions(record, retail);
  const material = materialKeyword(record);
  const compositionText = composition(record);
  const usableWidth = cm(record.usable_width_mm);
  const fullWidth = cm(record.full_width_mm);
  const verticalRepeat = cm(record.vertical_repeat_mm);
  const horizontalRepeat = cm(record.horizontal_repeat_mm);
  const patternMatch = clean(record.pattern_match_type)?.replace(/_MATCH$/, "").replace(/_/g, " ").toLowerCase();
  const colour = searchColour(exactColourway, primaryColourFamily) ?? exactColourway.toLowerCase();
  const pattern = patternClass === "plain" && texture.length ? "textured plain" : patternClass;
  const titleMaterial = material && colour.toLowerCase().includes(material.split(" ")[0].toLowerCase())
    ? undefined : material;
  const patternMaterial = [pattern, titleMaterial].filter(Boolean).join(" ");
  const design = clean(record.design_name)!;
  const room = rooms[0];
  const titleCore = `${label(colour)}${patternMaterial ? ` ${label(patternMaterial)}` : ""} Curtain Fabric for Made-to-Measure`;
  const titleEnd = ` Curtains – ${design} ${exactColourway} | Sample`;
  let title = `${titleCore}${room ? ` ${label(room)}` : ""}${titleEnd}`;
  if (title.length > 150) title = `${titleCore}${titleEnd}`;
  if (title.length > 150) title = `${label(colour)} Curtain Fabric for Made-to-Measure Curtains – ${design} ${exactColourway} | Sample`;
  if (title.length > 150) throw new Error(`FABRIC_SEARCH_TITLE_TOO_LONG:${record.fabric_id}`);

  const article = pattern && /^[aeiou]/i.test(pattern) ? "an" : "a";
  const opening = `${design} in ${exactColourway} is ${article} ${pattern ? `${pattern} ` : ""}fabric for made-to-measure curtains.`;
  const sentences = [opening];
  if (room) sentences.push(`${roomSource === "EXPLICIT_RETAIL" ? "The validated profile suggests" : "Its colour and visual character can work well in"} ${rooms.slice(0, 2).join(" and ")} interiors.`);
  if (primaryColourFamily && primaryColourFamily !== exactColourway.toLowerCase()) {
    sentences.push(`${label(primaryColourFamily)} tones shape the colour story${secondaryColours.length ? `, with ${list(secondaryColours.slice(0, 3))} as supporting ${secondaryColours.length === 1 ? "colour" : "colours"}` : ""}.`);
  } else if (secondaryColours.length) {
    sentences.push(`Supporting colours include ${list(secondaryColours.slice(0, 3))}.`);
  }
  if (texture.length) sentences.push(`The surface has ${list(texture.slice(0, 3).map((value) => TEXTURE_COPY[value] ?? value))}.`);
  const distinctMotif = motif.filter((value) => value !== patternClass && value !== pattern);
  if (distinctMotif.length) sentences.push(`Motifs include ${list(distinctMotif.slice(0, 3))}.`);
  if (character.length) sentences.push(`Its ${list(character.slice(0, 2))} character gives the window its own presence.`);
  if (visualActivity === "quiet" || visualActivity === "low") sentences.push("The pattern reads quietly at the window.");
  else if (visualActivity === "busy" || visualActivity === "high") sentences.push("The pattern makes a lively statement at the window.");
  else if (visualActivity === "balanced") sentences.push("The pattern has balanced visual movement.");
  if (visualPresence === "substantial" || visualPresence === "rich") sentences.push("Its stronger visual presence can anchor a room.");
  else if (visualPresence === "light") sentences.push("Its light visual presence sits gently in the room.");
  if (styles.length) sentences.push(`${styleSource === "EXPLICIT_RETAIL" ? "The validated profile supports" : "This can suit"} ${list(styles.slice(0, 2))} interiors.`);
  if (finish && finish !== "unknown") {
    const finishText = finish === "low" ? "low sheen" : finish === "gentle" ? "gentle sheen" : finish;
    sentences.push(finishText === "matte"
      ? "The visible finish is matte."
      : `The visible finish has a ${finishText}.`);
  }
  if (headings.length) sentences.push(`Choose ${list(headings)} headings where compatible with the window and fixing.`);
  if (linings.some((value) => value === "blackout" || value === "thermal")) {
    const liningOptions = linings.filter((value) => value === "blackout" || value === "thermal");
    sentences.push(`Made-to-measure curtains are available with ${list(liningOptions)} lining options where compatible.`);
  }
  const specifications = [
    compositionText ? `Composition: ${compositionText}` : undefined,
    usableWidth ? `usable width ${usableWidth}` : undefined,
    verticalRepeat ? `vertical repeat ${verticalRepeat}` : undefined,
    horizontalRepeat ? `horizontal repeat ${horizontalRepeat}` : undefined,
    patternMatch ? `pattern match ${patternMatch}` : undefined,
  ].filter(Boolean);
  if (specifications.length) sentences.push(`${specifications.join("; ")}.`);
  sentences.push(`View the full fabric details, order the £2.50 physical sample to check it at home, or continue to made-to-measure curtains. Finished curtains are priced separately.`);
  const description = sentences.join(" ");
  if (description.length > 1500) throw new Error(`FABRIC_SEARCH_DESCRIPTION_TOO_LONG:${record.fabric_id}`);
  const seoTitle = truncateWords(title.replace(/ \| Sample$/, " | CurtainsUK"), 70);
  const seoDescription = truncateWords(`${opening} ${primaryColourFamily ? `${label(primaryColourFamily)} tones. ` : ""}Order a £2.50 sample or design your curtains.`, 160);
  const intro = sentences.slice(0, Math.min(3, sentences.length - 1)).join(" ");
  const product_detail = [
    detail("Identity", "Collection", clean(record.collection_name)),
    detail("Identity", "Design", design),
    detail("Identity", "Colourway", exactColourway),
    detail("Fabric", "Composition", compositionText),
    detail("Fabric", "Usable width", usableWidth),
    detail("Fabric", "Full width", fullWidth),
    detail("Fabric", "Vertical repeat", verticalRepeat),
    detail("Fabric", "Horizontal repeat", horizontalRepeat),
    detail("Fabric", "Pattern match", patternMatch),
    detail("Fabric", "Suitable use", record.usage_suitability.filter((value) =>
      ["curtains", "blinds", "cushions", "upholstery"].includes(value.toLowerCase())).join(", ") || undefined),
  ].filter((value): value is { section: string; name: string; value: string } => Boolean(value));
  return {
    fabricId: record.fabric_id,
    canonicalUrl,
    sampleId: `cuk-sample:${record.fabric_id}`,
    exactColourway,
    primaryColourFamily,
    secondaryColours,
    patternClass,
    motif,
    texture,
    finish,
    character,
    visualActivity,
    visualPresence,
    rooms,
    roomSource,
    styles,
    styleSource,
    composition: compositionText,
    usableWidth,
    fullWidth,
    verticalRepeat,
    horizontalRepeat,
    patternMatch,
    headings,
    linings,
    title,
    description,
    seoTitle,
    seoDescription,
    intro,
    merchant: {
      id: `cuk-sample:${record.fabric_id}`,
      title,
      description,
      brand: record.brand_name,
      color: exactColourway,
      material: compositionText,
      pattern,
      product_type: "Home & Garden > Decor > Window Treatments > Made-to-Measure Curtain Fabric Samples",
      product_detail,
      link: canonicalUrl,
      price: "2.50 GBP",
    },
  };
}
