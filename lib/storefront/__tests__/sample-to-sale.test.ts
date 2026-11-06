import assert from 'node:assert/strict';
import test from 'node:test';
import { planSampleToSale, pilotStage, type CustomerOrder, type PilotOrder } from '../sample-to-sale';

const sample: PilotOrder = {
  id:'gid://shopify/Order/1',name:'#1',test:false,cancelledAt:null,displayFinancialStatus:'PAID',
  customer:{id:'gid://shopify/Customer/1',firstName:'Alex',defaultEmailAddress:{marketingState:'SUBSCRIBED'}},
  lineItems:{pageInfo:{hasNextPage:false},nodes:[{title:'Fabric Sample',quantity:1,variant:{id:'gid://shopify/ProductVariant/56120226873723'},customAttributes:[{key:'Fabric',value:'Midori — Herb'},{key:'Fabric Master ID',value:'sdg-f1068-20'}]}]},
  fulfillments:[{events:{pageInfo:{hasNextPage:false},nodes:[{status:'DELIVERED',happenedAt:'2026-11-05T10:00:00Z'}]}}],
};
const customerOrders: CustomerOrder[] = [{id:sample.id,test:false,cancelledAt:null,displayFinancialStatus:'PAID',tags:[],lineItems:{pageInfo:{hasNextPage:false},nodes:[{title:'Fabric Sample',sku:null,variant:{id:'gid://shopify/ProductVariant/56120226873723'}}]}}];

test('carrier delivery and subscription make a sample eligible after one day',()=>{
  const result=planSampleToSale(sample,customerOrders,true,new Date('2026-11-06T12:00:00Z'))!;
  assert.equal(result.reason,'ready');
  assert.equal(result.stage,'check_in');
  assert.equal(result.fabricId,'sdg-f1068-20');
});

test('fulfilment without a delivery event cannot start the journey',()=>{
  const result=planSampleToSale({...sample,fulfillments:[]},customerOrders,true,new Date('2026-11-20T12:00:00Z'))!;
  assert.equal(result.reason,'no_delivery');
});

test('an unsubscribed customer is withheld even after confirmed delivery',()=>{
  const order={...sample,customer:{...sample.customer!,defaultEmailAddress:{marketingState:'NOT_SUBSCRIBED'}}};
  assert.equal(planSampleToSale(order,customerOrders,true,new Date('2026-11-06T12:00:00Z'))?.reason,'no_marketing_permission');
});

test('a paid made-to-measure order suppresses all promotions',()=>{
  const curtains:CustomerOrder={id:'gid://shopify/Order/2',test:false,cancelledAt:null,displayFinancialStatus:'PAID',tags:['CURTAINSUK_PRODUCTION'],lineItems:{pageInfo:{hasNextPage:false},nodes:[{title:'Made-to-measure curtains',sku:'CUK-123',variant:null}]}};
  const result=planSampleToSale(sample,[...customerOrders,curtains],true,new Date('2026-11-06T12:00:00Z'))!;
  assert.equal(result.reason,'already_bought');
  assert.equal(result.stage,'not_ready');
});

test('a placed curtain order suppresses the journey even if payment is pending',()=>{
  const curtains:CustomerOrder={id:'gid://shopify/Order/3',test:false,cancelledAt:null,displayFinancialStatus:'PENDING',tags:[],lineItems:{pageInfo:{hasNextPage:false},nodes:[{title:'Made to measure Curtains - Customer',sku:null,variant:null}]}};
  assert.equal(planSampleToSale(sample,[...customerOrders,curtains],true,new Date('2026-11-06T12:00:00Z'))?.reason,'already_bought');
});

test('incomplete customer history is withheld rather than assuming no purchase',()=>{
  assert.equal(planSampleToSale(sample,customerOrders,false,new Date('2026-11-06T12:00:00Z'))?.reason,'incomplete_order_data');
});

test('offer and reminder windows stop after the 14-day offer period',()=>{
  assert.equal(pilotStage('2026-11-01T10:00:00Z',new Date('2026-11-09T10:00:00Z')),'offer');
  assert.equal(pilotStage('2026-11-01T10:00:00Z',new Date('2026-11-16T10:00:00Z')),'reminder');
  assert.equal(pilotStage('2026-11-01T10:00:00Z',new Date('2026-11-23T10:00:00Z')),'expired');
});
