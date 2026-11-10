import { allocateVatFromGross, parseShopifyMoneyMinor, type ShopifyDraftOrderExecutionContract } from './shopify-draft-order-core';
import { creditDigest, type SampleCreditQuote } from './sample-credit';
import type { PromotionQuote } from './sample-to-sale-code';

export const SAMPLE_TO_SALE_MINIMUM_GOODS_MINOR = 15_000;
export const SAMPLE_TO_SALE_PERCENT = 10;
export type OfferProductKind = 'CURTAIN' | 'CUSHION' | 'ROMAN_BLIND' | 'SMART_TRACK' | 'OTHER';
export type OfferLine = { kind: OfferProductKind; grossMinor: number };

/** Product subtotal includes VAT; delivery is never passed into this calculation. */
export function calculateStackedOffer(lines: OfferLine[], sampleCreditMinor = 0) {
  return calculateProductOffer(lines,sampleCreditMinor,SAMPLE_TO_SALE_PERCENT,SAMPLE_TO_SALE_MINIMUM_GOODS_MINOR);
}

/** The welcome offer has no minimum; the personal sample offer retains its £150 threshold. */
export function calculateWelcomeOffer(lines: OfferLine[], sampleCreditMinor = 0) {
  return calculateProductOffer(lines,sampleCreditMinor,5,0);
}

function calculateProductOffer(lines: OfferLine[], sampleCreditMinor: number, percent: number, minimumGoodsMinor: number) {
  if (!lines.length || lines.some(l=>!Number.isSafeInteger(l.grossMinor)||l.grossMinor<0)
    || !Number.isSafeInteger(sampleCreditMinor)||sampleCreditMinor<0)throw Error('SAMPLE_TO_SALE_PRICE_INVALID');
  const eligibleGoodsMinor=lines.reduce((n,l)=>n+l.grossMinor,0);
  if(!Number.isSafeInteger(eligibleGoodsMinor)||eligibleGoodsMinor<minimumGoodsMinor)throw Error('SAMPLE_TO_SALE_MINIMUM_NOT_MET');
  const promotionalSavingMinor=Math.round(eligibleGoodsMinor*percent/100);
  const promo=lines.map(l=>Math.floor(l.grossMinor*percent/100));
  const remainders=lines.map((l,index)=>({index,remainder:(l.grossMinor*percent)%100})).sort((a,b)=>b.remainder-a.remainder||a.index-b.index);
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

/** Apply WELCOME5 to every product line, plus any eligible curtain sample credit. */
export function applyWelcomeOffer<T extends ShopifyDraftOrderExecutionContract>(contract:T,credit:SampleCreditQuote|null):T {
  const existing=contract.input.customAttributes.find(a=>a.key==='curtainsuk_welcome_code');
  if(existing){
    if(existing.value!=='WELCOME5'||(contract.sampleCreditQuote?.reservationId??null)!==(credit?.reservationId??null))throw Error('WELCOME_OFFER_CHECKOUT_CONFLICT');
    return contract;
  }
  const products=contract.input.lineItems;
  if(!products.length||products.some(l=>l.quantity!==1||l.appliedDiscount)||contract.expected.discountAmountMinor)throw Error('WELCOME_OFFER_GOODS_REQUIRED');
  const saving=calculateWelcomeOffer(products.map(l=>({kind:lineKind(l),grossMinor:parseShopifyMoneyMinor(l.originalUnitPriceWithCurrency.amount)})),credit?.amountMinor??0);
  const fingerprint='fingerprint' in contract?creditDigest({original:contract.fingerprint,welcome:'WELCOME5',credit:credit?.digest??null}):null;
  const tag=fingerprint?`welcome-${fingerprint}`:contract.idempotencyTag;
  let index=0;
  return {...contract,...(credit?{sampleCreditQuote:credit}:{}),...(fingerprint?{fingerprint}:{}),idempotencyTag:tag,
    expected:{...contract.expected,discountAmountMinor:saving.totalSavingMinor,
      goodsVatAmountMinor:contract.expected.goodsVatAmountMinor-saving.vatReductionMinor,
      orderGrossAmountMinor:contract.expected.orderGrossAmountMinor-saving.totalSavingMinor,
      orderVatAmountMinor:contract.expected.orderVatAmountMinor-saving.vatReductionMinor},
    input:{...contract.input,tags:contract.input.tags.map(t=>t===contract.idempotencyTag?tag:t),
      customAttributes:[...contract.input.customAttributes.map(a=>fingerprint&&a.key==='curtainsuk_house_fingerprint'?{...a,value:fingerprint}:a),
        {key:'curtainsuk_welcome_code',value:'WELCOME5'},
        {key:'Welcome offer',value:`5% off products: £${(saving.promotionalSavingMinor/100).toFixed(2)}`},
        ...(credit?[{key:'curtainsuk_sample_credit_id',value:credit.reservationId},{key:'Sample credit',value:`£${(credit.amountMinor/100).toFixed(2)} (${credit.sampleCount} ${credit.sampleCount===1?'sample':'samples'})`}]:[])].sort((a,b)=>a.key.localeCompare(b.key)),
      lineItems:products.map(l=>{const discount=saving.combinedDiscountsMinor[index++];return discount?{...l,appliedDiscount:{title:credit?'Welcome offer + sample credit':'Welcome offer',description:'CurtainsUK WELCOME5 saving',value:discount/100,valueType:'FIXED_AMOUNT' as const}}:l;})}};
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
  const tag=fingerprint?`sample-offer-${fingerprint}`:contract.idempotencyTag;
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
