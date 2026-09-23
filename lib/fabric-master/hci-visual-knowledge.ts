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

type CachedKnowledge = { until: number; value: Promise<[string, HciFabricKnowledge][]> };
const cached = new Map<string, CachedKnowledge>();

function requestedIds(fabricIds?: readonly string[]) {
  if (!fabricIds) return undefined;
  return [...new Set(fabricIds)].sort();
}

/** Server-to-server only. The browser never receives this source projection. */
export function hciVisualKnowledge(fabricIds?: readonly string[]) {
  const ids = requestedIds(fabricIds);
  const key = ids ? ids.join('\n') : '*';
  const now = Date.now();
  for (const [candidate, entry] of cached) if (entry.until <= now) cached.delete(candidate);
  const previous = cached.get(key);
  if (previous) return previous.value;
  const value = (async () => {
    const db = createSupplierServiceClient();
    const rows: VisualRow[] = [];
    if (ids) {
      // Price level is a governed commercial boundary. Reading only its exact
      // Fabric Master cohort avoids serialising unrelated visual evidence into
      // the customer request while retaining all richer evidence for candidates
      // that can actually be selected.
      for (let from = 0; from < ids.length; from += 400) {
        const { data, error } = await db.from('fabric_visual_knowledge_read_cache')
          .select('fabric_id,visual_fields').in('knowledge_state', ['COMPLETE', 'PARTIAL_GOVERNED'])
          .in('fabric_id', ids.slice(from, from + 400));
        if (error) throw Error('FABRIC_VISUAL_KNOWLEDGE_UNAVAILABLE');
        rows.push(...((data ?? []) as VisualRow[]));
      }
    } else {
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from('fabric_visual_knowledge_read_cache')
          .select('fabric_id,visual_fields').in('knowledge_state', ['COMPLETE', 'PARTIAL_GOVERNED'])
          .order('fabric_id').range(from, from + 999);
        if (error) throw Error('FABRIC_VISUAL_KNOWLEDGE_UNAVAILABLE');
        const page = (data ?? []) as VisualRow[];
        rows.push(...page);
        if (page.length < 1000) break;
      }
    }
    return rows.sort((a, b) => a.fabric_id.localeCompare(b.fabric_id))
      .map((row) => [row.fabric_id, mapHciFabricKnowledge(row)] as [string, HciFabricKnowledge]);
  })();
  cached.set(key, { until: now + 60_000, value });
  value.catch(() => { if (cached.get(key)?.value === value) cached.delete(key); });
  return value;
}
