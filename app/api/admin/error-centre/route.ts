import { NextResponse } from 'next/server';
import { errorCentreStaffAccess } from '@/lib/storefront/review-auth';
import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/storefront/security/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const columns = 'event_id,journey_id,request_id,occurred_at,kind,page_path,name,code,status,release,browser,channel,error_detail';

export async function GET(request: Request) {
  const access = await errorCentreStaffAccess();
  if (access.status !== 200) return NextResponse.json({ error: access.error }, { status: access.status, headers: PRIVATE_NO_STORE_HEADERS });
  const params = new URL(request.url).searchParams;
  const journey = params.get('journey');
  const before = params.get('before');
  const since = params.get('since');
  const days = params.get('days') === '30' ? 30 : 7;
  if ((journey && !uuid.test(journey)) || [before, since].some((value) => value && (!Number.isFinite(Date.parse(value)) || value.length > 40))) {
    return NextResponse.json({ error: 'INVALID_FILTER' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
  }
  try {
    const db = createSupplierServiceClient();
    const periodStart = new Date(Date.now() - days * 86_400_000).toISOString();
    const errorQuery = db.from('customer_journey_events').select(columns).eq('kind', 'ERROR')
      .order('occurred_at', { ascending: false }).limit(51);
    if (before) errorQuery.lt('occurred_at', before);
    const arrivalQuery = db.from('customer_journey_events').select(columns).eq('name', 'VISIT_START')
      .order('occurred_at', { ascending: Boolean(since) }).limit(since ? 100 : 30);
    if (since) arrivalQuery.gt('occurred_at', since);
    const [summary, errors, visits, timeline, slow, alerts, serviceErrors, serviceErrorCount] = await Promise.all([
      db.rpc('customer_journey_summary', { p_days: days }),
      errorQuery,
      arrivalQuery,
      journey ? db.from('customer_journey_events').select(columns).eq('journey_id', journey)
        .order('occurred_at', { ascending: true }).limit(250) : Promise.resolve({ data: [], error: null }),
      db.from('customer_journey_events').select(columns).eq('kind', 'PERFORMANCE')
        .order('occurred_at', { ascending: false }).limit(30),
      db.from('customer_hourly_digests').select('hour_start', { count: 'exact', head: true }).neq('state', 'SENT'),
      db.from('customer_operational_errors').select('error_id,occurred_at,request_id,route_path,code,status,release,source,diagnostic')
        .gte('occurred_at', periodStart).order('occurred_at', { ascending: false }).limit(50),
      db.from('customer_operational_errors').select('error_id', { count: 'exact', head: true }).gte('occurred_at', periodStart),
    ]);
    if (summary.error || errors.error || visits.error || timeline.error || slow.error || alerts.error || serviceErrors.error || serviceErrorCount.error) throw Error('ERROR_CENTRE_QUERY_FAILED');
    return NextResponse.json({ summary: summary.data, errors: errors.data?.slice(0, 50) ?? [],
      nextBefore: (errors.data?.length ?? 0) > 50 ? errors.data?.[49]?.occurred_at : null,
      visits: visits.data ?? [], timeline: timeline.data ?? [], slow: slow.data ?? [], selectedJourney: journey,
      retentionDays: 30, pendingEmailAlerts: alerts.count ?? 0,
      serviceErrors: serviceErrors.data ?? [], serviceErrorCount: serviceErrorCount.count ?? 0,
      emailAlertsConfigured: Boolean(process.env.CRON_SECRET && process.env.RESEND_API_KEY
        && process.env.CURTAINSUK_VISIT_ALERT_EMAIL && process.env.CURTAINSUK_VISIT_ALERT_FROM) }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch {
    console.error('CURTAINSUK_ERROR_CENTRE_QUERY_FAILED');
    return NextResponse.json({ error: 'ERROR_CENTRE_UNAVAILABLE' }, { status: 503, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
