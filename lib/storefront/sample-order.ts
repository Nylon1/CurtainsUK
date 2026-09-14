import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FabricMasterRecord } from '../fabric-master/types';
import type { HciCommerceContext } from './hci-commerce-context';

export const SAMPLE_VARIANT_ID = 56120226873723;
const signatureKey = '_CurtainsUK identity signature';
function signature(properties: Record<string,string>, secret: string) {
  const entries = Object.entries(properties).filter(([key])=>key!==signatureKey).sort(([a],[b])=>a.localeCompare(b));
  return createHmac('sha256',secret).update(`sample-identity-v1:${JSON.stringify(entries)}`).digest('hex');
}
export function verifySampleProperties(properties: Record<string,string>, secret: string) {
  if (secret.length < 32 || Object.values(properties).some(v=>typeof v!=='string' || v.length>500)) throw Error('SAMPLE_IDENTITY_INVALID');
  const actual=Buffer.from(properties[signatureKey] ?? '', 'hex');
  const expected=Buffer.from(signature(properties,secret),'hex');
  if(actual.length!==expected.length || !timingSafeEqual(actual,expected)) throw Error('SAMPLE_IDENTITY_INVALID');
}
export function sampleOrderProperties(fabric: FabricMasterRecord, secret: string, context?: HciCommerceContext) {
  if (secret.length < 32) throw Error('SAMPLE_SIGNING_UNAVAILABLE');
  if (!fabric.staging_catalog_visible || fabric.lifecycle_state === 'DISCONTINUED' || fabric.sample_available !== true) throw Error('SAMPLE_NOT_AVAILABLE');
  if (context && context.fabricMasterId !== fabric.fabric_id) throw Error('SAMPLE_CONTEXT_MISMATCH');
  const properties: Record<string,string> = {
    'Fabric': `${fabric.design_name} — ${fabric.colour_name}`,
    'Fabric Master ID': fabric.fabric_id,
    'Supplier SKU': fabric.supplier_sku,
    'Brand': fabric.brand_name,
    'Design': fabric.design_name,
    'Colourway': fabric.colour_name,
  };
  if (context) {
    properties['Consultation ID'] = context.sessionId;
    properties['Strategy ID'] = context.strategyId;
    properties['_HCI policy'] = context.policyVersion;
    properties['_Recommendation version'] = context.recommendationVersion;
  }
  properties[signatureKey] = signature(properties,secret);
  return properties;
}
