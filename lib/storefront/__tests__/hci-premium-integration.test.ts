import test from 'node:test';
import assert from 'node:assert/strict';
import { premiumHciCommand, premiumHciEnabled } from '../hci-premium-contract';
import { acceptedHciFeedback } from '../hci-feedback';
import { roomFeatures } from '../../../vendor/hci-approved/intelligence/reference-images/room-context';
import { createPalette, editPalette, type PaletteAction } from '../../../vendor/hci-approved/intelligence/reference-images/palette';
import { customerShades } from '../../../vendor/hci-approved/intelligence/reference-images/customer-shades';
import { customerView } from '../hci-premium-view';
import { HCI_PREMIUM_BASELINE, HCI_PREMIUM_CONTRACT } from '../hci-premium-contract';

const sessionId = '11111111-1111-4111-8111-111111111111';

test('saved presentation/resume retains CAS revision and three corrected shade evidence records', () => {
  let state = createPalette({ schema: 'hci-draft-palette-observation-v1', palette: { primary: ['grey'], secondary: ['green'], accent: ['red'] } }, { consultationId: sessionId, imageHash: `sha256:${'c'.repeat(64)}`, modelVersion: 'test' });
  const original = structuredClone(state.draft);
  for (const [previousColour, colour, category, feature, influence] of [
    ['grey', 'blue', 'primary', 'walls', 'important'], ['green', 'brown', 'secondary', 'flooring', 'consider'], ['red', 'pink', 'accent', 'accessories', 'ignore'],
  ] as const) {
    const command = premiumHciCommand({ requestId: sessionId, sessionId, revision: state.revision, action: { type: 'palette', edit: { id: colour, revision: state.revision, type: 'review-colour', previousColour, colour, category, feature, influence, customerSelectedShade: customerShades[colour][1]!.id } } });
    state = editPalette(state, command.action!.edit as PaletteAction);
  }
  state = editPalette(state, { id: 'complete', revision: state.revision, type: 'complete-review' });
  const saved = { version: HCI_PREMIUM_CONTRACT, sourceCommit: HCI_PREMIUM_BASELINE, sessionId, revision: 27, phase: 'discovery', profileSummary: '', question: null, stimulusId: null, palette: { recordId: sessionId, state }, directions: [], learning: null, refinementDigest: null };
  const projected = customerView(JSON.parse(JSON.stringify(saved)));
  assert.equal(projected.revision, 27, 'projection must not drop revision and make the client invent it');
  assert.deepEqual(projected.palette, saved.palette);
  assert.deepEqual(state.draft, original);
  assert.equal(state.room?.confirmed?.blue?.customerSelectedShade, customerShades.blue[1]!.id);
  assert.throws(() => customerView({ ...saved, revision: -1 }));
});

test('gateway permits only exact registered within-family shade IDs on correction actions', () => {
  const edit = { id: 'shade', revision: 0, type: 'describe', previousColour: 'grey', colour: 'blue', category: 'primary', feature: 'walls', influence: 'important' };
  const request = (value: Record<string, unknown>) => premiumHciCommand({ requestId: sessionId, sessionId, revision: 0, action: { type: 'palette', edit: value } });
  for (const customerSelectedShade of [customerShades.blue[0]!.id, null]) assert.doesNotThrow(() => request({ ...edit, customerSelectedShade }));
  for (const customerSelectedShade of [customerShades.green[0]!.id, '#ffffff', {}, undefined]) assert.throws(() => request({ ...edit, customerSelectedShade }));
  assert.throws(() => request({ id: 'shade', revision: 0, type: 'complete-review', customerSelectedShade: null }));
});

test('gateway accepts every canonical HCI room feature without translation or evidence loss', () => {
  const draft = createPalette({ schema: 'hci-draft-palette-observation-v1', palette: { primary: ['grey'], secondary: [], accent: [] } }, {
    consultationId: sessionId, imageHash: `sha256:${'a'.repeat(64)}`, modelVersion: 'test',
  });
  const state = editPalette(draft, { id: 'begin', revision: 0, type: 'begin-review' });
  for (const feature of roomFeatures) {
    for (const type of ['describe', 'review-colour'] as const) {
      const command = premiumHciCommand({ requestId: sessionId, sessionId, revision: 1, action: {
        type: 'palette', edit: { id: `feature:${feature}:${type}`, revision: state.revision, type,
          previousColour: 'grey', colour: 'grey', category: 'primary', feature, influence: 'consider' },
      } });
      const result = editPalette(state, command.action!.edit as PaletteAction);
      assert.equal(result.room?.colours.grey?.feature, feature);
      assert.deepEqual(result.draft, draft.draft);
    }
  }
});

test('gateway still rejects obsolete aliases, arbitrary room features and malformed values', () => {
  for (const feature of ['sofa-upholstery', 'furniture-wood', 'existing-curtains', 'cushions-soft-furnishings', 'accessories-metalwork', 'guess', '', {}, 123]) {
    assert.throws(() => premiumHciCommand({ requestId: sessionId, sessionId, revision: 1, action: {
      type: 'palette', edit: { id: 'rejected', revision: 1, type: 'review-colour', previousColour: 'grey', colour: 'grey', category: 'primary', feature, influence: 'consider' },
    } }), /HCI_CONTRACT_INVALID/);
  }
});

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
