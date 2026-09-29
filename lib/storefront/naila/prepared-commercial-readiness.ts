import { fabricReadiness } from '@/lib/fabric-master/readiness';
import type { RetailCommercialReadiness, RetailDirectionCandidate } from '../hci-style-direction-eligibility';

export const NAILA_PREPARED_COMMERCIAL_RPC = 'naila_prepared_commercial_readiness_v1';

type Evidence = {
  fabric_id: string;
  stock: 'FABRIC_AVAILABLE' | 'TEMPORARILY_UNAVAILABLE' | 'AVAILABILITY_TO_BE_CONFIRMED' | 'NO_LONGER_AVAILABLE';
  stale: boolean;
  sample_stock_available: boolean;
  price_confirmed: boolean;
};
type Rpc = (name: string, parameters: { p_ids: string[] }) =>
  PromiseLike<{ data: unknown; error: unknown }>;

function parseEvidence(value: unknown, ids: readonly string[]) {
  if (!Array.isArray(value) || value.length !== ids.length) throw Error('NAILA_PREPARED_READINESS_INCOMPLETE');
  const expected = new Set(ids);
  const rows = new Map<string, Evidence>();
  for (const row of value) {
    if (!row || typeof row !== 'object') throw Error('NAILA_PREPARED_READINESS_INVALID');
    const evidence = row as Evidence;
    if (typeof evidence.fabric_id !== 'string' || !expected.has(evidence.fabric_id) || rows.has(evidence.fabric_id)
      || !['FABRIC_AVAILABLE', 'TEMPORARILY_UNAVAILABLE', 'AVAILABILITY_TO_BE_CONFIRMED', 'NO_LONGER_AVAILABLE'].includes(evidence.stock)
      || typeof evidence.stale !== 'boolean'
      || typeof evidence.sample_stock_available !== 'boolean'
      || typeof evidence.price_confirmed !== 'boolean') throw Error('NAILA_PREPARED_READINESS_INVALID');
    rows.set(evidence.fabric_id, evidence);
  }
  return rows;
}

/** Naila only: a single prepared-generation RPC, with no live-evidence fallback. */
export async function readNailaPreparedCommercialReadiness(
  records: readonly RetailDirectionCandidate[], rpc: Rpc,
): Promise<Map<string, RetailCommercialReadiness>> {
  if (!records.length) return new Map();
  const ids = records.map((record) => record.fabric_id);
  try {
    const { data, error } = await rpc(NAILA_PREPARED_COMMERCIAL_RPC, { p_ids: ids });
    if (error) throw Error('NAILA_PREPARED_READINESS_UNAVAILABLE');
    const evidence = parseEvidence(data, ids);
    return new Map(records.map((record) => {
      const row = evidence.get(record.fabric_id)!;
      return [record.fabric_id, fabricReadiness(record, {
        stock: row.stock,
        stale: row.stale,
        sampleStockAvailable: row.sample_stock_available,
        priceConfirmed: row.price_confirmed,
      })];
    }));
  } catch {
    throw Error('NAILA_PREPARED_READINESS_UNAVAILABLE');
  }
}
