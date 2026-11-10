import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { verifyGithubMonitorToken } from '@/lib/storefront/github-monitor-oidc';
import { parseMonitorReport } from '@/lib/storefront/synthetic-monitor';
import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/storefront/security/http';
import { recordOperationalError } from '@/lib/storefront/operational-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const identity = await verifyGithubMonitorToken(request.headers.get('authorization'));
    const raw = await request.text();
    if (raw.length > 32_768) return NextResponse.json({ error: 'MONITOR_REPORT_TOO_LARGE' },
      { status: 413, headers: PRIVATE_NO_STORE_HEADERS });
    const report = parseMonitorReport(JSON.parse(raw));
    if (report.runId !== identity.runId || report.attempt !== identity.attempt
      || report.workflowSha !== identity.sha || Date.now() - Date.parse(report.completedAt) > 600_000
      || Date.parse(report.completedAt) > Date.now() + 60_000)
      return NextResponse.json({ error: 'MONITOR_REPORT_INVALID' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    const deploymentSha = /^[a-f0-9]{40}$/.test(process.env.VERCEL_GIT_COMMIT_SHA ?? '')
      ? process.env.VERCEL_GIT_COMMIT_SHA! : null;
    const deploymentId = /^[A-Za-z0-9_-]{1,80}$/.test(process.env.VERCEL_DEPLOYMENT_ID ?? '')
      ? process.env.VERCEL_DEPLOYMENT_ID! : null;
    const { error } = await createSupplierServiceClient().rpc('record_customer_synthetic_run', {
      p_run_id: report.runId, p_attempt: report.attempt, p_started_at: report.startedAt,
      p_completed_at: report.completedAt, p_expected_next_at: report.expectedNextAt,
      p_workflow_sha: report.workflowSha, p_source_sha: report.sourceSha,
      p_deployment_sha: deploymentSha,
      p_deployment_id: deploymentId, p_report: report,
    });
    if (error && error.code !== '23505') throw Error('MONITOR_PERSIST_FAILED');
    if (!error) {
      const critical = report.checks.filter(check => check.status === 'FAIL' && check.severity === 'CRITICAL');
      if (critical.length) {
        try {
          const apiKey = process.env.RESEND_API_KEY;
          const from = process.env.CURTAINSUK_VISIT_ALERT_FROM;
          const to = process.env.CURTAINSUK_VISIT_ALERT_EMAIL;
          if (!apiKey || !from || !to) throw Error('MONITOR_ALERT_NOT_CONFIGURED');
          const result = await new Resend(apiKey).emails.send({ from, to: [to],
            subject: `CurtainsUK critical journey failure | run ${report.runId}`,
            text: `A scheduled customer journey check failed.\n\n${critical.map(check =>
              `- ${check.name} (${check.route}): ${check.reason}`).join('\n')}\n\n` +
              `Source ${report.sourceSha}; deployment ${deploymentId ?? 'unavailable'}.\n` +
              'Review the private Customer Experience dashboard: https://curtainsuk-production-api.vercel.app/admin/error-centre',
          }, { idempotencyKey: `curtainsuk-synthetic-critical/${report.runId}/${report.attempt}` });
          if (result.error || !result.data?.id) throw Error('MONITOR_ALERT_FAILED');
        } catch {
          await recordOperationalError({ routePath: '/api/monitor/journey-health',
            code: 'MONITOR_ALERT_FAILED', status: 503, source: 'HANDLED' });
        }
      }
    }
    return new NextResponse(null, { status: 204, headers: PRIVATE_NO_STORE_HEADERS });
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'MONITOR_AUTH_INVALID')
      return NextResponse.json({ error: 'UNAUTHORISED' }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS });
    if (cause instanceof SyntaxError || cause instanceof Error && cause.message === 'INVALID_MONITOR_REPORT')
      return NextResponse.json({ error: 'MONITOR_REPORT_INVALID' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    await recordOperationalError({ routePath: '/api/monitor/journey-health',
      code: 'MONITOR_INGEST_FAILED', status: 503, source: 'HANDLED', cause });
    return NextResponse.json({ error: 'MONITOR_UNAVAILABLE' }, { status: 503, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
