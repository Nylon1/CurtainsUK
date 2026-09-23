import assert from 'node:assert/strict';
import test from 'node:test';
import { GUIDE_PRICE_LEVELS, guidePriceLevel, guidePriceLevelDefinition } from '../guide-price-level';

test('locked Price Level bounds are exact, gap-free customer-guide bands', () => {
  for (const amount of [0, 4_999, 5_000, 14_999, 15_000, 24_999, 25_000, 1_000_000]) {
    assert.equal(GUIDE_PRICE_LEVELS.filter((level) => amount >= level.minimumMinor && (level.maximumMinor === null || amount < level.maximumMinor)).length, 1);
  }
  assert.equal(guidePriceLevel('MID_RANGE'), 'MID_RANGE');
  assert.equal(guidePriceLevel('supplier-cost'), null);
  assert.equal(guidePriceLevelDefinition('SUPER_LUXURY')?.minimumMinor, 25_000);
});
