import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const supplied = process.env.CUK_RELEASE_MATRIX_HCI_REPO;
if (!supplied) throw Error('Set CUK_RELEASE_MATRIX_HCI_REPO to the HCI candidate checkout');
const hciRoot = resolve(supplied);
const source = fileURLToPath(new URL('./hci-calibration-exhaustive.test.ts.txt', import.meta.url));
const testFile = join(hciRoot, 'src', 'tests', `release-hardening-${randomUUID()}.test.ts`);
const vitest = join(hciRoot, 'node_modules', 'vitest', 'vitest.mjs');
const resultPath = fileURLToPath(new URL('./_results/exhaustive-local-results.json', import.meta.url));
await stat(vitest);
await mkdir(new URL('./_results/', import.meta.url), { recursive: true });
await copyFile(source, testFile);
try {
  const run = spawnSync(process.execPath, [vitest, 'run', testFile], {
    cwd: hciRoot, env: { ...process.env, CUK_RELEASE_MATRIX_EXHAUSTIVE_RESULT: resultPath },
    stdio: 'inherit', shell: false,
  });
  if (run.error) throw run.error;
  if (run.status !== 0) throw Error(`HCI exhaustive replay failed with exit code ${run.status}`);
} finally {
  await rm(testFile);
}
