import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MTM_PRODUCTION_PRICING_RULE_SET} from '../../decision-engine/seed/production-pricing-rules';
import {STOCK_VALIDITY_MS} from '../daily-stock';
import {SDG_REFRESH_INTERVAL_MS} from '../../supplier-sync/sdg-routine-policy';
import {headingsForAutomatedMtm,assertAutomatedMtmCompatibility} from '../mtm-production-policy';
import {SAMPLE_VARIANT_ID} from '../sample-order';
const policy=JSON.parse(readFileSync('release/capabilities.json','utf8'));
test('required production versions and sample identity come from real implementations',()=>{
 assert.equal(MTM_PRODUCTION_PRICING_RULE_SET.version,policy.pricingRuleset);
 assert.equal(STOCK_VALIDITY_MS,policy.stockFreshnessHours*3600000);
 assert.equal(SDG_REFRESH_INTERVAL_MS,policy.refreshCadenceHours*3600000);
 assert.equal(SAMPLE_VARIANT_ID,policy.sampleVariantId);
});
test('every approved hardware matrix combination is enforced',()=>{
 for(const [key,windowSlug,hardware] of [['track','standard-window','TRACK'],['pole','standard-window','POLE'],['bay','bay-window','TRACK']] as const){
  assert.deepEqual(headingsForAutomatedMtm({windowSlug,hardware}),policy.compatibility[key]);
  for(const heading of ['PENCIL_PLEAT','DOUBLE_PINCH','WAVE','EYELET'] as const){
   if(policy.compatibility[key].includes(heading)) assert.doesNotThrow(()=>assertAutomatedMtmCompatibility({windowSlug,hardware,heading}));
   else assert.throws(()=>assertAutomatedMtmCompatibility({windowSlug,hardware,heading}));
  }
 }
});
test('the actual catalogue hydration reads governed knowledge rather than old sparse profiles',()=>{
 const source=readFileSync('lib/fabric-master/retail-repository.ts','utf8');
 const reader=readFileSync('lib/fabric-master/visual-knowledge.ts','utf8');
 assert.match(source,/await visualKnowledgeByFabricIds\(/);
 assert.match(source,/visualIntelligence:/);
 assert.ok(reader.includes(policy.fabricKnowledgeReader));
});
test('paid webhook cannot release manufacture and transition route requires staff authentication',()=>{
 const webhook=readFileSync('app/api/webhooks/shopify/orders-paid/route.ts','utf8');
 assert.match(webhook,/assertVerifiedShopifyWebhook/);
 assert.match(webhook,/recordVerifiedMtmPaidOrder/);
 assert.doesNotMatch(webhook,/transitionMtmPaidOrder|WORKROOM_RELEASED|APPROVED_FOR_MANUFACTURE/);
 const route=readFileSync('app/api/admin/mtm-orders/[orderId]/transition/route.ts','utf8');
 assert.match(route,/require.*(?:Staff|Admin)|authenticate.*(?:Staff|Admin)/i);
 assert.equal(policy.automaticManufacture,false);
 assert.equal(policy.workroomRelease,'STAFF_ONLY');
});
