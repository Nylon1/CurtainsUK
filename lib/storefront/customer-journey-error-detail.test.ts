import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { randomUUID } from 'node:crypto';
import { parseJourneyBatch, safeOperationalDiagnostic } from './customer-journey';

test('storefront sends useful browser and API details without leaking messages or URL queries', async () => {
  const source = readFileSync(join(process.cwd(), 'shopify-theme/curtainsuk-dawn-16/assets/customer-journey.js'), 'utf8');
  const listeners: Record<string, (event: unknown) => void> = {};
  const documentListeners: Record<string, (event: any) => void> = {};
  const requests: string[] = [];
  const storage = new Map<string, string>();
  const location = { origin: 'https://www.curtainsuk.com', hostname: 'www.curtainsuk.com',
    href: 'https://www.curtainsuk.com/pages/fabric-library?email=private@example.com' };
  const window = {
    Shopify: { customerPrivacy: { analyticsProcessingAllowed: () => true } },
    fetch: (url: string, options: { body: string; method?: string }) => {
      if (url.endsWith('/journey')) { requests.push(options.body); return Promise.resolve({ ok: true, status: 200 }); }
      if (url.endsWith('/jane')) return Promise.reject(new TypeError('Failed to fetch'));
      if (url.endsWith('/price')) return Promise.resolve({ ok: false, status: 400,
        headers: { get: () => 'CONFIGURATION_INVALID' } });
      return Promise.resolve({ ok: false, status: 503 });
    },
    addEventListener: (name: string, callback: (event: unknown) => void) => { listeners[name] = callback; },
  };
  runInNewContext(source, { window, location, URL, Promise,
    document: { readyState: 'complete', referrer: '', addEventListener: (name: string, callback: (event: any) => void) => { documentListeners[name] = callback; } },
    sessionStorage: { getItem: (key: string) => storage.get(key) || null,
      setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) },
    crypto: { randomUUID }, navigator: {}, performance: { getEntriesByType: () => [], now: () => 0 },
    setInterval: () => 1, clearInterval: () => {}, setTimeout: () => 1, clearTimeout: () => {} });
  const reason = new TypeError("Cannot read properties of undefined (reading 'private@example.com')");
  reason.stack = `TypeError: ${reason.message}\n at https://cdn.shopify.com/s/files/1/123/assets/curtainsuk-browse-filters.js?token=private:42:7\n at https://www.curtainsuk.com/cdn/shop/t/123/assets/other.js?v=secret:11:2`;
  listeners.unhandledrejection({ reason });
  assert.equal(requests.length, 1);
  assert.doesNotMatch(requests[0], /private@example\.com|token=private/);
  const body = JSON.parse(requests[0]);
  const events = parseJourneyBatch(body, 'Chrome/120');
  const error = events.find((event) => event.kind === 'ERROR');
  assert.equal(error?.code, 'PROMISE_REJECTION');
  assert.deepEqual(error?.error_detail, { type: 'TypeError', message: 'PROPERTY_READ_UNDEFINED',
    script: 'curtainsuk-browse-filters.js', line: 42, column: 7, origin: 'THEME', feature: 'FABRICS',
    messageText: "Cannot read properties of undefined (reading '[value]')",
    frames: [{ script: 'curtainsuk-browse-filters.js', line: 42, column: 7, origin: 'THEME' },
      { script: 'other.js', line: 11, column: 2, origin: 'THEME' }], reasonCode: null, request: null });
  await window.fetch('https://curtainsuk-production-api.vercel.app/api/curtain-consultation-premium?email=private@example.com', { body: '' });
  await Promise.resolve();
  assert.equal(requests.length, 2);
  assert.doesNotMatch(requests[1], /private@example\.com/);
  const apiEvents = parseJourneyBatch(JSON.parse(requests[1]), 'Chrome/120');
  assert.deepEqual(apiEvents[0].error_detail, { type: 'HttpError', message: 'HTTP_SERVER_ERROR',
    script: null, line: null, column: null, origin: 'APP', feature: 'FABRIC_INTELLIGENCE',
    messageText: null, frames: [], reasonCode: null, request: { method: 'GET', route: '/api/curtain-consultation-premium' } });
  await assert.rejects(window.fetch('https://curtainsuk-production-api.vercel.app/api/staging/shopify-proxy/jane', { body: '' }), /Failed to fetch/);
  await Promise.resolve();
  const rejected = parseJourneyBatch(JSON.parse(requests[2]), 'Chrome/120');
  assert.deepEqual(rejected[0].error_detail, { type: 'NetworkError', message: 'NETWORK_REQUEST_FAILED',
    script: null, line: null, column: null, origin: 'APP', feature: 'JANE_ADVISOR',
    messageText: 'Failed to fetch', frames: [], reasonCode: null, request: { method: 'GET', route: '/api/staging/shopify-proxy/jane' } });
  await window.fetch('https://www.curtainsuk.com/apps/curtainsuk-decision/price', { method: 'POST', body: '' });
  await Promise.resolve();
  const price = parseJourneyBatch(JSON.parse(requests[3]), 'Chrome/120');
  assert.equal(price[0].error_detail?.reasonCode, 'CONFIGURATION_INVALID');
  assert.deepEqual(price[0].error_detail?.request,
    { method: 'POST', route: '/apps/curtainsuk-decision/price' });
  const shopifyError = new TypeError('Failed to fetch');
  shopifyError.stack = 'TypeError: Failed to fetch\n at https://www.curtainsuk.com/cdn/shop/t/123/assets/shop_events_listener-4e26a9ce.js:1:7379';
  listeners.unhandledrejection({ reason: shopifyError });
  const shopify = parseJourneyBatch(JSON.parse(requests[4]), 'Chrome/120');
  assert.equal(shopify[0].error_detail?.origin, 'SHOPIFY');
  location.href = 'https://www.curtainsuk.com/pages/room-visualiser?fabric=private-value';
  documentListeners['curtainsuk:room-frame-error']({ detail: { reason: 'ROOM_FRAME_ABOUT_BLANK' } });
  const frame = parseJourneyBatch(JSON.parse(requests[5]), 'Chrome/120');
  assert.equal(frame[0].code, 'ROOM_FRAME_ABOUT_BLANK');
  assert.deepEqual(frame[0].error_detail?.request,
    { method: 'GET', route: '/apps/curtainsuk-decision/room-visualiser' });
  assert.doesNotMatch(requests[5], /private-value/);
});

