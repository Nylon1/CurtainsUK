import "server-only";

import { createHash } from "node:crypto";
import type { FabricMasterRecord } from "./types";
import { SAMPLE_VARIANT_ID } from "../storefront/sample-order";
import {
  customerGuidance,
  mapVisualKnowledgeRow,
  type VisualRow,
} from "./visual-knowledge";

export const FABRIC_PROFILE_KNOWLEDGE_FIELDS = [
  "knowledge_state",
  "knowledge_colour",
  "knowledge_pattern",
  "knowledge_activity",
  "knowledge_surface",
  "knowledge_finish",
  "knowledge_weight",
  "knowledge_character",
  "knowledge_advice",
] as const;

export const FABRIC_PROFILE_SYNC_FIELD = "sync_revision" as const;
export const FABRIC_PROFILE_SUPPLIER_FIELD = "supplier_facts" as const;

export const FABRIC_PROFILE_CREATE_BASE_FIELDS = [
  "fabric_master_id",
  "supplier",
  "display_title",
  "brand",
  "design",
  "colourway",
  "canonical_url",
  "image_url",
  "image_alt",
  "sample_variant_id",
  "sample_price",
  "sample_offer_label",
  "sample_identity",
  "sample_eligible",
  "seo_title",
  "seo_description",
  FABRIC_PROFILE_SUPPLIER_FIELD,
] as const;

export type FabricProfileKnowledgeField = typeof FABRIC_PROFILE_KNOWLEDGE_FIELDS[number];
export type FabricProfileCreateBaseField = typeof FABRIC_PROFILE_CREATE_BASE_FIELDS[number];
export type FabricProfileMutableField = FabricProfileKnowledgeField | typeof FABRIC_PROFILE_SYNC_FIELD | typeof FABRIC_PROFILE_SUPPLIER_FIELD;

export type FabricProfilePublication = {
  fabricId: string;
  fields: Partial<Record<FabricProfileKnowledgeField, string>>;
  revision: string;
};

function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function line(label: string, values: Array<string | undefined>) {
  const present = unique(values);
  return present.length ? `${label}: ${present.join(", ")}` : undefined;
}

function publicationState(state: string) {
  if (state === "COMPLETE") return "COMPLETE";
  if (state === "PARTIAL_GOVERNED") return "PARTIAL";
  return null;
}

function advice(value: ReturnType<typeof mapVisualKnowledgeRow>) {
  const guidance = customerGuidance(value);
  const labels: Record<keyof typeof guidance, string> = {
    space: "SPACE",
    light: "LIGHT",
    colour: "COLOUR",
    works: "WHAT WORKS",
    care: "WHAT NEEDS CARE",
  };
  return (Object.keys(labels) as Array<keyof typeof guidance>)
    .flatMap((key) => {
      const text = guidance[key];
      return typeof text === "string" && text ? [`${labels[key]}: ${text}`] : [];
    })
    .join("\n") || undefined;
}

function stableRevision(fields: Partial<Record<FabricProfileKnowledgeField, string>>) {
  const serialised = FABRIC_PROFILE_KNOWLEDGE_FIELDS
    .flatMap((key) => fields[key] === undefined ? [] : [[key, fields[key]]]);
  return `fi-manual-${createHash("sha256").update(JSON.stringify(serialised)).digest("hex").slice(0, 20)}`;
}

/**
 * Build the customer-facing Fabric Profile intelligence from the governed read
 * cache. Pending/unusable states are never publication candidates.
 */
export function buildFabricProfilePublication(row: VisualRow): FabricProfilePublication | null {
  const state = publicationState(row.knowledge_state);
  if (!state) return null;

  const value = mapVisualKnowledgeRow(row);
  const fields: Partial<Record<FabricProfileKnowledgeField, string>> = {
    knowledge_state: state,
    knowledge_colour: line("Colour", [value.palette?.primary, ...(value.palette?.secondary ?? [])]),
    knowledge_pattern: line("Pattern", [value.pattern?.category, ...(value.pattern?.motif ?? [])]),
    knowledge_activity: value.pattern?.activity ? `Visual activity: ${value.pattern.activity}` : undefined,
    knowledge_surface: line("Texture", value.texture ?? []),
    knowledge_finish: value.finish ? `Finish: ${value.finish}` : undefined,
    knowledge_weight: value.visualWeight ? `Presence: ${value.visualWeight}` : undefined,
    knowledge_character: line("Character", value.character ?? []),
    knowledge_advice: advice(value),
  };

  return {
    fabricId: row.fabric_id,
    fields,
    revision: stableRevision(fields),
  };
}


