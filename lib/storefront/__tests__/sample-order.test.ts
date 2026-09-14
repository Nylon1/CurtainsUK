import test from 'node:test';
import assert from 'node:assert/strict';
import type { FabricMasterRecord } from '../../fabric-master/types';
import { sampleOrderProperties, verifySampleProperties, SAMPLE_VARIANT_ID } from '../sample-order';
const fabric = {fabric_id:'pt-4262-770',supplier_sku:'4262/770',brand_name:'Prestigious Textiles',design_name:'Sadira',colour_name:'Lagoon',staging_catalog_visible:true,lifecycle_state:'UNKNOWN',sample_available:true} as FabricMasterRecord;
const secret='test-only-sample-identity-secret-32-characters';
test('generic payable sample preserves exact deterministic colourway identity, not commercial data',()=>{
  const properties=sampleOrderProperties(fabric,secret);
  assert.equal(SAMPLE_VARIANT_ID,56120226873723);
  assert.equal(properties.Fabric,'Sadira — Lagoon');
  assert.equal(properties['Supplier SKU'],'4262/770');
  assert.equal(properties['Fabric Master ID'],'pt-4262-770');
  assert.deepEqual(properties,sampleOrderProperties(fabric,secret));
  assert.doesNotThrow(()=>verifySampleProperties(properties,secret));
  assert.doesNotThrow(()=>verifySampleProperties(Object.fromEntries(Object.entries(properties).reverse()),secret));
  assert.throws(()=>verifySampleProperties({...properties,'Supplier SKU':'wrong'},secret));
  assert.notEqual(properties['_CurtainsUK identity signature'],sampleOrderProperties({...fabric,colour_name:'Other'},secret)['_CurtainsUK identity signature']);
  assert.ok(!/cost|margin|metres|stock/i.test(JSON.stringify(properties)));
});
test('sample eligibility fails closed; signed consultation context must match the selected fabric',()=>{
  for(const change of [{sample_available:null},{sample_available:false},{staging_catalog_visible:false},{lifecycle_state:'DISCONTINUED'}]) assert.throws(()=>sampleOrderProperties({...fabric,...change} as FabricMasterRecord,secret));
  const context={sessionId:'d8052224-4554-428c-9873-c94fefc665d4',strategyId:'overall',fabricMasterId:fabric.fabric_id,policyVersion:'41a9f3f',recommendationVersion:'test'};
  assert.equal(sampleOrderProperties(fabric,secret,context)['Consultation ID'],context.sessionId);
  assert.throws(()=>sampleOrderProperties(fabric,secret,{...context,fabricMasterId:'wrong'}));
});
