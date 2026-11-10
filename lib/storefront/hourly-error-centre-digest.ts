import 'server-only';
import { Resend } from 'resend';
import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';
import { recordOperationalError } from './operational-error';
import { monitorHealth, type StoredMonitorRun } from './synthetic-monitor';

const dashboardUrl = 'https://curtainsuk-production-api.vercel.app/admin/error-centre';
const routePath = '/api/cron/error-centre-digest';

type Page = { path: string; views: number };
type Channel = { name: string; visits: number };
type ErrorGroup = { code: string; path: string; count: number };
export type HourlyDigestSummary = {
  visits: number; journeys: number; pageViews: number; cartAdds: number; cartViews: number;
  checkoutStarts: number; paidOrders: number; browserErrors: number;
  serviceErrors: number; slowLoads: number;
  topPages: Page[]; channels: Channel[];
  browserErrorGroups: ErrorGroup[]; serviceErrorGroups: ErrorGroup[];
  syntheticHealth?: { state: string; checked: number; failed: number; findings: string[] };
};

export function previousCompletedHour(now = new Date()) {
  const end = new Date(now);
  end.setUTCMinutes(0, 0, 0);
  return new Date(end.getTime() - 3_600_000);
}

const londonTime = (value: Date) => new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London',
}).format(value);

export function formatHourlyDigest(summary: HourlyDigestSummary, hourStart: Date) {
  const hourEnd = new Date(hourStart.getTime() + 3_600_000);
  const topPages = summary.topPages.length
    ? summary.topPages.map((entry) => `- ${entry.path}: ${entry.views}`).join('\n') : '- No recorded page views';
  const channels = summary.channels.length
    ? summary.channels.map((entry) => `- ${entry.name}: ${entry.visits}`).join('\n') : '- No recorded arrival sources';
  const errorLines = (groups: ErrorGroup[]) => groups.length
    ? groups.map((entry) => `- ${entry.code} at ${entry.path}: ${entry.count}`).join('\n')
    : '- None recorded';
  return {
    subject: `CurtainsUK hourly dashboard | ${londonTime(hourStart)}`,
    text: `CurtainsUK Error Centre: ${londonTime(hourStart)} to ${londonTime(hourEnd)}\n\n` +
      `New anonymous visits: ${summary.visits}\nActive anonymous journeys: ${summary.journeys}\n` +
      `Page views: ${summary.pageViews}\n` +
      `Cart additions: ${summary.cartAdds}\nCart visits: ${summary.cartViews}\n` +
      `Checkout starts: ${summary.checkoutStarts}\nPaid orders recorded: ${summary.paidOrders}\n` +
      `Slow loads: ${summary.slowLoads}\nBrowser/API errors: ${summary.browserErrors}\n` +
      `Service errors: ${summary.serviceErrors}\n\n` +
      `Browser/API errors by code and page\n${errorLines(summary.browserErrorGroups)}\n\n` +
      `Service errors by code and route\n${errorLines(summary.serviceErrorGroups)}\n\n` +
      `Scheduled journey checks\n${summary.syntheticHealth
        ? `${summary.syntheticHealth.state}: ${summary.syntheticHealth.checked} checked, ${summary.syntheticHealth.failed} failed.\n${summary.syntheticHealth.findings.map(item => `- ${item}`).join('\n') || '- No open synthetic findings'}`
        : 'Monitoring status unavailable'}\n\n` +
      `Most viewed pages\n${topPages}\n\nArrival sources\n${channels}\n\n` +
      `Open the private dashboard for full error details and journeys: ${dashboardUrl}\n\n` +
      `Visits and page activity include only analytics-consented browsers. Minimal technical fault counts can include browsers without analytics consent. A visit is a browser session, not a verified new customer. Counts reflect events recorded by the end of the hour and may lag late-arriving events.`,
  };
}

/** One delivery per completed hour; the private row and provider key handle retries. */
export async function sendHourlyErrorCentreDigest(hourStart: Date) {
  const db = createSupplierServiceClient();
  const key = hourStart.toISOString();
  const { data: claimed, error: claimError } = await db.rpc('claim_customer_hourly_digest', { p_hour_start: key });
  if (claimError) throw Error('HOURLY_DIGEST_CLAIM_FAILED');
  if (!claimed) return 'already-claimed';
  try {
    const { data, error } = await db.rpc('customer_hourly_digest_summary', { p_hour_start: key });
    if (error || !data) throw Error('HOURLY_DIGEST_SUMMARY_FAILED');
    const [runs, findings, registry] = await Promise.all([
      db.from('customer_synthetic_monitor_runs')
        .select('run_id,attempt,started_at,completed_at,expected_next_at,workflow_sha,source_sha,deployment_sha,deployment_id,report')
        .order('completed_at', { ascending: false }).limit(2),
      db.from('customer_synthetic_findings').select('name,severity,state')
        .eq('state', 'OPEN').order('last_detected_at', { ascending: false }).limit(10),
      db.from('customer_synthetic_check_registry').select('check_id').limit(100),
    ]);
    const syntheticHealth = runs.error || findings.error || registry.error ? undefined : (() => {
      const health = monitorHealth((runs.data ?? []) as StoredMonitorRun[], new Date(),
        (registry.data ?? []).map(row => row.check_id), findings.data ?? []);
      return { state: health.state, checked: health.checked, failed: health.failed,
        findings: (findings.data ?? []).slice(0, 5).map(row => `${row.severity}: ${row.name}`) };
    })();
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.CURTAINSUK_VISIT_ALERT_FROM;
    const to = process.env.CURTAINSUK_VISIT_ALERT_EMAIL;
    if (!apiKey || !from || !to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      throw Error('HOURLY_DIGEST_NOT_CONFIGURED');
    }
    const message = formatHourlyDigest({ ...data as HourlyDigestSummary, syntheticHealth }, hourStart);
    const result = await new Resend(apiKey).emails.send({ from, to: [to], ...message },
      { idempotencyKey: `curtainsuk-hourly-digest/${key}` });
    if (result.error || !result.data?.id) throw Error('HOURLY_DIGEST_DELIVERY_FAILED');
    const { data: receipt, error: receiptError } = await db.from('customer_hourly_digests').update({
      state: 'SENT', sent_at: new Date().toISOString(), provider_email_id: result.data.id,
      failure_code: null,
    }).eq('hour_start', key).eq('state', 'SENDING').select('hour_start').single();
    if (receiptError || !receipt || Date.parse(receipt.hour_start) !== hourStart.getTime())
      throw Error('HOURLY_DIGEST_RECEIPT_FAILED');
    return 'sent';
  } catch (cause) {
    const code = cause instanceof Error && /^HOURLY_DIGEST_[A-Z_]+$/.test(cause.message)
      ? cause.message : 'HOURLY_DIGEST_DELIVERY_FAILED';
    await db.from('customer_hourly_digests').update({ state: 'FAILED', failure_code: code })
      .eq('hour_start', key).eq('state', 'SENDING');
    await recordOperationalError({ routePath, code, status: 503, source: 'HANDLED' });
    throw Error(code);
  }
}
