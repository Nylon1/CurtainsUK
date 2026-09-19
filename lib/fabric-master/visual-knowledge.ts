import "server-only";

import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";



type VisualField = { value?: unknown; confidence?: string };

export type VisualRow = { fabric_id: string; knowledge_state: string; visual_fields: Record<string, VisualField> | null };



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



export function mapVisualKnowledgeRow(row: VisualRow): FabricVisualIntelligence {

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

    .from("fabric_visual_knowledge_read_cache")

    .select("fabric_id,knowledge_state,visual_fields")

    .in("fabric_id", ids);

  if (error) throw new Error("FABRIC_VISUAL_KNOWLEDGE_UNAVAILABLE");

  return new Map(((data ?? []) as VisualRow[]).map((row) => [row.fabric_id, mapVisualKnowledgeRow(row)]));

}



export function visualKnowledgeLabels(value: FabricVisualIntelligence | undefined) {

  if (!value) return [];

  return [value.palette?.primary, value.pattern?.category, value.pattern?.activity, ...(value.texture ?? []), ...(value.character ?? []), value.visualWeight].filter(Boolean) as string[];

}



export function customerGuidance(value: FabricVisualIntelligence | undefined) {

  if (!value) return {};

  const p = value.palette;

  const space = value.visualWeight === "substantial"

    ? "Its substantial visual presence gives the curtains a noticeable role in the room. Allow space around them so the fabric can lead."

    : value.visualWeight === "light" ? "A light visual presence can sit gently alongside the room’s architecture, leaving other pieces to take the lead." : undefined;

  const light = p?.lightness === "deep" ? "A deep palette can look more enveloping in evening light. Compare a sample beside the window and further into the room before choosing."

    : p?.lightness === "light" ? "A light palette can soften the visual outline of the curtains. Check it against the wall in daylight and lamplight; this does not indicate how much light the fabric transmits."

    : value.texture?.some(v => ["relief", "visible-weave"].includes(v)) ? "View the surface in both daylight and lamplight. Changing light can bring its visible texture forward or make it feel quieter." : undefined;

  const colours = p?.secondary?.filter(v => v !== p.primary) ?? [];

  const colour = p?.primary ? `Let ${p.primary} anchor the scheme${colours.length ? `, with ${colours.join(" and ")} as supporting colours to pick up in nearby furnishings` : " and compare it with the room’s largest existing surfaces"}. A small shared colour can connect the curtains to the rest of the room.` : undefined;

  const works = value.pattern?.category === "stripe" && value.character?.includes("graphic") ? "Give the stripe room to establish its rhythm beside simpler surfaces. A shared colour in a cushion or upholstered piece can connect the graphic pattern to the wider scheme."

    : value.pattern?.activity === "quiet" || value.character?.includes("understated") ? "Pair its quieter character with a favourite artwork or a more expressive piece of furniture, allowing both to remain distinct."

    : value.pattern?.activity === "busy" ? "Let the pattern act as a focal point, with quieter neighbouring surfaces giving the eye somewhere to rest." : undefined;

  const care = value.visualWeight === "substantial" ? "Other strong patterns or dark surfaces may compete with this fabric. Compare the combination over a larger area before committing to a full curtain."

    : value.pattern?.category === "geometric" ? "Nearby geometric patterns can create competing rhythms. Compare them together rather than judging each sample separately." : undefined;

  return { space, light, colour, works, care };

}



export function customerIntelligence(value: FabricVisualIntelligence | undefined) {

  if (!value) return undefined;

  const dimensions = [

    ['colour', 'Colour', [value.palette?.primary, ...(value.palette?.secondary ?? [])].filter(Boolean)],

    ['pattern', 'Pattern', [value.pattern?.category, ...(value.pattern?.motif ?? [])]],

    ['activity', 'Visual activity', value.pattern?.activity ? [value.pattern.activity] : []],

    ['texture', 'Texture', value.texture ?? []],

    ['finish', 'Finish', value.finish ? [value.finish] : []],

    ['character', 'Character', value.character ?? []],

    ['presence', 'Presence', value.visualWeight ? [value.visualWeight] : []],

  ].filter(([, , values]) => (values as unknown[]).filter(Boolean).length).map(([key, label, values]) => ({ key, label, values: [...new Set((values as unknown[]).filter(Boolean))] }));

  const guidance = customerGuidance(value);

  const advice = Object.entries(guidance).filter(([, text]) => typeof text === 'string' && text).map(([key, text]) => ({ label: key === 'space' ? 'SPACE' : key === 'light' ? 'LIGHT' : key === 'colour' ? 'COLOUR' : key === 'works' ? 'WHAT WORKS' : 'WHAT NEEDS CARE', text }));

  return { dimensions, advice };

}
