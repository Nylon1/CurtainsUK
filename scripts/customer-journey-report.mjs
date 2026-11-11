import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const value = name => process.env[name] || '';
const startedAt = readFileSync('customer-monitor-started-at.txt', 'utf8').trim();
const completedAt = new Date().toISOString();
const expectedNextAt = new Date(Date.parse(completedAt) + 5 * 3_600_000).toISOString();
const checks = [];
// Unavailable coverage stays failing, but must not claim that an unrun checkout
// assertion found a customer-facing defect. Keep IDs stable for later recovery.
const notRunReason = (outcome, needsBrowser) => {
  if (outcome === 'success' || outcome === 'failure') return null;
  if (value('DEPENDENCY_OUTCOME') === 'failure') return 'MONITOR_DEPENDENCY_SETUP_FAILED';
  if (needsBrowser && value('BROWSER_OUTCOME') === 'failure') return 'MONITOR_BROWSER_SETUP_FAILED';
  return 'MONITOR_CHECK_NOT_RUN';
};
const classify = (name, route) => {
  const label = name.toLowerCase();
  if (/checkout|cart|price|order/.test(label)) return ['CHECKOUT', 'CRITICAL'];
  if (/sample/.test(label)) return ['SAMPLES', 'HIGH'];
  if (/coverage/.test(label)) return ['STOREFRONT', 'HIGH'];
  if (/making studio/.test(label)) return ['CURTAINS', 'HIGH'];
  if (/adviser|fiona|naila|jane|specialist/.test(label)) return ['ADVISERS', 'HIGH'];
  if (/roman/.test(label)) return ['ROMANS', 'HIGH'];
  if (/cushion/.test(label)) return ['CUSHIONS', 'HIGH'];
  if (/track/.test(label)) return ['TRACKS', 'HIGH'];
  if (/visualiser/.test(label)) return ['VISUALISER', 'HIGH'];
  if (/fabric|window|design library/.test(label)) return ['DISCOVERY', 'HIGH'];
  if (/\/apps\//.test(route)) return ['BACKEND', 'HIGH'];
  return ['STOREFRONT', 'MEDIUM'];
};
const reason = failures => {
  const message = failures.join(' ').toLowerCase();
  if (/http|status/.test(message)) return 'HTTP_FAILURE';
  if (/blank|error page/.test(message)) return 'CONTENT_UNAVAILABLE';
  if (/frame/.test(message)) return 'FRAME_UNAVAILABLE';
  if (/price/.test(message)) return 'PRICE_UNAVAILABLE';
  if (/adviser|consultation/.test(message)) return 'ADVISER_UNAVAILABLE';
  return 'JOURNEY_CHECK_FAILED';
};
try {
  if (notRunReason(value('SCAN_OUTCOME'), true) && value('SCAN_OUTCOME'))
    throw Error('scan did not run');
  const source = JSON.parse(readFileSync('customer-journey-monitor.json', 'utf8'));
  if (source.schema !== 1 || !Array.isArray(source.checks) || !source.checks.length) throw Error('missing checks');
  for (const row of source.checks) {
    const id = row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const route = new URL(row.route, 'https://www.curtainsuk.com').pathname;
    const [feature, severity] = classify(row.name, route);
    checks.push({ id, name: row.name.replace(/[^A-Za-z0-9 /&().-]/g, '').slice(0, 80),
      feature, route, status: row.status, severity,
      reason: row.status === 'FAIL' ? reason(row.failures || [row.reason || '']) : null });
  }
  checks.push({ id: 'public-journeys', name: 'Public journey monitor output', feature: 'BACKEND',
    route: '/', status: 'PASS', severity: 'CRITICAL', reason: null });
} catch {
  const unavailable = notRunReason(value('SCAN_OUTCOME'), true);
  checks.push({ id: 'public-journeys', name: 'Public journey monitor unavailable', feature: 'BACKEND',
    route: '/', status: 'FAIL', severity: 'CRITICAL', reason: unavailable || 'MONITOR_OUTPUT_MISSING' });
}
for (const [id, name, feature, route, severity, outcome, failure] of [
  ['checkout-contracts', 'Pricing and checkout contracts', 'CHECKOUT', '/pages/build-my-rooms',
    'CRITICAL', value('CONTRACT_OUTCOME'), 'CHECKOUT_CONTRACT_FAILED'],
  ['catalogue-links', 'Catalogue and page links', 'LINKS', '/pages/fabric-library',
    'HIGH', value('SITEMAP_OUTCOME'), 'LINK_SCAN_FAILED'],
]) {
  const unavailable = notRunReason(outcome, id === 'catalogue-links');
  checks.push({ id, name: unavailable ? `${name} not run` : name,
    feature: unavailable ? 'BACKEND' : feature, route, severity,
    status: outcome === 'success' ? 'PASS' : 'FAIL',
    reason: outcome === 'success' ? null : unavailable || failure });
}

const report = { schema: 1, runId: Number(value('GITHUB_RUN_ID')),
  attempt: Number(value('GITHUB_RUN_ATTEMPT')), startedAt, completedAt,
  expectedNextAt, workflowSha: value('GITHUB_SHA'),
  sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), checks };
writeFileSync('customer-journey-report.json', JSON.stringify(report));
console.log(`Prepared monitor heartbeat with ${checks.length} checks; ${checks.filter(check => check.status === 'FAIL').length} failed.`);