function centimetres(mm: number | null) {
  if (mm === null) return undefined;
  const value = mm / 10;
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)} cm`;
}

function humanise(value: string | null | undefined) {
  if (!value) return undefined;
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function buildFabricProfileSupplierFacts(record: FabricMasterRecord) {
  const composition = record.composition
    .filter((part) => part.material && Number.isFinite(part.percentage))
    .map((part) => `${part.percentage}% ${part.material}`)
    .join(", ");
  const lines: Array<string | undefined> = [
    `Supplier: ${record.supplier_name}`,
    `Brand: ${record.brand_name}`,
    `Collection: ${record.collection_name}`,
    `Design: ${record.design_name}`,
    `Colourway: ${record.colour_name}`,
    `SKU: ${record.supplier_sku}`,
    composition ? `Composition: ${composition}` : undefined,
    centimetres(record.full_width_mm) ? `Full width: ${centimetres(record.full_width_mm)}` : undefined,
    centimetres(record.usable_width_mm) ? `Usable width: ${centimetres(record.usable_width_mm)}` : undefined,
    centimetres(record.vertical_repeat_mm) ? `Vertical repeat: ${centimetres(record.vertical_repeat_mm)}` : undefined,
    centimetres(record.horizontal_repeat_mm) ? `Horizontal repeat: ${centimetres(record.horizontal_repeat_mm)}` : undefined,
    humanise(record.pattern_match_type) ? `Pattern match: ${humanise(record.pattern_match_type)}` : undefined,
    record.weight_gsm === null ? undefined : `Physical weight: ${record.weight_gsm} g/m²`,
    record.usage_suitability.length ? `Usage: ${record.usage_suitability.map((value) => humanise(value)).filter(Boolean).join(", ")}` : undefined,
    record.care_instructions.length ? `Care: ${record.care_instructions.map((value) => humanise(value)).filter(Boolean).join(", ")}` : undefined,
  ];
  return lines.filter((value): value is string => Boolean(value)).join("\n");
}

export function fabricProfileHandle(record: FabricMasterRecord) {
  const slug = (value: string) => value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return [record.fabric_id, slug(record.design_name), slug(record.colour_name)]
    .filter(Boolean)
    .join("-")
    .slice(0, 240)
    .replace(/-+$/g, "");
}

export function buildFabricProfileCreateBase(record: FabricMasterRecord) {
  const image = record.imagery.find((value) => /^https:\/\/cdn\.shopify\.com\//i.test(value));
  if (!image) return null;
  const handle = fabricProfileHandle(record);
  const displayTitle = `${record.brand_name} ${record.design_name} — ${record.colour_name}`;
  const fields: Record<FabricProfileCreateBaseField, string> = {
    fabric_master_id: record.fabric_id,
    supplier: record.supplier_name,
    display_title: displayTitle,
    brand: record.brand_name,
    design: record.design_name,
    colourway: record.colour_name,
    canonical_url: `https://www.curtainsuk.com/pages/fabric/${handle}`,
    image_url: image,
    image_alt: `${record.design_name} fabric in ${record.colour_name} by ${record.brand_name}`,
    sample_variant_id: String(SAMPLE_VARIANT_ID),
    sample_price: "2.50",
    sample_offer_label: "Fabric sample — £2.50",
    sample_identity: `Fabric Master ${record.fabric_id}; Shopify sample variant ${SAMPLE_VARIANT_ID}`,
    sample_eligible: "true",
    seo_title: `${displayTitle} Curtain Fabric Sample | CurtainsUK`,
    seo_description: `Explore ${displayTitle} through CurtainsUK colour, pattern and interior guidance. Order the exact physical fabric sample for £2.50.`,
    supplier_facts: buildFabricProfileSupplierFacts(record),
  };
  return { handle, fields };
}

