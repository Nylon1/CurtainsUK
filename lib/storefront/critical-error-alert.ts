import 'server-only';
import { Resend } from 'resend';
import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';

const dashboard = 'https://curtainsuk-production-api.vercel.app/admin/error-centre';
const browserCodes = [
  'API_SERVER_ERROR', 'API_NETWORK_ERROR', 'API_REQUEST_REJECTED',
  'ROOM_FRAME_ABOUT_BLANK', 'ROOM_FRAME_NOT_READY', 'ROOM_FRAME_INACCESSIBLE',
  'ROOM_FRAME_LOAD_ERROR', 'ROOM_FRAME_CHILD_ERROR', 'ROOM_FRAME_GRAPHICS_UNAVAILABLE',
  'ROOM_FRAME_MODULE_UNAVAILABLE', 'ROOM_FRAME_ASSET_UNAVAILABLE',
  'ROOM_FRAME_NETWORK_UNAVAILABLE', 'ROOM_FRAME_RENDER_FAILED',
  'EMBEDDED_FRAME_LOAD_FAILED', 'EMBEDDED_ASSET_FAILED', 'EMBEDDED_EXCEPTION',
  'EMBEDDED_PROMISE_REJECTION',
];
const customerFeatures = new Set([
  'PRICE_CALCULATOR', 'FABRICS', 'ROOM_VISUALISER', 'ROMAN_BLINDS',
  'CUSHION_STUDIO', 'SMART_TRACK_STUDIO', 'DESIGN_MY_HOME',
  'JANE_ADVISOR', 'SPECIALISTS', 'FABRIC_INTELLIGENCE',
  'HANGING_GUIDE', 'HOTEL_STUDIO', 'BEYOND_WINDOWS',
]);
type BrowserEvent = { code: string | null; status: number | null; page_path: string;
  error_detail: { feature?: string } | null };
type ServiceEvent = { code: string; route_path: string };
type Group = { code: string; path: string; count: number };

export function completedTenMinuteWindow(now = new Date()) {
  const end = Math.floor(now.getTime() / 600_000) * 600_000;
  return { start: new Date(end - 600_000), end: new Date(end) };
}

export function criticalGroups(browser: BrowserEvent[], service: ServiceEvent[]) {
  const groups = new Map<string, Group>();
  const add = (code: string, path: string) => {
    const key = `${code}\n${path}`;
    const group = groups.get(key) ?? { code, path, count: 0 };
    group.count += 1;
    groups.set(key, group);
  };
  for (const event of browser) {
    if (!event.code || !customerFeatures.has(event.error_detail?.feature ?? '')) continue;
    add(event.code, event.page_path);
  }
  for (const event of service) {
    if (/^(?:HOURLY_DIGEST_|CRITICAL_ALERT_)/.test(event.code)) continue;
    add(event.code, event.route_path);
  }
  return [...groups.values()].filter(group =>
    !['API_NETWORK_ERROR', 'API_REQUEST_REJECTED'].includes(group.code)
      || group.count >= (group.code === 'API_NETWORK_ERROR' ? 3 : 5))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

export async function sendCriticalErrorAlert(now = new Date()) {
  const { start, end } = completedTenMinuteWindow(now);
  const db = createSupplierServiceClient();
  const [browserResult, serviceResult] = await Promise.all([
    db.from('customer_journey_events').select('code,status,page_path,error_detail')
      .eq('kind', 'ERROR').gte('occurred_at', start.toISOString()).lt('occurred_at', end.toISOString())
      .in('code', browserCodes).limit(2000),
    db.from('customer_operational_errors').select('code,route_path')
      .gte('occurred_at', start.toISOString()).lt('occurred_at', end.toISOString()).limit(500),
  ]);
  if (browserResult.error || serviceResult.error) throw Error('CRITICAL_ALERT_QUERY_FAILED');
  const groups = criticalGroups((browserResult.data ?? []) as BrowserEvent[],
    (serviceResult.data ?? []) as ServiceEvent[]);
  if (!groups.length) return 'none';
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CURTAINSUK_VISIT_ALERT_FROM;
  const to = process.env.CURTAINSUK_VISIT_ALERT_EMAIL;
  if (!apiKey || !from || !to) throw Error('CRITICAL_ALERT_NOT_CONFIGURED');
  const lines = groups.slice(0, 10).map(group =>
    `- ${group.code} at ${group.path}: ${group.count}`).join('\n');
  const result = await new Resend(apiKey).emails.send({ from, to: [to],
    subject: `CurtainsUK customer journey alert | ${start.toISOString().slice(0, 16)} UTC`,
    text: `Customer-facing failures were recorded from ${start.toISOString()} to ${end.toISOString()}.\n\n` +
      `${lines}\n\nInvestigate the private Error Centre: ${dashboard}\n\n` +
      'This is an operational alert, not a count of lost orders. Browser faults may include minimal diagnostics without analytics consent; visit tracking remains consented.' },
  { idempotencyKey: `curtainsuk-critical-alert/${start.toISOString()}` });
  if (result.error || !result.data?.id) throw Error('CRITICAL_ALERT_DELIVERY_FAILED');
  return 'sent';
}
