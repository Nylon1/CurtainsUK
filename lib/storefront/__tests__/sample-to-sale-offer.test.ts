import assert from 'node:assert/strict';
import test from 'node:test';
import { applyStackedCurtainOffer, applyWelcomeOffer, calculateStackedCurtainOffer, calculateStackedOffer, calculateWelcomeOffer } from '../sample-to-sale-offer';
import { promotionCode, promotionCodeHash, quotePromotion, verifyPromotionCode } from '../sample-to-sale-code';
import { allocateVatFromGross, type ShopifyDraftOrderExecutionContract } from '../shopify-draft-order-core';
import type { SampleCreditQuote } from '../sample-credit';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('10% stacks with sample credit on curtain goods and excludes shipping',()=>{
  const result=calculateStackedCurtainOffer([20_000],500);
  assert.equal(result.promotionalSavingMinor,2_000);
  assert.equal(result.sampleCreditMinor,500);
  assert.equal(result.payableCurtainGoodsMinor,17_500);
  assert.deepEqual(result.combinedDiscountsMinor,[2_500]);
});

test('percentage allocation stays exact across multiple curtain lines',()=>{
  const result=calculateStackedCurtainOffer([7_501,7_502],250);
  assert.equal(result.promotionalAllocationsMinor.reduce((a,b)=>a+b,0),1_500);
  assert.equal(result.combinedDiscountsMinor.reduce((a,b)=>a+b,0),1_750);
  assert.equal(result.payableCurtainGoodsMinor,13_253);
});

test('the £150 minimum uses curtain goods before savings',()=>{
  assert.throws(()=>calculateStackedCurtainOffer([14_999],0),/SAMPLE_TO_SALE_MINIMUM_NOT_MET/);
  assert.equal(calculateStackedCurtainOffer([15_000],1_000).promotionalSavingMinor,1_500);
});

test('sample credit cannot exceed the goods left after the promotion',()=>{
  assert.throws(()=>calculateStackedCurtainOffer([15_000],14_000),/SAMPLE_TO_SALE_CREDIT_EXCEEDS_GOODS/);
});

test('one code covers curtains, Roman blinds, cushions and motorised tracks, with sample credit only on curtains',()=>{
  const result=calculateStackedOffer([
    {kind:'ROMAN_BLIND',grossMinor:6_000},{kind:'SMART_TRACK',grossMinor:5_000},
    {kind:'CURTAIN',grossMinor:4_000},{kind:'CUSHION',grossMinor:2_000},
  ],500);
  assert.equal(result.eligibleGoodsMinor,17_000);
  assert.equal(result.promotionalSavingMinor,1_700);
  assert.deepEqual(result.promotionalAllocationsMinor,[600,500,400,200]);
  assert.deepEqual(result.sampleCreditAllocationsMinor,[0,0,500,0]);
  assert.equal(result.payableEligibleGoodsMinor,14_800);
});

test('a track-only order qualifies at £150 and shipping is outside the product subtotal',()=>{
  assert.equal(calculateStackedOffer([{kind:'SMART_TRACK',grossMinor:15_000}]).promotionalSavingMinor,1_500);
  assert.throws(()=>calculateStackedOffer([{kind:'SMART_TRACK',grossMinor:14_999}]),/SAMPLE_TO_SALE_MINIMUM_NOT_MET/);
});

