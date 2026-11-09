import { createHmac } from 'node:crypto';
import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';
import { parseCheckoutStageInput } from '@/lib/storefront/checkout-stage';
import { readHardLimitedRequestBytes, PUBLIC_NO_STORE_HEADERS } from '@/lib/storefront/security/http';
import { consumeEndpointRateLimit } from '@/lib/storefront/security/endpoint-rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { ...PUBLIC_NO_STORE_HEADERS, 'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

export function OPTIONS() { return new Response(null, { status: 204, headers }); }

export async function POST(request: Request) {
  try {
    if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json')
      return new Response(null, { status: 415, headers });
    const secret = process.env.CURTAINSUK_SHOPIFY_APP_SECRET;
    if (!secret || secret.length < 32) throw Error('CHECKOUT_STAGE_UNCONFIGURED');
    const address = (request.headers.get('x-vercel-forwarded-for') ?? 'unknown').split(',', 1)[0].slice(0, 128);
    const hash = (purpose: string, value: string) => createHmac('sha256', secret).update(`checkout-stage:${purpose}:`).update(value).digest('hex');
    await consumeEndpointRateLimit(hash('rate', address), { limit: 120, windowSeconds: 60 });
    const input = parseCheckoutStageInput(JSON.parse(new TextDecoder().decode(await readHardLimitedRequestBytes(request, 2048))));
    const { error } = await createSupplierServiceClient().from('checkout_stage_events').upsert({
      event_hash: hash('event', input.eventId), checkout_hash: hash('checkout', input.checkoutToken),
      stage: input.stage, product_mix: input.productMix, total_minor: input.totalMinor,
      shipping_minor: input.shippingMinor, has_discount: input.hasDiscount, is_test: input.isTest,
    }, { onConflict: 'event_hash', ignoreDuplicates: true });
    if (error) throw Error('CHECKOUT_STAGE_PERSIST_FAILED');
    return new Response(null, { status: 204, headers });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof Error && /INPUT_INVALID|REQUEST_TOO_LARGE/.test(error.message))
      return new Response(null, { status: 400, headers });
    console.error('CURTAINSUK_CHECKOUT_STAGE_UNAVAILABLE');
    return new Response(null, { status: 503, headers });
  }
}
