import 'server-only';

import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';
import { guidePriceLevelDefinition, type GuidePriceLevel } from '@/lib/fabric-master/guide-price-level';
import { collectRetailGuideProjection, type ProjectionPage } from './hci-price-level-pagination';

/**
 * The private database applies the existing approved customer-guide policy.
 * This boundary deliberately returns identities only: HCI never receives a
 * supplier cost or a customer price amount.
 */
export async function currentRetailPriceLevelEligibility(level: GuidePriceLevel) {
  const definition = guidePriceLevelDefinition(level);
  if (!definition) throw Error('PRICE_LEVEL_INVALID');
  const database = createSupplierServiceClient();
  const parameters = {
    p_guide_min: definition.minimumMinor,
    p_guide_max: definition.maximumMinor,
  };
  return collectRetailGuideProjection(async (from, to, exactCount) => {
    const result = await database
      .rpc('retail_guide_price_level_fabric_ids', parameters, exactCount ? { count: 'exact' } : undefined)
      .range(from, to);
    return result as ProjectionPage;
  });
}
