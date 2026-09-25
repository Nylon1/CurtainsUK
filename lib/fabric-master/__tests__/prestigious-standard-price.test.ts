import test from 'node:test';
import assert from 'node:assert/strict';
import { PT_GOVERNED_PDF_CUT_SOURCE, selectCurrentApprovedSupplierCostMinor } from '../verified-supplier-price';

const now = new Date('2026-09-15T16:00:00Z');
function select(supplierId: string, standard: string | null, cut: string | null, approved = true) {
  const snapshotId = cut ? 'pt-pdf-cut:genuine-observation' : 'genuine-observation';
  return selectCurrentApprovedSupplierCostMinor({
    supplierId,
    snapshots: [{ snapshot_id: snapshotId, checked_at: '2026-09-15T13:50:00Z', price_expires_at: null,
      source_type: cut ? 'OTHER' : null, source_name: cut ? PT_GOVERNED_PDF_CUT_SOURCE : null,
      prices: { standard_trade_price: standard, cut_trade_price: cut, currency: 'GBP' } }],
    promotionEvents: [{ snapshot_id: snapshotId, promotion_state: approved ? 'APPROVED_FOR_PROJECTION' : 'REJECTED', created_at: '2026-09-15T14:00:00Z' }], now,
  });
}
test('PT preserves Standard-only history and gives governed PDF Cut precedence', () => {
  assert.equal(select('prestigious-textiles', '24.40', null), 2440);
  assert.equal(select('prestigious-textiles', '10.40', null), 1040);
  assert.equal(select('prestigious-textiles', '24.40', '30.50'), 3050);
  assert.equal(select('prestigious-textiles', '10.40', '13.00'), 1300);
});
test('PT does not derive a Cut Price from Standard Price or use unapproved evidence', () => {
  assert.equal(select('prestigious-textiles', null, '30.50'), 3050);
  assert.equal(select('prestigious-textiles', '24.40', '30.50', false), null);
});
test('unrelated approved PT Cut-only evidence cannot reprice an existing guide', () => {
  const snapshots = [{ snapshot_id: 'hci-daily:4262/770', checked_at: '2026-09-15T13:00:00Z', price_expires_at: null,
    source_type: 'MANUAL_PORTAL', source_name: 'Owner-authorised exact-SKU Webtex aggregate stock observation',
    prices: { standard_trade_price: null, cut_trade_price: '19.00', currency: 'GBP' } }];
  const promotionEvents = [{ snapshot_id: snapshots[0].snapshot_id, promotion_state: 'APPROVED_FOR_PROJECTION', created_at: '2026-09-15T14:00:00Z' }];
  assert.equal(selectCurrentApprovedSupplierCostMinor({ supplierId: 'prestigious-textiles', snapshots, promotionEvents, now }), null);
});
test('SDG keeps its existing approved price basis', () => {
  assert.equal(select('sanderson-design-group', '24.40', '30.50'), 3050);
  assert.equal(select('sanderson-design-group', '24.40', null), null);
});

test('PT uses Cut-only evidence until Standard evidence arrives without mutating source observations', () => {
  const snapshots = [
    { snapshot_id: 'old', checked_at: '2025-08-01T00:00:00Z', price_expires_at: '2025-09-01T00:00:00Z', prices: { standard_trade_price: '24.40', cut_trade_price: null, currency: 'GBP' } },
    { snapshot_id: 'pt-pdf-cut:new', checked_at: '2026-09-15T13:00:00Z', price_expires_at: null, source_type: 'OTHER', source_name: PT_GOVERNED_PDF_CUT_SOURCE, prices: { standard_trade_price: '25.00', cut_trade_price: '31.25', currency: 'GBP' } },
  ];
  const before = JSON.stringify(snapshots);
  const promotionEvents = [{ snapshot_id: 'old', promotion_state: 'APPROVED_FOR_PROJECTION', created_at: '2025-08-01T00:00:00Z' }];
  assert.equal(selectCurrentApprovedSupplierCostMinor({supplierId:'prestigious-textiles',snapshots,promotionEvents,now}),2440);
  promotionEvents.push({snapshot_id:'pt-pdf-cut:new',promotion_state:'APPROVED_FOR_PROJECTION',created_at:'2026-09-15T14:00:00Z'});
  assert.equal(selectCurrentApprovedSupplierCostMinor({supplierId:'prestigious-textiles',snapshots,promotionEvents,now}),3125);
  promotionEvents.push({snapshot_id:'pt-pdf-cut:new',promotion_state:'REJECTED',created_at:'2026-09-15T15:00:00Z'});
  assert.equal(selectCurrentApprovedSupplierCostMinor({supplierId:'prestigious-textiles',snapshots,promotionEvents,now}),2440);
  assert.equal(JSON.stringify(snapshots),before);
});

test('governed PDF Cut preserves the cohort price over newer Standard evidence', () => {
  const snapshots = [
    { snapshot_id: 'new-standard', checked_at: '2026-09-16T13:00:00Z', price_expires_at: null, prices: { standard_trade_price: '31.00', cut_trade_price: null, currency: 'GBP' } },
    { snapshot_id: 'pt-pdf-cut:prior-cut', checked_at: '2026-09-15T13:00:00Z', price_expires_at: null, source_type: 'OTHER', source_name: PT_GOVERNED_PDF_CUT_SOURCE, prices: { standard_trade_price: null, cut_trade_price: '19.00', currency: 'GBP' } },
  ];
  const promotionEvents = snapshots.map((snapshot) => ({ snapshot_id: snapshot.snapshot_id, promotion_state: 'APPROVED_FOR_PROJECTION', created_at: '2026-09-16T14:00:00Z' }));
  assert.equal(selectCurrentApprovedSupplierCostMinor({ supplierId: 'prestigious-textiles', snapshots, promotionEvents, now: new Date('2026-09-17T00:00:00Z') }), 1900);
});
