import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync('shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-storefront.js', 'utf8');

function requestWith(responses: ((signal: AbortSignal) => Promise<unknown>)[], fastTimeout = false) {
  const calls: AbortSignal[] = [];
  const optionsSeen: Record<string, unknown>[] = [];
  const context = {
    AbortController, DOMException, FormData, TypeError, URL, URLSearchParams,
    setTimeout: (callback: () => void, delay: number) => setTimeout(callback, fastTimeout && delay === 15000 ? 0 : delay),
    clearTimeout,
    location: { origin: 'https://www.curtainsuk.com' },
    document: { querySelectorAll: () => [] },
    window: {},
    fetch: (_url: string, options: { signal: AbortSignal; method?: string }) => {
      calls.push(options.signal);
      optionsSeen.push(options);
      const response = responses.shift();
      assert.ok(response, 'unexpected retry');
      return response(options.signal);
    },
    __browseTest: undefined as undefined | {
      fetchBrowseJson: (url: string, signal: AbortSignal) => Promise<unknown>;
      fetchJson: (url: string) => Promise<unknown>;
      fetchNailaBrowse: (root: unknown, url: string, signal: AbortSignal) => Promise<unknown>;
    },
  };
  const instrumented = source.replace(
    '  document.querySelectorAll("[data-cuk-configurator]").forEach(initConfigurator);',
    '  globalThis.__browseTest = { fetchBrowseJson, fetchJson, fetchNailaBrowse };',
  );
  assert.notEqual(instrumented, source);
  runInNewContext(instrumented, context);
  return { ...context.__browseTest!, calls, optionsSeen };
}

function response(status: number, data: unknown, retryAfter?: string) {
  return async () => ({
    ok: status >= 200 && status < 300, status,
    headers: { get: () => retryAfter ?? null },
    json: async () => data,
  });
}

test('ordinary Browse GET recovers once from a transient 503 and preserves guide data', async () => {
  const data = { fabrics: [{ browseGuide: { amountMinor: 12345, currency: 'GBP', policy: 'curtainsuk-browse-guide-v1' } }] };
  const { fetchBrowseJson, calls, optionsSeen } = requestWith([response(503, {}), response(200, data)]);
  assert.deepEqual(await fetchBrowseJson('https://www.curtainsuk.com/api/catalog', new AbortController().signal), data);
  assert.equal(calls.length, 2);
  assert.equal(optionsSeen[0].method, 'GET');
});

test('final transient failure stops after one retry', async () => {
  const { fetchBrowseJson, calls } = requestWith([response(502, {}), response(503, {})]);
  await assert.rejects(fetchBrowseJson('https://www.curtainsuk.com/api/catalog', new AbortController().signal), /could not be refreshed/);
  assert.equal(calls.length, 2);
});

test('ordinary 4xx and long Retry-After do not retry', async () => {
  for (const [status, after] of [[401, undefined], [403, undefined], [429, '10']] as const) {
    const { fetchBrowseJson, calls } = requestWith([response(status, { error: 'Denied' }, after)]);
    await assert.rejects(fetchBrowseJson('https://www.curtainsuk.com/api/catalog', new AbortController().signal), /Denied/);
    assert.equal(calls.length, 1);
  }
});

test('superseded request aborts its active fetch and cannot retry', async () => {
  const controller = new AbortController();
  const { fetchBrowseJson, calls } = requestWith([signal => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  })]);
  const pending = fetchBrowseJson('https://www.curtainsuk.com/api/catalog', controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].aborted, true);
});

test('network error gets one bounded recovery attempt', async () => {
  const { fetchBrowseJson, calls } = requestWith([async () => { throw new TypeError('offline'); }, response(200, { fabrics: [] })]);
  assert.deepEqual(await fetchBrowseJson('https://www.curtainsuk.com/api/catalog', new AbortController().signal), { fabrics: [] });
  assert.equal(calls.length, 2);
});

test('timed-out Browse GET stops loading after the bounded retry', async () => {
  const never = (signal: AbortSignal) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('timed out', 'AbortError')));
  });
  const { fetchBrowseJson, calls } = requestWith([never, never], true);
  await assert.rejects(fetchBrowseJson('https://www.curtainsuk.com/api/catalog', new AbortController().signal), { name: 'AbortError' });
  assert.equal(calls.length, 2);
  assert.equal(calls.every(signal => signal.aborted), true);
});

test('Fabric Detail and Naila retain their existing one-shot request policy', async () => {
  const detail = requestWith([response(503, { error: 'Detail unavailable' })]);
  await assert.rejects(detail.fetchJson('https://www.curtainsuk.com/apps/curtainsuk-decision/catalog?fabric=pt-1'), /Detail unavailable/);
  assert.equal(detail.calls.length, 1);
  const naila = requestWith([response(503, { error: 'Consultation unavailable' })]);
  const root = {
    dataset: { nailaEnabled: 'true', nailaActive: 'true' },
    cukNailaBrowseProof: async () => ({
      'x-curtainsuk-naila-capability': 'test-capability',
      'x-curtainsuk-naila-session': '123e4567-e89b-42d3-a456-426614174000',
    }),
  };
  await assert.rejects(naila.fetchNailaBrowse(root, 'https://www.curtainsuk.com/apps/curtainsuk-decision/catalog?view=retail&naila=1', new AbortController().signal), /Consultation unavailable/);
  assert.equal(naila.calls.length, 1);
  assert.equal((naila.optionsSeen[0].headers as Record<string, string>)['x-curtainsuk-naila-capability'], 'test-capability');
});
