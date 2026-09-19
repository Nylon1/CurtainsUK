import "server-only";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";

type VisualField = { value?: unknown; confidence?: string };
type VisualRow = { fabric_id: string; knowledge_state: string; visual_fields: Record<string, VisualField> | null };

export type FabricVisualIntelligence = {
  palette?: { primary?: string; secondary?: string[]; temperature?: string; lightness?: string; saturation?: string; contrast?: string; complexity?: string };
  pattern?: { category?: string; motif?: string[]; activity?: string; directionality?: string };
  texture?: string[];
  finish?: string;
  character?: string[];
  visualWeight?: string;
};

function known(value: unknown) {
  if (value === null || value === undefined || value === "unknown") return undefined;
  if (Array.isArray(value)) {
    const values = value.filter((item) => typeof item === "string" && item !== "unknown");
    return values.length ? values : undefined;
  }
  return typeof value === "string" ? value : undefined;
}

function field(fields: Record<string, VisualField>, key: string) { return known(fields[key]?.value); }

function mapRow(row: VisualRow): FabricVisualIntelligence {
  const fields = row.visual_fields ?? {};
  return {
    palette: {
      primary: field(fields, "primaryColour") as string | undefined,
      secondary: field(fields, "secondaryColours") as string[] | undefined,
      temperature: field(fields, "colourTemperature") as string | undefined,
      lightness: field(fields, "lightness") as string | undefined,
      saturation: field(fields, "saturation") as string | undefined,
      contrast: field(fields, "contrast") as string | undefined,
      complexity: field(fields, "colourComplexity") as string | undefined,
    },
    pattern: {
      category: field(fields, "patternClass") as string | undefined,
      motif: field(fields, "motif") as string[] | undefined,
      activity: field(fields, "visualActivity") as string | undefined,
      directionality: field(fields, "directionality") as string | undefined,
    },
    texture: field(fields, "visualSurface") as string[] | undefined,
    finish: field(fields, "sheenAppearance") as string | undefined,
    character: field(fields, "character") as string[] | undefined,
    visualWeight: field(fields, "visualWeight") as string | undefined,
  };
}

export async function visualKnowledgeByFabricIds(ids: string[]) {
  if (!ids.length) return new Map<string, FabricVisualIntelligence>();
  const { data, error } = await createSupplierServiceClient()
    .from("fabric_visual_knowledge")
    .select("fabric_id,knowledge_state,visual_fields")
    .in("fabric_id", ids);
  if (error) throw new Error("FABRIC_VISUAL_KNOWLEDGE_UNAVAILABLE");
  return new Map(((data ?? []) as VisualRow[]).map((row) => [row.fabric_id, mapRow(row)]));
}

export function visualKnowledgeLabels(value: FabricVisualIntelligence | undefined) {
  if (!value) return [];
  return [value.palette?.primary, value.pattern?.category, value.pattern?.activity, ...(value.texture ?? []), ...(value.character ?? []), value.visualWeight].filter(Boolean) as string[];
}

export function customerGuidance(value: FabricVisualIntelligence | undefined) {
  if (!value) return {};
  const space = value.visualWeight === "substantial" ? "Works well where the room can carry a more present fabric." : value.visualWeight === "light" ? "Suits rooms where a lighter visual presence is helpful." : undefined;
  const light = value.palette?.lightness ? `The visual palette reads ${value.palette.lightness} in the approved imagery.` : undefined;
  const colour = value.palette?.primary ? `The dominant colour reads ${value.palette.primary}.` : undefined;
  const works = value.pattern?.activity === "quiet" || value.character?.includes("understated") ? "A calmer setting can support this fabric's quieter character." : value.pattern?.activity === "busy" ? "Use as a considered focal point alongside quieter surfaces." : undefined;
  const care = value.pattern?.category && value.pattern.category !== "plain" ? "Pattern matching and room scale deserve attention during specification." : undefined;
  return { space, light, colour, works, care };
}
