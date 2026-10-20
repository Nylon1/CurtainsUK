import test from 'node:test';
import assert from 'node:assert/strict';
import { BROWSE_PRICE_BANDS, browsePriceBand, browsePriceOptions, customerBrowseGuide } from '../browse-price-guide';
import { selectCurrentApprovedSupplierCostMinor } from '../verified-supplier-price';
import { assertCustomerSafeProjection } from '../projection';

test('guide bands have exact, gap-free boundaries; unknown prices are not zero', () => {
  for (const amount of [1,2999,3000,4999,5000,5999,6000,9999,10000,14999,15000,24999,25000,64749]) {
    assert.equal(BROWSE_PRICE_BANDS.filter(band => amount >= band.minimumMinor && (band.maximumMinor === null || amount < band.maximumMinor)).length,1);
  }
  assert.equal(browsePriceBand(null),null);
  assert.equal(browsePriceBand('50-100')?.minimumMinor,5000);
  assert.throws(()=>browsePriceBand('0 or 1=1'));
  for(const amount of [undefined,null,0,-1,NaN,Infinity,'5000',100.5,Number.MAX_SAFE_INTEGER+1]) assert.equal(customerBrowseGuide(amount),null);
});

test('new guide ranges and saved links keep explicit, accurate boundaries', () => {
  assert.deepEqual(browsePriceOptions().map(x=>x.value), ['under-30','30-60','60-100','100-150','150-plus']);
  assert.equal(browsePriceBand('under-30')?.maximumMinor,3000);
  assert.equal(browsePriceBand('30-60')?.minimumMinor,3000);
  assert.equal(browsePriceBand('30-60')?.maximumMinor,6000);
  assert.equal(browsePriceBand('60-100')?.minimumMinor,6000);
  assert.equal(browsePriceBand('150-plus')?.maximumMinor,null);
  assert.equal(browsePriceBand('50-100')?.minimumMinor,5000);
  assert.equal(browsePriceBand('50-100')?.maximumMinor,10000);
  assert.deepEqual(browsePriceOptions('50-100').at(-1),{value:'50-100',label:'£50 – under £100 (saved range)'});
  assert.equal(browsePriceOptions('30-60').length,5);
});

test('guide uses approved PT Cut / SDG Cut pricing policy, not an order calculation', () => {
  const snapshots=[{snapshot_id:'price',checked_at:'2026-01-01T00:00:00Z',price_expires_at:'2026-02-01T00:00:00Z',prices:{standard_trade_price:20.33,cut_trade_price:25,currency:'GBP'}}];
  const promotionEvents=[{snapshot_id:'price',promotion_state:'APPROVED_FOR_PROJECTION',created_at:'2026-01-01T00:01:00Z'}];
  for(const [supplierId,expected] of [['prestigious-textiles',5000],['sanderson-design-group',5000]] as const) {
    const cost=selectCurrentApprovedSupplierCostMinor({supplierId,snapshots,promotionEvents});
    const guide=customerBrowseGuide(cost===null?null:cost*2);
    assert.equal(guide?.amountMinor,expected);
    assert.deepEqual(Object.keys(guide!),['amountMinor','currency','policy']);
    assertCustomerSafeProjection(guide);
  }
  const revoked=[...promotionEvents,{snapshot_id:'price',promotion_state:'REJECTED',created_at:'2026-09-01T00:00:00Z'}];
  assert.equal(selectCurrentApprovedSupplierCostMinor({supplierId:'prestigious-textiles',snapshots,promotionEvents:revoked}),null);
  assert.equal(selectCurrentApprovedSupplierCostMinor({supplierId:'prestigious-textiles',snapshots,promotionEvents:[]}),null);
});
