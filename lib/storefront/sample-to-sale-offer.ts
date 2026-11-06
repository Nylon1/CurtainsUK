import { allocateVatFromGross, parseShopifyMoneyMinor, type ShopifyDraftOrderExecutionContract } from './shopify-draft-order-core';
import { creditDigest, type SampleCreditQuote } from './sample-credit';
import type { PromotionQuote } from './sample-to-sale-code';

export const SAMPLE_TO_SALE_MINIMUM_GOODS_MINOR = 15_000;
export const SAMPLE_TO_SALE_PERCENT = 10;
export type OfferProductKind = 'CURTAIN' | 'CUSHION' | 'ROMAN_BLIND' | 'SMART_TRACK' | 'OTHER';
export type OfferLine = { kind: OfferProductKind; grossMinor: number };

/** Product subtotal includes VAT; delivery is never passed into this calculation. */
export function calculateStackedOffer(lines: OfferLine[], sampleCreditMinor = 0) {
  if (!lines.length || lines.some(l=>!Number.isSafeInteger(l.grossMinor)||l.grossMinor<0)
    || !Number.isSafeInteger(sampleCreditMinor)||sampleCreditMinor<0)throw Error('SAMPLE_TO_SALE_PRICE_INVALID');
  const eligibleGoodsMinor=lines.reduce((n,l)=>n+l.grossMinor,0);
  if(!Number.isSafeInteger(eligibleGoodsMinor)||eligibleGoodsMinor<SAMPLE_TO_SALE_MINIMUM_GOODS_MINOR)throw Error('SAMPLE_TO_SALE_MINIMUM_NOT_MET');
  const promotionalSavingMinor=Math.round(eligibleGoodsMinor*SAMPLE_TO_SALE_PERCENT/100);
  const promo=lines.map(l=>Math.floor(l.grossMinor*SAMPLE_TO_SALE_PERCENT/100));
  const remainders=lines.map((l,index)=>({index,remainder:(l.grossMinor*SAMPLE_TO_SALE_PERCENT)%100})).sort((a,b)=>b.remainder-a.remainder||a.index-b.index);
  const pennies=promotionalSavingMinor-promo.reduce((n,p)=>n+p,0);
  for(let i=0;i<pennies;i++)promo[remainders[i].index]++;
  let remainingCredit=sampleCreditMinor;
  const credit=lines.map((l,index)=>{if(l.kind!=='CURTAIN')return 0;const value=Math.min(l.grossMinor-promo[index],remainingCredit);remainingCredit-=value;return value;});
  if(remainingCredit)throw Error('SAMPLE_TO_SALE_CREDIT_EXCEEDS_GOODS');
  const discounts=promo.map((p,index)=>p+credit[index]);
  const vatReductionMinor=lines.reduce((n,l,index)=>n+allocateVatFromGross(l.grossMinor,2000)-allocateVatFromGross(l.grossMinor-discounts[index],2000),0);
  return {eligibleGoodsMinor,promotionalSavingMinor,sampleCreditMinor,totalSavingMinor:promotionalSavingMinor+sampleCreditMinor,
    payableEligibleGoodsMinor:eligibleGoodsMinor-promotionalSavingMinor-sampleCreditMinor,vatReductionMinor,
    promotionalAllocationsMinor:promo,sampleCreditAllocationsMinor:credit,combinedDiscountsMinor:discounts};
}

export function calculateStackedCurtainOffer(curtainGrossLinesMinor:number[],sampleCreditMinor=0){
  const result=calculateStackedOffer(curtainGrossLinesMinor.map(grossMinor=>({kind:'CURTAIN',grossMinor})),sampleCreditMinor);
  return {...result,curtainGoodsMinor:result.eligibleGoodsMinor,payableCurtainGoodsMinor:result.payableEligibleGoodsMinor};
}

