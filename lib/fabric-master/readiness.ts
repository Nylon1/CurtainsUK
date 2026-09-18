import type { FabricMasterRecord } from './types';
import type { PublicSupplierAvailability } from '../supplier-intelligence/types';

export const FABRIC_READINESS_POLICY = 'curtainsuk-commercial-readiness-v2';
/** Supplier stated width is authoritative. Legacy usable width is retained as source data only. */
export function calculationWidth(record: Pick<FabricMasterRecord,'usable_width_mm'|'full_width_mm'>) {
  const width = record.full_width_mm;
  return width !== null && Number.isFinite(width) && width > 0 ? width : null;
}
export function fabricReadiness(record: FabricMasterRecord, evidence: {
  stock?: PublicSupplierAvailability; stale?: boolean; sampleStockAvailable?: boolean; priceConfirmed?: boolean; shippingKnown?: boolean;
} = {}) {
  const canonical = Boolean(record.fabric_id && record.supplier_id && record.supplier_sku && record.brand_name && record.design_name && record.colour_name);
  const discontinued = record.lifecycle_state === 'DISCONTINUED' || evidence.stock === 'NO_LONGER_AVAILABLE';
  const browsable = canonical && !discontinued && Boolean(record.staging_catalog_visible) && record.imagery.length > 0;
  const currentStockConfirmed = !discontinued && evidence.stock === 'FABRIC_AVAILABLE' && evidence.stale === false;
  const calculatorReady = browsable && calculationWidth(record) !== null && record.pattern_match_type !== 'HALF_DROP_MATCH';
  const sampleEligible = browsable;
  const sampleReady = sampleEligible && evidence.sampleStockAvailable === true && evidence.stale === false;
  const priceReady = !discontinued && evidence.priceConfirmed === true;
  return {policyVersion:FABRIC_READINESS_POLICY,canonical,browsable,recommendationEligible:browsable,
    calculatorReady,priceReady,sampleEligible,sampleReady,currentStockConfirmed,
    orderReady:calculatorReady && priceReady && currentStockConfirmed,
    purchasable:calculatorReady && priceReady && currentStockConfirmed && evidence.shippingKnown === true,
    commercialStockState:discontinued ? 'DISCONTINUED' as const : currentStockConfirmed ? 'AVAILABLE' as const : evidence.stock === 'TEMPORARILY_UNAVAILABLE' && evidence.stale === false ? 'OUT_OF_STOCK' as const : 'CHECK_AVAILABILITY' as const,
    stockMessage:discontinued ? 'No longer available' : currentStockConfirmed ? 'Fabric available' : evidence.stock === 'TEMPORARILY_UNAVAILABLE' && evidence.stale === false ? sampleReady ? 'Sample available; curtains awaiting supplier stock' : 'Out of stock — awaiting supplier stock' : 'Check availability',
  } as const;
}
