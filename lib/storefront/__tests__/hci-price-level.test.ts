import assert from 'node:assert/strict';
import test from 'node:test';
import { collectRetailGuideProjection, requiresRetailGuideProjection } from '../hci-price-level-pagination';

test('loads a full price projection only at a governed selection boundary', () => {
  assert.equal(requiresRetailGuideProjection('MID_RANGE', true, false), true);
  assert.equal(requiresRetailGuideProjection('LUXURY', false, true), true);
  assert.equal(requiresRetailGuideProjection('LUXURY', false, false), false);
  assert.equal(requiresRetailGuideProjection(undefined, true, true), false);
});

test('collects every governed price-tier ID beyond the PostgREST row limit', async () => {
  const ids = Array.from({ length: 2_405 }, (_, index) => `fabric-${String(index).padStart(4, '0')}`);
  const calls: Array<[number, number, boolean]> = [];
  const result = await collectRetailGuideProjection(async (from, to, exactCount) => {
    calls.push([from, to, exactCount]);
    return { data: ids.slice(from, to + 1).map((fabric_id) => ({ fabric_id })), error: null, count: exactCount ? ids.length : null };
  });
  assert.deepEqual(result, ids);
  assert.deepEqual(calls, [[0, 999, true], [1_000, 1_999, false], [2_000, 2_404, false]]);
});

test('rejects a partial governed price-tier projection', async () => {
  await assert.rejects(() => collectRetailGuideProjection(async (from, _to, exactCount) => ({
    data: from === 0
      ? Array.from({ length: 1_000 }, (_, index) => ({ fabric_id: `fabric-${index}` }))
      : [],
    error: null,
    count: exactCount ? 1_001 : null,
  })), /RETAIL_GUIDE_PRICE_PROJECTION_INVALID/);
});

test('rejects duplicate or malformed identities', async () => {
  await assert.rejects(() => collectRetailGuideProjection(async () => ({
    data: [{ fabric_id: 'fabric-1' }, { fabric_id: 'fabric-1' }], error: null, count: 2,
  })), /RETAIL_GUIDE_PRICE_PROJECTION_INVALID/);
  await assert.rejects(() => collectRetailGuideProjection(async () => ({
    data: [{ fabric_id: '../fabric-1' }], error: null, count: 1,
  })), /RETAIL_GUIDE_PRICE_PROJECTION_INVALID/);
});
