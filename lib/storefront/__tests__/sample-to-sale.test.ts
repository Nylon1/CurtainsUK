import assert from 'node:assert/strict';
import test from 'node:test';
import { planSampleToSale, pilotStage, type CustomerOrder, type PilotOrder } from '../sample-to-sale';
import { sampleToSaleEmail, SAMPLE_TO_SALE_BCC } from '../sample-to-sale-email';
import { sampleToSaleUnsubscribeToken, validSampleToSaleUnsubscribeToken } from '../sample-to-sale-unsubscribe';

const sample: PilotOrder = {
  id:'gid://shopify/Order/1',name:'#1',test:false,cancelledAt:null,displayFinancialStatus:'PAID',
  customer:{id:'gid://shopify/Customer/1',firstName:'Alex',defaultEmailAddress:{marketingState:'SUBSCRIBED'}},
  lineItems:{pageInfo:{hasNextPage:false},nodes:[{title:'Fabric Sample',quantity:1,variant:{id:'gid://shopify/ProductVariant/56120226873723'},customAttributes:[{key:'Fabric',value:'Midori — Herb'},{key:'Fabric Master ID',value:'sdg-f1068-20'}]}]},
  fulfillments:[{events:{pageInfo:{hasNextPage:false},nodes:[{status:'DELIVERED',happenedAt:'2026-11-05T10:00:00Z'}]}}],
};
const customerOrders: CustomerOrder[] = [{id:sample.id,test:false,cancelledAt:null,displayFinancialStatus:'PAID',tags:[],lineItems:{pageInfo:{hasNextPage:false},nodes:[{title:'Fabric Sample',sku:null,variant:{id:'gid://shopify/ProductVariant/56120226873723'}}]}}];

test('carrier delivery and subscription make a sample eligible on day three',()=>{
  const result=planSampleToSale(sample,customerOrders,true,new Date('2026-11-08T12:00:00Z'))!;
  assert.equal(result.reason,'ready');
  assert.equal(result.stage,'check_in');
  assert.equal(result.fabricId,'sdg-f1068-20');
  assert.equal(result.customerId,'gid://shopify/Customer/1');
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

test('a prior Roman blind, cushion or motorised track order suppresses a first-product code',()=>{
  for(const title of ['Made-to-measure Roman blind','Cushion','Motorised curtain track']){
    const order:CustomerOrder={id:'gid://shopify/Order/5',test:false,cancelledAt:null,displayFinancialStatus:'PAID',tags:[],
      lineItems:{pageInfo:{hasNextPage:false},nodes:[{title,sku:null,variant:null}]}};
    assert.equal(planSampleToSale(sample,[...customerOrders,order],true,new Date('2026-11-15T12:00:00Z'))?.reason,'already_bought');
  }
});

test('incomplete customer history is withheld rather than assuming no purchase',()=>{
  assert.equal(planSampleToSale(sample,customerOrders,false,new Date('2026-11-06T12:00:00Z'))?.reason,'incomplete_order_data');
});

test('journey changes at days three, five, seven and fourteen',()=>{
  const delivered='2026-11-01T10:00:00Z';
  const atDay=(day:number)=>new Date(Date.parse(delivered)+day*86_400_000);
  assert.equal(pilotStage(delivered,atDay(2)),'not_ready');
  assert.equal(pilotStage(delivered,atDay(3)),'check_in');
  assert.equal(pilotStage(delivered,atDay(5)),'inspiration');
  assert.equal(pilotStage(delivered,atDay(7)),'offer');
  assert.equal(pilotStage(delivered,atDay(14)),'reminder');
  assert.equal(pilotStage(delivered,atDay(21)),'expired');
});

test('branded offer email has private code, BCC, telephone CTA and unsubscribe',()=>{
  const candidate=planSampleToSale(sample,customerOrders,true,new Date('2026-11-12T10:00:00Z'))!;
  const mail=sampleToSaleEmail(candidate,'offer',{code:'CUK-TEST',expiry:'21 November 2026',unsubscribeUrl:'https://example.com/unsubscribe'});
  assert.deepEqual(mail.bcc,[SAMPLE_TO_SALE_BCC]);
  assert.match(mail.html,/tel:\+448007720367/);
  assert.match(mail.html,/Mon(?:day)? to Fri(?:day)?, 9am to 5pm/);
  assert.match(mail.html,/CUK-TEST/);
  assert.match(mail.html,/Unsubscribe/);
  assert.match(mail.text,/0800 772 0367/);
  assert.match(mail.text,/https:\/\/example.com\/unsubscribe/);
});

test('email renderer escapes untrusted names and requires a real unsubscribe URL',()=>{
  const candidate=planSampleToSale(sample,customerOrders,true,new Date('2026-11-12T10:00:00Z'))!;
  const malicious={...candidate,firstName:'<script>alert(1)</script>'};
  const mail=sampleToSaleEmail(malicious,'check_in',{unsubscribeUrl:'https://example.com/unsubscribe'});
  assert.doesNotMatch(mail.html,/<script>/);
  assert.match(mail.html,/&lt;script&gt;/);
  assert.throws(()=>sampleToSaleEmail(candidate,'offer',{unsubscribeUrl:'https://example.com/unsubscribe'}),/CODE_REQUIRED/);
  assert.throws(()=>sampleToSaleEmail(candidate,'check_in',{unsubscribeUrl:''}),/UNSUBSCRIBE_REQUIRED/);
});

test('one customer unsubscribe token cannot suppress another customer',()=>{
  const secret='sample-to-sale-test-secret-at-least-32-characters';
  const customer='gid://shopify/Customer/1';
  const token=sampleToSaleUnsubscribeToken(customer,secret);
  assert.equal(validSampleToSaleUnsubscribeToken(customer,token,secret),true);
  assert.equal(validSampleToSaleUnsubscribeToken('gid://shopify/Customer/2',token,secret),false);
  assert.equal(validSampleToSaleUnsubscribeToken(customer,'not-a-token',secret),false);
});
