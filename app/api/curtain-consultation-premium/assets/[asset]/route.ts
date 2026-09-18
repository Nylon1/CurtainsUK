import { cookies } from 'next/headers';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PREMIUM_HCI_COOKIE, premiumHciEnabled } from '@/lib/storefront/hci-premium-integration';
import { verifyCustomerSession } from '@/lib/storefront/customer-hci-session';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/storefront/security/http';

export async function GET(_: Request, context: { params: Promise<{ asset: string }> }) {
  const { asset } = await context.params;
  if (!premiumHciEnabled() || !/^[a-zA-Z0-9_-]+\.svg$/.test(asset)) return new Response(null, { status: 404 });
  const secret = process.env.CURTAINSUK_STAGING_REVIEW_SIGNING_SECRET ?? '';
  if (!verifyCustomerSession((await cookies()).get(PREMIUM_HCI_COOKIE)?.value, secret)) return new Response(null, { status: 401, headers: PRIVATE_NO_STORE_HEADERS });
  try {
    const body = await readFile(resolve('lib/storefront/hci/visuals', asset), 'utf8');
    return new Response(body, { headers: { ...PRIVATE_NO_STORE_HEADERS, 'Content-Type': 'image/svg+xml', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return new Response(null, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
