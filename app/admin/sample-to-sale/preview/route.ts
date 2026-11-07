import { createClient } from '@/lib/supabase/server';
import { hasSupplierAdminRole } from '@/lib/supplier-intelligence/authz';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/storefront/security/http';
import { readSampleToSalePilot } from '@/lib/storefront/sample-to-sale-server';
import { sampleToSaleEmail, type FollowUpStage } from '@/lib/storefront/sample-to-sale-email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stages = new Set<FollowUpStage>(['check_in', 'inspiration', 'offer', 'reminder']);
const headers = { ...PRIVATE_NO_STORE_HEADERS, 'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'" };

export async function GET(request: Request) {
  const auth = await createClient();
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user || user.is_anonymous || !hasSupplierAdminRole(user.app_metadata))
    return new Response('Staff sign-in required.', { status: error ? 503 : user ? 403 : 401, headers });
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order');
  const stage = url.searchParams.get('stage') as FollowUpStage | null;
  if (!orderId || !/^gid:\/\/shopify\/Order\/\d+$/.test(orderId) || !stage || !stages.has(stage))
    return new Response('Invalid preview request.', { status: 400, headers });
  try {
    const { candidates } = await readSampleToSalePilot();
    const candidate = candidates.find(item => item.orderId === orderId);
    if (!candidate) return new Response('Sample order is outside the current review window.', { status: 404, headers });
    const email = sampleToSaleEmail(candidate, stage, {
      code: '[UNIQUE CODE]', expiry: '[EXPIRY DATE]',
      unsubscribeUrl: 'https://www.curtainsuk.com/pages/contact',
    });
    const preview = email.html.replace(/(<body[^>]*>)/,
      '$1<div style="position:relative;padding:12px;text-align:center;background:#e6d7aa;color:#173b31;font:700 13px Arial,sans-serif">Staff design preview only. No email sent. The unsubscribe link is a placeholder.</div>');
    return new Response(preview, { headers });
  } catch {
    return new Response('Preview temporarily unavailable.', { status: 503, headers });
  }
}