test('WELCOME5 discounts all four product types without a minimum and leaves delivery untouched',()=>{
  const lines=[
    {kind:'ROMAN_BLIND' as const,grossMinor:6_001},{kind:'SMART_TRACK' as const,grossMinor:5_002},
    {kind:'CURTAIN' as const,grossMinor:4_003},{kind:'CUSHION' as const,grossMinor:2_004},
  ];
  const saving=calculateWelcomeOffer(lines,250);
  assert.equal(saving.eligibleGoodsMinor,17_010);
  assert.equal(saving.promotionalSavingMinor,851);
  assert.equal(saving.totalSavingMinor,1_101);
  assert.deepEqual(saving.sampleCreditAllocationsMinor,[0,0,250,0]);
  assert.equal(calculateWelcomeOffer([{kind:'CUSHION',grossMinor:1_000}]).promotionalSavingMinor,50);
  assert.throws(()=>calculateStackedOffer([{kind:'CUSHION',grossMinor:1_000}]),/SAMPLE_TO_SALE_MINIMUM_NOT_MET/);
  const goodsVat=lines.reduce((n,l)=>n+allocateVatFromGross(l.grossMinor,2000),0);
  const keys=['_curtainsuk_roman_snapshot_id','_curtainsuk_track_snapshot_id','_curtainsuk_snapshot_id','_curtainsuk_cushion_snapshot_id'];
  const contract={apiVersion:'2026-07',environment:'PRODUCTION',idempotencyTag:'original-tag',requiredScopes:['write_draft_orders'],
    paymentEnabled:true,completionMutationAllowed:false,invoiceSendAllowed:false,
    expected:{currency:'GBP',goodsGrossAmountMinor:17_010,goodsVatAmountMinor:goodsVat,shippingGrossAmountMinor:1_295,
      shippingVatAmountMinor:allocateVatFromGross(1_295,2000),orderGrossAmountMinor:18_305,orderVatAmountMinor:goodsVat+allocateVatFromGross(1_295,2000)},
    input:{acceptAutomaticDiscounts:false,allowDiscountCodesInCheckout:false,customAttributes:[],
      lineItems:lines.map((l,index)=>({title:'Product',quantity:1,originalUnitPriceWithCurrency:{amount:(l.grossMinor/100).toFixed(2),currencyCode:'GBP'},
        requiresShipping:true,taxable:true,sku:`CUK-${index}`,customAttributes:[{key:keys[index],value:`item-${index}`}]})),
      note:'test',presentmentCurrencyCode:'GBP',shippingLine:{title:'Delivery',priceWithCurrency:{amount:'12.95',currencyCode:'GBP'}},
      shippingAddress:{countryCode:'GB'},tags:['original-tag'],taxExempt:false}} as ShopifyDraftOrderExecutionContract;
  const credit:SampleCreditQuote={version:'sample-credit-v1',reservationId:'c'.repeat(64),digest:'d'.repeat(64),amountMinor:250,sampleCount:1,grants:[{id:'30000000-0000-4000-8000-000000000001',units:[{lineId:'sample',ordinal:0,amountMinor:250}]}]};
  const applied=applyWelcomeOffer(contract,credit);
  assert.equal(applied.expected.discountAmountMinor,1_101);
  assert.equal(applied.expected.orderGrossAmountMinor,17_204);
  assert.equal(applied.expected.shippingGrossAmountMinor,1_295);
  assert.equal(applied.input.lineItems.reduce((n,l)=>n+Math.round((l.appliedDiscount?.value??0)*100),0),1_101);
  assert.equal(applied.input.customAttributes.find(a=>a.key==='curtainsuk_welcome_code')?.value,'WELCOME5');
  assert.deepEqual(applyWelcomeOffer(applied,credit),applied);
});

