import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateStackedCurtainOffer } from '../sample-to-sale-offer';

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
