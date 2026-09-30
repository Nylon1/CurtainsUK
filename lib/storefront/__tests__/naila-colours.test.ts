import assert from 'node:assert/strict';
import test from 'node:test';
import { colourPresentation } from '../naila/colours';

// Exact IDs returned by the current governed HCI colour-family question.
const hciAnswerIds = [
  'neutral', 'blue', 'green', 'pink', 'terracotta',
  'white', 'cream', 'beige', 'taupe', 'brown', 'grey', 'black',
  'red', 'purple', 'orange', 'yellow', 'gold',
];

test('every current governed HCI colour answer has a visible labelled swatch', () => {
  assert.equal(new Set(hciAnswerIds).size, 17);
  for (const id of hciAnswerIds) {
    const look = colourPresentation(id);
    assert(look?.label, id);
    assert(look.swatch, id);
  }
  assert.equal(colourPresentation('neutral')?.label, 'Neutral');
  assert.equal(colourPresentation('terracotta')?.label, 'Terracotta');
  assert.equal(colourPresentation('orange')?.label, 'Orange');
  assert.equal(colourPresentation('not-governed'), null);
});
