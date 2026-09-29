import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { verifyPersistedCalibration } from './persisted-history.mjs';

if (process.env.CUK_RELEASE_MATRIX_AUDIT_DB !== '1') {
  throw Error('Set CUK_RELEASE_MATRIX_AUDIT_DB=1 for the read-only saved-version audit');
}
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw Error('Supply SUPABASE_URL and an authorised Supabase service key through the environment');
const root = new URL('./_results/', import.meta.url);
const run = JSON.parse(await readFile(new URL('live-results.json', root), 'utf8'));
if (run.status !== 'PASS') throw Error('The live matrix must pass before auditing saved state');
const cases = run.cases.filter(item => /^calibration-\d+$/.test(item.id));
const sequences = cases.map(item => item.sequence.join('|'));
if (cases.length !== 28 || new Set(sequences).size !== 28) {
  throw Error('Expected 28 distinct ordered six-reaction histories');
}
const db = createClient(url, key, {
  db: { schema: 'curtainsuk_private' },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const audits = [];
for (const testCase of cases) {
  const session = run.sessionIndex.find(item => item.label === testCase.id);
  if (!session?.sessionId) throw Error(`${testCase.id}: synthetic session ID missing`);
  const start = testCase.calibration.startingRevision;
  const { data, error } = await db.from('hci_staging_versions')
    .select('revision,private_state')
    .eq('session_id', session.sessionId)
    .gte('revision', start + 1).lte('revision', start + 6)
    .order('revision', { ascending: true });
  if (error) throw Error(`${testCase.id}: private version read failed: ${error.code || 'UNKNOWN'}`);
  audits.push(verifyPersistedCalibration(testCase, data || []));
}
// Never write a capability, private state, owner ID, or full customer view.
await writeFile(new URL('persisted-history-results.json', root), JSON.stringify({
  checkedAt: new Date().toISOString(), verdict: 'PASS', cases: audits.length,
  distinctOrderedHistories: sequences.length, audits,
}, null, 2));
console.log(JSON.stringify({ verdict: 'PASS', cases: audits.length, savedVersions: audits.length * 6 }));
