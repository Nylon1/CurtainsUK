import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = process.env.CUK_RELEASE_MATRIX_GATEWAY_REPO
  ? resolve(process.env.CUK_RELEASE_MATRIX_GATEWAY_REPO)
  : fileURLToPath(new URL('../..', import.meta.url));
const styleTest = 'lib/storefront/__tests__/hci-style-directions.test.ts';
const integrationTest = 'lib/storefront/__tests__/hci-premium-integration.test.ts';
const [styleSource, integrationSource, matrixSource] = await Promise.all([
  readFile(resolve(repo, styleTest), 'utf8'),
  readFile(resolve(repo, integrationTest), 'utf8'),
  readFile(new URL('./live-matrix.mjs', import.meta.url), 'utf8'),
]);
if (!styleSource.includes('trusted HCI feedback validates the full bounded menu and presents its first twelve in order') ||
    !styleSource.includes('an invalid option beyond the visible twelve must still fail closed')) {
  throw Error('Focused 13-to-12 feedback projection/fail-closed regression is missing');
}
if (!integrationSource.includes('direction preparation persists the cumulative HCI state and keeps later cards in the bounded private store')) {
  throw Error('Focused cumulative Direction 2 HCI-state persistence regression is missing');
}
if (!matrixSource.includes('feedbackDirection: i < 4 ? 1 : 2') || !matrixSource.includes("feedback: ['LOVE', 'MORE_LIKE_THIS', 'NOT_QUITE', 'NOT_FOR_ME']")) {
  throw Error('Live matrix must exercise Direction 2 feedback to catch LEARNING_UNEXPOSED_FABRIC');
}
const runner = resolve(repo, 'node_modules/tsx/dist/cli.mjs');
const run = spawnSync(process.execPath, [runner, '--test', styleTest, integrationTest], {
  cwd: repo, stdio: 'inherit', shell: false,
});
if (run.error) throw run.error;
if (run.status !== 0) throw Error(`Focused gateway regressions failed with exit code ${run.status}`);
