import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRetailGuideProjection, requiresRetailGuideProjection } from '../hci-price-level-pagination';

test('loads a full price projection only at a governed selection boundary', () => {
  assert.equal(requiresRetailGuideProjection('MID_RANGE', true, false), true);
  assert.equal(requiresRetailGuideProjection('LUXURY', false, true), true);
  assert.equal(requiresRetailGuideProjection('LUXURY', false, false), false);
  assert.equal(requiresRetailGuideProjection(undefined, true, true), false);
});

test('accepts every governed price-tier ID in a single JSON projection', () => {
  const ids = Array.from({ length: 2_405 }, (_, index) => `fabric-${String(index).padStart(4, '0')}`);
  assert.deepEqual(parseRetailGuideProjection([...ids].reverse()), ids);
});

test('rejects duplicate, malformed, or non-array projections', () => {
  assert.throws(() => parseRetailGuideProjection(['fabric-1', 'fabric-1']), /RETAIL_GUIDE_PRICE_PROJECTION_INVALID/);
  assert.throws(() => parseRetailGuideProjection(['../fabric-1']), /RETAIL_GUIDE_PRICE_PROJECTION_INVALID/);
  assert.throws(() => parseRetailGuideProjection({ fabric_id: 'fabric-1' }), /RETAIL_GUIDE_PRICE_PROJECTION_INVALID/);
});
