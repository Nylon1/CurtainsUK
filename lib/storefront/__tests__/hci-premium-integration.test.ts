import test from 'node:test';
import assert from 'node:assert/strict';
import { premiumHciCommand, premiumHciEnabled } from '../hci-premium-contract';
import { acceptedHciFeedback } from '../hci-feedback';

const sessionId = '11111111-1111-4111-8111-111111111111';

test('premium customer contract accepts only bounded guided palette actions', () => {
  assert.equal(premiumHciCommand({ requestId: sessionId, sessionId: null, revision: null }).sessionId, sessionId);
  const command = premiumHciCommand({
    requestId: sessionId,
    sessionId,
    revision: 3,
    action: {
      type: 'palette',
      edit: {
        id: 'palette:4', revision: 3, type: 'review-colour', previousColour: 'grey', colour: 'cream', category: 'primary', feature: 'walls', influence: 'consider',
      },
    },
  });
  assert.equal((command.action?.edit as { colour: string }).colour, 'cream');
  assert.throws(() => premiumHciCommand({ requestId: sessionId, action: { type: 'palette', edit: { id: 'x', revision: 0, type: 'add', colour: 'red', category: 'primary', unexpected: true } } }));
});

test('premium route is preview-only and needs both existing staging gates', () => {
  const base = { VERCEL_ENV: 'preview', CURTAINSUK_DEPLOYMENT_STAGE: 'STAGING', CURTAINSUK_HCI_INTEGRATION_ENABLED: 'true', CURTAINSUK_HCI_PREMIUM_ENABLED: 'true' };
  assert.equal(premiumHciEnabled(base), true);
  assert.equal(premiumHciEnabled({ ...base, VERCEL_ENV: 'production' }), false);
  assert.equal(premiumHciEnabled({ ...base, CURTAINSUK_HCI_PREMIUM_ENABLED: 'false' }), false);
});

test('premium fabric feedback records governed reaction evidence without mutating supplier truth', () => {
  const events = acceptedHciFeedback({
    sessionId,
    policyVersion: 'test-policy',
    recommendationVersion: 'test-recommendation',
    timestamp: '2026-09-17T09:00:00.000Z',
    action: { type: 'feedback', command: { strategyId: 'tonal', fabricId: 'canonical:1', fabricReaction: 'MORE_LIKE_THIS', directionReaction: 'LIKE', optionIds: ['colour', 'texture'] } },
    directions: [{ id: 'tonal', cards: [{ fabricMasterId: 'fabric-master:1', reactionId: 'canonical:1' }] }],
  });
  assert.deepEqual(events.map((event) => event.event), ['STRATEGY_REACTION', 'FABRIC_REACTION']);
  assert.equal(JSON.stringify(events).includes('supplier'), false);
  assert.deepEqual((events[1] as { optionIds: string[] }).optionIds, ['colour', 'texture']);
});
