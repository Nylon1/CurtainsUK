import { fabricReadiness } from '../fabric-master/readiness';
import type { FabricMasterRecord } from '../fabric-master/types';

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
