import 'server-only';

import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';

type VisualField = { value?: unknown };
type VisualRow = {
  fabric_id: string;
  visual_fields: Record<string, VisualField> | null;
};

export type HciFabricKnowledge = {
  palette?: { primary?: string; secondary?: string[]; temperature?: string; lightness?: string; saturation?: string; contrast?: string; complexity?: string };
  pattern?: { category?: string; motif?: string[]; activity?: string; directionality?: string };
  texture?: string[];
  finish?: string;
  character?: string[];
  visualWeight?: string;
};

function known(value: unknown): string | string[] | undefined {
  if (value === null || value === undefined || value === 'unknown') return undefined;
  if (Array.isArray(value)) {
    const entries = value.filter((entry): entry is string => typeof entry === 'string' && entry !== 'unknown');
    return entries.length ? entries : undefined;
  }
  return typeof value === 'string' ? value : undefined;
}

function scalar(fields: Record<string, VisualField>, key: string) {
  const value = known(fields[key]?.value);
  return typeof value === 'string' ? value : undefined;
}

function list(fields: Record<string, VisualField>, key: string) {
  const value = known(fields[key]?.value);
  return Array.isArray(value) ? value : undefined;
}

/** Maps only governed visual evidence from the private cache. Supplier facts remain separate. */
export function mapHciFabricKnowledge(row: VisualRow): HciFabricKnowledge {
  const fields = row.visual_fields ?? {};
  return {
    palette: {
      primary: scalar(fields, 'primaryColour'), secondary: list(fields, 'secondaryColours'),
      temperature: scalar(fields, 'colourTemperature'), lightness: scalar(fields, 'lightness'),
      saturation: scalar(fields, 'saturation'), contrast: scalar(fields, 'contrast'), complexity: scalar(fields, 'colourComplexity'),
    },
    pattern: {
      category: scalar(fields, 'patternClass'), motif: list(fields, 'motif'),
      activity: scalar(fields, 'visualActivity'), directionality: scalar(fields, 'directionality'),
    },
    texture: list(fields, 'visualSurface'), finish: scalar(fields, 'sheenAppearance'),
    character: list(fields, 'character'), visualWeight: scalar(fields, 'visualWeight'),
  };
}

let cached: { until: number; value: Promise<[string, HciFabricKnowledge][]> } | undefined;

/** Server-to-server only. The browser never receives this source projection. */
export function hciVisualKnowledge() {
  if (cached && cached.until > Date.now()) return cached.value;
  const value = (async () => {
    const db = createSupplierServiceClient();
    const rows: VisualRow[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('fabric_visual_knowledge_read_cache')
        .select('fabric_id,visual_fields').in('knowledge_state', ['COMPLETE', 'PARTIAL_GOVERNED'])
        .order('fabric_id').range(from, from + 999);
      if (error) throw Error('FABRIC_VISUAL_KNOWLEDGE_UNAVAILABLE');
      const page = (data ?? []) as VisualRow[];
      rows.push(...page);
      if (page.length < 1000) break;
    }
    return rows.map((row) => [row.fabric_id, mapHciFabricKnowledge(row)] as [string, HciFabricKnowledge]);
  })();
  cached = { until: Date.now() + 60_000, value };
  value.catch(() => { if (cached?.value === value) cached = undefined; });
  return value;
}
