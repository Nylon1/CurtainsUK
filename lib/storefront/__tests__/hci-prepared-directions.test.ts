import test from 'node:test';
import assert from 'node:assert/strict';
import { needsPreparedDirectionCards } from '../hci-prepared-directions';

const cards = Array.from({ length: 6 }, (_, index) => ({ id: index }));

test('a progressive style direction with a saved summary requires its private card payload', () => {
  assert.equal(needsPreparedDirectionCards({ phase: 'directions', directions: [{ cards }, { cards: [] }] }), true);
  assert.equal(needsPreparedDirectionCards({ phase: 'directions', directions: [{ cards }, { cards }] }), false);
});

test('a final shortlist with no selected fabric is a completed result, not a pending direction', () => {
  assert.equal(needsPreparedDirectionCards({ phase: 'final', directions: [{ cards: [cards[0]] }, { cards: [] }] }), false);
  assert.equal(needsPreparedDirectionCards({ phase: 'directions', directions: [{ cards: [cards[0]] }, { cards: [] }] }), false);
});
