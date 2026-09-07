import type { FabricMasterRecord } from "./types";
import { stableSlug } from "./catalogue-normalization";
import { fabricIsConfigurationEligible } from "./projection";

export const RETAIL_TAXONOMY = {
  colour: ["white/cream", "beige/taupe", "grey", "black", "blue", "green", "pink", "red", "orange", "yellow/gold", "purple", "brown", "neutral", "multicolour", "UNKNOWN"],
  pattern: ["plain", "textured plain", "stripe", "check", "geometric", "floral", "botanical", "abstract", "traditional", "animal", "children’s", "UNKNOWN"],
  character: ["smooth", "textured", "matte", "sheen", "natural", "refined", "soft", "structured", "velvet", "linen-look", "UNKNOWN"],
  style: ["contemporary", "traditional", "luxury", "country", "minimalist", "classic", "bold", "UNKNOWN"],
};
export interface RetailProfile {
  description: string; description_validated: boolean;
  colour_families: string[]; patterns: string[]; characters: string[]; styles: string[];
  rooms: string[]; window_types: string[]; headings: string[]; linings: string[];
}
export interface RetailImage { imageType: string; url: string; width: number; height: number; approved: boolean }
export function validTaxonomy(profile: RetailProfile) {
  return [ [profile.colour_families, RETAIL_TAXONOMY.colour], [profile.patterns, RETAIL_TAXONOMY.pattern], [profile.characters, RETAIL_TAXONOMY.character], [profile.styles, RETAIL_TAXONOMY.style] ].every(([values, allowed]) => values.length > 0 && values.every((v) => allowed.includes(v)));
}
export function retailLaunchBlockers(record: FabricMasterRecord, profile: RetailProfile | null, images: RetailImage[]) {
  const blockers: string[] = [];
  if (!record.supplier_sku || !record.brand_name || !record.design_name || !record.colour_name) blockers.push("IDENTITY_INCOMPLETE");
  if (record.lifecycle_state !== "CURRENT") blockers.push("CURRENT_LIFECYCLE_UNCONFIRMED");
  if (!images.some((i) => i.imageType === "MAIN" && i.approved && i.width >= 400 && i.height >= 400 && /^https:\/\/cdn\.shopify\.com\//.test(i.url))) blockers.push("APPROVED_MAIN_IMAGE_REQUIRED");
  if (!record.usable_width_mm || !record.composition.length || !record.usage_suitability.includes("Curtains")) blockers.push("SPECIFICATION_INCOMPLETE");
  if (!profile?.description_validated || !profile.description.trim()) blockers.push("DESCRIPTION_REQUIRES_VALIDATION");
  if (!profile || !validTaxonomy(profile)) blockers.push("CLASSIFICATION_INVALID");
  if (record.sample_available === null) blockers.push("SAMPLE_STATE_UNKNOWN");
  if (record.storefront_selectable && !fabricIsConfigurationEligible(record)) blockers.push("PRICING_GATE_INCONSISTENT");
  return blockers;
}
export function factualRetailDescription(record: Omit<FabricMasterRecord, "supplier_name">) {
  const parts = [`${record.design_name} in ${record.colour_name} is part of the ${record.collection_name} collection by ${record.brand_name}.`];
  if (record.composition.length) parts.push(`Its composition is ${record.composition.map((p) => `${p.percentage}% ${p.material.toLowerCase()}`).join(" and ")}.`);
  if (record.vertical_repeat_mm !== null && record.vertical_repeat_mm > 0) parts.push(`The vertical pattern repeats every ${record.vertical_repeat_mm / 10} cm; consider this scale when planning the finished curtains.`);
  if (record.usage_suitability.includes("Curtains")) parts.push("The supplier lists this fabric for curtains. Choose a sample to assess the colour and feel in your room before deciding on a heading and lining.");
  return parts.join(" ");
}
export function retailMetadata(record: FabricMasterRecord) {
  const brand = stableSlug(record.brand_name), collection = stableSlug(record.collection_name), design = stableSlug(record.design_name), colour = stableSlug(record.colour_name);
  return { title: `${record.design_name} ${record.colour_name} by ${record.brand_name} | CurtainsUK`, h1: `${record.design_name} — ${record.colour_name}`,
    metaDescription: `Explore ${record.design_name} in ${record.colour_name} from ${record.brand_name}’s ${record.collection_name} collection. View fabric details and plan your made-to-measure curtains.`.slice(0, 170),
    canonicalPath: `/fabrics/${brand}/${design}/${colour}`, brandPath: `/fabrics/${brand}`, collectionPath: `/fabrics/${brand}/${collection}`,
    alt: `${record.design_name} fabric in ${record.colour_name} by ${record.brand_name}`, robots: "noindex, nofollow" };
}
