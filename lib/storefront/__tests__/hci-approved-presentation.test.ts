import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { createPalette, editPalette, paletteContext } from '../../../vendor/hci-approved/intelligence/reference-images/palette';
import { acknowledgedPremiumRevision, savedPremiumSession } from '../../../components/curtainsuk-premium-transport';

const root = resolve('vendor/hci-approved');
const manifest = JSON.parse(readFileSync(resolve(root, 'source-manifest.json'), 'utf8'));

test('server revisions distinguish mutation/retry acknowledgements from read-only resume', () => {
  assert.equal(acknowledgedPremiumRevision(null, 0), 0);
  assert.equal(acknowledgedPremiumRevision(0, 1), 1);
  assert.equal(acknowledgedPremiumRevision(1, 2), 2);
  assert.equal(acknowledgedPremiumRevision(1, 2), 2, 'same request retry keeps same acknowledged revision');
  assert.equal(acknowledgedPremiumRevision(2, 3), 3);
  assert.throws(() => acknowledgedPremiumRevision(2, 8));
  assert.throws(() => acknowledgedPremiumRevision(2, undefined));
  assert.equal(acknowledgedPremiumRevision(null, 7, false), 7);
  assert.equal(acknowledgedPremiumRevision(7, 7, false), 7);
  assert.equal(acknowledgedPremiumRevision(5, 7, false), 7);
  assert.equal(savedPremiumSession('not-a-session'), null);
  assert.equal(savedPremiumSession('11111111-1111-4111-8111-111111111111'), '11111111-1111-4111-8111-111111111111');
});

test('transport-adapted copy keeps UTF-8 punctuation intact', () => {
  const source = readFileSync(resolve(root, 'components/ReferenceExperience.tsx'), 'utf8');
  assert.ok(source.includes('CurtainsUK · Fabric Intelligence™'));
  assert.ok(!source.includes('â€'));
});

test('approved analysis, guided palette and styles retain exact HCI source with portable line endings', () => {
  for (const [file, hash] of Object.entries(manifest.files)) {
    if (manifest.transportAdapted.includes(file)) continue;
    assert.equal(createHash('sha256').update(readFileSync(resolve(root, file), 'utf8').replaceAll('\r\n', '\n')).digest('hex'), hash, file);
  }
});

test('source mirror is evidence/projection compatible, preserving machine colours when ignored', () => {
  const provenance = { consultationId: 'presentation-test', imageHash: `sha256:${'a'.repeat(64)}`, modelVersion: 'test' };
  const state = createPalette({ schema: 'hci-draft-palette-observation-v1', palette: { primary: ['cream'], secondary: ['green'], accent: [] } }, provenance);
  const original = JSON.stringify(state.draft);
  let next = editPalette(state, { id: 'begin', revision: state.revision, type: 'begin-review' });
  next = editPalette(next, { id: 'cream', revision: next.revision, type: 'review-colour', previousColour: 'cream', colour: 'cream', category: 'primary', feature: 'walls', influence: 'important' });
  next = editPalette(next, { id: 'green', revision: next.revision, type: 'review-colour', previousColour: 'green', colour: 'green', category: 'secondary', feature: 'sofa', influence: 'ignore' });
  next = editPalette(next, { id: 'complete', revision: next.revision, type: 'complete-review' });
  assert.equal(JSON.stringify(next.draft), original);
  assert.equal(next.review?.colours.green, 'IGNORED');
  assert.ok(!JSON.stringify(paletteContext(next)).includes('green'));
});
