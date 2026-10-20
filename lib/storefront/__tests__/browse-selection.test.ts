import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync('shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-browse-filters.js', 'utf8');

// Small event/element adapter, matching the existing storefront VM test approach.
function setup(search = '?colour=blue,green') {
  const document = { activeElement: null as Node | null, createElement: (_tag: string) => new Node() };
  class Node {
    children: Node[] = []; dataset: Record<string, string> = {}; attributes: Record<string, string> = {};
    listeners: Record<string, ((event: { preventDefault(): void }) => void)[]> = {};
    textContent = ''; value = ''; hidden = false; type = ''; className = '';
    append(...children: Node[]) { this.children.push(...children); }
    replaceChildren(...children: Node[]) { this.children = children; }
    contains(node: Node) { return this.children.includes(node); }
    setAttribute(name: string, value: string) { this.attributes[name] = value; }
    addEventListener(name: string, fn: (event: { preventDefault(): void }) => void) { (this.listeners[name] ??= []).push(fn); }
    focus() { document.activeElement = this; }
    click() { this.focus(); this.listeners.click?.forEach(fn => fn({ preventDefault() {} })); }
  }
  const host = new Node(), clear = new Node(), query = new Node(), colour = new Node(), price = new Node();
  colour.value = new URLSearchParams(search).get('colour') || '';
  const form = {
    elements: { query, colour, guidePrice: price }, events: 0, resets: 0,
    dispatchEvent() { this.events++; api.syncSelection(root, catalog, form); },
    reset() { this.resets++; for (const field of Object.values(this.elements)) field.value = ''; api.syncSelection(root, catalog, form); },
  };
  const catalog = { facets: {
    discovery: [{ key: 'colour', options: ['blue', 'green'].map(value => ({ value, label: value })) }],
    guidePrices: [{ value: '50-100', label: '£50 – under £100' }],
  } };
  const choices: Node[] = [];
  const root = {
    querySelector: (selector: string) => selector === '[data-cuk-active-filters]' ? host : clear,
    querySelectorAll: () => choices,
  };
  const win = { location: { search } } as any;
  runInNewContext(source.replace('const existing =', 'window.optionButton = optionButton; const existing ='),
    { window: win, document, URLSearchParams, Event });
  const api = win.CurtainsUKFabricExperience;
  for (const value of ['blue', 'green']) choices.push(win.optionButton({
    key: 'colour', choice: { value, label: value }, field: colour, form, multiple: true,
  }));
  api.syncSelection(root, catalog, form);
  return { api, root, catalog, form, host, clear, query, colour, price, choices, win, document };
}

test('rapid off/on honours the last intent before any response or URL update', () => {
  const s = setup('?colour=blue');
  s.choices[0].click();
  assert.equal(s.colour.value, '');
  assert.equal(s.choices[0].attributes['aria-pressed'], 'false');
  s.choices[0].click();
  assert.equal(s.colour.value, 'blue');
  assert.equal(s.choices[0].attributes['aria-pressed'], 'true');
  assert.equal(s.host.children[0].textContent, 'Blue ×');
});

test('removing two chips rapidly does not resurrect a removed value', () => {
  const s = setup();
  s.host.children[0].click();
  s.host.children[0].click();
  assert.equal(s.colour.value, '');
  assert.equal(s.host.children.length, 0);
  assert.equal(s.clear.hidden, true);
  assert.equal(s.document.activeElement, s.query);
  assert.equal(s.win.location.search, '?colour=blue,green');
});

test('reset then immediate choice cannot recover old URL filters', () => {
  const s = setup();
  s.clear.click();
  s.choices[1].click();
  assert.equal(s.form.resets, 1);
  assert.equal(s.colour.value, 'green');
  assert.equal(s.choices[0].attributes['aria-pressed'], 'false');
});

test('search-only selection has an accessible removable chip and clear all', () => {
  const s = setup('');
  s.query.value = 'Acanthus, blue';
  s.form.dispatchEvent();
  assert.equal(s.clear.hidden, false);
  assert.equal(s.host.children[0].textContent, 'Search: Acanthus, blue ×');
  assert.equal(s.host.children[0].attributes['aria-label'], 'Remove search: Acanthus, blue');
  s.host.children[0].click();
  assert.equal(s.query.value, '');
  assert.equal(s.clear.hidden, true);
});

test('re-render after a response cannot overwrite current form intent', () => {
  const s = setup('?colour=blue');
  s.choices[0].click();
  s.api.renderActiveFilters(s.root, s.catalog, s.form);
  assert.equal(s.host.children.length, 0);
  assert.equal(s.colour.value, '');
});
