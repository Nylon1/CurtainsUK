import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPremiumJourney, assertRecoverableFiView, needsDiscoveryReprojection, requestedPremiumJourney, staleColourAnswer } from '../hci-premium-journey';
import { premiumHciCommand } from '../hci-premium-contract';

test('entry determines the requested journey, while committed state pins it', () => {
  assert.equal(requestedPremiumJourney(false), 'fabric-intelligence');
  assert.equal(requestedPremiumJourney(true), 'naila-v1');
  assert.doesNotThrow(() => assertPremiumJourney({ journey: 'fabric-intelligence' }, 'fabric-intelligence'));
  assert.throws(() => assertPremiumJourney({ journey: 'fabric-intelligence' }, 'naila-v1'), /HCI_SESSION_CONFLICT/);
  assert.throws(() => assertPremiumJourney({ journey: 'unexpected' }, 'fabric-intelligence'), /HCI_STORAGE_UNAVAILABLE/);
});

test('old FI discovery resumes from HCI evidence and rejects a stale colour answer', () => {
  const state = { tasteAnswers: [{ questionId: 'curtain-priority' }, { questionId: 'atmosphere' }] };
  const oldView = { phase: 'discovery', question: { id: 'colour-family', answers: [{ id: 'blue' }, { id: 'red' }] } };
  assert.equal(needsDiscoveryReprojection(state, oldView, 'fabric-intelligence'), true);
  assert.equal(staleColourAnswer(state, oldView, 'fabric-intelligence', { type: 'answer', answerId: 'blue' }), true);
  assert.equal(staleColourAnswer(state, oldView, 'fabric-intelligence', { type: 'answer', questionId: 'colour-family', answerId: 'blue' }), true);
  assert.equal(staleColourAnswer(state, oldView, 'fabric-intelligence', { type: 'answer', questionId: 'pattern', answerId: 'plain' }), false);
  assert.equal(staleColourAnswer(state, oldView, 'fabric-intelligence', { type: 'answer', answerId: 'plain' }), false);
  assert.equal(staleColourAnswer(state, oldView, 'fabric-intelligence', undefined), false);
  assert.equal(needsDiscoveryReprojection(state, oldView, 'naila-v1'), false);
  assert.equal(needsDiscoveryReprojection({ ...state, journey: 'fabric-intelligence' }, oldView, 'fabric-intelligence'), true);
  assert.equal(needsDiscoveryReprojection({ ...state, journey: 'fabric-intelligence' },
    { phase: 'discovery', question: { id: 'pattern' } }, 'fabric-intelligence'), false);
  assert.doesNotThrow(() => assertRecoverableFiView(state, oldView, 'fabric-intelligence'));
  assert.throws(() => assertRecoverableFiView(null, oldView, 'fabric-intelligence'), /HCI_STORAGE_UNAVAILABLE/);
  assert.equal(staleColourAnswer(state, { phase: 'discovery', question: { id: 'colour-family' } },
    'fabric-intelligence', { type: 'answer', answerId: 'plain' }), true);
});

test('FI without an image or palette remains identified by entry, not inferred colour', () => {
  const state = { tasteAnswers: [{ questionId: 'curtain-priority' }, { questionId: 'atmosphere' }], consultation: { palette: null } };
  assert.equal(needsDiscoveryReprojection(state, { phase: 'discovery' }, requestedPremiumJourney(false)), true);
});

test('FI answer question identity is optional for old clients and validated for new clients', () => {
  const base = { requestId: '134d6079-4931-4a10-8e82-593ec1c6fb34',
    sessionId: '134d6079-4931-4a10-8e82-593ec1c6fb34', revision: 2 };
  assert.equal(premiumHciCommand({ ...base, action: { type: 'answer', answerId: 'plain' } }).action?.answerId, 'plain');
  assert.equal(premiumHciCommand({ ...base, action: { type: 'answer', questionId: 'pattern', answerId: 'plain' } }).action?.questionId, 'pattern');
  assert.throws(() => premiumHciCommand({ ...base, action: { type: 'answer', questionId: 'invented', answerId: 'plain' } }), /HCI_CONTRACT_INVALID/);
});

test('later FI phases never reproject the discovery question', () => {
  const state = { tasteAnswers: [{ questionId: 'curtain-priority' }, { questionId: 'atmosphere' }, { questionId: 'pattern' }] };
  for (const phase of ['price', 'calibration', 'brief', 'complete', 'final'])
    assert.equal(needsDiscoveryReprojection(state, { phase }, 'fabric-intelligence'), false);
});
