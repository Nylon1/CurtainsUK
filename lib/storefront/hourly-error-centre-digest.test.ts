import assert from 'node:assert/strict';
import test from 'node:test';
import { formatHourlyDigest, previousCompletedHour, type HourlyDigestSummary } from './hourly-error-centre-digest';

const summary: HourlyDigestSummary = {
  visits: 12, journeys: 14, pageViews: 48, cartAdds: 3, cartViews: 4,
  checkoutStarts: 2, paidOrders: 1, browserErrors: 2, serviceErrors: 1,
  slowLoads: 5, topPages: [{ path: '/pages/fabric-library', views: 20 }],
  channels: [{ name: 'Search', visits: 7 }],
  browserErrorGroups: [{ code: 'ASSET_LOAD_FAILED', path: '/pages/fabric-library', count: 2 }],
  serviceErrorGroups: [{ code: 'QUOTE_UNAVAILABLE', path: '/api/staging/shopify-proxy/price', count: 1 }],
};

test('hourly digest uses the last completed UTC window across a London clock change', () => {
  const start = previousCompletedHour(new Date('2026-10-25T02:17:00.000Z'));
  assert.equal(start.toISOString(), '2026-10-25T01:00:00.000Z');
  const email = formatHourlyDigest(summary, start);
  assert.match(email.text, /CurtainsUK Error Centre: 25 Oct 2026, 01:00 to 25 Oct 2026, 02:00/);
});

test('one summary includes commerce, performance and both error sources without visitor identifiers', () => {
  const email = formatHourlyDigest(summary, new Date('2026-10-21T12:00:00.000Z'));
  for (const expected of ['New anonymous visits: 12', 'Active anonymous journeys: 14',
    'Cart additions: 3', 'Checkout starts: 2',
    'Paid orders recorded: 1', 'Slow loads: 5', 'Browser/API errors: 2', 'Service errors: 1',
    'ASSET_LOAD_FAILED at /pages/fabric-library: 2',
    'QUOTE_UNAVAILABLE at /api/staging/shopify-proxy/price: 1']) assert.ok(email.text.includes(expected));
  assert.ok(!email.text.includes('journey_id'));
});
