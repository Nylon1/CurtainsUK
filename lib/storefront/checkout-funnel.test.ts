import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { parseJourneyBatch } from './customer-journey';
import { summarizeMyHomeFunnel, type FunnelEvent } from './checkout-funnel';

const now = Date.parse('2026-11-09T12:00:00Z');
const event = (journey_id: string, name: string, code: string, minutesAgo: number, release = 'journey-20261109-v5'): FunnelEvent =>
  ({ journey_id, name, code, occurred_at: new Date(now - minutesAgo * 60_000).toISOString(), release });

test('made-to-measure funnel deduplicates retries, separates product mixes and excludes QA', () => {
  const curtain = randomUUID(), mixed = randomUUID(), qa = randomUUID();
  const rows = summarizeMyHomeFunnel([
    event(curtain, 'MY_HOME_CART_VIEW', 'CURTAIN', 3000),
    event(curtain, 'MY_HOME_REVIEW_READY', 'CURTAIN', 2999),
    event(curtain, 'MY_HOME_REVIEW_READY', 'CURTAIN', 2998),
    event(mixed, 'MY_HOME_ORDER_NOW', 'CURTAIN_ROMAN', 30),
    event(mixed, 'MY_HOME_HANDOFF_FAILED', 'CURTAIN_ROMAN', 29),
    event(qa, 'MY_HOME_HANDOFF_READY', 'CURTAIN', 40, 'journey-20261109-v5-qa'),
  ], now);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].mix, 'CURTAIN');
  assert.equal(rows[0].steps.MY_HOME_REVIEW_READY, 1);
  assert.equal(rows[0].lastObservedAfter24h.MY_HOME_REVIEW_READY, 1);
  assert.equal(rows[1].steps.MY_HOME_HANDOFF_FAILED, 1);
  assert.equal(rows[1].lastObservedAfter24h.MY_HOME_HANDOFF_FAILED, undefined);
});

test('journey ingestion accepts only fixed cart steps and safe product combinations', () => {
  const body = (name: string, code: string, pagePath = '/pages/build-my-rooms') => ({
    journeyId: randomUUID(), events: [{ eventId: randomUUID(), kind: 'ACTION', name, code, status: null,
      pagePath, release: 'journey-20261109-v5', channel: null, detail: null }],
  });
  assert.equal(parseJourneyBatch(body('MY_HOME_ORDER_NOW', 'CURTAIN_ROMAN'), 'Chrome/120')[0].code, 'CURTAIN_ROMAN');
  assert.throws(() => parseJourneyBatch(body('MY_HOME_ORDER_NOW', 'user@example.com'), 'Chrome/120'), /JOURNEY_INPUT_INVALID/);
  assert.throws(() => parseJourneyBatch(body('MY_HOME_ORDER_NOW', 'CURTAIN', '/checkout'), 'Chrome/120'), /JOURNEY_INPUT_INVALID/);
});
