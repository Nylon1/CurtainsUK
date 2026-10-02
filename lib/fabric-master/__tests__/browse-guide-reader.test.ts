import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBrowseGuideMinor } from '../browse-guide-reader';
import { customerBrowseGuide } from '../browse-price-guide';
import { selectCurrentApprovedSupplierCostMinor } from '../verified-supplier-price';

const active = { active_generation: 'governed-generation', next_time_change_at: '2026-10-02T00:00:00Z' };
const now = new Date('2026-09-30T12:00:00Z');
const read = (guide: unknown, source: 'prepared' | 'current' = 'prepared', dirty = false) => {
  const calls: string[] = [];
  return {
    calls,
    reads: {
      control: async () => { calls.push('control'); return source === 'prepared' ? active : null; },
      hasDirtyRows: async () => { calls.push('dirty'); return dirty; },
      prepared: async (fabricId: string, generation: string) => {
        calls.push(`prepared:${fabricId}:${generation}`);
        return { guide_minor: guide };
      },
      current: async (supplier: string, sku: string) => {
        calls.push(`current:${supplier}:${sku}`);
        return { guide_minor: guide };
      },
    },
  };
};

test('owner-confirmed PT Cut guide is the same prepared Browse guide on detail', async () => {
  const fixture = read(8040);
  const amount = await resolveBrowseGuideMinor({ fabricId: 'pt-7245-902', supplierId: 'prestigious-textiles', supplierSku: '7245/902', preparedEnabled: true, now }, fixture.reads);
  assert.equal(customerBrowseGuide(amount)?.amountMinor, 8040);
  assert.deepEqual(fixture.calls, ['control', 'dirty', 'prepared:pt-7245-902:governed-generation']);
  // Builder/checkout uses the same approved PT Cut Price basis as Browse.
  assert.equal(selectCurrentApprovedSupplierCostMinor({ supplierId: 'prestigious-textiles', snapshots: [{ snapshot_id: 'pt-pdf-cut:7245/902', checked_at: now.toISOString(), price_expires_at: null, prices: { standard_trade_price: null, cut_trade_price: 26.8, currency: 'GBP' } }], promotionEvents: [{ snapshot_id: 'pt-pdf-cut:7245/902', promotion_state: 'APPROVED_FOR_PROJECTION', created_at: now.toISOString() }], now }), 2680);
});

test('ordinary PT Standard and SDG Cut guides retain their governed Browse amounts', async () => {
  for (const [supplierId, guide] of [['prestigious-textiles', 6099], ['sanderson-design-group', 7500]] as const) {
    const fixture = read(guide);
    const amount = await resolveBrowseGuideMinor({ fabricId: 'fabric', supplierId, supplierSku: 'SKU', preparedEnabled: true, now }, fixture.reads);
    assert.equal(customerBrowseGuide(amount)?.amountMinor, guide);
    assert.equal(fixture.calls[2], 'prepared:fabric:governed-generation');
  }
});

test('stale prepared generation uses the same current governed guide source as Browse fallback', async () => {
  const fixture = read(6099, 'current');
  const amount = await resolveBrowseGuideMinor({ fabricId: 'pt-ordinary', supplierId: 'prestigious-textiles', supplierSku: 'SKU', preparedEnabled: true, now }, fixture.reads);
  assert.equal(amount, 6099);
  assert.deepEqual(fixture.calls, ['control', 'current:prestigious-textiles:SKU']);
});

test('dirty prepared generation follows Browse fallback', async () => {
  const fixture = read(8040, 'prepared', true);
  const amount = await resolveBrowseGuideMinor({ fabricId: 'pt-7245-902', supplierId: 'prestigious-textiles', supplierSku: '7245/902', preparedEnabled: true, now }, fixture.reads);
  assert.equal(amount, 8040);
  assert.deepEqual(fixture.calls, ['control', 'dirty', 'current:prestigious-textiles:7245/902']);
});

test('an infinite next-change timestamp keeps the prepared generation current', async () => {
  const fixture = read(6099);
  fixture.reads.control = async () => ({ active_generation: 'governed-generation', next_time_change_at: 'infinity' });
  const amount = await resolveBrowseGuideMinor({ fabricId: 'pt-ordinary', supplierId: 'prestigious-textiles', supplierSku: 'SKU', preparedEnabled: true, now }, fixture.reads);
  assert.equal(amount, 6099);
  assert.deepEqual(fixture.calls, ['dirty', 'prepared:pt-ordinary:governed-generation']);
});

test('missing or invalid governed evidence fails closed on detail', async () => {
  for (const guide of [null, undefined, 0, -1, '8040', 80.4, Number.MAX_SAFE_INTEGER + 1]) {
    const fixture = read(guide);
    const amount = await resolveBrowseGuideMinor({ fabricId: 'fabric', supplierId: 'prestigious-textiles', supplierSku: 'SKU', preparedEnabled: true, now }, fixture.reads);
    assert.equal(customerBrowseGuide(amount), null);
  }
});
