import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  PREMIUM_HCI_COOKIE,
  premiumHciCommand,
  premiumHciEnabled,
  premiumHciIntegration,
} from '@/lib/storefront/hci-premium-integration';
import { CUSTOMER_HCI_MAX_AGE, issueCustomerSession, verifyCustomerSession } from '@/lib/storefront/customer-hci-session';
import { retailFabricDetail } from '@/lib/fabric-master/retail-repository';
import { consumeEndpointRateLimit, endpointRateLimitResponse } from '@/lib/storefront/security/endpoint-rate-limit';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/storefront/security/http';
import { readBoundedJson } from '@/lib/storefront/staging-api';

export const maxDuration = 30;

type Access = { owner: string; token?: string };
function response(body: unknown, status = 200, access?: Access) {
  const result = NextResponse.json(body, { status, headers: PRIVATE_NO_STORE_HEADERS });
  if (access?.token)
    result.cookies.set(PREMIUM_HCI_COOKIE, access.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: CUSTOMER_HCI_MAX_AGE,
    });
  return result;
}
async function access(request: Request, allowNew: boolean): Promise<Access> {
  if (!premiumHciEnabled()) throw Error('HCI_DISABLED');
  const secret = process.env.CURTAINSUK_STAGING_REVIEW_SIGNING_SECRET ?? '';
  const current = verifyCustomerSession((await cookies()).get(PREMIUM_HCI_COOKIE)?.value, secret);
  if (current) {
    const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    await consumeEndpointRateLimit(createHash('sha256').update(`cuk-premium-hci-ip:${ip}`).digest('hex'), { limit: 120, windowSeconds: 60 });
    await consumeEndpointRateLimit(createHash('sha256').update(`cuk-premium-hci-owner:${current}`).digest('hex'), { limit: 60, windowSeconds: 60 });
    return { owner: current };
  }
  if (!allowNew) throw Error('HCI_SESSION_REQUIRED');
  const value = issueCustomerSession(secret);
  const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  await consumeEndpointRateLimit(createHash('sha256').update(`cuk-premium-hci-ip:${ip}`).digest('hex'), { limit: 120, windowSeconds: 60 });
  await consumeEndpointRateLimit(createHash('sha256').update(`cuk-premium-hci-owner:${value.owner}`).digest('hex'), { limit: 60, windowSeconds: 60 });
  return { owner: value.owner, token: value.token };
}
function failure(error: unknown, access?: Access) {
  const rate = endpointRateLimitResponse(error);
  if (rate) return response({ error: rate.message }, rate.status, access);
  const code = error instanceof Error ? error.message : '';
  // Keep diagnostics to the controlled error class: never emit request payloads, image bytes or credentials.
  console.error('CurtainsUK premium consultation request failed', { code: code || 'UNKNOWN' });
  const status = code === 'HCI_DISABLED' ? 404 : code === 'HCI_SESSION_REQUIRED' ? 401 : code === 'HCI_ORIGIN_DENIED' ? 403 : code === 'HCI_SESSION_CONFLICT' ? 409 : 503;
  return response({ error: status === 409 ? 'This consultation changed. Resume the saved version or start again.' : 'Your consultation is temporarily unavailable. You can browse fabrics independently.' }, status, access);
}

export async function GET(request: Request) {
  try {
    const customer = await access(request, false);
    const fabric = await retailFabricDetail(new URL(request.url).searchParams.get('fabric') ?? '');
    return response({ fabric }, fabric ? 200 : 404, customer);
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  let customer: Access | undefined;
  try {
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json' || request.headers.get('origin') !== new URL(request.url).origin)
      throw Error('HCI_ORIGIN_DENIED');
    const body = await readBoundedJson(request, 3_000_000);
    const command = premiumHciCommand(body);
    // A new anonymous owner may create only its first session. A supplied session always needs its cookie.
    customer = await access(request, command.sessionId === command.requestId && command.revision === null);
    return response(await premiumHciIntegration(customer.owner, body), 200, customer);
  } catch (error) {
    return failure(error, customer);
  }
}
