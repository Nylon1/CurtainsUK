import assert from 'node:assert/strict';
import test from 'node:test';

import { styleDirectionRequestContext } from '../hci-style-directions';
import { retailStyleDirectionEligibility } from '../hci-style-direction-eligibility';
import { customerView } from '../hci-premium-view';
import { HCI_PREMIUM_BASELINE, HCI_PREMIUM_CONTRACT } from '../hci-premium-contract';
import type { FabricMasterRecord } from '../../fabric-master/types';

test('keeps the exact V2 eligibility context for feedback and refinement', () => {
  assert.equal(styleDirectionRequestContext(null, { type: 'brief-confirm' }).needsEligibility, true);
  assert.equal(styleDirectionRequestContext(null, { type: 'answer' }).needsEligibility, false);
  assert.equal(styleDirectionRequestContext({ styleDirectionsV2: {} }, { type: 'feedback' }).needsEligibility, true);
  assert.equal(styleDirectionRequestContext({ styleDirectionsV2: {} }, { type: 'finish' }).needsEligibility, true);
  assert.equal(styleDirectionRequestContext({ styleDirectionsV2: {} }, { type: 'calibrate' }).needsEligibility, false);
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

const record = (overrides: Record<string, unknown> = {}) => ({
  fabric_id: 'pt-1223-374', supplier_id: 'prestigious-textiles', supplier_sku: '1223/374',
  brand_name: 'Prestigious Textiles', design_name: 'Dunbar', colour_name: 'Moss',
  staging_catalog_visible: true, lifecycle_state: 'CURRENT', imagery: ['https://cdn.shopify.com/source.jpg'],
  ...overrides,
} as unknown as FabricMasterRecord);

test('requires the retail projection’s exact approved media binding for a Style Directions card', () => {
  const ids = retailStyleDirectionEligibility([record(), record({ fabric_id: 'missing-media', supplier_sku: '1223/375' })], [{
    fabric_id: 'pt-1223-374', supplier_id: 'prestigious-textiles', supplier_sku: '1223/374',
    fabric_media_assets: { shopify_cdn_url: 'https://cdn.shopify.com/f.jpg', width: 800, height: 800 },
  }]);
  assert.deepEqual(ids, ['pt-1223-374']);
});
