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

test('price level is a bounded consultation action and never a customer-supplied amount', () => {
  const command = premiumHciCommand({ requestId: sessionId, sessionId, revision: 3, action: { type: 'price-level', level: 'PREMIUM_LUXURY' } });
  assert.equal(command.action?.level, 'PREMIUM_LUXURY');
  assert.throws(() => premiumHciCommand({ requestId: sessionId, sessionId, revision: 3, action: { type: 'price-level', level: '£150' } }));
  assert.throws(() => premiumHciCommand({ requestId: sessionId, sessionId, revision: 3, action: { type: 'price-level', level: 'MID_RANGE', amount: 4999 } }));
});

test('progressive direction delivery accepts only one bounded persisted-direction index', () => {
  const command = premiumHciCommand({ requestId: sessionId, sessionId, revision: 3, action: { type: 'direction-load', index: 2 } });
  assert.equal(command.action?.type, 'direction-load');
  assert.equal(command.action?.index, 2);
  for (const index of [-1, 3, 1.5, '1'])
    assert.throws(() => premiumHciCommand({ requestId: sessionId, sessionId, revision: 3, action: { type: 'direction-load', index } }));
});

test('later directions have separate bounded prepare and hydrate commands', () => {
  for (const type of ['direction-prepare', 'direction-hydrate'] as const) {
    const command = premiumHciCommand({ requestId: sessionId, sessionId, revision: 3, action: { type, index: 1 } });
    assert.equal(command.action?.type, type);
    assert.equal(command.action?.index, 1);
  }
  for (const type of ['direction-prepare', 'direction-hydrate'] as const)
    for (const index of [0, 3, 1.5, '1'])
      assert.throws(() => premiumHciCommand({ requestId: sessionId, sessionId, revision: 3, action: { type, index } }));
});

test('price level is retained as a bounded preference in the customer view, without an amount', () => {
  const view = customerView({
    version: HCI_PREMIUM_CONTRACT, sourceCommit: HCI_PREMIUM_BASELINE, sessionId,
    phase: 'calibration', profileSummary: '', question: null, stimulusId: null,
    tasteProgress: { current: 3, total: 3 }, priceLevel: { selected: 'LUXURY' },
    calibrationFabric: null, calibrationProgress: { current: 1, total: 6 },
    interiorBrief: null, palette: null, directions: [], learning: null, refinementDigest: null,
  });
  assert.deepEqual(view.priceLevel, { selected: 'LUXURY' });
  assert.throws(() => customerView({ ...view, priceLevel: { selected: 'LUXURY', amountMinor: 15000 } }));
});

test('premium route requires matching deployment stage and explicit gates', () => {
  const base = { VERCEL_ENV: 'preview', CURTAINSUK_DEPLOYMENT_STAGE: 'STAGING', CURTAINSUK_HCI_INTEGRATION_ENABLED: 'true', CURTAINSUK_HCI_PREMIUM_ENABLED: 'true' };
  assert.equal(premiumHciEnabled(base), true);
  assert.equal(premiumHciEnabled({ ...base, VERCEL_ENV: 'production' }), false);
  assert.equal(premiumHciEnabled({ ...base, VERCEL_ENV: 'production', CURTAINSUK_DEPLOYMENT_STAGE: 'PRODUCTION' }), true);
  assert.equal(premiumHciEnabled({ ...base, CURTAINSUK_DEPLOYMENT_STAGE: 'PRODUCTION' }), false);
  assert.equal(premiumHciEnabled({ ...base, CURTAINSUK_HCI_PREMIUM_ENABLED: 'false' }), false);
});

test('short taste and exact real-fabric calibration projection is bounded', () => {
  const base = {
    version: HCI_PREMIUM_CONTRACT, sourceCommit: HCI_PREMIUM_BASELINE, sessionId,
    phase: 'calibration', profileSummary: '', question: null, stimulusId: null,
    palette: null, directions: [], learning: null, refinementDigest: null,
    tasteProgress: { current: 3, total: 3 },
    calibrationProgress: { current: 2, total: 6 },
    calibrationFabric: {
      fabricMasterId: 'sdg-ddae236495', supplierSku: 'DDAE236495',
      brand: 'Sanderson', design: 'Linden', colourway: 'Celadon',
      imageUrl: 'https://cdn.shopify.com/s/files/1/example.jpg',
    },
  };
  const view = customerView(base);
  assert.equal(view.calibrationFabric?.fabricMasterId, 'sdg-ddae236495');
  assert.deepEqual(view.calibrationProgress, { current: 2, total: 6 });
  assert.throws(() => customerView({ ...base, calibrationFabric: { ...base.calibrationFabric, imageUrl: 'https://example.com/a.jpg' } }));
  assert.throws(() => customerView({ ...base, calibrationProgress: { current: 7, total: 6 } }));
});

test('interior brief commands and projection retain governed choices', () => {
  const command = (action: Record<string, unknown>) => premiumHciCommand({ requestId: sessionId, sessionId, revision: 9, action });
  assert.equal((command({ type: 'brief-change', id: sessionId, choice: { dimension: 'pattern', value: 'Plain' } }).action?.choice as { value: string }).value, 'Plain');
  assert.equal(command({ type: 'brief-confirm', id: sessionId }).action?.type, 'brief-confirm');
  assert.throws(() => command({ type: 'brief-change', id: sessionId, choice: { dimension: 'supplier.price', value: 'Free' } }));
  const base = { version: HCI_PREMIUM_CONTRACT, sourceCommit: HCI_PREMIUM_BASELINE, sessionId,
    phase: 'brief', profileSummary: '', question: null, stimulusId: null, tasteProgress: null,
    calibrationFabric: null, calibrationProgress: null, palette: null, directions: [], learning: null,
    refinementDigest: null, interiorBrief: { status: 'HCI_PROPOSED', version: 0, sections: [
      { dimension: 'pattern', title: 'Pattern direction', description: 'How much pattern.', value: 'Plain', changed: false,
        options: [{ value: 'Plain', label: 'Plain' }, { value: 'Subtle pattern', label: 'Subtle pattern' }] },
    ] } };
  assert.equal(customerView(base).interiorBrief?.sections[0]?.value, 'Plain');
  assert.throws(() => customerView({ ...base, interiorBrief: { ...base.interiorBrief, sections: [{ ...base.interiorBrief.sections[0], dimension: 'supplier.price' }] } }));
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
