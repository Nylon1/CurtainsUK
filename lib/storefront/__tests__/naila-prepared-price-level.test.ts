import assert from 'node:assert/strict';
import test from 'node:test';
import { GUIDE_PRICE_LEVELS, type GuidePriceLevel } from '@/lib/fabric-master/guide-price-level';
import { NAILA_PREPARED_PRICE_RPC, priceLevelEligibilityReader, readNailaPreparedPriceLevelIds } from '../naila/prepared-price-level';

test('Naila passes all four existing price boundaries to only its prepared RPC', async () => {
  for (const level of GUIDE_PRICE_LEVELS) {
    const names: string[] = [];
    const result = await readNailaPreparedPriceLevelIds(level.id, async (name, parameters) => {
      names.push(name);
      assert.deepEqual(parameters, { p_guide_min: level.minimumMinor, p_guide_max: level.maximumMinor });
      return { data: ['fabric-2', 'fabric-1'], error: null };
    });
    assert.deepEqual(names, [NAILA_PREPARED_PRICE_RPC]);
    assert.deepEqual(result, ['fabric-1', 'fabric-2']);
  }
});

test('ordinary premium keeps its existing reader, including when Naila is available', async () => {
  const calls: string[] = [];
  const ordinary = async (_level: GuidePriceLevel) => { calls.push('ordinary'); return ['fabric-ordinary']; };
  const prepared = async (_level: GuidePriceLevel) => { calls.push('naila'); return ['fabric-naila']; };
  assert.deepEqual(await priceLevelEligibilityReader(false, ordinary, prepared)('MID_RANGE'), ['fabric-ordinary']);
  assert.deepEqual(calls, ['ordinary']);
  assert.deepEqual(await priceLevelEligibilityReader(true, ordinary, prepared)('MID_RANGE'), ['fabric-naila']);
  assert.deepEqual(calls, ['ordinary', 'naila']);
});

test('Naila fails closed on missing, failed or malformed prepared data', async () => {
  const ordinary = async (_level: GuidePriceLevel) => { throw Error('ordinary fallback was called'); };
  const cases = [
    { data: null, error: { message: 'missing projection' } },
    { data: null, error: null },
    { data: ['fabric-1', 'fabric-1'], error: null },
  ];
  for (const response of cases) {
    const prepared = (level: GuidePriceLevel) => readNailaPreparedPriceLevelIds(level, async () => response);
    await assert.rejects(priceLevelEligibilityReader(true, ordinary, prepared)('LUXURY'), /NAILA_PREPARED_PRICE_UNAVAILABLE/);
  }
});
