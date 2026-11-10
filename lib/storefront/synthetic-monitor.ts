export type MonitorCheck = {
  id: string; name: string; feature: string; route: string;
  status: 'PASS' | 'FAIL'; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'; reason: string | null;
};
export type MonitorReport = {
  schema: 1; runId: number; attempt: number; startedAt: string; completedAt: string;
  expectedNextAt: string; workflowSha: string; sourceSha: string; checks: MonitorCheck[];
};
export type StoredMonitorRun = { run_id: number; attempt: number; started_at: string;
  completed_at: string; expected_next_at: string; workflow_sha: string; source_sha: string;
  deployment_sha: string | null; deployment_id: string | null; report: MonitorReport };

const code = /^[A-Z][A-Z0-9_]{1,63}$/;
const id = /^[a-z][a-z0-9-]{1,63}$/;
const path = /^\/[a-z0-9/_.-]{0,159}$/i;
const sha = /^[a-f0-9]{40}$/;
const features = new Set(['STOREFRONT', 'DISCOVERY', 'VISUALISER', 'CURTAINS', 'ROMANS',
  'CUSHIONS', 'TRACKS', 'SAMPLES', 'ADVISERS', 'CART', 'CHECKOUT', 'LINKS', 'BACKEND']);
const severities = new Set(['CRITICAL', 'HIGH', 'MEDIUM']);

export function parseMonitorReport(value: unknown): MonitorReport {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('INVALID_MONITOR_REPORT');
  const report = value as Record<string, unknown>;
  const start = Date.parse(String(report.startedAt));
  const end = Date.parse(String(report.completedAt));
  const next = Date.parse(String(report.expectedNextAt));
  if (report.schema !== 1 || !Number.isSafeInteger(report.runId) || Number(report.runId) < 1
    || !Number.isInteger(report.attempt) || Number(report.attempt) < 1 || Number(report.attempt) > 100
    || typeof report.workflowSha !== 'string' || !sha.test(report.workflowSha)
    || typeof report.sourceSha !== 'string' || !sha.test(report.sourceSha)
    || ![start, end, next].every(Number.isFinite) || start > end || end - start > 20 * 60_000
    || next - end < 3 * 3_600_000 || next - end > 6 * 3_600_000
    || !Array.isArray(report.checks) || report.checks.length < 3 || report.checks.length > 100)
    throw Error('INVALID_MONITOR_REPORT');
  const seen = new Set<string>();
  for (const item of report.checks) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw Error('INVALID_MONITOR_REPORT');
    const check = item as Record<string, unknown>;
    if (typeof check.id !== 'string' || !id.test(check.id) || seen.has(check.id)
      || typeof check.name !== 'string' || !/^[A-Za-z0-9 /&().-]{3,80}$/.test(check.name)
      || !features.has(String(check.feature)) || typeof check.route !== 'string' || !path.test(check.route)
      || !['PASS', 'FAIL'].includes(String(check.status)) || !severities.has(String(check.severity))
      || (check.reason !== null && (typeof check.reason !== 'string' || !code.test(check.reason)))
      || (check.status === 'PASS' && check.reason !== null)
      || (check.status === 'FAIL' && check.reason === null)) throw Error('INVALID_MONITOR_REPORT');
    seen.add(check.id);
  }
  return { schema: 1, runId: Number(report.runId), attempt: Number(report.attempt),
    startedAt: String(report.startedAt), completedAt: String(report.completedAt),
    expectedNextAt: String(report.expectedNextAt), workflowSha: String(report.workflowSha),
    sourceSha: String(report.sourceSha),
    checks: report.checks.map((item: MonitorCheck) => ({ id: item.id, name: item.name,
      feature: item.feature, route: item.route, status: item.status,
      severity: item.severity, reason: item.reason })) };
}

export function monitorHealth(runs: StoredMonitorRun[], now = new Date(), expectedIds?: string[],
  persistentFindings?: { severity: string }[]) {
  const ordered = [...runs].sort((a, b) => Date.parse(a.completed_at) - Date.parse(b.completed_at));
  const latest = ordered.at(-1);
  if (!latest) return { state: 'UNKNOWN' as const, latest: null, lastHealthyAt: null,
    incidents: [], checked: 0, passed: 0, failed: 0 };
  const open = new Map<string, { id: string; name: string; feature: string; route: string;
    severity: string; reason: string; occurrences: number; firstDetectedAt: string;
    lastDetectedAt: string; sourceSha: string; deploymentSha: string | null;
    deploymentId: string | null }>();
  for (const run of ordered) {
    for (const check of run.report.checks) {
      if (check.status === 'PASS') { open.delete(check.id); continue; }
      const existing = open.get(check.id);
      open.set(check.id, {
        id: check.id, name: check.name, feature: check.feature, route: check.route,
        severity: check.severity, reason: check.reason!, occurrences: (existing?.occurrences ?? 0) + 1,
        firstDetectedAt: existing?.firstDetectedAt ?? run.completed_at, lastDetectedAt: run.completed_at,
        sourceSha: run.source_sha, deploymentSha: run.deployment_sha, deploymentId: run.deployment_id,
      });
    }
  }
  const checks = latest.report.checks;
  const failed = checks.filter(check => check.status === 'FAIL').length;
  const expected = expectedIds ?? [...new Set(ordered.flatMap(run => run.report.checks.map(check => check.id)))];
  const present = new Set(checks.map(check => check.id));
  const missing = expected.filter(id => !present.has(id)).length;
  const stale = now.getTime() > Date.parse(latest.expected_next_at);
  const findings = persistentFindings ?? [...open.values()];
  const state = stale ? 'STALE'
    : checks.some(check => check.status === 'FAIL' && check.severity === 'CRITICAL')
      || findings.some(finding => finding.severity === 'CRITICAL') ? 'FAILED'
      : failed || findings.length || missing ? 'DEGRADED' : 'HEALTHY';
  const healthy = ordered.filter(run => run.report.checks.every(check => check.status === 'PASS')).at(-1);
  return { state, latest: { startedAt: latest.started_at, completedAt: latest.completed_at,
    expectedNextAt: latest.expected_next_at, workflowSha: latest.workflow_sha,
    sourceSha: latest.source_sha,
    deploymentSha: latest.deployment_sha, deploymentId: latest.deployment_id,
    runId: latest.run_id, attempt: latest.attempt }, lastHealthyAt: healthy?.completed_at ?? null,
  incidents: [...open.values()].sort((a, b) =>
    ['CRITICAL', 'HIGH', 'MEDIUM'].indexOf(a.severity) - ['CRITICAL', 'HIGH', 'MEDIUM'].indexOf(b.severity)),
  checked: checks.length, passed: checks.length - failed, failed, missing };
}
