import assert from 'node:assert/strict';
import test from 'node:test';
import { fabricReadiness } from '../../fabric-master/readiness';
import { fiCommercialReadiness, fiEvidenceBatches, FI_COMMERCIAL_EVIDENCE_RPC } from '../hci-fi-commercial-evidence';
import type { RetailDirectionCandidate } from '../hci-style-direction-eligibility';

function record(id: string, lifecycle_state = 'CURRENT'): RetailDirectionCandidate {
  return {
    fabric_id: id, supplier_id: 'fixture-supplier', supplier_sku: id,
    brand_name: 'Fixture', design_name: id, colour_name: 'Blue',
    lifecycle_state, staging_catalog_visible: true,
    imagery: ['https://cdn.shopify.com/fixture.jpg'], usable_width_mm: 1400,
    full_width_mm: 1400, pattern_match_type: 'STRAIGHT_MATCH',
  } as RetailDirectionCandidate;
}

test('bounds a full Luxury-sized cohort without dropping or duplicating identities', () => {
  const ids = Array.from({ length: 6_697 }, (_, i) => `fixture-${i}`);
  const batches = fiEvidenceBatches(ids);
  assert.equal(batches.length, 28);
  assert(batches.every((batch) => batch.length <= 240));
  assert.deepEqual(batches.flat(), ids);
  assert.throws(() => fiEvidenceBatches(['fixture-1', 'fixture-1']), /FI_COMMERCIAL_IDENTITY_INVALID/);
});

test('projects every identity in a full cohort through the unchanged readiness predicate', async () => {
  const records = Array.from({ length: 6_697 }, (_, i) => record(`fixture-${i}`));
  let calls = 0;
  const actual = await fiCommercialReadiness(records, async (_name, { p_ids }) => {
    calls += 1;
    return {
      data: p_ids.map((fabric_id, index) => ({
        fabric_id,
        stock: index % 3 === 0 ? 'FABRIC_AVAILABLE' : 'TEMPORARILY_UNAVAILABLE',
        stale: false,
        sample_stock_available: true,
        price_confirmed: index % 5 !== 0,
      })),
      error: null,
    };
  });
  assert.equal(calls, 28);
  assert.equal(actual.size, records.length);
  for (const item of records) assert(actual.has(item.fabric_id));
});

test('uses the existing readiness predicate for available, stale, missing and discontinued evidence', async () => {
  const records = [record('available'), record('stale'), record('missing'), record('discontinued', 'DISCONTINUED')];
  const evidence = new Map([
    ['available', { fabric_id: 'available', stock: 'FABRIC_AVAILABLE', stale: false, sample_stock_available: true, price_confirmed: true }],
    ['stale', { fabric_id: 'stale', stock: 'AVAILABILITY_TO_BE_CONFIRMED', stale: true, sample_stock_available: false, price_confirmed: true }],
    ['discontinued', { fabric_id: 'discontinued', stock: 'NO_LONGER_AVAILABLE', stale: false, sample_stock_available: false, price_confirmed: true }],
  ]);
  let calls = 0;
  const actual = await fiCommercialReadiness(records, async (name, { p_ids }) => {
    assert.equal(name, FI_COMMERCIAL_EVIDENCE_RPC);
    calls += 1;
    return { data: p_ids.flatMap((id) => evidence.has(id) ? [evidence.get(id)] : []), error: null };
  });
  assert.equal(calls, 1);
  for (const item of records) {
    const row = evidence.get(item.fabric_id);
    assert.deepEqual(actual.get(item.fabric_id), fabricReadiness(item, {
      stock: row?.stock as never, stale: row?.stale,
      sampleStockAvailable: row?.sample_stock_available, priceConfirmed: row?.price_confirmed,
    }));
  }
  assert.equal(actual.get('available')?.orderReady, true);
  for (const id of ['stale', 'missing', 'discontinued']) assert.equal(actual.get(id)?.orderReady, false);
});

test('fails closed on incomplete response shape or database failure', async () => {
  const rows = [record('fixture-1')];
  await assert.rejects(fiCommercialReadiness(rows, async () => ({ data: [{ fabric_id: '../wrong' }], error: null })), /FI_COMMERCIAL_EVIDENCE_INVALID/);
  await assert.rejects(fiCommercialReadiness(rows, async () => ({ data: null, error: 'database failure' })), /FI_COMMERCIAL_EVIDENCE_UNAVAILABLE/);
});
