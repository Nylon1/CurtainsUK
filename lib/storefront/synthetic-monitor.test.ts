import assert from 'node:assert/strict';
import { test } from 'node:test';
import { monitorHealth, parseMonitorReport, type StoredMonitorRun } from './synthetic-monitor';

const sha = 'a'.repeat(40);
const base = Date.parse('2026-11-10T12:00:00Z');
const check = (id: string, status: 'PASS' | 'FAIL', severity: 'CRITICAL' | 'HIGH' = 'HIGH') => ({
  id, name: id === 'adviser-auth' ? 'Expected adviser sign in' : 'Guest checkout handoff',
  feature: id === 'adviser-auth' ? 'ADVISERS' : 'CHECKOUT',
  route: id === 'adviser-auth' ? '/pages/meet-our-team' : '/pages/build-my-rooms',
  status, severity, reason: status === 'FAIL' ? 'JOURNEY_CHECK_FAILED' : null,
});
function run(runId: number, offsetHours: number, checkout: 'PASS' | 'FAIL', auth: 'PASS' | 'FAIL' = 'PASS'): StoredMonitorRun {
  const completed = new Date(base + offsetHours * 3_600_000).toISOString();
  const report = parseMonitorReport({ schema: 1, runId, attempt: 1,
    startedAt: new Date(Date.parse(completed) - 60_000).toISOString(), completedAt: completed,
    expectedNextAt: new Date(Date.parse(completed) + 5 * 3_600_000).toISOString(),
    workflowSha: 'b'.repeat(40), sourceSha: sha,
    checks: [check('guest-checkout', checkout, 'CRITICAL'),
      check('adviser-auth', auth), check('home-page', 'PASS')] });
  return { run_id: runId, attempt: 1, started_at: report.startedAt,
    completed_at: report.completedAt, expected_next_at: report.expectedNextAt,
    workflow_sha: report.workflowSha, source_sha: sha,
    deployment_sha: sha, deployment_id: 'dpl_test', report };
}

test('monitor distinguishes failed, recovered, stale and unknown states', () => {
  assert.equal(monitorHealth([], new Date(base)).state, 'UNKNOWN');
  const failed = run(1, 0, 'FAIL');
  assert.equal(monitorHealth([failed], new Date(base + 60_000)).state, 'FAILED');
  assert.equal(monitorHealth([failed], new Date(base + 6 * 3_600_000)).state, 'STALE');
  const recovery = run(2, 4, 'PASS');
  const healthy = monitorHealth([failed, recovery], new Date(base + 4 * 3_600_000 + 60_000));
  assert.equal(healthy.state, 'HEALTHY');
  assert.equal(healthy.incidents.length, 0);
  assert.equal(healthy.lastHealthyAt, recovery.completed_at);
});

test('expected adviser sign-in boundary remains a passing check', () => {
  const result = monitorHealth([run(3, 0, 'PASS', 'PASS')], new Date(base + 60_000));
  assert.equal(result.state, 'HEALTHY');
  assert.equal(result.failed, 0);
});

test('a missing check degrades coverage and extra report fields are dropped', () => {
  const earlier = run(4, 0, 'PASS');
  const latest = run(5, 4, 'PASS');
  latest.report.checks = latest.report.checks.filter(item => item.id !== 'adviser-auth');
  const result = monitorHealth([earlier, latest], new Date(base + 4 * 3_600_000 + 60_000));
  assert.equal(result.state, 'DEGRADED');
  assert.equal(result.missing, 1);
  const report = parseMonitorReport({ ...earlier.report, customerEmail: 'private@example.com',
    checks: earlier.report.checks.map(item => ({ ...item, customerEmail: 'private@example.com' })) });
  assert.doesNotMatch(JSON.stringify(report), /private@example\.com/);
});
