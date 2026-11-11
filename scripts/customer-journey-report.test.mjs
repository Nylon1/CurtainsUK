import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { monitorHealth, parseMonitorReport } from '../lib/storefront/synthetic-monitor.ts';

const script = fileURLToPath(new URL('./customer-journey-report.mjs', import.meta.url));
const gitDir = execFileSync('git', ['rev-parse', '--absolute-git-dir'], { encoding: 'utf8' }).trim();
const scan = (status = 'PASS') => ({ schema: 1, checks: [
  { name: 'Curtain live price', route: '/pages/curtain-visualiser', status,
    reason: status === 'FAIL' ? 'no usable live curtain price' : null },
] });

function report(env = {}, source) {
  const cwd = mkdtempSync(join(tmpdir(), 'curtainsuk-monitor-report-'));
  try {
    writeFileSync(join(cwd, 'customer-monitor-started-at.txt'), new Date().toISOString());
    if (source !== undefined) writeFileSync(join(cwd, 'customer-journey-monitor.json'), JSON.stringify(source));
    execFileSync(process.execPath, [script], { cwd, env: { ...process.env,
      GIT_DIR: gitDir, GITHUB_RUN_ID: '43055714384', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: 'a'.repeat(40),
      DEPENDENCY_OUTCOME: 'success', BROWSER_OUTCOME: 'success', SCAN_OUTCOME: 'success',
      CONTRACT_OUTCOME: 'success', SITEMAP_OUTCOME: 'success', ...env,
    } });
    return parseMonitorReport(JSON.parse(readFileSync(join(cwd, 'customer-journey-report.json'), 'utf8')));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test('browser setup failure reports unavailable coverage and preserves a passing checkout suite', () => {
  const result = report({ BROWSER_OUTCOME: 'failure', SCAN_OUTCOME: 'skipped', SITEMAP_OUTCOME: 'skipped' });
  assert.equal(result.checks.find(row => row.id === 'checkout-contracts').status, 'PASS');
  const failed = result.checks.filter(row => row.status === 'FAIL');
  assert.equal(failed.length, 2);
  assert.ok(failed.every(row => row.feature === 'BACKEND' && row.reason === 'MONITOR_BROWSER_SETUP_FAILED'));
});

test('the incident from run 43055714384 does not claim skipped checkout assertions failed', () => {
  const result = report({ BROWSER_OUTCOME: 'failure', SCAN_OUTCOME: 'skipped',
    CONTRACT_OUTCOME: 'skipped', SITEMAP_OUTCOME: 'skipped' });
  const checkout = result.checks.find(row => row.id === 'checkout-contracts');
  assert.equal(checkout.reason, 'MONITOR_CHECK_NOT_RUN');
  assert.match(checkout.name, /not run$/);
  assert.equal(checkout.status, 'FAIL');
});

test('dependency setup failure labels every unrun check as unavailable', () => {
  const result = report({ DEPENDENCY_OUTCOME: 'failure', BROWSER_OUTCOME: 'skipped',
    SCAN_OUTCOME: 'skipped', CONTRACT_OUTCOME: 'skipped', SITEMAP_OUTCOME: 'skipped' });
  assert.ok(result.checks.every(row => row.reason === 'MONITOR_DEPENDENCY_SETUP_FAILED'));
});

test('real journey and contract failures retain their customer-facing classifications', () => {
  const result = report({ SCAN_OUTCOME: 'failure', CONTRACT_OUTCOME: 'failure', SITEMAP_OUTCOME: 'failure' }, scan('FAIL'));
  assert.equal(result.checks.find(row => row.id === 'curtain-live-price').reason, 'PRICE_UNAVAILABLE');
  assert.equal(result.checks.find(row => row.id === 'checkout-contracts').reason, 'CHECKOUT_CONTRACT_FAILED');
  assert.equal(result.checks.find(row => row.id === 'checkout-contracts').feature, 'CHECKOUT');
  assert.equal(result.checks.find(row => row.id === 'catalogue-links').reason, 'LINK_SCAN_FAILED');
});

test('missing or empty scan output cannot report healthy coverage', () => {
  for (const source of [undefined, { schema: 1, checks: [] }]) {
    const result = report({}, source);
    assert.equal(result.checks.find(row => row.id === 'public-journeys').reason, 'MONITOR_OUTPUT_MISSING');
  }
});

test('skipped scans ignore leftover output and do not invent a successful scan', () => {
  const result = report({ SCAN_OUTCOME: 'skipped' }, scan());
  assert.equal(result.checks.find(row => row.id === 'public-journeys').reason, 'MONITOR_CHECK_NOT_RUN');
  assert.equal(result.checks.some(row => row.id === 'curtain-live-price'), false);
});

test('a later complete scan clears the missing-output incident', () => {
  const failed = report({ BROWSER_OUTCOME: 'failure', SCAN_OUTCOME: 'skipped', SITEMAP_OUTCOME: 'skipped' });
  const recovered = report({}, scan());
  const stored = report => ({ run_id: report.runId, attempt: report.attempt,
    started_at: report.startedAt, completed_at: report.completedAt, expected_next_at: report.expectedNextAt,
    workflow_sha: report.workflowSha, source_sha: report.sourceSha,
    deployment_sha: report.sourceSha, deployment_id: 'dpl_test', report });
  const health = monitorHealth([stored(failed), stored(recovered)]);
  assert.equal(health.state, 'HEALTHY');
  assert.equal(health.incidents.length, 0);
});
