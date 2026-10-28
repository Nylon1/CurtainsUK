import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { sampleOrderProperties, SAMPLE_VARIANT_ID } from '../sample-order';
import type { FabricMasterRecord } from '../../fabric-master/types';
import type { ShopifyDraftOrderExecutionContract } from '../shopify-draft-order-core';
import { applySampleCredit, creditDigest, eligibleSampleUnits, normalizeSampleCreditCodes, quoteSampleCredit, sampleCreditCode, sampleCreditCodeHash, type SampleCreditOrder } from '../sample-credit';

const secret='synthetic-sample-credit-secret-not-for-production';
const fabric={fabric_id:'test-only-fabric',supplier_sku:'TEST',brand_name:'Test',design_name:'Test',colour_name:'Cream',staging_catalog_visible:true,lifecycle_state:'UNKNOWN',sample_available:true} as FabricMasterRecord;
const money=(amount:string)=>({shopMoney:{amount,currencyCode:'GBP'}});
const gid='gid://shopify/Order/100';
const grantId='00000000-0000-4000-8000-000000000001';
function order(quantity=1):SampleCreditOrder{return {id:gid,name:'#TEST',email:'test@example.invalid',test:false,cancelledAt:null,displayFinancialStatus:'PAID',currencyCode:'GBP',taxesIncluded:true,lineItems:{pageInfo:{hasNextPage:false},nodes:[{id:'gid://shopify/LineItem/1',quantity,currentQuantity:quantity,variant:{id:`gid://shopify/ProductVariant/${SAMPLE_VARIANT_ID}`},customAttributes:Object.entries(sampleOrderProperties(fabric,secret)).map(([key,value])=>({key,value})),originalUnitPriceSet:money('2.50'),discountAllocations:[]}]}};}
function quote(quantity=1){return quoteSampleCredit('a'.repeat(64),[{id:grantId,units:eligibleSampleUnits(order(quantity),secret)}]);}
function contract():ShopifyDraftOrderExecutionContract{return {apiVersion:'2026-07',environment:'PRODUCTION',idempotencyTag:'synthetic-draft',requiredScopes:['write_draft_orders'],paymentEnabled:true,completionMutationAllowed:false,invoiceSendAllowed:false,expected:{currency:'GBP',goodsGrossAmountMinor:18000,goodsVatAmountMinor:3000,shippingGrossAmountMinor:1295,shippingVatAmountMinor:216,orderGrossAmountMinor:19295,orderVatAmountMinor:3216},input:{acceptAutomaticDiscounts:false,allowDiscountCodesInCheckout:false,customAttributes:[],lineItems:[{title:'Curtain',quantity:1,originalUnitPriceWithCurrency:{amount:'120.00',currencyCode:'GBP'},requiresShipping:true,taxable:true,sku:'TEST-CURTAIN',customAttributes:[{key:'_curtainsuk_snapshot_id',value:'snapshot-test'}]},{title:'Cushion',quantity:1,originalUnitPriceWithCurrency:{amount:'60.00',currencyCode:'GBP'},requiresShipping:true,taxable:true,sku:'TEST-CUSHION',customAttributes:[{key:'_cushion_id',value:'cushion-test'}]}],note:'Synthetic fixture',presentmentCurrencyCode:'GBP',shippingLine:{title:'Delivery',priceWithCurrency:{amount:'12.95',currencyCode:'GBP'}},shippingAddress:{countryCode:'GB'},tags:['synthetic-draft'],taxExempt:false}};}

