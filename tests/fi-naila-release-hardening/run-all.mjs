import { spawnSync } from 'node:child_process';

// Full run is deliberately interactive/explicit. It cannot be started by npm
// test or CI accidentally, and it never mutates supplier or product records.
for (const name of ['CUK_RELEASE_MATRIX_TARGET', 'CUK_RELEASE_MATRIX_OWNER_SESSION',
  'CUK_RELEASE_MATRIX_DIRECT_GATEWAY', 'CUK_RELEASE_MATRIX_HCI_REPO', 'SUPABASE_URL']) {
  if (!process.env[name]) throw Error(`${name} is required for the complete release matrix`);
}
if (process.env.CUK_RELEASE_MATRIX_ALLOW_WRITES !== '1' ||
    process.env.CUK_RELEASE_MATRIX_AUDIT_DB !== '1' ||
    !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
  throw Error('Explicit synthetic-session and read-only audit opt-ins/credentials are required');
}
for (const script of ['matrix.test.mjs', 'run-focused-gateway.mjs', 'run-hci-exhaustive.mjs', 'live-matrix.mjs', 'edge-cases.mjs',
  'palette-influence.mjs', 'naila-full.mjs', 'audit-persisted-history.mjs',
  'validate-results.mjs']) {
  const args = script.endsWith('.test.mjs') ? ['--test', script] : [script];
  const result = spawnSync(process.execPath, args, { cwd: new URL('.', import.meta.url),
    env: process.env, stdio: 'inherit', shell: false });
  if (result.status !== 0) throw Error(`${script} failed with exit code ${result.status}`);
}