export function fabricProfileCreateFields(
  base: NonNullable<ReturnType<typeof buildFabricProfileCreateBase>>,
  publication: FabricProfilePublication,
) {
  return [
    ...FABRIC_PROFILE_CREATE_BASE_FIELDS.map((key) => ({ key, value: base.fields[key] })),
    ...FABRIC_PROFILE_KNOWLEDGE_FIELDS.flatMap((key) => {
      const value = publication.fields[key];
      return value ? [{ key, value }] : [];
    }),
    { key: FABRIC_PROFILE_SYNC_FIELD, value: publication.revision },
  ];
}

export function fabricProfilePublicationRichEnough(publication: FabricProfilePublication) {
  if (!publication.fields.knowledge_pattern) return false;
  const supportingDimensions = [
    publication.fields.knowledge_colour,
    publication.fields.knowledge_activity,
    publication.fields.knowledge_surface,
    publication.fields.knowledge_finish,
    publication.fields.knowledge_weight,
    publication.fields.knowledge_character,
  ].filter(Boolean).length;
  return supportingDimensions >= 3;
}

/** Fabric Profile creation policy; other Fabric Master consumers keep their existing filters. */
export function eligibleFabricProfileCreateBase(
  record: FabricMasterRecord,
  sampleCurrent: boolean,
  publication: FabricProfilePublication | null,
) {
  if (record.staging_catalog_visible !== true || record.storefront_selectable !== true) return null;
  if (record.lifecycle_state === "DISCONTINUED" || !sampleCurrent) return null;
  if (!publication || !fabricProfilePublicationRichEnough(publication)) return null;
  return buildFabricProfileCreateBase(record);
}

export function fabricProfileSupplierFactsPatch(
  existing: Readonly<Record<string, string | null | undefined>>,
  desired: string | undefined,
): Array<{ key: typeof FABRIC_PROFILE_SUPPLIER_FIELD; value: string }> {
  if (!desired || comparable(existing[FABRIC_PROFILE_SUPPLIER_FIELD]) === comparable(desired)) return [];
  return [{ key: FABRIC_PROFILE_SUPPLIER_FIELD, value: desired }];
}

function comparable(value: string | null | undefined) {
  return value?.replace(/\r\n/g, "\n").trim() ?? "";
}

/**
 * Conservative publication patch:
 * - never clears a populated Shopify field because the governed reading is unknown;
 * - never downgrades an already COMPLETE published profile to PARTIAL;
 * - writes sync_revision only when customer-facing intelligence actually changes.
 */
export function fabricProfilePatch(
  existing: Readonly<Record<string, string | null | undefined>>,
  publication: FabricProfilePublication,
): Array<{ key: FabricProfileMutableField; value: string }> {
  const patch: Array<{ key: FabricProfileMutableField; value: string }> = [];

  for (const key of FABRIC_PROFILE_KNOWLEDGE_FIELDS) {
    const desired = publication.fields[key];
    if (!desired) continue;
    if (key === "knowledge_state"
      && comparable(existing.knowledge_state) === "COMPLETE"
      && desired === "PARTIAL") {
      continue;
    }
    if (comparable(existing[key]) !== comparable(desired)) {
      patch.push({ key, value: desired });
    }
  }

  if (patch.length > 0 && comparable(existing[FABRIC_PROFILE_SYNC_FIELD]) !== publication.revision) {
    patch.push({ key: FABRIC_PROFILE_SYNC_FIELD, value: publication.revision });
  }

  return patch;
}

export function assertFabricProfilePatchAllowed(
  fields: ReadonlyArray<{ key: string; value: string }>,
) {
  const allowed = new Set<string>([...FABRIC_PROFILE_KNOWLEDGE_FIELDS, FABRIC_PROFILE_SYNC_FIELD, FABRIC_PROFILE_SUPPLIER_FIELD]);
  for (const field of fields) {
    if (!allowed.has(field.key)) throw new Error(`FABRIC_PROFILE_FIELD_NOT_ALLOWED:${field.key}`);
  }
}
