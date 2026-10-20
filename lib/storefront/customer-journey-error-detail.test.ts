import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { randomUUID } from 'node:crypto';
import { parseJourneyBatch } from './customer-journey';

test('storefront sends useful browser and API details without leaking messages or URL queries', async () => {
  const source = readFileSync(join(process.cwd(), 'shopify-theme/curtainsuk-dawn-16/assets/customer-journey.js'), 'utf8');
  const listeners: Record<string, (event: unknown) => void> = {};
  const requests: string[] = [];
  const storage = new Map<string, string>();
  const location = { origin: 'https://www.curtainsuk.com', hostname: 'www.curtainsuk.com',
    href: 'https://www.curtainsuk.com/pages/fabric-library?email=private@example.com' };
  const window = {
    Shopify: { customerPrivacy: { analyticsProcessingAllowed: () => true } },
    fetch: (url: string, options: { body: string }) => {
      if (url.endsWith('/journey')) { requests.push(options.body); return Promise.resolve({ ok: true, status: 200 }); }
      return Promise.resolve({ ok: false, status: 503 });
    },
    addEventListener: (name: string, callback: (event: unknown) => void) => { listeners[name] = callback; },
  };
  runInNewContext(source, { window, location, URL, Promise,
    document: { readyState: 'complete', referrer: '', addEventListener: () => {} },
    sessionStorage: { getItem: (key: string) => storage.get(key) || null,
      setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) },
    crypto: { randomUUID }, navigator: {}, performance: { getEntriesByType: () => [], now: () => 0 },
    setInterval: () => 1, clearInterval: () => {}, setTimeout: () => 1, clearTimeout: () => {} });
  const reason = new TypeError("Cannot read properties of undefined (reading 'private@example.com')");
  reason.stack = `TypeError: ${reason.message}\n at https://cdn.shopify.com/s/files/1/123/assets/curtainsuk-browse-filters.js?token=private:42:7`;
  listeners.unhandledrejection({ reason });
  assert.equal(requests.length, 1);
  assert.doesNotMatch(requests[0], /private@example\.com|token=private/);
  const body = JSON.parse(requests[0]);
  const events = parseJourneyBatch(body, 'Chrome/120');
  const error = events.find((event) => event.kind === 'ERROR');
  assert.equal(error?.code, 'PROMISE_REJECTION');
  assert.deepEqual(error?.error_detail, { type: 'TypeError', message: 'PROPERTY_READ_UNDEFINED',
    script: 'curtainsuk-browse-filters.js', line: 42, column: 7, origin: 'THEME', feature: 'FABRICS' });
  await window.fetch('https://curtainsuk-production-api.vercel.app/api/curtain-consultation-premium', { body: '' });
  await Promise.resolve();
  assert.equal(requests.length, 2);
  const apiEvents = parseJourneyBatch(JSON.parse(requests[1]), 'Chrome/120');
  assert.deepEqual(apiEvents[0].error_detail, { type: 'HttpError', message: 'HTTP_SERVER_ERROR',
    script: null, line: null, column: null, origin: 'APP', feature: 'FABRIC_INTELLIGENCE' });
});

test('server rejects free-form error detail that could contain customer data', () => {
  assert.throws(() => parseJourneyBatch({ journeyId: randomUUID(), events: [{ eventId: randomUUID(),
    kind: 'ERROR', name: 'BROWSER_ERROR', pagePath: '/', code: 'PROMISE_REJECTION', status: null,
    release: 'journey-20261020-v2', channel: null, detail: { type: 'TypeError',
      message: 'private@example.com', script: null, line: 42, column: 7,
      origin: 'THEME', feature: 'GENERAL' } }] }, 'Chrome/120'), /JOURNEY_INPUT_INVALID/);
});
