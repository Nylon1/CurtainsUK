import assert from 'node:assert/strict';
import test from 'node:test';

const key = 'cuk-premium-proxy-capability-v1';
const command = { requestId: 'same-request', sessionId: 'same-session', revision: 3, action: { type: 'answer', answerId: 'plain' } };
let fixtureId = 0;

async function withTransport(cached, reply, check, { removeDenied = false } = {}) {
  const originalFetch = globalThis.fetch;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const values = new Map(cached ? [[key, cached]] : []);
  const removed = [];
  const requests = [];
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: name => values.get(name) ?? null,
    setItem: (name, value) => values.set(name, value),
    removeItem: name => { removed.push(name); if (removeDenied) throw Error('Storage denied'); values.delete(name); },
  } });
  globalThis.fetch = async (url, init) => {
    const request = { url: String(url), method: init.method, body: JSON.parse(init.body) };
    requests.push(request);
    return reply(request, requests.length);
  };
  try {
    const transport = await import(`../../components/curtainsuk-premium-proxy-transport.ts?fixture=${++fixtureId}`);
    await check({ transport, requests, values, removed });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage) Object.defineProperty(globalThis, 'sessionStorage', originalStorage);
    else delete globalThis.sessionStorage;
  }
}

test('valid cached capability sends one command without requesting a session', async () => {
  await withTransport('valid', request => {
    assert.match(request.url, /premium-command$/);
    return Response.json({ revision: 4 });
  }, async ({ transport, requests }) => {
    assert.equal((await transport.premiumProxyCommand(command)).status, 200);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body, { capability: 'valid', command });
  });
});

test('stale cached capability is cleared, refreshed once and the exact command retried once', async () => {
  await withTransport('stale', request => request.url.endsWith('premium-session')
    ? Response.json({ capability: 'fresh' })
    : Response.json(request.body.capability === 'stale' ? { error: 'Session expired' } : { revision: 4 },
      { status: request.body.capability === 'stale' ? 401 : 200 }), async ({ transport, requests, values, removed }) => {
    assert.equal(await transport.premiumProxyCapability(), 'stale'); // Prime the in-memory cache.
    assert.equal((await transport.premiumProxyCommand(command)).status, 200);
    assert.deepEqual(requests.map(request => request.url.split('/').at(-1)),
      ['premium-command', 'premium-session', 'premium-command']);
    assert.deepEqual(requests[0].body.command, command);
    assert.deepEqual(requests[2].body.command, command);
    assert.equal(requests[2].body.capability, 'fresh');
    assert.deepEqual(removed, [key]);
    assert.equal(values.get(key), 'fresh');
  });
});

test('a second 401 returns the normal customer-safe error without another retry', async () => {
  const message = 'Your consultation is temporarily unavailable. You can browse fabrics independently.';
  await withTransport('stale', request => request.url.endsWith('premium-session')
    ? Response.json({ capability: 'fresh' })
    : Response.json({ error: message }, { status: 401 }), async ({ transport, requests }) => {
    const response = await transport.premiumProxyCommand(command);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, message);
    assert.deepEqual(requests.map(request => request.url.split('/').at(-1)),
      ['premium-command', 'premium-session', 'premium-command']);
  });
});

test('refresh bypasses stale storage when removal is denied', async () => {
  await withTransport('stale', request => request.url.endsWith('premium-session')
    ? Response.json({ capability: 'fresh' })
    : Response.json({}, { status: request.body.capability === 'stale' ? 401 : 200 }),
  async ({ transport, requests, removed }) => {
    assert.equal((await transport.premiumProxyCommand(command)).status, 200);
    assert.deepEqual(requests.map(request => request.url.split('/').at(-1)),
      ['premium-command', 'premium-session', 'premium-command']);
    assert.deepEqual(removed, [key]);
    assert.equal(requests[2].body.capability, 'fresh');
  }, { removeDenied: true });
});

test('non-401 command failure does not refresh the capability', async () => {
  await withTransport('valid', () => Response.json({ error: 'Temporarily unavailable' }, { status: 503 }),
    async ({ transport, requests, values, removed }) => {
      assert.equal((await transport.premiumProxyCommand(command)).status, 503);
      assert.equal(requests.length, 1);
      assert.equal(values.get(key), 'valid');
      assert.deepEqual(removed, []);
    });
});

test('fresh session still requests a capability before sending one command', async () => {
  await withTransport(null, request => request.url.endsWith('premium-session')
    ? Response.json({ capability: 'fresh' })
    : Response.json({ revision: 1 }), async ({ transport, requests, values }) => {
    assert.equal((await transport.premiumProxyCommand(command)).status, 200);
    assert.deepEqual(requests.map(request => request.url.split('/').at(-1)), ['premium-session', 'premium-command']);
    assert.deepEqual(requests[1].body, { capability: 'fresh', command });
    assert.equal(values.get(key), 'fresh');
  });
});
