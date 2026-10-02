import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCurrentApprovedSupplierCostMinor } from '../verified-supplier-price';

const now = new Date('2026-10-02T12:00:00Z');
function select(supplierId: string, standard: string | null, cut: string | null, approved = true) {
  return selectCurrentApprovedSupplierCostMinor({
    supplierId,
    snapshots: [{ snapshot_id: 'genuine-observation', checked_at: '2026-10-02T11:00:00Z', price_expires_at: null,
      prices: { standard_trade_price: standard, cut_trade_price: cut, currency: 'GBP' } }],
    promotionEvents: [{ snapshot_id: 'genuine-observation', promotion_state: approved ? 'APPROVED_FOR_PROJECTION' : 'REJECTED', created_at: '2026-10-02T11:01:00Z' }], now,
  });
}

test('PT uses approved Cut Price as its primary CurtainsUK supplier base price', () => {
  assert.equal(select('prestigious-textiles', '24.40', '30.50'), 3050);
  assert.equal(select('prestigious-textiles', '10.40', '13.00'), 1300);
  assert.equal(select('prestigious-textiles', null, '30.50'), 3050);
});

test('PT retains approved Standard Price only as a legacy fallback', () => {
  assert.equal(select('prestigious-textiles', '24.40', null), 2440);
  assert.equal(select('prestigious-textiles', '24.40', null, false), null);
});

test('PT prefers approved Cut Price even when a newer approved Standard-only snapshot exists', () => {
  const snapshots = [
    { snapshot_id: 'older-cut', checked_at: '2026-08-01T00:00:00Z', price_expires_at: null, prices: { standard_trade_price: null, cut_trade_price: '30.50', currency: 'GBP' } },
    { snapshot_id: 'newer-standard', checked_at: '2026-09-15T13:00:00Z', price_expires_at: null, prices: { standard_trade_price: '24.40', cut_trade_price: null, currency: 'GBP' } },
  ];
  const promotionEvents = [
    { snapshot_id: 'older-cut', promotion_state: 'APPROVED_FOR_PROJECTION', created_at: '2026-08-01T00:01:00Z' },
    { snapshot_id: 'newer-standard', promotion_state: 'APPROVED_FOR_PROJECTION', created_at: '2026-09-15T13:01:00Z' },
  ];
  assert.equal(selectCurrentApprovedSupplierCostMinor({supplierId:'prestigious-textiles',snapshots,promotionEvents,now}),3050);
});

test('SDG keeps its existing approved Cut Price basis', () => {
  assert.equal(select('sanderson-design-group', '24.40', '30.50'), 3050);
  assert.equal(select('sanderson-design-group', '24.40', null), null);
});

test('explicit rejection prevents a PT price from being selected', () => {
  const snapshots = [
    { snapshot_id: 'cut', checked_at: '2026-08-01T00:00:00Z', price_expires_at: null, prices: { standard_trade_price: null, cut_trade_price: '30.50', currency: 'GBP' } },
  ];
  const promotionEvents = [
    { snapshot_id: 'cut', promotion_state: 'APPROVED_FOR_PROJECTION', created_at: '2026-08-01T00:01:00Z' },
    { snapshot_id: 'cut', promotion_state: 'REJECTED', created_at: '2026-10-01T00:00:00Z' },
  ];
  assert.equal(selectCurrentApprovedSupplierCostMinor({supplierId:'prestigious-textiles',snapshots,promotionEvents,now}),null);
});
