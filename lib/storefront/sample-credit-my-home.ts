import { reviewMyHome, checkoutMyHome, type MyHomeInput, type MyHomeCheckoutInput, type MyHomeServices } from '../cushion-studio/my-home';
import { applySampleCredit, creditDigest, curtainCreditAllocation, normalizeSampleCreditCodes, type SampleCreditQuote } from './sample-credit';

type Input = MyHomeInput & {sampleCreditCodes?:unknown};
type CreditServices = {preview(codes:unknown,baseReviewId:string):Promise<SampleCreditQuote|null>};

async function creditReview(input:Input,services:MyHomeServices,credit:CreditServices) {
  const base=await reviewMyHome(input,services);
  const codes=normalizeSampleCreditCodes(input.sampleCreditCodes);
  if(!codes.length)return {base,response:base,quote:null};
  if(!input.curtains || !base.ready || base.totalMinor===null || base.vatMinor===null)throw Error('SAMPLE_CREDIT_CURTAINS_REQUIRED');
  const quote=await credit.preview(codes,base.reviewId);
  if(!quote)throw Error('SAMPLE_CREDIT_UNAVAILABLE');
  const gross=base.lines.filter(l=>l.kind==='CURTAIN').flatMap(l=>{
    if(l.totalMinor===null || l.totalMinor%l.quantity!==0)throw Error('SAMPLE_CREDIT_CURTAINS_REQUIRED');
    return Array.from({length:l.quantity},()=>l.totalMinor!/l.quantity);
  });
  const {vatReduction}=curtainCreditAllocation(quote.amountMinor,gross);
  const reviewId=creditDigest({base:base.reviewId,credit:quote.digest});
  return {base,quote,response:{...base,reviewId,totalMinor:base.totalMinor-quote.amountMinor,vatMinor:base.vatMinor-vatReduction,
    sampleCredit:{amountMinor:quote.amountMinor,sampleCount:quote.sampleCount},
  }};
}
export async function reviewMyHomeWithSampleCredit(input:Input,services:MyHomeServices,credit:CreditServices){return (await creditReview(input,services,credit)).response;}

export async function checkoutMyHomeWithSampleCredit(input:MyHomeCheckoutInput&Input,services:MyHomeServices,credit:CreditServices) {
  if(!normalizeSampleCreditCodes(input.sampleCreditCodes).length)return checkoutMyHome(input,services);
  const checked=await creditReview(input,services,credit);
  if(checked.response.reviewId!==input.reviewId || !checked.quote)throw Error('MY_HOME_REVIEW_CHANGED');
  const quote=checked.quote;
  const verifySaved=(saved:{contract:Parameters<typeof applySampleCredit>[0]}|null|undefined)=>{
    if(saved && saved.contract.sampleCreditQuote?.reservationId!==quote.reservationId)throw Error('SAMPLE_CREDIT_CHECKOUT_CONFLICT');
    if(saved)applySampleCredit(saved.contract,quote);
    return saved;
  };
  const cushion=services.mixed.cushion;
  const wrapped:MyHomeServices={...services,
    executeHouse:prepared=>services.executeHouse({...prepared,contract:applySampleCredit(prepared.contract,quote)}),
    mixed:{...services.mixed,cushion:{...cushion,
      existing:cushion.existing?async key=>{const saved=await cushion.existing!(key);verifySaved(saved);return saved;}:undefined,
      persist:value=>cushion.persist({...value,contract:applySampleCredit(value.contract,quote)}),
      execute:contract=>cushion.execute(applySampleCredit(contract,quote)),
    }},
    tracks:services.tracks?{...services.tracks,
      existing:async key=>{const saved=await services.tracks!.existing(key);verifySaved(saved);return saved;},
      persist:(key,group)=>services.tracks!.persist(key,{...group,contract:applySampleCredit(group.contract,quote)}),
      execute:(key,contract)=>services.tracks!.execute(key,applySampleCredit(contract,quote)),
    }:undefined,
  };
  // A credit invoice has its own stable attempt, including after a retry or a reopened review.
  // Removing the code cannot accidentally reuse a saved discounted invoice under the ordinary key.
  return checkoutMyHome({...input,reviewId:checked.base.reviewId,idempotencyKey:`sc-${quote.reservationId}`},wrapped);
}
