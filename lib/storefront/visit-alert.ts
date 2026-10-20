import 'server-only';
import { Resend } from 'resend';
import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';
import type { JourneyEvent } from './customer-journey';
import { recordOperationalError } from './operational-error';

const dashboardUrl = 'https://curtainsuk-production-api.vercel.app/admin/error-centre';

/** A provider idempotency key and the private journey claim prevent duplicate mail. */
export async function sendVisitAlert(event: JourneyEvent) {
  if (event.name !== 'VISIT_START') return;
  const db = createSupplierServiceClient();
  const { error: claimError } = await db.from('customer_visit_alerts').upsert({
    journey_id: event.journey_id, event_id: event.event_id,
  }, { onConflict: 'journey_id', ignoreDuplicates: true });
  if (claimError) throw Error('VISIT_ALERT_CLAIM_FAILED');
  const { data: claim, error: readError } = await db.from('customer_visit_alerts')
    .select('event_id,state,attempted_at').eq('journey_id', event.journey_id).single();
  if (readError || !claim) throw Error('VISIT_ALERT_CLAIM_FAILED');
  if (claim.event_id !== event.event_id || claim.state === 'SENT') return;
  // Resend retains idempotency keys for 24 hours. Do not retry an ambiguous
  // delivery after that window, when doing so might generate a second email.
  if (claim.attempted_at && Date.now() - Date.parse(claim.attempted_at) > 23 * 60 * 60 * 1000) return;

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CURTAINSUK_VISIT_ALERT_EMAIL;
  const from = process.env.CURTAINSUK_VISIT_ALERT_FROM;
  if (!apiKey || !from || !to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    await db.from('customer_visit_alerts').update({ state: 'FAILED', attempted_at: new Date().toISOString(), failure_code: 'ALERT_NOT_CONFIGURED' })
      .eq('journey_id', event.journey_id).neq('state', 'SENT');
    console.error('CURTAINSUK_VISIT_ALERT_NOT_CONFIGURED');
    await recordOperationalError({ routePath: '/api/staging/shopify-proxy/journey', code: 'VISIT_ALERT_NOT_CONFIGURED', status: 503, source: 'HANDLED' });
    return;
  }
  const resend = new Resend(apiKey);
  const message = {
    from, to: [to], subject: 'New CurtainsUK visit',
    text: `A new anonymous visitor opened ${event.page_path}.\nArrival source: ${event.channel ?? 'Unknown'}.\n\nOpen the private dashboard: ${dashboardUrl}\n\nOnly analytics-consented visits are reported. This is a new browser session, not a verified first-time customer.`,
  };
  try {
    const result = await resend.emails.send(message, { idempotencyKey: `curtainsuk-visit/${event.journey_id}` });
    if (result.error || !result.data?.id) throw Error('VISIT_ALERT_PROVIDER_FAILED');
    const { error: updateError } = await db.from('customer_visit_alerts').update({ state: 'SENT',
      attempted_at: new Date().toISOString(), sent_at: new Date().toISOString(),
      provider_email_id: result.data.id, failure_code: null })
      .eq('journey_id', event.journey_id).neq('state', 'SENT');
    if (updateError) throw Error('VISIT_ALERT_RECEIPT_FAILED');
  } catch {
    await db.from('customer_visit_alerts').update({ state: 'FAILED',
      attempted_at: new Date().toISOString(), failure_code: 'ALERT_DELIVERY_FAILED' })
      .eq('journey_id', event.journey_id).neq('state', 'SENT');
    console.error('CURTAINSUK_VISIT_ALERT_DELIVERY_FAILED', event.journey_id);
    await recordOperationalError({ routePath: '/api/staging/shopify-proxy/journey', code: 'VISIT_ALERT_DELIVERY_FAILED', status: 503, source: 'HANDLED' });
  }
}
