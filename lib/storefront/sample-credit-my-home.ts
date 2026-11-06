import { reviewMyHome, checkoutMyHome, type MyHomeInput, type MyHomeCheckoutInput, type MyHomeServices } from '../cushion-studio/my-home';
import { applySampleCredit, creditDigest, curtainCreditAllocation, normalizeSampleCreditCodes, type SampleCreditQuote } from './sample-credit';
import { applyStackedCurtainOffer, calculateStackedOffer, type OfferLine } from './sample-to-sale-offer';
import { normalizePromotionCode, type PromotionQuote } from './sample-to-sale-code';
import type { ShopifyDraftOrderExecutionContract } from './shopify-draft-order-core';

type Input = MyHomeInput & {sampleCreditCodes?:unknown;promotionCode?:unknown};
type CreditServices = {preview(codes:unknown,baseReviewId:string):Promise<SampleCreditQuote|null>};
type OfferServices = {preview(code:unknown,baseReviewId:string,goodsMinor:number):Promise<PromotionQuote|null>};

async function discountReview(input:Input,services:MyHomeServices,credit:CreditServices,offer?:OfferServices) {
  const base=await reviewMyHome(input,services);
  const codes=normalizeSampleCreditCodes(input.sampleCreditCodes);
  const promotionCode=normalizePromotionCode(input.promotionCode);
  if(!codes.length&&!promotionCode)return {base,response:base,creditQuote:null,offerQuote:null};
  if(!base.ready || base.totalMinor===null || base.vatMinor===null || (codes.length&&!input.curtains))throw Error('SAMPLE_CREDIT_CURTAINS_REQUIRED');
  const gross=base.lines.filter(l=>l.kind==='CURTAIN').flatMap(l=>{
    if(l.totalMinor===null || l.totalMinor%l.quantity!==0)throw Error('SAMPLE_CREDIT_CURTAINS_REQUIRED');
    return Array.from({length:l.quantity},()=>l.totalMinor!/l.quantity);
  });
  const creditQuote=codes.length?await credit.preview(codes,base.reviewId):null;
  if(codes.length&&!creditQuote)throw Error('SAMPLE_CREDIT_UNAVAILABLE');
  const goods:OfferLine[]=base.lines.flatMap(line=>{
    if(line.totalMinor===null)throw Error('SAMPLE_TO_SALE_PRICE_INVALID');
    if(line.kind==='CURTAIN'){
      if(line.totalMinor%line.quantity!==0)throw Error('SAMPLE_TO_SALE_PRICE_INVALID');
      return Array.from({length:line.quantity},()=>({kind:line.kind,grossMinor:line.totalMinor!/line.quantity}));
    }
    return [{kind:line.kind,grossMinor:line.totalMinor}];
  });
  const offerQuote=promotionCode?await offer?.preview(promotionCode,base.reviewId,goods.reduce((a,b)=>a+b.grossMinor,0)):null;
  if(promotionCode&&!offerQuote)throw Error('SAMPLE_TO_SALE_UNAVAILABLE');
  if(offerQuote){
    const saving=calculateStackedOffer(goods,creditQuote?.amountMinor??0);
    if(saving.promotionalSavingMinor!==offerQuote.amountMinor)throw Error('SAMPLE_TO_SALE_PRICE_CHANGED');
    const reviewId=creditDigest({base:base.reviewId,credit:creditQuote?.digest??null,promotion:offerQuote.digest});
    return {base,creditQuote,offerQuote,response:{...base,reviewId,totalMinor:base.totalMinor-saving.totalSavingMinor,vatMinor:base.vatMinor-saving.vatReductionMinor,
      ...(creditQuote?{sampleCredit:{amountMinor:creditQuote.amountMinor,sampleCount:creditQuote.sampleCount}}:{}),
      promotion:{amountMinor:offerQuote.amountMinor,expiresAt:offerQuote.expiresAt},
    }};
  }
  const quote=creditQuote!;
  const {vatReduction}=curtainCreditAllocation(quote.amountMinor,gross);
  const reviewId=creditDigest({base:base.reviewId,credit:quote.digest});
  return {base,creditQuote:quote,offerQuote:null,response:{...base,reviewId,totalMinor:base.totalMinor-quote.amountMinor,vatMinor:base.vatMinor-vatReduction,
    sampleCredit:{amountMinor:quote.amountMinor,sampleCount:quote.sampleCount},
  }};
}
export async function reviewMyHomeWithSampleCredit(input:Input,services:MyHomeServices,credit:CreditServices,offer?:OfferServices){return (await discountReview(input,services,credit,offer)).response;}

export async function checkoutMyHomeWithSampleCredit(input:MyHomeCheckoutInput&Input,services:MyHomeServices,credit:CreditServices,offer?:OfferServices) {
  if(!normalizeSampleCreditCodes(input.sampleCreditCodes).length&&!normalizePromotionCode(input.promotionCode))return checkoutMyHome(input,services);
  const checked=await discountReview(input,services,credit,offer);
  if(checked.response.reviewId!==input.reviewId || (!checked.creditQuote&&!checked.offerQuote))throw Error('MY_HOME_REVIEW_CHANGED');
  const quote=checked.creditQuote, promotion=checked.offerQuote;
  const apply=<T extends ShopifyDraftOrderExecutionContract>(contract:T):T=>promotion?applyStackedCurtainOffer(contract,promotion,quote):applySampleCredit(contract,quote!);
  const verifySaved=(saved:{contract:Parameters<typeof applySampleCredit>[0]}|null|undefined)=>{
    if(saved && (promotion?saved.contract.promotionQuote?.reservationId!==promotion.reservationId:saved.contract.sampleCreditQuote?.reservationId!==quote!.reservationId))throw Error('SAMPLE_CREDIT_CHECKOUT_CONFLICT');
    if(saved)apply(saved.contract);
    return saved;
  };
  const cushion=services.mixed.cushion;
  const wrapped:MyHomeServices={...services,
    executeHouse:prepared=>services.executeHouse({...prepared,contract:apply(prepared.contract)}),
    mixed:{...services.mixed,cushion:{...cushion,
      existing:cushion.existing?async key=>{const saved=await cushion.existing!(key);verifySaved(saved);return saved;}:undefined,
      persist:value=>cushion.persist({...value,contract:apply(value.contract)}),
      execute:contract=>cushion.execute(apply(contract)),
    }},
    tracks:services.tracks?{...services.tracks,
      existing:async key=>{const saved=await services.tracks!.existing(key);verifySaved(saved);return saved;},
      persist:(key,group)=>services.tracks!.persist(key,{...group,contract:apply(group.contract)}),
      execute:(key,contract)=>services.tracks!.execute(key,apply(contract)),
    }:undefined,
  };
  const key=promotion?`so-${promotion.reservationId}`:`sc-${quote!.reservationId}`;
  return checkoutMyHome({...input,reviewId:checked.base.reviewId,idempotencyKey:key},wrapped);
}