test('the reviewed mixed offer becomes exact line discounts while delivery stays full price',()=>{
  const amounts=[6_000,5_000,4_000,2_000],keys=['_curtainsuk_roman_snapshot_id','_curtainsuk_track_snapshot_id','_curtainsuk_snapshot_id','_curtainsuk_cushion_snapshot_id'];
  const goodsVat=amounts.reduce((n,a)=>n+allocateVatFromGross(a,2000),0);
  const contract={apiVersion:'2026-07',environment:'PRODUCTION',idempotencyTag:'original-tag',requiredScopes:['write_draft_orders'],
    paymentEnabled:true,completionMutationAllowed:false,invoiceSendAllowed:false,
    expected:{currency:'GBP',goodsGrossAmountMinor:17_000,goodsVatAmountMinor:goodsVat,shippingGrossAmountMinor:1_000,
      shippingVatAmountMinor:allocateVatFromGross(1_000,2000),orderGrossAmountMinor:18_000,orderVatAmountMinor:goodsVat+allocateVatFromGross(1_000,2000)},
    input:{acceptAutomaticDiscounts:false,allowDiscountCodesInCheckout:false,customAttributes:[],
      lineItems:amounts.map((a,index)=>({title:'Product',quantity:1,originalUnitPriceWithCurrency:{amount:(a/100).toFixed(2),currencyCode:'GBP'},
        requiresShipping:true,taxable:true,sku:`CUK-${index}`,customAttributes:[{key:keys[index],value:`item-${index}`}]})),
      note:'test',presentmentCurrencyCode:'GBP',shippingLine:{title:'Delivery',priceWithCurrency:{amount:'10.00',currencyCode:'GBP'}},
      shippingAddress:{countryCode:'GB'},tags:['original-tag'],taxExempt:false}} as ShopifyDraftOrderExecutionContract;
  const promotion=quotePromotion({offerId:'10000000-0000-4000-8000-000000000001',codeHash:'a'.repeat(64),expiresAt:'2026-11-20T12:00:00Z',baseReviewId:'b'.repeat(64),amountMinor:1_700});
  const credit:SampleCreditQuote={version:'sample-credit-v1',reservationId:'c'.repeat(64),digest:'d'.repeat(64),amountMinor:500,sampleCount:1,grants:[{id:'30000000-0000-4000-8000-000000000001',units:[{lineId:'sample',ordinal:0,amountMinor:500}]}]};
  const applied=applyStackedCurtainOffer(contract,promotion,credit);
  assert.deepEqual(applied.input.lineItems.map(l=>Math.round((l.appliedDiscount?.value??0)*100)),[600,500,900,200]);
  assert.equal(applied.expected.discountAmountMinor,2_200);
  assert.equal(applied.expected.shippingGrossAmountMinor,1_000);
  assert.equal(applied.expected.orderGrossAmountMinor,15_800);
});

test('issued personal code has a stable hash and fails verification for another offer',()=>{
  const secret='s'.repeat(32),id='10000000-0000-4000-8000-000000000001';
  const code=promotionCode(id,secret);
  assert.match(code,/^CUK10-[A-F0-9]{8}-[A-F0-9]{20}$/);
  assert.equal(promotionCodeHash(code).length,64);
  assert.equal(verifyPromotionCode(code,id,secret),true);
  assert.equal(verifyPromotionCode(code,'20000000-0000-4000-8000-000000000001',secret),false);
});

