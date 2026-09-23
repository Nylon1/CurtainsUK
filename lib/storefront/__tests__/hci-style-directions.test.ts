import assert from 'node:assert/strict';
import test from 'node:test';

import { styleDirectionRequestContext } from '../hci-style-directions';
import { customerView } from '../hci-premium-view';
import { HCI_PREMIUM_BASELINE, HCI_PREMIUM_CONTRACT } from '../hci-premium-contract';

test('requests current Fabric Master eligibility only when a brief is confirmed', () => {
  assert.equal(styleDirectionRequestContext(null, { type: 'brief-confirm' }).needsEligibility, true);
  assert.equal(styleDirectionRequestContext(null, { type: 'answer' }).needsEligibility, false);
});

test('accepts three style directions with up to seven exact governed cards', () => {
  const cards = Array.from({ length: 6 }, (_, index) => ({
    fabricMasterId: `pt-test-${index}`,
    supplierSku: `TEST/${index}`,
    reactionId: `canonical-${index}`,
    explanation: ['Governed evidence supports this current brief.'],
  }));
  const view = customerView({
    version: HCI_PREMIUM_CONTRACT,
    sourceCommit: HCI_PREMIUM_BASELINE,
    sessionId: '12345678-1234-4123-8123-123456789abc',
    phase: 'directions',
    profileSummary: '', question: null, stimulusId: null, tasteProgress: null,
    calibrationFabric: null, calibrationProgress: null, interiorBrief: null, palette: null,
    directions: ['overall', 'tonal', 'pattern-style'].map((id) => ({
      id, label: id, purpose: 'Existing direction.', status: 'available', cards,
      feedback: { keep: [], change: [] },
    })),
    learning: null, refinementDigest: null,
  });
  assert.equal(view.directions.length, 3);
  assert.equal(view.directions[0]?.cards.length, 6);
});
