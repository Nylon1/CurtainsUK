import test from 'node:test';
import assert from 'node:assert/strict';
import { governedBrowseFilters } from '../browse-filters';

test('governed Browse facets accept only bounded known-value-shaped browser input', () => {
  const params = new URLSearchParams({
    query: '  Dunbar  ', colour: 'Blue, green,UNKNOWN,not/a/value', pattern: 'geometric, geometric',
    texture: 'visible-weave', finish: 'matte', character: 'natural, refined',
  });
  assert.deepEqual(governedBrowseFilters(params), {
    query: 'Dunbar', brand: '', collection: '', sample: '', availability: '', window: '',
    colour: ['blue', 'green'], pattern: ['geometric'], texture: ['visible-weave'], finish: ['matte'], character: ['natural', 'refined'],
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