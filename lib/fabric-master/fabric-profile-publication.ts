import "server-only";

import { createHash } from "node:crypto";
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

export type FabricProfileKnowledgeField = typeof FABRIC_PROFILE_KNOWLEDGE_FIELDS[number];
export type FabricProfileMutableField = FabricProfileKnowledgeField | typeof FABRIC_PROFILE_SYNC_FIELD;

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
  const allowed = new Set<string>([...FABRIC_PROFILE_KNOWLEDGE_FIELDS, FABRIC_PROFILE_SYNC_FIELD]);
  for (const field of fields) {
    if (!allowed.has(field.key)) throw new Error(`FABRIC_PROFILE_FIELD_NOT_ALLOWED:${field.key}`);
  }
}
