import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { previousCompletedHour, sendHourlyErrorCentreDigest } from '@/lib/storefront/hourly-error-centre-digest';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/storefront/security/http';
import { retrySampleCreditEmails } from '@/lib/storefront/sample-credit-server';
import { recordOperationalError } from '@/lib/storefront/operational-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization') ?? '';
  const expected = secret ? `Bearer ${secret}` : '';
  if (!secret) return NextResponse.json({ error: 'DIGEST_NOT_CONFIGURED' }, { status: 503, headers: PRIVATE_NO_STORE_HEADERS });
  const valid = supplied.length === expected.length
    && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  if (!valid) return NextResponse.json({ error: 'UNAUTHORISED' }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS });
  try {
    try { await retrySampleCreditEmails(); }
    catch { await recordOperationalError({routePath:'/api/cron/error-centre-digest',code:'SAMPLE_CREDIT_EMAIL_QUEUE_FAILED',source:'HANDLED'}); }
    await sendHourlyErrorCentreDigest(previousCompletedHour());
    return new NextResponse(null, { status: 204, headers: PRIVATE_NO_STORE_HEADERS });
  } catch {
    return NextResponse.json({ error: 'HOURLY_DIGEST_UNAVAILABLE' }, { status: 503, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
