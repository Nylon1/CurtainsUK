import test from 'node:test';
import assert from 'node:assert/strict';
import records from './commercial-records.json';
import type {FabricMasterRecord} from '../types';
import {BROWSE_CURTAIN_EXAMPLE, browseCurtainEstimate} from '../browse-curtain-estimate';
import {toDecisionEngineFabric} from '../decision-engine';
import {calculateProductionMtmCustomerPrice} from '../../storefront/production-pricing';

const record = records.find(r => r.fabric_id === 'pt-4262-770') as FabricMasterRecord;
test('200cm pair guide matches production total including VAT exactly once', () => {
  const estimate = browseCurtainEstimate(record, 2000)!;
  const quote = calculateProductionMtmCustomerPrice({...BROWSE_CURTAIN_EXAMPLE, fabricId:record.fabric_id},
    toDecisionEngineFabric(record, 2000, '2026-10-20'));
  assert.equal(estimate.amountMinor, quote.totalAmountMinor);
  assert.equal(estimate.amountMinor, quote.netAmountMinor! + quote.vatAmountMinor!);
  assert.equal(estimate.includesVat, true);
  assert.equal(estimate.deliveryIncluded, false);
  assert.equal(estimate.construction, 'PAIR');
  assert.equal(estimate.widthCm, 200);
  assert.equal(estimate.dropCm, 200);
  assert.equal(estimate.calculationVersion, quote.calculationVersion);
  assert.ok(!JSON.stringify(estimate).includes('supplierCost'));
});
test('guide uses actual width and repeat, not the browse fabric-price multiplier', () => {
  const plain = {...record, full_width_mm:1400, pattern_match_type:'RANDOM_MATCH' as const, vertical_repeat_mm:0};
  const narrow = {...plain, full_width_mm:1000};
  const repeated = {...plain, pattern_match_type:'STRAIGHT_MATCH' as const, vertical_repeat_mm:640};
  assert.notEqual(browseCurtainEstimate(plain, 2000)?.amountMinor, browseCurtainEstimate(narrow, 2000)?.amountMinor);
  assert.notEqual(browseCurtainEstimate(plain, 2000)?.amountMinor, browseCurtainEstimate(repeated, 2000)?.amountMinor);
});
test('missing or ineligible evidence never produces an invented total', () => {
  for (const cost of [null, 0, -1, NaN, 20.5]) assert.equal(browseCurtainEstimate(record, cost), null);
  assert.equal(browseCurtainEstimate({...record, full_width_mm:null}, 2000), null);
  assert.equal(browseCurtainEstimate({...record, lifecycle_state:'DISCONTINUED'}, 2000), null);
});
