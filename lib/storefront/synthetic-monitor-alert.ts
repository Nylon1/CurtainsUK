import 'server-only';
import { Resend } from 'resend';
import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';

/** The dashboard and alert both use the run's declared next expected time. */
export async function sendMonitorStaleAlert(now = new Date()) {
  const { data, error } = await createSupplierServiceClient().from('customer_synthetic_monitor_runs')
    .select('run_id,completed_at,expected_next_at').order('completed_at', { ascending: false }).limit(1);
  if (error) throw Error('MONITOR_STALE_QUERY_FAILED');
  const latest = data?.[0];
  if (!latest || Date.parse(latest.expected_next_at) >= now.getTime()) return 'current';
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CURTAINSUK_VISIT_ALERT_FROM;
  const to = process.env.CURTAINSUK_VISIT_ALERT_EMAIL;
  if (!apiKey || !from || !to) throw Error('MONITOR_STALE_ALERT_NOT_CONFIGURED');
  const bucket = Math.floor(now.getTime() / (6 * 3_600_000));
  const sent = await new Resend(apiKey).emails.send({ from, to: [to],
    subject: 'CurtainsUK journey monitoring has stopped reporting',
    text: `The scheduled journey monitor missed its expected follow-up. Last completed run: ${latest.completed_at}; expected next run by ${latest.expected_next_at}. Run ${latest.run_id}. Investigate the private Customer Experience dashboard: https://curtainsuk-production-api.vercel.app/admin/error-centre`,
  }, { idempotencyKey: `curtainsuk-synthetic-stale/${latest.run_id}/${bucket}` });
  if (sent.error || !sent.data?.id) throw Error('MONITOR_STALE_ALERT_FAILED');
  return 'sent';
}
