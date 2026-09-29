import { guidePriceLevelDefinition, type GuidePriceLevel } from '@/lib/fabric-master/guide-price-level';
import { parseRetailGuideProjection } from '../hci-price-level-pagination';

export const NAILA_PREPARED_PRICE_RPC = 'retail_guide_price_level_fabric_ids_naila_prepared_v1';

type Rpc = (name: string, parameters: { p_guide_min: number; p_guide_max: number | null }) =>
  PromiseLike<{ data: unknown; error: unknown }>;

/** Naila's price cohort is read from the same governed generation as Browse.
 * A missing or dirty projection fails closed; it never calls the ordinary RPC. */
export async function readNailaPreparedPriceLevelIds(level: GuidePriceLevel, rpc: Rpc) {
  const definition = guidePriceLevelDefinition(level);
  if (!definition) throw Error('PRICE_LEVEL_INVALID');
  try {
    const { data, error } = await rpc(NAILA_PREPARED_PRICE_RPC, {
      p_guide_min: definition.minimumMinor,
      p_guide_max: definition.maximumMinor,
    });
    if (error) throw Error('NAILA_PREPARED_PRICE_UNAVAILABLE');
    return parseRetailGuideProjection(data);
  } catch {
    throw Error('NAILA_PREPARED_PRICE_UNAVAILABLE');
  }
}

export function priceLevelEligibilityReader(isNaila: boolean,
  ordinary: (level: GuidePriceLevel) => Promise<string[]>,
  prepared: (level: GuidePriceLevel) => Promise<string[]>) {
  return isNaila ? prepared : ordinary;
}
