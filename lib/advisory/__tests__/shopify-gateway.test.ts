import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { signShopifyAppProxyQuery } from '../../storefront/security/shopify-app-proxy-core';
import { createShopifyJaneGateway, janeBrowserBinding, janeGatewayEnabled, janeOwner, janePreviewEnabled, janePublicEnabled, janePublicBudgetApproved, janeRestrictedLiveEnabled } from '../shopify-gateway';
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
  ADVISORY_SHOPIFY_PUBLIC_BUDGET_APPROVAL_REFERENCE: 'OWNER_APPROVED_JANE_PUBLIC_BUDGET_20261013',
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
  const bindingA = (await (await handle(new Request(url('123')))).json()).ownerBinding;
  const bindingB = (await (await handle(new Request(url('456')))).json()).ownerBinding;
  assert.match(bindingA, /^[a-f0-9]{32}$/);
  assert.notEqual(bindingA, bindingB);
  assert.equal(bindingA, janeBrowserBinding(janeOwner('carpetup.myshopify.com', '123', env.ADVISORY_OWNER_DERIVATION_KEY), env.ADVISORY_CSRF_KEY));
  assert.deepEqual(Object.keys(await (await handle(new Request(url('123')))).json()).sort(), ['csrf', 'expiresAt', 'ownerBinding']);
  assert.match(janeOwner('carpetup.myshopify.com', '123', env.ADVISORY_OWNER_DERIVATION_KEY), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  const request = (id: string, csrf: string) => handle(new Request(url(id), { method: 'POST', headers: { origin: 'https://www.curtainsuk.com', 'x-forwarded-host': 'www.curtainsuk.com', 'content-type': 'application/json', 'x-advisory-csrf': csrf }, body: JSON.stringify({ action: 'start' }) }));
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
test('manual protected preview needs exact compiled source and deployment identity', () => {
  const compiledCommit = 'c'.repeat(40);
  const manual = { ...env, VERCEL_GIT_COMMIT_SHA: undefined, VERCEL_PROJECT_ID: 'prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA',
    VERCEL_DEPLOYMENT_ID: 'dpl_884S7LrjNc77jLu45RAHViPWKR39', ADVISORY_SHOPIFY_APPROVED_COMMIT: compiledCommit };
  assert.equal(janePreviewEnabled(manual, compiledCommit), true);
  assert.equal(janePreviewEnabled({ ...manual, VERCEL_PROJECT_ID: 'prj_other' }, compiledCommit), false);
  assert.equal(janePreviewEnabled({ ...manual, VERCEL_DEPLOYMENT_ID: undefined }, compiledCommit), false);
  assert.equal(janePreviewEnabled({ ...manual, ADVISORY_SHOPIFY_APPROVED_COMMIT: 'd'.repeat(40) }, compiledCommit), false);
  assert.equal(janePreviewEnabled({ ...manual, VERCEL_ENV: 'production' }, compiledCommit), false);
});
test('restricted production transport is exact-commit and synthetic-owner only', async () => {
  const live = { ...env, VERCEL_ENV: 'production', VERCEL_PROJECT_ID: 'prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA',
    CURTAINSUK_ADVISORY_RESTRICTED_LIVE: 'true' };
  assert.equal(janeRestrictedLiveEnabled(live), true);
  assert.equal(janeGatewayEnabled(live), true);
  for (const changes of [
    { CURTAINSUK_ADVISORY_RESTRICTED_LIVE: 'false' },
    { VERCEL_PROJECT_ID: 'prj_other' },
    { VERCEL_GIT_COMMIT_SHA: 'b'.repeat(40) },
    { ADVISORY_SHOPIFY_APPROVED_COMMIT: 'b'.repeat(40) },
    { ADVISORY_SHOPIFY_TEST_CUSTOMER_IDS: '' },
    { ADVISORY_SHOPIFY_TEST_CUSTOMER_IDS: '123,not-a-customer' },
  ]) {
    const candidate = { ...live, ...changes };
    assert.equal(janeRestrictedLiveEnabled(candidate), false);
    assert.equal((await fixture(candidate).handle(new Request(url()))).status, 404);
  }
  const { handle } = fixture(live);
  assert.equal((await handle(new Request(url('123')))).status, 200);
  assert.equal((await handle(new Request(url('789')))).status, 401);
  assert.equal((await handle(new Request(url('')))).status, 401);
});

test('manual protected deployment needs a baked SHA and real deployment identity', () => {
  const commit = 'c'.repeat(40);
  const manual = { ...env, VERCEL_ENV: 'production', VERCEL_PROJECT_ID: 'prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA',
    VERCEL_GIT_COMMIT_SHA: undefined, VERCEL_DEPLOYMENT_ID: 'dpl_884S7LrjNc77jLu45RAHViPWKR39',
    ADVISORY_SHOPIFY_APPROVED_COMMIT: commit, CURTAINSUK_ADVISORY_RESTRICTED_LIVE: 'true' };
  assert.equal(janeRestrictedLiveEnabled(manual, commit), true);
  assert.equal(janeRestrictedLiveEnabled(manual), false);
  assert.equal(janeRestrictedLiveEnabled({ ...manual, VERCEL_DEPLOYMENT_ID: undefined }, commit), false);
  assert.equal(janeRestrictedLiveEnabled({ ...manual, ADVISORY_SHOPIFY_APPROVED_COMMIT: 'd'.repeat(40) }, commit), false);
  assert.equal(janeRestrictedLiveEnabled({ ...manual, VERCEL_GIT_COMMIT_SHA: 'd'.repeat(40) }, commit), false);
  const publicMode = { ...manual, CURTAINSUK_ADVISORY_RESTRICTED_LIVE: 'false', ADVISORY_SHOPIFY_PUBLIC_ENABLED: 'true', ADVISORY_SHOPIFY_PROVIDER: 'openai' };
  assert.equal(janePublicEnabled(publicMode, commit), true);
  assert.equal(janePublicEnabled({ ...publicMode, VERCEL_DEPLOYMENT_ID: undefined }, commit), false);
});
test('public daily budget requires its exact approval and is independent of a finite date map', () => {
  assert.equal(janePublicBudgetApproved(env), true);
  assert.equal(janePublicBudgetApproved({ ...env, ADVISORY_SHOPIFY_PUBLIC_BUDGET_APPROVAL_REFERENCE: '' }), false);
  assert.equal(janePublicBudgetApproved({ ...env, ADVISORY_SHOPIFY_PUBLIC_BUDGET_APPROVAL_REFERENCE: 'not-approved' }), false);
});
test('public transport needs its separate exact-release switch and retains signed owner isolation', async () => {
  const live = { ...env, VERCEL_ENV: 'production', VERCEL_PROJECT_ID: 'prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA',
    ADVISORY_SHOPIFY_PUBLIC_ENABLED: 'true', ADVISORY_SHOPIFY_PROVIDER: 'openai' };
  assert.equal(janePublicEnabled(live), true);
  const { handle, calls } = fixture(live);
  assert.equal((await handle(new Request(url('789')))).status, 200);
  assert.equal((await handle(new Request(url('')))).status, 401);
  const customerA = await (await handle(new Request(url('789')))).json();
  const customerB = await (await handle(new Request(url('790')))).json();
  assert.notEqual(customerA.ownerBinding, customerB.ownerBinding);
  assert.notEqual(customerA.csrf, customerB.csrf);
  const post = (id: string, csrf: string) => handle(new Request(url(id), { method: 'POST', headers: {
    origin: 'https://www.curtainsuk.com', 'content-type': 'application/json', 'x-advisory-csrf': csrf,
  }, body: JSON.stringify({ action: 'start' }) }));
  assert.equal((await post('790', customerA.csrf)).status, 403);
  assert.equal((await post('790', customerB.csrf)).status, 200);
  assert.equal(calls.length, 1);
  for (const changes of [
    { ADVISORY_SHOPIFY_PUBLIC_ENABLED: 'false' }, { VERCEL_PROJECT_ID: 'prj_other' },
    { VERCEL_GIT_COMMIT_SHA: 'b'.repeat(40) }, { ADVISORY_SHOPIFY_APPROVED_COMMIT: 'b'.repeat(40) },
    { ADVISORY_SHOPIFY_CHAT_ENABLED: 'false' },
    { ADVISORY_SHOPIFY_PROVIDER: 'mock' },
    { ADVISORY_SHOPIFY_PUBLIC_BUDGET_APPROVAL_REFERENCE: '' },
  ]) {
    assert.equal(janePublicEnabled({ ...live, ...changes }), false);
    assert.equal((await fixture({ ...live, ...changes }).handle(new Request(url()))).status, 404);
  }
  assert.equal(janePublicEnabled({ ...live, CURTAINSUK_ADVISORY_RESTRICTED_LIVE: 'true' }), false);
  assert.equal((await fixture({ ...live, CURTAINSUK_ADVISORY_RESTRICTED_LIVE: 'true' }).handle(new Request(url('789')))).status, 401);
});
test('origin, CSRF, content limit and recovery transfer are denied before execution', async () => {
  const { handle, calls } = fixture();
  const csrf = (await (await handle(new Request(url()))).json()).csrf;
  const post = (body: unknown, headers: Record<string, string> = {}) => handle(new Request(url(), { method: 'POST', headers: { origin: 'https://www.curtainsuk.com', 'x-forwarded-host': 'www.curtainsuk.com', 'content-type': 'application/json', 'x-advisory-csrf': csrf, ...headers }, body: JSON.stringify(body) }));
  assert.equal((await post({ action: 'start' }, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await post({ action: 'start' }, { origin: 'https://evil.example' })).status, 403);
  const noForwardedHost = new Headers({ origin: 'https://www.curtainsuk.com', 'content-type': 'application/json', 'x-advisory-csrf': csrf });
  assert.equal((await handle(new Request(url(), { method: 'POST', headers: noForwardedHost, body: JSON.stringify({ action: 'start' }) }))).status, 200);
  const noOrigin = new Headers({ 'x-forwarded-host': 'www.curtainsuk.com', 'content-type': 'application/json', 'x-advisory-csrf': csrf });
  assert.equal((await handle(new Request(url(), { method: 'POST', headers: noOrigin, body: JSON.stringify({ action: 'start' }) }))).status, 403);
  assert.equal((await post({ action: 'start' }, { 'x-advisory-csrf': 'wrong' })).status, 403);
  assert.equal((await post({ action: 'recover' })).status, 400);
  assert.equal((await post({ action: 'start', payload: 'x'.repeat(16000) })).status, 413);
  assert.equal(calls.length, 1);
});
test('signed Shopify ownership reaches the real consultation service and blocks another customer', async () => {
  const store = new MemoryStore();
  const service = createConsultationService({ store, provider: createMockProvider(), catalogue: { lookup: async () => [] } });
  const handle = createShopifyJaneGateway({ env, now: () => now, take: async () => {}, execute: (owner, body) => service.execute(owner, body) });
  const csrf = async (id: string) => (await (await handle(new Request(url(id)))).json()).csrf;
  const post = (id: string, token: string, action: string, sessionId: string | null = null) => handle(new Request(url(id), { method: 'POST', headers: { origin: 'https://www.curtainsuk.com', 'x-forwarded-host': 'www.curtainsuk.com', 'content-type': 'application/json', 'x-advisory-csrf': token }, body: JSON.stringify({ requestId: randomUUID(), sessionId, revision: sessionId ? 0 : null, action, text: null, context: null, consent: action === 'start', recoveryToken: null }) }));
  const a = await csrf('123'), b = await csrf('456');
  const created = await post('123', a, 'start'); assert.equal(created.status, 200);
  const session = (await created.json()).session;
  assert.equal((await post('456', b, 'resume', session.id)).status, 404);
  assert.equal((await post('123', a, 'resume', session.id)).status, 200);
  assert.equal((await post('123', a, 'delete', session.id)).status, 200);
  assert.equal((await post('123', a, 'resume', session.id)).status, 404);
});
test('public AI consultation notice is customer-ready while private trials remain labelled', async () => {
  const input = { requestId: randomUUID(), sessionId: null, revision: null, action: 'start', text: null, context: null, consent: true, recoveryToken: null };
  const owner = janeOwner('carpetup.myshopify.com', '123', env.ADVISORY_OWNER_DERIVATION_KEY);
  const catalogue = { lookup: async () => [] };
  const provider = { kind: 'openai', respond: async () => { throw Error('start must not call model'); } };
  const publicService = createConsultationService({ store: new MemoryStore(), provider, catalogue, publicMode: true });
  const trialService = createConsultationService({ store: new MemoryStore(), provider, catalogue });
  const live = await publicService.execute(owner, input);
  const trial = await trialService.execute(owner, { ...input, requestId: randomUUID() });
  assert.match(live.session.notice, /AI adviser/);
  assert.match(live.session.notice, /availability and prices/);
  assert.match(trial.session.notice, /development consultation/);
});
