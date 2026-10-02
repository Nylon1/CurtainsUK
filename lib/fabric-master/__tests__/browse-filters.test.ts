import test from 'node:test';
import assert from 'node:assert/strict';
import { governedBrowseFilters } from '../browse-filters';

test('governed Browse facets accept only bounded known-value-shaped browser input', () => {
  const params = new URLSearchParams({
    query: '  Dunbar  ', colour: 'blue, blue', pattern: 'geometric, geometric',
    texture: 'visible-weave', finish: 'matte', character: 'natural, refined',
  });
  assert.deepEqual(governedBrowseFilters(params), {
    query: 'Dunbar', brand: '', collection: '', sample: '', availability: '', window: '',
    colour: ['blue'], pattern: ['geometric'], texture: ['visible-weave'], finish: ['matte'], character: ['natural', 'refined'],
  });
});

test('missing governed facet input remains an empty constraint, never a fabricated value', () => {
  const filters = governedBrowseFilters(new URLSearchParams());
  assert.deepEqual(filters.colour, []);
  assert.deepEqual(filters.pattern, []);
  assert.deepEqual(filters.texture, []);
  assert.deepEqual(filters.finish, []);
  assert.deepEqual(filters.character, []);
});

test('ordinary and exact grouped governed colours reach the Browse filter', () => {
  for (const colour of ['blue', 'green', 'red', 'grey', 'beige/taupe', 'white/cream', 'yellow/gold']) {
    assert.deepEqual(governedBrowseFilters(new URLSearchParams({ colour })).colour, [colour]);
  }
  assert.deepEqual(governedBrowseFilters(new URLSearchParams({ colour: 'Blue,white/cream,beige/taupe,yellow/gold' })).colour,
    ['blue', 'white/cream', 'beige/taupe', 'yellow/gold']);
});

test('arbitrary slash values remain rejected for colour and every other facet', () => {
  for (const colour of ['blue/green', 'white/black', 'beige/taupe/grey', '/blue', 'blue/']) {
    assert.deepEqual(governedBrowseFilters(new URLSearchParams({ colour })).colour, []);
  }
  for (const key of ['pattern', 'texture', 'finish', 'character']) {
    assert.deepEqual(governedBrowseFilters(new URLSearchParams({ [key]: 'white/cream' }))[key], []);
  }
});
