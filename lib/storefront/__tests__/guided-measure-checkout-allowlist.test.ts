import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20260929183102_restore_guided_measure_checkout_measurement_allowlist.sql'), 'utf8');
const previousDefinition = readFileSync(join(process.cwd(), 'supabase/migrations/20260915152734_prestigious_standard_price.sql'), 'utf8');
const previousAllowlist = previousDefinition.match(/from jsonb_object_keys\(p_snapshot->'measurements'\)[\s\S]*?where measurement_key\.key not in \(([\s\S]*?)\)/)?.[1];
const replacement = migration.match(/definition := replace\([\s\S]*?original,\s*'''number_of_sections'', ''track_or_pole_fitted''',\s*([\s\S]*?)\s*\);/)?.[1];

test('guarded repair adds exactly the seven Guided Measure keys to the existing measurement allowlist', () => {
  assert.ok(previousAllowlist);
  assert.ok(replacement);
  const priorKeys = [...previousAllowlist.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]);
  const replacementKeys = [...replacement.matchAll(/''([a-z_]+)''/g)].map((match) => match[1]);
  assert.deepEqual(replacementKeys, [
    'number_of_sections', 'track_or_pole_fitted',
    'measurement_contract_version', 'hardware', 'raw_width_cm', 'raw_drop_cm',
    'width_anchor', 'drop_anchor', 'desired_finish',
  ]);
  assert.deepEqual(replacementKeys.slice(0, 2), priorKeys.slice(-2));
  const added = replacementKeys.slice(2);
  assert.equal(new Set(added).size, 7);
  assert.ok(added.every((key) => !priorKeys.includes(key)));
  assert.match(migration, /md5\(original\) <> 'a67cb5f3b2d393e439674282f3c83717'/);
  assert.match(migration, /md5\(definition\) <> 'ec722311cb3a5c03ab6b995c26df45aa'/);
  assert.match(migration, /execute definition;/);
  assert.doesNotMatch(migration, /\b(?:create table|alter table|insert into|update|delete from|drop)\b/i);
});

test('House measurement keys pass the repaired predicate; unknown and private keys remain rejected', () => {
  assert.ok(previousAllowlist);
  assert.ok(replacement);
  const allowed = new Set([
    ...[...previousAllowlist.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]),
    ...[...replacement.matchAll(/''([a-z_]+)''/g)].map((match) => match[1]),
  ]);
  const houseMeasurements = {
    measurement_contract_version: 'guided-measure-v1', hardware: 'TRACK',
    raw_width_cm: 201, raw_drop_cm: 236, width_anchor: 'TRACK_FULL_WIDTH',
    drop_anchor: 'TRACK_BOTTOM_TO_FINISH', desired_finish: 'FLOOR',
  };
  const passesKeyGuard = (value: Record<string, unknown>) => Object.keys(value).every((key) => allowed.has(key));
  assert.equal(passesKeyGuard(houseMeasurements), true);
  assert.equal(passesKeyGuard({ ...houseMeasurements, invented_measurement: 1 }), false);
  assert.equal(passesKeyGuard({ ...houseMeasurements, supplier_cost: 1 }), false);
  assert.match(previousDefinition, /\(p_snapshot->'measurements'\)::text ~\* private_key_pattern/);
  assert.match(previousDefinition, /\(p_snapshot->'customer_summary'\)::text ~\* private_key_pattern/);
  assert.match(previousDefinition, /p_snapshot->'customer_summary'->'measurements' is distinct from p_snapshot->'measurements'/);
  const requiredSummary = previousDefinition.match(/not \(p_snapshot->'customer_summary' \?& array\[([\s\S]*?)\]\)/)?.[1];
  assert.ok(requiredSummary);
  const requiredKeys = [...requiredSummary.matchAll(/'([a-zA-Z]+)'/g)].map((match) => match[1]);
  const validSummary = {
    windowType: 'french-doors', measurements: houseMeasurements,
    fabric: { id: 'sdg-f1681-03', supplier: 'SDG', brand: 'Sanderson', design: 'Acanthus', colour: 'Slate/Dove' },
    heading: 'WAVE', lining: 'BLACKOUT', construction: 'PAIR',
    availability: 'FABRIC_AVAILABLE', vatIncluded: true, deliveryShownSeparately: true,
  };
  assert.ok(requiredKeys.every((key) => key in validSummary));
  const { fabric: _fabric, ...missingFabricSummary } = validSummary;
  assert.equal(requiredKeys.every((key) => key in missingFabricSummary), false);
  assert.match(previousDefinition, /jsonb_typeof\(p_snapshot->'customer_summary'->'measurements'\) <> 'object'/);
  assert.match(previousDefinition, /jsonb_typeof\(p_snapshot->'customer_summary'->'fabric'\) <> 'object'/);
});
