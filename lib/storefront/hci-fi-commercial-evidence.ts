import { fabricReadiness } from '@/lib/fabric-master/readiness';
import type { RetailCommercialReadiness, RetailDirectionCandidate } from './hci-style-direction-eligibility';

export const FI_COMMERCIAL_EVIDENCE_RPC = 'fi_bulk_commercial_evidence_v1';
const maxIdsPerCall = 240;
const concurrency = 8;

type Evidence = {
  fabric_id: string;
  stock: 'FABRIC_AVAILABLE' | 'TEMPORARILY_UNAVAILABLE' | 'AVAILABILITY_TO_BE_CONFIRMED' | 'NO_LONGER_AVAILABLE';
  stale: boolean;
  sample_stock_available: boolean;
  price_confirmed: boolean;
};
type Rpc = (name: string, parameters: { p_ids: string[] }) => PromiseLike<{ data: unknown; error: unknown }>;

export function fiEvidenceBatches(ids: readonly string[]) {
  if (ids.some((id) => !/^[-a-zA-Z0-9]{1,150}$/.test(id)) || new Set(ids).size !== ids.length)
    throw Error('FI_COMMERCIAL_IDENTITY_INVALID');
  return Array.from({ length: Math.ceil(ids.length / maxIdsPerCall) }, (_, index) =>
    ids.slice(index * maxIdsPerCall, (index + 1) * maxIdsPerCall));
}

function evidenceRows(value: unknown, requested: readonly string[]) {
  if (!Array.isArray(value)) throw Error('FI_COMMERCIAL_EVIDENCE_INVALID');
  const expected = new Set(requested);
  const result = new Map<string, Evidence>();
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') throw Error('FI_COMMERCIAL_EVIDENCE_INVALID');
    const row = candidate as Evidence;
    if (typeof row.fabric_id !== 'string' || !expected.has(row.fabric_id) || result.has(row.fabric_id) ||
      !['FABRIC_AVAILABLE', 'TEMPORARILY_UNAVAILABLE', 'AVAILABILITY_TO_BE_CONFIRMED', 'NO_LONGER_AVAILABLE'].includes(row.stock) ||
      typeof row.stale !== 'boolean' || typeof row.sample_stock_available !== 'boolean' ||
      typeof row.price_confirmed !== 'boolean') throw Error('FI_COMMERCIAL_EVIDENCE_INVALID');
    result.set(row.fabric_id, row);
  }
  // The old reader treats absent commercial evidence as unavailable. Preserve
  // that fail-closed decision instead of manufacturing an approved row.
  return result;
}

/** FI only. The database wrapper returns evidence for bounded ID batches. */
export async function fiCommercialReadiness(records: readonly RetailDirectionCandidate[], rpc: Rpc): Promise<Map<string, RetailCommercialReadiness>> {
  const batches = fiEvidenceBatches(records.map((record) => record.fabric_id));
  const evidence = new Map<string, Evidence>();
  for (let from = 0; from < batches.length; from += concurrency) {
    const pages = await Promise.all(batches.slice(from, from + concurrency).map(async (ids) => {
      const { data, error } = await rpc(FI_COMMERCIAL_EVIDENCE_RPC, { p_ids: [...ids] });
      if (error) throw Error('FI_COMMERCIAL_EVIDENCE_UNAVAILABLE');
      return evidenceRows(data, ids);
    }));
    pages.forEach((page) => page.forEach((row, id) => evidence.set(id, row)));
  }
  return new Map(records.map((record) => {
    const row = evidence.get(record.fabric_id);
    return [record.fabric_id, fabricReadiness(record, {
      stock: row?.stock, stale: row?.stale,
      sampleStockAvailable: row?.sample_stock_available, priceConfirmed: row?.price_confirmed,
    })];
  }));
}
