import { createHmac, timingSafeEqual } from 'node:crypto';
import { ShopifyAppProxyError, verifyShopifyAppProxyQuery } from '../storefront/security/shopify-app-proxy-core';
import { AdvisoryError } from './contracts.mjs';
import { limitedBody } from './http.mjs';

const noStore = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const customerId = /^[1-9][0-9]{0,19}$/;
const allowedShop = 'carpetup.myshopify.com';
const allowedPath = '/apps/curtainsuk-decision';
const storefrontOrigins = new Set(['https://www.curtainsuk.com', `https://${allowedShop}`]);
const deploymentId = /^dpl_[A-Za-z0-9]{12,}$/;

function productionSourceAttested(env: Record<string, string | undefined>, compiledCommit: string | undefined) {
  if (!/^[a-f0-9]{40}$/.test(compiledCommit ?? '')) return false;
  // Git-linked builds have Vercel's commit SHA. For this project's manual CLI
  // releases, the protected SHA is baked into the bundle at build time and
  // checked against the separately staged approved commit at request time.
  return env.VERCEL_GIT_COMMIT_SHA
    ? env.VERCEL_GIT_COMMIT_SHA === compiledCommit
    : deploymentId.test(env.VERCEL_DEPLOYMENT_ID ?? '');
}

function fail(status: number, code: string) { return Response.json({ error: code }, { status, headers: noStore }); }
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function key(value: string | undefined) {
  if (!value || value.length < 32) throw Error('JANE_PROXY_KEY_REQUIRED');
  return value;
}
export function janeOwner(shop: string, id: string, secret: string) {
  if (shop !== allowedShop || !customerId.test(id)) throw Error('JANE_CUSTOMER_REQUIRED');
  const hex = createHmac('sha256', key(secret)).update('curtainsuk:jane:shopify-owner:v1\0').update(shop).update('\0').update(id).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export function janeCsrf(owner: string, bucket: number, secret: string) {
  return createHmac('sha256', key(secret)).update('curtainsuk:jane:csrf:v1\0').update(owner).update('\0').update(String(bucket)).digest('base64url');
}
export function janeBrowserBinding(owner: string, secret: string) {
  return createHmac('sha256', key(secret)).update('curtainsuk:jane:browser-binding:v1\0').update(owner).digest('hex').slice(0, 32);
}
export function janePreviewEnabled(env: Record<string, string | undefined>, compiledCommit = env.VERCEL_GIT_COMMIT_SHA) {
  const prebuilt = !env.VERCEL_GIT_COMMIT_SHA
    && env.VERCEL_PROJECT_ID === 'prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA'
    && /^dpl_[A-Za-z0-9]{12,}$/.test(env.VERCEL_DEPLOYMENT_ID ?? '');
  return env.VERCEL_ENV === 'preview' && env.CURTAINSUK_ADVISORY_PREVIEW === 'true' && env.ADVISORY_SHOPIFY_CHAT_ENABLED === 'true'
    && /^[a-f0-9]{40}$/.test(env.ADVISORY_SHOPIFY_APPROVED_COMMIT ?? '')
    && env.ADVISORY_SHOPIFY_APPROVED_COMMIT === compiledCommit
    && (env.VERCEL_GIT_COMMIT_SHA === compiledCommit || prebuilt);
}
/** Allow a production-path transport trial for explicitly listed synthetic customers only. */
export function janeRestrictedLiveEnabled(env: Record<string, string | undefined>, compiledCommit = env.VERCEL_GIT_COMMIT_SHA) {
  const ids = (env.ADVISORY_SHOPIFY_TEST_CUSTOMER_IDS ?? '').split(',').map(x => x.trim()).filter(Boolean);
  return env.VERCEL_ENV === 'production'
    && env.VERCEL_PROJECT_ID === 'prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA'
    && env.CURTAINSUK_ADVISORY_RESTRICTED_LIVE === 'true'
    && env.ADVISORY_SHOPIFY_CHAT_ENABLED === 'true'
    && productionSourceAttested(env, compiledCommit)
    && compiledCommit === env.ADVISORY_SHOPIFY_APPROVED_COMMIT
    && ids.length > 0 && ids.length <= 10 && ids.every(id => customerId.test(id));
}
/** Public access is a separate, exact-release switch. It never uses the test allowlist. */
export function janePublicEnabled(env: Record<string, string | undefined>, compiledCommit = env.VERCEL_GIT_COMMIT_SHA) {
  return env.VERCEL_ENV === 'production'
    && env.VERCEL_PROJECT_ID === 'prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA'
    && env.ADVISORY_SHOPIFY_PUBLIC_ENABLED === 'true'
    && env.ADVISORY_SHOPIFY_CHAT_ENABLED === 'true'
    && env.ADVISORY_SHOPIFY_PROVIDER === 'openai'
    && env.CURTAINSUK_ADVISORY_RESTRICTED_LIVE !== 'true'
    && productionSourceAttested(env, compiledCommit)
    && compiledCommit === env.ADVISORY_SHOPIFY_APPROVED_COMMIT;
}
export function janeGatewayEnabled(env: Record<string, string | undefined>, compiledCommit = env.VERCEL_GIT_COMMIT_SHA) {
  return janePreviewEnabled(env, compiledCommit) || janeRestrictedLiveEnabled(env, compiledCommit) || janePublicEnabled(env, compiledCommit);
}
type GatewayOptions = {
  env: Record<string, string | undefined>;
  compiledCommit?: string;
  execute: (owner: string, command: unknown) => Promise<unknown>;
  take: (owner: string) => Promise<unknown>;
  now?: () => number;
};
/** Separate from the shared commerce proxy. No Jane request reaches supplier or checkout handlers. */
export function createShopifyJaneGateway({ env, compiledCommit, execute, take, now = Date.now }: GatewayOptions) {
  return async (request: Request) => {
    if (!janeGatewayEnabled(env, compiledCommit)) return new Response(null, { status: 404, headers: noStore });
    if (request.method !== 'GET' && request.method !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED');
    try {
      const signed = verifyShopifyAppProxyQuery(new URL(request.url).search, {
        secret: key(env.CURTAINSUK_SHOPIFY_APP_SECRET), allowedShops: [allowedShop], allowedPathPrefixes: [allowedPath], nowSeconds: Math.floor(now() / 1000), maximumAgeSeconds: 300,
      });
      const id = signed.loggedInCustomerId;
      const allowed = (env.ADVISORY_SHOPIFY_TEST_CUSTOMER_IDS ?? '').split(',').map(x => x.trim()).filter(Boolean);
      if (!id || !customerId.test(id)
        || (!janePublicEnabled(env, compiledCommit)
          && (allowed.length === 0 || allowed.length > 10 || !allowed.includes(id)))) return fail(401, 'CUSTOMER_SIGN_IN_REQUIRED');
      const owner = janeOwner(signed.shop, id, key(env.ADVISORY_OWNER_DERIVATION_KEY));
      const bucket = Math.floor(now() / 600000);
      if (request.method === 'GET') {
        await take(owner);
        return Response.json({ csrf: janeCsrf(owner, bucket, key(env.ADVISORY_CSRF_KEY)), ownerBinding: janeBrowserBinding(owner, key(env.ADVISORY_CSRF_KEY)), expiresAt: (bucket + 1) * 600000 }, { headers: noStore });
      }
      // The signed Shopify query authenticates the proxy request. Vercel can
      // rewrite X-Forwarded-Host to its backend host, so require the browser's
      // exact storefront Origin for mutations instead of that proxy header.
      const origin = request.headers.get('origin');
      if (!origin || !storefrontOrigins.has(origin)) return fail(403, 'ORIGIN_DENIED');
      const supplied = request.headers.get('x-advisory-csrf') ?? '';
      if (!safeEqual(supplied, janeCsrf(owner, bucket, key(env.ADVISORY_CSRF_KEY))) && !safeEqual(supplied, janeCsrf(owner, bucket - 1, key(env.ADVISORY_CSRF_KEY)))) return fail(403, 'CSRF_DENIED');
      if (!request.headers.get('content-type')?.startsWith('application/json')) return fail(415, 'INVALID_INPUT');
      const length = Number(request.headers.get('content-length') ?? '0');
      if (!Number.isFinite(length) || length > 16000) return fail(413, 'INPUT_TOO_LARGE');
      const command: unknown = await limitedBody(request);
      if (!command || typeof command !== 'object' || Array.isArray(command) || (command as { action?: unknown }).action === 'recover') return fail(400, 'INVALID_INPUT');
      await take(owner);
      const result = await execute(owner, command);
      return Response.json(result, { headers: noStore });
    } catch (error) {
      if (error instanceof ShopifyAppProxyError) return fail(401, 'REQUEST_AUTHENTICATION_FAILED');
      if (error instanceof AdvisoryError) return fail(error.status, error.code);
      return fail(503, 'JANE_TEMPORARILY_UNAVAILABLE');
    }
  };
}