test('server rejects free-form error detail that could contain customer data', () => {
  assert.throws(() => parseJourneyBatch({ journeyId: randomUUID(), events: [{ eventId: randomUUID(),
    kind: 'ERROR', name: 'BROWSER_ERROR', pagePath: '/', code: 'PROMISE_REJECTION', status: null,
    release: 'journey-20261020-v2', channel: null, detail: { type: 'TypeError',
      message: 'private@example.com', script: null, line: 42, column: 7,
      origin: 'THEME', feature: 'GENERAL' } }] }, 'Chrome/120'), /JOURNEY_INPUT_INVALID/);
  assert.throws(() => parseJourneyBatch({ journeyId: randomUUID(), events: [{ eventId: randomUUID(),
    kind: 'ERROR', name: 'BROWSER_ERROR', pagePath: '/', code: 'PROMISE_REJECTION', status: null,
    release: 'journey-20261021-v3', channel: null, detail: { type: 'TypeError', message: 'NETWORK_REQUEST_FAILED',
      script: null, line: null, column: null, origin: 'UNKNOWN', feature: 'GENERAL',
      messageText: 'Request for private@example.com failed', frames: [], request: null } }] }, 'Chrome/120'), /JOURNEY_INPUT_INVALID/);
});

test('server-side caught exceptions retain source location while redacting customer text', () => {
  const cause = new TypeError('Request for private@example.com failed at https://example.com/order?token=secret');
  cause.stack = `TypeError: ${cause.message}\n at handler (file:///var/task/.next/server/chunks/proxy.js:73:11)`;
  assert.deepEqual(safeOperationalDiagnostic(cause), {
    type: 'TypeError', messageText: 'Request for [EMAIL] failed at [URL]',
    script: 'proxy.js', line: 73, column: 11,
  });
});
