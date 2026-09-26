import { fabricReadiness } from '../fabric-master/readiness';
import type { FabricMasterRecord } from '../fabric-master/types';
import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';

const policy = 'brief-calibration-v2';
/** Server-derived context only; browser commands cannot supply an eligibility list. */
export function calibrationRequestContext(state: {
  calibrationPolicy?: string; calibrationSelection?: unknown; tasteAnswers?: unknown[];
} | null | undefined, action?: Record<string, unknown>) {
  const enabled = !state || state.calibrationPolicy === policy;
  return {
    policy: enabled ? policy : undefined,
    needsEligibility: enabled && !state?.calibrationSelection &&
      state?.tasteAnswers?.length === 3 && action?.type === 'price-level',
  };
}

export function calibrationEligibility(records: FabricMasterRecord[]) {
  return [...new Set(records.filter(r => fabricReadiness(r).recommendationEligible)
    .map(r => r.fabric_id))].sort();
}

const calibrationCandidateSelect =
  'fabric_id,supplier_id,supplier_sku,colour_name,lifecycle_state,staging_catalog_visible,imagery,supplier_brands!inner(display_name),fabric_designs!inner(display_name)';
const calibrationBatchSize = 400;

function exactCalibrationIds(fabricIds: readonly string[]) {
  const ids = [...new Set(fabricIds)].sort();
  if (!ids.length || ids.some((id) => !/^[-a-zA-Z0-9]{1,150}$/.test(id)))
    throw Error('CALIBRATION_RETAIL_IDENTITY_INVALID');
  return ids;
}

function calibrationCandidate(row: Record<string, unknown>) {
  const brand = row.supplier_brands as { display_name?: unknown } | null;
  const design = row.fabric_designs as { display_name?: unknown } | null;
  return {
    fabric_id: String(row.fabric_id),
    supplier_id: String(row.supplier_id),
    supplier_sku: String(row.supplier_sku),
    brand_name: typeof brand?.display_name === 'string' ? brand.display_name : '',
    design_name: typeof design?.display_name === 'string' ? design.display_name : '',
    colour_name: String(row.colour_name),
    lifecycle_state: row.lifecycle_state as FabricMasterRecord['lifecycle_state'],
    staging_catalog_visible: row.staging_catalog_visible === true,
    imagery: Array.isArray(row.imagery)
      ? row.imagery.filter((image): image is string => typeof image === 'string')
      : [],
    usable_width_mm: null,
    full_width_mm: null,
    pattern_match_type: null,
  };
}

/**
 * The price choice needs a Calibration candidate, but it does not need to load
 * unrelated price tiers or the full Fabric Master record. Apply the unchanged
 * recommendation-readiness predicate to the exact selected-price cohort.
 */
export async function currentRetailCalibrationEligibility(fabricIds: readonly string[]) {
  const ids = exactCalibrationIds(fabricIds);
  const database = createSupplierServiceClient();
  const batches = Array.from({ length: Math.ceil(ids.length / calibrationBatchSize) }, (_, index) =>
    ids.slice(index * calibrationBatchSize, (index + 1) * calibrationBatchSize),
  );
  const pages = await Promise.all(batches.map(async (batch) => {
    const { data, error } = await database.from('fabric_colourways')
      .select(calibrationCandidateSelect).in('fabric_id', batch);
    if (error) throw Error('CALIBRATION_RETAIL_CATALOGUE_UNAVAILABLE');
    return (data ?? []) as Record<string, unknown>[];
  }));
  return [...new Set(pages.flat().map(calibrationCandidate)
    .filter((record) => fabricReadiness(record).recommendationEligible)
    .map((record) => record.fabric_id))].sort();
}

type CalibrationFabric = {fabricMasterId:string;supplierSku:string;brand:string;design:string;colourway:string;imageUrl:string};
/** Re-check current truth on resume/retry as well as before saving a new view. */
export function currentCalibrationFabric(offered: CalibrationFabric, records: FabricMasterRecord[]): CalibrationFabric {
  const exact = records.filter(r=>r.fabric_id===offered.fabricMasterId);
  const record = exact[0];
  if (exact.length!==1 || !record || record.supplier_sku!==offered.supplierSku || !fabricReadiness(record).recommendationEligible)
    throw Error('HCI_CALIBRATION_FABRIC_UNAVAILABLE');
  const imageUrl = record.imagery.find(url=>{
    try { const u=new URL(url); return u.protocol==='https:' && u.hostname==='cdn.shopify.com' && !u.search; }
    catch { return false; }
  });
  if (!imageUrl) throw Error('HCI_CALIBRATION_IMAGE_UNAVAILABLE');
  return {fabricMasterId:record.fabric_id,supplierSku:record.supplier_sku,brand:record.brand_name,
    design:record.design_name,colourway:record.colour_name,imageUrl};
}
