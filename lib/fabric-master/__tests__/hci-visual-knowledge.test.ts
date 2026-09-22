import '../../../scripts/curtainsuk-server-script-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapHciFabricKnowledge } from '../hci-visual-knowledge';

test('projects only governed known visual fields for the server-to-server HCI contract', () => {
  const row = { fabric_id: 'pt-1223-374', visual_fields: {
    primaryColour: { value: 'blue' }, secondaryColours: { value: ['cream', 'unknown'] },
    colourTemperature: { value: 'cool' }, patternClass: { value: 'geometric' },
    visualActivity: { value: 'balanced' }, visualSurface: { value: ['visible-weave'] },
    sheenAppearance: { value: 'unknown' }, character: { value: ['graphic'] },
    visualWeight: { value: 'light' }, supplierSku: { value: 'must-not-project' },
  }};
  const before = JSON.stringify(row);
  const value = mapHciFabricKnowledge(row);
  assert.deepEqual(value.palette, { primary: 'blue', secondary: ['cream'], temperature: 'cool', lightness: undefined, saturation: undefined, contrast: undefined, complexity: undefined });
  assert.deepEqual(value.pattern, { category: 'geometric', motif: undefined, activity: 'balanced', directionality: undefined });
  assert.deepEqual(value.texture, ['visible-weave']);
  assert.equal(value.finish, undefined);
  assert.deepEqual(value.character, ['graphic']);
  assert.equal(value.visualWeight, 'light');
  assert.equal(JSON.stringify(row), before);
});
