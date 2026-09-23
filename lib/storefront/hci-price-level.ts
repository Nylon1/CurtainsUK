import 'server-only';

import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';
import { guidePriceLevelDefinition, type GuidePriceLevel } from '@/lib/fabric-master/guide-price-level';

/**
 * The private database applies the existing approved customer-guide policy.
 * This boundary deliberately returns identities only: HCI never receives a
 * supplier cost or a customer price amount.
 */
export async function currentRetailPriceLevelEligibility(level: GuidePriceLevel) {
  const definition = guidePriceLevelDefinition(level);
  if (!definition) throw Error('PRICE_LEVEL_INVALID');
  const { data, error } = await createSupplierServiceClient().rpc('retail_guide_price_level_fabric_ids', {
    p_guide_min: definition.minimumMinor,
    p_guide_max: definition.maximumMinor,
  });
  if (error) throw Error('RETAIL_GUIDE_PRICE_PROJECTION_UNAVAILABLE');
  const rows = data as { fabric_id?: unknown }[] | null;
  const ids = (rows ?? []).map((row) => row.fabric_id).filter((id): id is string =>
    typeof id === 'string' && /^[-a-zA-Z0-9]{1,150}$/.test(id),
  );
  if (new Set(ids).size !== ids.length) throw Error('RETAIL_GUIDE_PRICE_PROJECTION_INVALID');
  return ids.sort();
}
