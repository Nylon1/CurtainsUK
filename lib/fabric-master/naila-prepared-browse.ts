import { governedBrowseFilters } from './browse-filters';
import { browsePriceBand } from './browse-price-guide';
import { guidePriceLevelDefinition } from './guide-price-level';

export const NAILA_PREPARED_RPC = 'search_retail_fabrics_naila_v1';
export const NAILA_PREPARED_UNAVAILABLE = 'NAILA_PREPARED_BROWSE_UNAVAILABLE';
export const NAILA_PREPARED_CONTRACT = 'naila-prepared-only-v1';
export const NAILA_PREPARED_MESSAGE = 'Your prepared fabric selection is unavailable just now. Please try again. Your consultation choices are saved.';

type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{data: unknown; error: unknown}>;
type Selection = { ids: string[]; total: number; brands: string[]; collections: string[]; guidePrices?: Record<string, number>; facetOptions?: Record<string, {value:string;label:string;count:number}[]> };

/** This reader has exactly one RPC dependency. It cannot request the legacy
 * prepared or relational functions, refresh a projection, or hydrate records. */
export async function readNailaPreparedSelection(params: URLSearchParams, rpc: Rpc): Promise<Selection> {
  const requestedLevel = params.get('nailaPriceLevel');
  const level = guidePriceLevelDefinition(requestedLevel);
  if (requestedLevel && !level) throw Error(NAILA_PREPARED_UNAVAILABLE);
  const band = params.get('browseGuide') === '1' ? browsePriceBand(params.get('guidePrice')) : null;
  const args = {
    p_filters: governedBrowseFilters(params),
    p_page: Math.max(1, Math.min(10000, Number.parseInt(params.get('page') ?? '1', 10) || 1)),
    p_size: 24,
    p_guide_min: level?.minimumMinor ?? band?.minimumMinor ?? null,
    p_guide_max: level ? level.maximumMinor : band?.maximumMinor ?? null,
  };
  try {
    const {data, error} = await rpc(NAILA_PREPARED_RPC, args);
    const value = data as Selection | null;
    if (error || !value || !Array.isArray(value.ids) || value.ids.length > 24 ||
      value.ids.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,150}$/.test(id)) ||
      !Number.isSafeInteger(value.total) || value.total < value.ids.length ||
      !Array.isArray(value.brands) || !Array.isArray(value.collections)) throw Error(NAILA_PREPARED_UNAVAILABLE);
    // Owner-preview evidence only; no change to selection, response or retries.
    const auditId = params.get('nailaAuditId');
    if (process.env.VERCEL_ENV === 'preview' && process.env.NAILA_PREPARED_AUDIT === 'true' && auditId && /^[a-f0-9-]{36}$/.test(auditId)) {
      console.info(JSON.stringify({ event: 'NAILA_PREPARED_READ', auditId, rpc: NAILA_PREPARED_RPC, source: 'prepared_hci', ids: value.ids, total: value.total }));
    }
    return value;
  } catch {
    // Missing RPC, missing/dirty projection, timeout and permission errors all
    // stop here. Never retry through an ordinary catalogue reader.
    throw Error(NAILA_PREPARED_UNAVAILABLE);
  }
}
