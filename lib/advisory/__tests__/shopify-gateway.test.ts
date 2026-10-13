import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { signShopifyAppProxyQuery } from '../../storefront/security/shopify-app-proxy-core';
import { createShopifyJaneGateway, janeOwner, janePreviewEnabled } from '../shopify-gateway';
import { createConsultationService } from '../service.mjs';
import { MemoryStore } from '../store.mjs';
import { createMockProvider } from '../mock-provider.mjs';

const now = Date.UTC(2026, 9, 13, 12);
const secret = 'shopify-app-secret-local-fixture-only-123456789';
const env = {
  VERCEL_ENV: 'preview', CURTAINSUK_ADVISORY_PREVIEW: 'true', ADVISORY_SHOPIFY_CHAT_ENABLED: 'true',
  VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40), ADVISORY_SHOPIFY_APPROVED_COMMIT: 'a'.repeat(40),
  CURTAINSUK_SHOPIFY_APP_SECRET: secret, ADVISORY_OWNER_DERIVATION_KEY: 'owner-key-local-fixture-only-123456789',
  ADVISORY_CSRF_KEY: 'csrf-key-local-fixture-only-123456789', ADVISORY_SHOPIFY_TEST_CUSTOMER_IDS: '123,456',
};
function url(id = '123', timestamp = Math.floor(now / 1000)) {
  const query = new URLSearchParams({ shop: 'carpetup.myshopify.com', path_prefix: '/apps/curtainsuk-decision', timestamp: String(timestamp), logged_in_customer_id: id }).toString();
  return 'https://preview.example/api/staging/shopify-proxy/jane?' + query + '&signature=' + signShopifyAppProxyQuery(query, secret);
}
function fixture(options: Record<string, string | undefined> = {}) {
  const calls: Array<{ owner: string; command: unknown }> = [];
  const limits: string[] = [];
  const handle = createShopifyJaneGateway({ env: { ...env, ...options }, now: () => now,
    take: async owner => { limits.push(owner); },
    execute: async (owner, command) => { calls.push({ owner, command }); return { session: { id: 'synthetic-session' } }; },
  });
  return { handle, calls, limits };
}
test('signed synthetic Shopify customer gets a stable, separate advisory owner and CSRF', async () => {
  const { handle, calls } = fixture();
  const a = await handle(new Request(url('123')));
  const b = await handle(new Request(url('456')));
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  const tokenA = (await a.json()).csrf, tokenB = (await b.json()).csrf;
  assert.notEqual(tokenA, tokenB);
  assert.match(janeOwner('carpetup.myshopify.com', '123', env.ADVISORY_OWNER_DERIVATION_KEY), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  const request = (id: string, csrf: string) => handle(new Request(url(id), { method: 'POST', headers: { origin: 'https://www.curtainsuk.com', 'content-type': 'application/json', 'x-advisory-csrf': csrf }, body: JSON.stringify({ action: 'start' }) }));
  assert.equal((await request('123', tokenA)).status, 200);
  assert.equal((await request('456', tokenA)).status, 403);
  assert.equal((await request('456', tokenB)).status, 200);
  assert.equal(calls.length, 2); assert.notEqual(calls[0].owner, calls[1].owner);
});
test('production, mismatched commit, guest and unsigned requests fail closed', async () => {
  assert.equal(janePreviewEnabled({ ...env, VERCEL_ENV: 'production' }), false);
  for (const change of [{ VERCEL_ENV: 'production' }, { ADVISORY_SHOPIFY_APPROVED_COMMIT: 'b'.repeat(40) }, { ADVISORY_SHOPIFY_CHAT_ENABLED: 'false' }]) {
    const { handle, limits } = fixture(change);
    assert.equal((await handle(new Request(url()))).status, 404); assert.equal(limits.length, 0);
  }
  const { handle, calls } = fixture();
  assert.equal((await handle(new Request(url('')))).status, 401);
  assert.equal((await handle(new Request(url('789')))).status, 401);
  assert.equal((await handle(new Request(url('123', Math.floor(now / 1000) - 600)))).status, 401);
  assert.equal((await handle(new Request(url().replace(/signature=[a-f0-9]+/, 'signature=' + '0'.repeat(64))))).status, 401);
  assert.equal(calls.length, 0);
});
test('origin, CSRF, content limit and recovery transfer are denied before execution', async () => {
  const { handle, calls } = fixture();
  const csrf = (await (await handle(new Request(url()))).json()).csrf;
  const post = (body: unknown, headers: Record<string, string> = {}) => handle(new Request(url(), { method: 'POST', headers: { origin: 'https://www.curtainsuk.com', 'content-type': 'application/json', 'x-advisory-csrf': csrf, ...headers }, body: JSON.stringify(body) }));
  assert.equal((await post({ action: 'start' }, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await post({ action: 'start' }, { 'x-advisory-csrf': 'wrong' })).status, 403);
  assert.equal((await post({ action: 'recover' })).status, 400);
  assert.equal((await post({ action: 'start', payload: 'x'.repeat(16000) })).status, 413);
  assert.equal(calls.length, 0);
});
test('signed Shopify ownership reaches the real consultation service and blocks another customer', async () => {
  const store = new MemoryStore();
  const service = createConsultationService({ store, provider: createMockProvider(), catalogue: { lookup: async () => [] } });
  const handle = createShopifyJaneGateway({ env, now: () => now, take: async () => {}, execute: (owner, body) => service.execute(owner, body) });
  const csrf = async (id: string) => (await (await handle(new Request(url(id)))).json()).csrf;
  const post = (id: string, token: string, action: string, sessionId: string | null = null) => handle(new Request(url(id), { method: 'POST', headers: { origin: 'https://www.curtainsuk.com', 'content-type': 'application/json', 'x-advisory-csrf': token }, body: JSON.stringify({ requestId: randomUUID(), sessionId, revision: sessionId ? 0 : null, action, text: null, context: null, consent: action === 'start', recoveryToken: null }) }));
  const a = await csrf('123'), b = await csrf('456');
  const created = await post('123', a, 'start'); assert.equal(created.status, 200);
  const session = (await created.json()).session;
  assert.equal((await post('456', b, 'resume', session.id)).status, 404);
  assert.equal((await post('123', a, 'resume', session.id)).status, 200);
  assert.equal((await post('123', a, 'delete', session.id)).status, 200);
  assert.equal((await post('123', a, 'resume', session.id)).status, 404);
});