test('offer ledger migration applies after sample credit and keeps browser roles out',async()=>{
  const db=new PGlite();
  try{
    await db.exec('create role anon; create role authenticated; create role service_role; create schema curtainsuk_private;');
    for(const file of ['20261028200448_sample_credit.sql','20261106220140_sample_to_sale_offers.sql','20261110054127_welcome_offer_sample_credit.sql'])
      await db.exec(readFileSync(new URL(`../../../supabase/migrations/${file}`,import.meta.url),'utf8'));
    const access=await db.query("select has_table_privilege('anon','curtainsuk_private.sample_to_sale_offers','SELECT') allowed");
    assert.equal((access.rows[0] as {allowed:boolean}).allowed,false);
    const id='10000000-0000-4000-8000-000000000001',hash='a'.repeat(64),reservationId='b'.repeat(64);
    await db.query("insert into curtainsuk_private.sample_to_sale_offers(id,sample_order_gid,customer_gid,code_hash,issued_at,expires_at) values($1,'gid://shopify/Order/1','gid://shopify/Customer/1',$2,now(),now()+interval '14 days')",[id,hash]);
    const contract={promotionQuote:{offerId:id,codeHash:hash,amountMinor:1500,reservationId},
      expected:{discountAmountMinor:1500},input:{customAttributes:[{key:'curtainsuk_sample_to_sale_id',value:reservationId}]}};
    await db.query('select curtainsuk_private.reserve_sample_to_sale($1::jsonb)',[JSON.stringify(contract)]);
    await db.query('select curtainsuk_private.reserve_sample_to_sale($1::jsonb)',[JSON.stringify(contract)]);
    const changed={...contract,promotionQuote:{...contract.promotionQuote,reservationId:'c'.repeat(64)},
      input:{customAttributes:[{key:'curtainsuk_sample_to_sale_id',value:'c'.repeat(64)}]}};
    await assert.rejects(db.query('select curtainsuk_private.reserve_sample_to_sale($1::jsonb)',[JSON.stringify(changed)]),/SAMPLE_TO_SALE_UNAVAILABLE/);
    await db.query("select curtainsuk_private.redeem_sample_to_sale($1,'gid://shopify/Order/2')",[reservationId]);
    const status=await db.query('select state from curtainsuk_private.sample_to_sale_offers where id=$1',[id]);
    assert.equal((status.rows[0] as {state:string}).state,'REDEEMED');
    const secondId='20000000-0000-4000-8000-000000000001',secondHash='f'.repeat(64),secondReservation='1'.repeat(64);
    const grantId='30000000-0000-4000-8000-000000000001',creditReservation='2'.repeat(64);
    await db.query("insert into curtainsuk_private.sample_to_sale_offers(id,sample_order_gid,customer_gid,code_hash,issued_at,expires_at) values($1,'gid://shopify/Order/3','gid://shopify/Customer/3',$2,now(),now()+interval '14 days')",[secondId,secondHash]);
    await db.query("insert into curtainsuk_private.sample_credit_grants(id,order_gid,order_name,code_hash,units) values($1,'gid://shopify/Order/4','#4',$2,'[]'::jsonb || '[{\"lineId\":\"sample-line\"}]'::jsonb)",[grantId,'3'.repeat(64)]);
    const sampleCreditQuote={reservationId:creditReservation,digest:'4'.repeat(64),grants:[{id:grantId,units:[{lineId:'sample-line',ordinal:0,amountMinor:250}]}],sampleCount:1,amountMinor:250};
    const combined={promotionQuote:{offerId:secondId,codeHash:secondHash,amountMinor:1500,reservationId:secondReservation},sampleCreditQuote,
      expected:{discountAmountMinor:1750},input:{customAttributes:[{key:'curtainsuk_sample_to_sale_id',value:secondReservation},{key:'curtainsuk_sample_credit_id',value:creditReservation}]}};
    await db.query('select curtainsuk_private.reserve_sample_to_sale($1::jsonb)',[JSON.stringify(combined)]);
    const both=await db.query('select state from curtainsuk_private.sample_credit_grants where id=$1',[grantId]);
    assert.equal((both.rows[0] as {state:string}).state,'RESERVED');
    const welcomeGrant='40000000-0000-4000-8000-000000000001',welcomeReservation='5'.repeat(64);
    await db.query("insert into curtainsuk_private.sample_credit_grants(id,order_gid,order_name,code_hash,units) values($1,'gid://shopify/Order/5','#5',$2,'[{\"lineId\":\"welcome-sample\"}]'::jsonb)",[welcomeGrant,'6'.repeat(64)]);
    const welcomeCredit={reservationId:welcomeReservation,digest:'7'.repeat(64),grants:[{id:welcomeGrant,units:[{lineId:'welcome-sample',ordinal:0,amountMinor:250}]}],sampleCount:1,amountMinor:250};
    const welcomeContract={sampleCreditQuote:welcomeCredit,expected:{goodsGrossAmountMinor:10_000,discountAmountMinor:750},
      input:{customAttributes:[{key:'curtainsuk_welcome_code',value:'WELCOME5'},{key:'curtainsuk_sample_credit_id',value:welcomeReservation}]}};
    await assert.rejects(db.query('select curtainsuk_private.reserve_sample_credit($1::jsonb,$2::jsonb)',[JSON.stringify(welcomeCredit),JSON.stringify({...welcomeContract,expected:{...welcomeContract.expected,discountAmountMinor:749}})]),/SAMPLE_CREDIT_INVALID/);
    await db.query('select curtainsuk_private.reserve_sample_credit($1::jsonb,$2::jsonb)',[JSON.stringify(welcomeCredit),JSON.stringify(welcomeContract)]);
    await db.query('select curtainsuk_private.reserve_sample_credit($1::jsonb,$2::jsonb)',[JSON.stringify(welcomeCredit),JSON.stringify(welcomeContract)]);
    const welcomeState=await db.query('select state from curtainsuk_private.sample_credit_grants where id=$1',[welcomeGrant]);
    assert.equal((welcomeState.rows[0] as {state:string}).state,'RESERVED');
    const privilege=await db.query("select has_function_privilege('anon','curtainsuk_private.reserve_sample_credit(jsonb,jsonb)','EXECUTE') allowed");
    assert.equal((privilege.rows[0] as {allowed:boolean}).allowed,false);
  }finally{await db.close();}
});
