import type { FabricMasterRecord } from './types';
import { fabricIsPriceEligible } from './projection';
import { toDecisionEngineFabric } from './decision-engine';
import { calculateProductionMtmCustomerPrice } from '../storefront/production-pricing';

/** Illustrative pair only. Never an order, quote token or stock approval. */
export const BROWSE_CURTAIN_EXAMPLE = {
  windowSlug: 'standard-window', measurementBasis: 'TRACK_WIDTH', hardware: 'TRACK',
  widthCm: 100, dropCm: 100, heading: 'PENCIL_PLEAT', lining: 'STANDARD',
  interlining: 'NONE', construction: 'PAIR', stackDirection: 'SPLIT',
} as const;

export function browseCurtainEstimate(record: FabricMasterRecord, costMinor: number | null) {
  if (!fabricIsPriceEligible(record) || costMinor === null || !Number.isSafeInteger(costMinor) || costMinor <= 0) return null;
  try {
    const fabric = toDecisionEngineFabric(record, costMinor, record.source_effective_date ?? new Date().toISOString().slice(0, 10));
    const result = calculateProductionMtmCustomerPrice({...BROWSE_CURTAIN_EXAMPLE, fabricId: record.fabric_id}, fabric);
    if (result.outcome === 'MANUAL_QUOTE' || !result.totalAmountMinor) return null;
    return {
      amountMinor: result.totalAmountMinor, currency: 'GBP' as const, includesVat: true,
      widthCm: BROWSE_CURTAIN_EXAMPLE.widthCm, dropCm: BROWSE_CURTAIN_EXAMPLE.dropCm, measurementBasis: 'TRACK_WIDTH' as const,
      heading: 'PENCIL_PLEAT' as const, lining: 'STANDARD' as const, construction: 'PAIR' as const,
      deliveryIncluded: false, calculationVersion: result.calculationVersion,
    };
  } catch {
    // Missing specifications or a specialist match must not become a made-up price.
    return null;
  }
}
