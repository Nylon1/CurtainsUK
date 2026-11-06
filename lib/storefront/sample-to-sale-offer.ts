import { allocateVatFromGross } from './shopify-draft-order-core';

export const SAMPLE_TO_SALE_MINIMUM_GOODS_MINOR = 15_000;
export const SAMPLE_TO_SALE_PERCENT = 10;

/** A pricing model for review. No code is issued or redeemed by this function. */
export function calculateStackedCurtainOffer(curtainGrossLinesMinor: number[], sampleCreditMinor = 0) {
  if (!curtainGrossLinesMinor.length || curtainGrossLinesMinor.some(n => !Number.isSafeInteger(n) || n < 0)
    || !Number.isSafeInteger(sampleCreditMinor) || sampleCreditMinor < 0) throw Error('SAMPLE_TO_SALE_PRICE_INVALID');
  const curtainGoodsMinor = curtainGrossLinesMinor.reduce((sum, n) => sum + n, 0);
  if (!Number.isSafeInteger(curtainGoodsMinor) || curtainGoodsMinor < SAMPLE_TO_SALE_MINIMUM_GOODS_MINOR) throw Error('SAMPLE_TO_SALE_MINIMUM_NOT_MET');
  const promotionalSavingMinor = Math.round(curtainGoodsMinor * SAMPLE_TO_SALE_PERCENT / 100);
  const floors = curtainGrossLinesMinor.map(n => Math.floor(n * SAMPLE_TO_SALE_PERCENT / 100));
  const remainders = curtainGrossLinesMinor.map((n, index) => ({ index, remainder: (n * SAMPLE_TO_SALE_PERCENT) % 100 }))
    .sort((a,b) => b.remainder-a.remainder || a.index-b.index);
  for (let i=0, remaining=promotionalSavingMinor-floors.reduce((a,b)=>a+b,0); i<remaining; i++) floors[remainders[i].index]++;
  const afterPromo = curtainGrossLinesMinor.map((gross,index) => gross-floors[index]);
  if (sampleCreditMinor > afterPromo.reduce((a,b)=>a+b,0)) throw Error('SAMPLE_TO_SALE_CREDIT_EXCEEDS_GOODS');
  let remainingCredit = sampleCreditMinor;
  const creditAllocations = afterPromo.map(gross => { const credit = Math.min(gross,remainingCredit); remainingCredit -= credit; return credit; });
  const combinedDiscounts = floors.map((promo,index)=>promo+creditAllocations[index]);
  const vatReductionMinor = curtainGrossLinesMinor.reduce((sum,gross,index) => sum
    + allocateVatFromGross(gross,2000)-allocateVatFromGross(gross-combinedDiscounts[index],2000),0);
  return {
    curtainGoodsMinor, promotionalSavingMinor, sampleCreditMinor,
    totalSavingMinor: promotionalSavingMinor+sampleCreditMinor,
    payableCurtainGoodsMinor: curtainGoodsMinor-promotionalSavingMinor-sampleCreditMinor,
    vatReductionMinor, promotionalAllocationsMinor: floors,
    sampleCreditAllocationsMinor: creditAllocations, combinedDiscountsMinor: combinedDiscounts,
  };
}
