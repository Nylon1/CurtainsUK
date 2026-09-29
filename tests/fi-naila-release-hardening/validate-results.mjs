import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = new URL('./_results/', import.meta.url);
const load = async name => JSON.parse(await readFile(new URL(name, root), 'utf8'));
const [matrix, edge, naila, palette, persisted, exhaustive] = await Promise.all([
  load('live-results.json'), load('edge-results.json'), load('naila-full-results.json'),
  load('palette-influence-results.json'), load('persisted-history-results.json'),
  load('exhaustive-local-results.json'),
]);
assert.equal(matrix.status, 'PASS');
assert.equal(edge.verdict, 'PASS');
assert.equal(naila.verdict, 'PASS');
assert.equal(palette.verdict, 'PASS');
assert.equal(persisted.verdict, 'PASS');
assert.equal(exhaustive.verdict, 'PASS');
assert.equal(exhaustive.histories, 4096);
assert.equal(exhaustive.positionReactionPairs, 240);
const cases = matrix.cases.filter(item => /^calibration-\d+$/.test(item.id));
assert.equal(cases.length, 28);
assert.equal(new Set(cases.map(item => item.sequence.join('|'))).size, 28);
assert.deepEqual(new Set(cases.map(item => item.price)),
  new Set(['MID_RANGE', 'LUXURY', 'PREMIUM_LUXURY', 'SUPER_LUXURY']));
assert.equal(cases.filter(item => item.image).length, 2);
assert.equal(cases.filter(item => item.directions).length, 8);
assert.deepEqual(new Set(cases.filter(item => item.directions).map(item => item.directions.feedback)),
  new Set(['LOVE', 'MORE_LIKE_THIS', 'NOT_QUITE', 'NOT_FOR_ME']));
assert.deepEqual(new Set(cases.filter(item => item.directions).map(item => item.directions.feedbackDirection)),
  new Set([1, 2]));
assert.equal(matrix.cases.find(item => item.id === 'naila-owner-resume')?.result, 'PASS');
assert.equal(matrix.rows.find(item => item.label === 'naila:prepared-browse')?.browseSource, 'prepared_hci');
assert.equal(edge.rows.find(item => item.label === 'edge:unsigned-direct-proxy')?.status >= 401, true);
assert.equal(persisted.cases, 28);
assert.equal(persisted.distinctOrderedHistories, 28);
assert.equal(persisted.audits.length, 28);
for (const audit of persisted.audits) {
  assert.equal(audit.revisions.length, 6);
  assert.deepEqual(audit.persistedEventPrefixLengths, [1, 2, 3, 4, 5, 6]);
}
for (const [suite, rows] of [['matrix', matrix.rows], ['edge', edge.rows], ['naila', naila.rows], ['palette', palette.rows]]) {
  for (const row of rows) {
    assert.notEqual(row.status, 'SKIP', `${suite}:${row.label} was skipped`);
    assert.equal(typeof row.roundTripMs, 'number', `${suite}:${row.label} lacks timing`);
    assert.ok(row.roundTripMs <= 20_000, `${suite}:${row.label} exceeded 20 seconds`);
    const intentional = row.label === 'edge:stale-tab-new-request' ? [409]
      : row.label === 'edge:invalid-capability' ? [401]
      : row.label === 'edge:unsigned-direct-proxy' ? [401, 403] : [200];
    assert.ok(intentional.includes(row.status), `${suite}:${row.label} unexpected HTTP ${row.status}`);
  }
}
console.log(JSON.stringify({ verdict: 'PASS', calibrationCases: cases.length,
  savedCalibrationVersions: persisted.audits.length * 6, requestRows:
    matrix.rows.length + edge.rows.length + naila.rows.length + palette.rows.length }));