test('a paid order has one stable private code, distinct from every other order; no generic code',()=>{
  const code=sampleCreditCode(gid,secret);
  assert.equal(code,sampleCreditCode(gid,secret));
  assert.notEqual(code,sampleCreditCode('gid://shopify/Order/101',secret));
  assert.equal(sampleCreditCodeHash(code),sampleCreditCodeHash(code.toLowerCase().replaceAll('-',' ')));
  assert.throws(()=>normalizeSampleCreditCodes(['WELCOME']));
  assert.throws(()=>normalizeSampleCreditCodes([code,code]));
  assert.throws(()=>sampleCreditCode(gid,''));
});
test('credit uses actual paid sample products, never shipping or other products; max ten units',()=>{
  assert.equal(eligibleSampleUnits(order(12),secret).length,10);
  const o=order(3);o.lineItems.nodes[0].discountAllocations=[{allocatedAmountSet:money('1.00')}];
  assert.deepEqual(eligibleSampleUnits(o,secret).map(u=>u.amountMinor),[217,217,216]);
  const other=structuredClone(o.lineItems.nodes[0]);other.variant={id:'gid://shopify/ProductVariant/123'};o.lineItems.nodes.push(other);
  assert.equal(eligibleSampleUnits(o,secret).reduce((n,u)=>n+u.amountMinor,0),650);
  o.lineItems.nodes[0].discountAllocations=[{allocatedAmountSet:money('7.50')}];assert.equal(eligibleSampleUnits(o,secret).length,0);
});
test('unpaid, test, cancelled, refunded, partial monetary refunds, foreign currency and unsigned samples fail closed',()=>{
  for(const change of [{displayFinancialStatus:'PENDING'},{displayFinancialStatus:'PARTIALLY_REFUNDED'},{displayFinancialStatus:'REFUNDED'},{test:true},{cancelledAt:'2026-10-28'},{currencyCode:'USD'},{taxesIncluded:false}])assert.throws(()=>eligibleSampleUnits({...order(),...change},secret));
  const o=order();o.lineItems.nodes[0].customAttributes=[];assert.throws(()=>eligibleSampleUnits(o,secret));
  const large=order();large.lineItems.pageInfo.hasNextPage=true;assert.throws(()=>eligibleSampleUnits(large,secret));
});
test('combined codes share the ten-sample ceiling, stable ordering and current review identity',()=>{
  const grants=[{id:grantId,units:eligibleSampleUnits(order(6),secret)},{id:'00000000-0000-4000-8000-000000000002',units:eligibleSampleUnits(order(7),secret)}];
  const q=quoteSampleCredit('a'.repeat(64),grants);assert.equal(q.sampleCount,10);assert.equal(q.amountMinor,2500);
  assert.deepEqual(q,quoteSampleCredit('a'.repeat(64),[...grants].reverse()));
  assert.notEqual(q.reservationId,quoteSampleCredit('b'.repeat(64),grants).reservationId);
});
test('credit lowers curtain and mixed checkout totals with VAT once; delivery and cushion prices untouched',()=>{
  const original=contract(),discounted=applySampleCredit(original,quote(10));
  assert.equal(original.expected.orderGrossAmountMinor,19295);
  assert.equal(discounted.expected.orderGrossAmountMinor,16795);
  assert.equal(discounted.expected.orderVatAmountMinor,2799);
  assert.equal(discounted.expected.shippingGrossAmountMinor,1295);
  assert.equal(discounted.input.lineItems[0].appliedDiscount?.value,25);
  assert.equal(discounted.input.lineItems[1].appliedDiscount,undefined);
  assert.deepEqual(applySampleCredit(discounted,quote(10)),discounted);
  assert.throws(()=>applySampleCredit(discounted,quote(2)));
  const onlyCushions=contract();onlyCushions.input.lineItems.shift();assert.throws(()=>applySampleCredit(onlyCushions,quote()));
});

test('actual SQL ledger: atomic single reservation, exact retry, no second redemption; email lease and private access',async()=>{
  const db=new PGlite();
  try{
    await db.exec('create schema curtainsuk_private; create role anon; create role authenticated; create role service_role;');
    await db.exec(await readFile('supabase/migrations/20261028200448_sample_credit.sql','utf8'));
    const q=quote(),c=applySampleCredit(contract(),q);
    await db.query(`insert into curtainsuk_private.sample_credit_grants(id,order_gid,order_name,code_hash,units,email) values($1,$2,'#TEST',$3,$4,'test@example.invalid')`,[grantId,gid,creditDigest('test'),JSON.stringify(q.grants[0].units)]);
    const reserve=(v=q,d=c)=>db.query('select curtainsuk_private.reserve_sample_credit($1::jsonb,$2::jsonb)',[JSON.stringify(v),JSON.stringify(d)]);
    await Promise.all([reserve(),reserve()]);
    const competing={...q,reservationId:'b'.repeat(64)};
    await assert.rejects(()=>reserve(competing,applySampleCredit(contract(),competing)));
    await assert.rejects(()=>reserve(q,{...c,expected:{...c.expected,orderGrossAmountMinor:1}}));
    const claim=()=>db.query<{claim:boolean}>('select curtainsuk_private.claim_sample_credit_email($1) as claim',[grantId]);
    assert.equal((await claim()).rows[0].claim,true);assert.equal((await claim()).rows[0].claim,false);
    await db.query("update curtainsuk_private.sample_credit_grants set email_started_at=now()-interval '24 hours',updated_at=now()-interval '10 minutes' where id=$1",[grantId]);
    assert.equal((await claim()).rows[0].claim,false);
    assert.equal((await db.query<{email_state:string}>('select email_state from curtainsuk_private.sample_credit_grants')).rows[0].email_state,'REVIEW');
    const redeem=(id:string)=>db.query('select curtainsuk_private.redeem_sample_credit($1,$2)',[q.reservationId,id]);
    await redeem('gid://shopify/Order/200');await redeem('gid://shopify/Order/200');
    await assert.rejects(()=>redeem('gid://shopify/Order/201'));
    await assert.rejects(()=>reserve());
    assert.equal((await db.query<{state:string}>('select state from curtainsuk_private.sample_credit_grants')).rows[0].state,'REDEEMED');
    const access=await db.query<{allowed:boolean}>("select has_table_privilege('anon','curtainsuk_private.sample_credit_grants','SELECT') as allowed");assert.equal(access.rows[0].allowed,false);
  }finally{await db.close();}
});
