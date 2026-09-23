import {
  retailStyleDirectionEligibility,
  type ApprovedImageRow,
  type RetailDirectionCandidate,
} from './hci-style-direction-eligibility';
import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';

const candidateSelect = 'fabric_id,supplier_id,supplier_sku,colour_name,lifecycle_state,staging_catalog_visible,imagery,supplier_brands!inner(display_name),fabric_designs!inner(display_name)';
const batchSize = 400;

function exactIds(fabricIds: readonly string[]) {
  const ids = [...new Set(fabricIds)].sort();
  if (!ids.length || ids.some((id) => !/^[-a-zA-Z0-9]{1,150}$/.test(id)))
    throw Error('STYLE_DIRECTION_RETAIL_IDENTITY_INVALID');
  return ids;
}

function candidate(row: Record<string, unknown>): RetailDirectionCandidate {
  const brand = row.supplier_brands as { display_name?: unknown } | null;
  const design = row.fabric_designs as { display_name?: unknown } | null;
  return {
    fabric_id: String(row.fabric_id),
    supplier_id: String(row.supplier_id),
    supplier_sku: String(row.supplier_sku),
    colour_name: String(row.colour_name),
    lifecycle_state: row.lifecycle_state as RetailDirectionCandidate['lifecycle_state'],
    staging_catalog_visible: row.staging_catalog_visible === true,
    imagery: Array.isArray(row.imagery) ? row.imagery.filter((image): image is string => typeof image === 'string') : [],
    // These fields are irrelevant to recommendation eligibility. Keep them
    // explicitly unknown here rather than hydrating supplier specifications.
    usable_width_mm: null,
    full_width_mm: null,
    pattern_match_type: null,
    brand_name: typeof brand?.display_name === 'string' ? brand.display_name : '',
    design_name: typeof design?.display_name === 'string' ? design.display_name : '',
  };
}

/**
 * Server-derived only. The browser never supplies an eligibility list.
 * A confirmed Interior Fabric Brief is the one point at which Style Directions
 * V2 needs a fresh Fabric Master eligibility projection.
 */
export function styleDirectionRequestContext(
  state: { interiorBrief?: unknown; styleDirectionsV2?: unknown } | null | undefined,
  action?: Record<string, unknown>,
) {
  // Feedback and refinement must rebuild the same governed candidate context
  // used when V2 rendered its cards. Without this, the learning input digest
  // changes between display and reaction even though the customer is reacting
  // to the same persisted direction.
  return {
    needsEligibility:
      action?.type === 'brief-confirm' ||
      action?.type === 'direction-load' ||
      (Boolean(state?.styleDirectionsV2) &&
        (action?.type === 'feedback' || action?.type === 'finish')),
  };
}

export async function currentRetailStyleDirectionEligibility(fabricIds?: readonly string[]) {
  const database = createSupplierServiceClient();
  if (fabricIds) {
    // The selected price tier is a strict commercial boundary. This is exactly
    // the same readiness/media gate as the full catalogue path below, scoped
    // before retrieval because no other record can appear in this direction.
    const ids = exactIds(fabricIds);
    const batches = Array.from({ length: Math.ceil(ids.length / batchSize) }, (_, index) =>
      ids.slice(index * batchSize, (index + 1) * batchSize),
    );
    const [recordPages, mediaPages] = await Promise.all([
      Promise.all(batches.map(async (batch) => {
        const { data, error } = await database.from('fabric_colourways')
          .select(candidateSelect).in('fabric_id', batch);
        if (error) throw Error('STYLE_DIRECTION_RETAIL_CATALOGUE_UNAVAILABLE');
        return (data ?? []) as Record<string, unknown>[];
      })),
      Promise.all(batches.map(async (batch) => {
        const { data, error } = await database.from('fabric_media_mappings')
          .select('fabric_id,supplier_id,supplier_sku,fabric_media_assets!inner(shopify_cdn_url,width,height)')
          .eq('rights_state', 'APPROVED')
          .eq('mapping_state', 'VERIFIED')
          .in('fabric_id', batch);
        if (error) throw Error('STYLE_DIRECTION_RETAIL_MEDIA_UNAVAILABLE');
        return (data ?? []) as unknown as ApprovedImageRow[];
      })),
    ]);
    return retailStyleDirectionEligibility(recordPages.flat().map(candidate), mediaPages.flat());
  }
  const { listFabricMasterRecords } = await import('@/lib/fabric-master/repository');
  const records = await listFabricMasterRecords({ stagingCatalogOnly: true });
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