function lineKind(line:ShopifyDraftOrderExecutionContract['input']['lineItems'][number]):OfferProductKind {
  const keys=new Set(line.customAttributes.map(a=>a.key));
  return keys.has('_curtainsuk_snapshot_id')?'CURTAIN':keys.has('_curtainsuk_cushion_snapshot_id')?'CUSHION':keys.has('_curtainsuk_roman_snapshot_id')?'ROMAN_BLIND':keys.has('_curtainsuk_track_snapshot_id')?'SMART_TRACK':'OTHER';
}

/** Apply one fixed discount per product line so Shopify can verify the final total. */
export function applyStackedCurtainOffer<T extends ShopifyDraftOrderExecutionContract>(contract:T,promotion:PromotionQuote,credit:SampleCreditQuote|null):T {
  const existing=contract.input.customAttributes.find(a=>a.key==='curtainsuk_sample_to_sale_id');
  if(existing){
    if(existing.value!==promotion.reservationId||contract.promotionQuote?.digest!==promotion.digest||
      (contract.sampleCreditQuote?.reservationId??null)!==(credit?.reservationId??null)||
      contract.expected.discountAmountMinor!==promotion.amountMinor+(credit?.amountMinor??0))throw Error('SAMPLE_TO_SALE_CHECKOUT_CONFLICT');
    return contract;
  }
  const products=contract.input.lineItems;
  if(!products.length||products.some(l=>l.quantity!==1||l.appliedDiscount)||contract.expected.discountAmountMinor)throw Error('SAMPLE_TO_SALE_GOODS_REQUIRED');
  const saving=calculateStackedOffer(products.map(l=>({kind:lineKind(l),grossMinor:parseShopifyMoneyMinor(l.originalUnitPriceWithCurrency.amount)})),credit?.amountMinor??0);
  if(saving.promotionalSavingMinor!==promotion.amountMinor)throw Error('SAMPLE_TO_SALE_PRICE_CHANGED');
  const fingerprint='fingerprint' in contract?creditDigest({original:contract.fingerprint,promotion:promotion.digest,credit:credit?.digest??null}):null;
  const tag=fingerprint?`sample-offer-${fingerprint}`:`sample-offer-${promotion.reservationId}`;
  let index=0;
  return {...contract,promotionQuote:promotion,...(credit?{sampleCreditQuote:credit}:{}),...(fingerprint?{fingerprint}:{}),idempotencyTag:tag,
    expected:{...contract.expected,discountAmountMinor:saving.totalSavingMinor,
      goodsVatAmountMinor:contract.expected.goodsVatAmountMinor-saving.vatReductionMinor,
      orderGrossAmountMinor:contract.expected.orderGrossAmountMinor-saving.totalSavingMinor,
      orderVatAmountMinor:contract.expected.orderVatAmountMinor-saving.vatReductionMinor},
    input:{...contract.input,tags:contract.input.tags.map(t=>t===contract.idempotencyTag?tag:t),
      customAttributes:[...contract.input.customAttributes.map(a=>fingerprint&&a.key==='curtainsuk_house_fingerprint'?{...a,value:fingerprint}:a),
        {key:'curtainsuk_sample_to_sale_id',value:promotion.reservationId},
        {key:'Sample offer',value:`10% off products: £${(promotion.amountMinor/100).toFixed(2)}`},
        ...(credit?[{key:'curtainsuk_sample_credit_id',value:credit.reservationId},{key:'Sample credit',value:`£${(credit.amountMinor/100).toFixed(2)} (${credit.sampleCount} samples)`}]:[])].sort((a,b)=>a.key.localeCompare(b.key)),
      lineItems:products.map(l=>{const discount=saving.combinedDiscountsMinor[index++];return discount?{...l,appliedDiscount:{title:credit?'Sample offer + sample credit':'Sample offer',description:'CurtainsUK sample-to-sale saving',value:discount/100,valueType:'FIXED_AMOUNT' as const}}:l;})}};
}
