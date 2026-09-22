import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { asProductionHouseDraftOrderContract, buildHouseDraftContract } from '../rooms-order-contract';
import { createImmutableConfigurationSnapshot, evaluateCheckoutGate, prepareStagingCheckoutHandoff } from '../checkout-gates';
import { assertShopifyDraftOrderFinancials } from '../shopify-draft-order-core';
import { ROOMS_RULESET } from '../rooms-core';
import type { ShippingQuote } from '../shipping';

function curtain(roomId=randomUUID()) {
  const price={grossAmountMinor:66100,netAmountMinor:55083,vatAmountMinor:11017,vatRateBasisPoints:2000,currency:'GBP' as const};
  const shipping:ShippingQuote={status:'READY',postcode:'BB23FA',region:'UK_MAINLAND',parcelClass:'STANDARD',currency:'GBP',grossAmountMinor:1295,shownSeparately:true,countsTowardGoodsMinimum:false,message:'Delivery confirmed'};
  const gate=evaluateCheckoutGate({outcome:'INSTANT_PRICE',price,fabricPricingEligible:true,technicallyValid:true,availability:'FABRIC_AVAILABLE',reviewState:null,customerAccepted:true,shipping});
  const now=new Date().toISOString();
  const snapshot=createImmutableConfigurationSnapshot({snapshotId:randomUUID(),configurationId:randomUUID(),reviewRequestId:null,reviewRevisionId:null,outcome:'INSTANT_PRICE',windowType:'french-doors',measurements:{hardware:'TRACK',raw_width_cm:201,raw_drop_cm:236,width_anchor:'TRACK_FULL_WIDTH',drop_anchor:'TRACK_BOTTOM_TO_FINISH',measurement_contract_version:'guided-measure-v1'},fabricMasterId:'sdg-f1681-03',supplierSku:'F1681/03',fabricIdentity:{supplier:'SDG',brand:'Sanderson',design:'Acanthus',colour:'Slate/Dove'},heading:'WAVE',lining:'BLACKOUT',construction:'PAIR',calculatedFabricMetres:12,pricingRuleVersion:ROOMS_RULESET,customerPrice:price,availability:'FABRIC_AVAILABLE',shipping,customerAcceptedAt:now,recordedAt:now,gate});
  return{roomId,roomName:'Living Room',windowName:'French Doors',handoff:prepareStagingCheckoutHandoff({handoffId:randomUUID(),snapshot,preparedAt:now})};
}
for(const count of [1,2,10])test(`${count}-line house contract preserves each immutable line, VAT and one governed delivery charge`,()=>{
  const roomId=randomUUID(),curtains=Array.from({length:count},(_,i)=>curtain(i%2?randomUUID():roomId));
  const contract=buildHouseDraftContract({houseId:randomUUID(),revision:2,curtains});
  assert.equal(contract.paymentEnabled,false);
  assert.equal(contract.input.lineItems.length,count);
  assert.equal(contract.expected.goodsGrossAmountMinor,count*66100);
  assert.equal(contract.expected.goodsVatAmountMinor,count*11017);
  assert.equal(contract.expected.shippingGrossAmountMinor,1295);
  assert.equal(contract.expected.orderGrossAmountMinor,count*66100+1295);
  assert.equal(contract.input.customAttributes.some(a=>a.key==='curtainsuk_snapshot_id'),false);
  for(const [index,line] of contract.input.lineItems.entries()){
    const props=new Map(line.customAttributes.map(a=>[a.key,a.value]));
    assert.equal(props.get('_curtainsuk_snapshot_id'),curtains[index].handoff.snapshot.snapshotId);
    assert.equal(props.get('_curtainsuk_fabric_master_id'),'sdg-f1681-03');
    assert.equal(props.get('_curtainsuk_supplier_sku'),'F1681/03');
    assert.equal(props.get('_curtainsuk_pricing_rule_version'),ROOMS_RULESET);
    assert.equal(props.get('_curtainsuk_room_id'),curtains[index].roomId);
    assert.equal(props.get('_curtainsuk_mtm_locked'),'true');
    assert.equal(line.quantity,1);
    assert.equal(props.get('Width × drop'),'201 × 236 cm');
    assert.ok([...props.keys()].filter(key=>/snapshot|anchor|version|configuration/i.test(key)).every(key=>key.startsWith('_')));
  }
  const bag=(amount:number)=>({presentmentMoney:{amount:(amount/100).toFixed(2),currencyCode:'GBP'}});
  const node={taxesIncluded:true,presentmentCurrencyCode:'GBP',totalLineItemsPriceSet:bag(contract.expected.goodsGrossAmountMinor),totalShippingPriceSet:bag(1295),totalTaxSet:bag(contract.expected.orderVatAmountMinor),totalDiscountsSet:bag(0),totalPriceSet:bag(contract.expected.orderGrossAmountMinor)};
  assert.doesNotThrow(()=>assertShopifyDraftOrderFinancials(node,contract.expected));
  assert.throws(()=>assertShopifyDraftOrderFinancials({...node,totalPriceSet:bag(contract.expected.orderGrossAmountMinor-1)},contract.expected),/EXACT_PRICE_MISMATCH/);
});
test('house membership or room-name changes invalidate its order fingerprint',()=>{const a=curtain(),b=curtain(),houseId=randomUUID();const build=(revision:number,curtains:ReturnType<typeof curtain>[])=>buildHouseDraftContract({houseId,revision,curtains});assert.notEqual(build(1,[a,b]).fingerprint,build(2,[a]).fingerprint);assert.notEqual(build(1,[a,b]).fingerprint,build(1,[{...a,roomName:'Front Lounge'},b]).fingerprint);assert.throws(()=>build(1,[a,a]),/DUPLICATE/);});

test('House promotion changes execution authority only, retaining every checked line and financial value',()=>{
  const contract=buildHouseDraftContract({houseId:randomUUID(),revision:2,curtains:[curtain(),curtain()]});
  const production=asProductionHouseDraftOrderContract(contract);
  assert.equal(production.environment,'PRODUCTION');
  assert.equal(production.paymentEnabled,true);
  assert.equal(production.releaseBlocker,null);
  assert.deepEqual(production.expected,contract.expected);
  assert.deepEqual(production.curtains,contract.curtains);
  assert.deepEqual(production.input.lineItems,contract.input.lineItems);
  assert.deepEqual(production.input.tags,['CURTAINSUK_PRODUCTION',contract.idempotencyTag]);
  assert.throws(()=>asProductionHouseDraftOrderContract(production),/PROMOTION_INVALID/);
});

test('authored comma separators preserve punctuation within exact fabric and room names',()=>{
  const original=curtain();const copy=structuredClone(original);copy.roomName='Room — West';
  const identity={...copy.handoff.snapshot.fabricIdentity!,design:'Design — Archive',colour:'Slate/Dove'};
  const contract=buildHouseDraftContract({houseId:randomUUID(),revision:1,curtains:[{...copy,handoff:{...copy.handoff,snapshot:{...copy.handoff.snapshot,fabricIdentity:identity}}}]});
  assert.equal(contract.input.lineItems[0].title,'Room — West, French Doors');
  assert.equal(contract.input.lineItems[0].customAttributes.find(p=>p.key==='Fabric')?.value,'Design — Archive, Slate/Dove');
  assert.equal(contract.input.lineItems[0].customAttributes.find(p=>p.key==='_curtainsuk_design')?.value,'Design — Archive');
});
