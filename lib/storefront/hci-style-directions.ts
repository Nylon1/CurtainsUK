import {
  retailStyleDirectionEligibility,
  type ApprovedImageRow,
} from './hci-style-direction-eligibility';

/**
 * Server-derived only. The browser never supplies an eligibility list.
 * A confirmed Interior Fabric Brief is the one point at which Style Directions
 * V2 needs a fresh Fabric Master eligibility projection.
 */
export function styleDirectionRequestContext(
  _state: { interiorBrief?: unknown; styleDirectionsV2?: unknown } | null | undefined,
  action?: Record<string, unknown>,
) {
  return { needsEligibility: action?.type === 'brief-confirm' };
}

export async function currentRetailStyleDirectionEligibility() {
  const [{ listFabricMasterRecords }, { createSupplierServiceClient }] = await Promise.all([
    import('@/lib/fabric-master/repository'),
    import('@/lib/supabase/supplier-service'),
  ]);
  const [records, database] = [
    await listFabricMasterRecords({ stagingCatalogOnly: true }),
    createSupplierServiceClient(),
  ] as const;
  const mappings: ApprovedImageRow[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await database
      .from('fabric_media_mappings')
      .select('fabric_id,supplier_id,supplier_sku,fabric_media_assets!inner(shopify_cdn_url,width,height)')
      .eq('rights_state', 'APPROVED')
      .eq('mapping_state', 'VERIFIED')
      .order('fabric_id')
      .range(from, from + pageSize - 1);
    if (error) throw Error('STYLE_DIRECTION_RETAIL_MEDIA_UNAVAILABLE');
    const page = (data ?? []) as unknown as ApprovedImageRow[];
    mappings.push(...page);
    if (page.length < pageSize) break;
  }
  return retailStyleDirectionEligibility(records, mappings);
}
