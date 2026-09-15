import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCurrentApprovedSupplierCostMinor } from '../verified-supplier-price';

const now = new Date('2026-09-15T16:00:00Z');
function select(supplierId: string, standard: string | null, cut: string | null, approved = true) {
  return selectCurrentApprovedSupplierCostMinor({
    supplierId,
    snapshots: [{ snapshot_id: 'genuine-observation', checked_at: '2026-09-15T13:50:00Z', price_expires_at: null,
      prices: { standard_trade_price: standard, cut_trade_price: cut, currency: 'GBP' } }],
    promotionEvents: [{ snapshot_id: 'genuine-observation', promotion_state: approved ? 'APPROVED_FOR_PROJECTION' : 'REJECTED', created_at: '2026-09-15T14:00:00Z' }], now,
  });
}
test('PT uses the genuine Standard Price for both pilot controls, never Cut Price', () => {
  assert.equal(select('prestigious-textiles', '24.40', null), 2440);
  assert.equal(select('prestigious-textiles', '10.40', null), 1040);
  assert.equal(select('prestigious-textiles', '24.40', '30.50'), 2440);
  assert.equal(select('prestigious-textiles', '10.40', '13.00'), 1040);
});
test('PT does not derive a Standard Price from Cut Price or use unapproved evidence', () => {
  assert.equal(select('prestigious-textiles', null, '30.50'), null);
  assert.equal(select('prestigious-textiles', '24.40', '30.50', false), null);
});
test('SDG keeps its existing approved price basis', () => {
  assert.equal(select('sanderson-design-group', '24.40', '30.50'), 3050);
  assert.equal(select('sanderson-design-group', '24.40', null), null);
});

test('PT keeps approved Standard Price until superseded without mutating source observations', () => {
  const snapshots = [
    { snapshot_id: 'old', checked_at: '2025-08-01T00:00:00Z', price_expires_at: '2025-09-01T00:00:00Z', prices: { standard_trade_price: '24.40', cut_trade_price: null, currency: 'GBP' } },
    { snapshot_id: 'new', checked_at: '2026-09-15T13:00:00Z', price_expires_at: null, prices: { standard_trade_price: '25.00', cut_trade_price: '31.25', currency: 'GBP' } },
  ];
  const before = JSON.stringify(snapshots);
  const promotionEvents = [{ snapshot_id: 'old', promotion_state: 'APPROVED_FOR_PROJECTION', created_at: '2025-08-01T00:00:00Z' }];
  assert.equal(selectCurrentApprovedSupplierCostMinor({supplierId:'prestigious-textiles',snapshots,promotionEvents,now}),2440);
  promotionEvents.push({snapshot_id:'new',promotion_state:'APPROVED_FOR_PROJECTION',created_at:'2026-09-15T14:00:00Z'});
  assert.equal(selectCurrentApprovedSupplierCostMinor({supplierId:'prestigious-textiles',snapshots,promotionEvents,now}),2500);
  promotionEvents.push({snapshot_id:'new',promotion_state:'REJECTED',created_at:'2026-09-15T15:00:00Z'});
  assert.equal(selectCurrentApprovedSupplierCostMinor({supplierId:'prestigious-textiles',snapshots,promotionEvents,now}),2440);
  assert.equal(JSON.stringify(snapshots),before);
});
