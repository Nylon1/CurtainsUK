import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const theme = path.join(repository, 'shopify-theme/curtainsuk-dawn-16');
const read = (file) => readFileSync(path.join(theme, file), 'utf8');
const interactions = read('assets/curtainsuk-advisory-interactions.js');
const consultation = read('assets/curtainsuk-advisory-team.js');
const spotlightMarkup = read('snippets/curtainsuk-advisory-spotlight.liquid');
const roomMarkup = read('snippets/curtainsuk-advisory-room.liquid');
const locale = JSON.parse(read('locales/en.default.json').replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ''));
const ids = ['jane', 'anne', 'noah', 'james', 'ben', 'natalie'];
const profiles = ids.map((id, index) => ({ ...locale.advisory_team[id], id, blockId: `block-${index + 1}-${id}` }));
const camel = (value) => value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
const encode = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const decode = (value) => value.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&#39;', "'").replaceAll('&amp;', '&');

class Element {
  constructor(tag, attributes = {}) {
    this.tagName = tag.toLowerCase();
    this.attributes = { ...attributes };
    this.dataset = Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith('data-')).map(([key, value]) => [camel(key.slice(5)), value]));
    this.children = [];
    this.listeners = new Map();
    this.hidden = Object.hasOwn(attributes, 'hidden');
    this.disabled = Object.hasOwn(attributes, 'disabled');
    this.textContent = '';
    this.value = Number(attributes.value ?? 0);
    const classes = new Set((attributes.class ?? '').split(/\s+/).filter(Boolean));
    this.classList = { add: (...names) => names.forEach((name) => classes.add(name)), remove: (...names) => names.forEach((name) => classes.delete(name)), contains: (name) => classes.has(name) };
    const properties = new Map();
    this.style = { setProperty: (name, value) => properties.set(name, value), removeProperty: (name) => properties.delete(name), getPropertyValue: (name) => properties.get(name) ?? '' };
    this.boundsReads = 0;
    this.bounds = { left: 50, top: 100, width: 400, height: 500 };
  }
  append(child) { child.parentElement = this; child.setDocument(this.ownerDocument); this.children.push(child); return child; }
  setDocument(document) { this.ownerDocument = document; this.children.forEach((child) => child.setDocument(document)); }
  setAttribute(name, value) { this.attributes[name] = String(value); if (name.startsWith('data-')) this.dataset[camel(name.slice(5))] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  matches(selector) {
    return selector.split(',').some((part) => {
      part = part.trim();
      if (part.includes(' > ')) { const [parent, child] = part.split(' > '); return this.matches(child) && Boolean(this.parentElement?.matches(parent)); }
      if (part.startsWith('.')) return this.classList.contains(part.slice(1));
      if (part === 'button:not([disabled])') return this.tagName === 'button' && !this.disabled;
      if (part === 'a[href]') return this.tagName === 'a' && Object.hasOwn(this.attributes, 'href');
      const attribute = part.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
      return attribute ? Object.hasOwn(this.attributes, attribute[1]) && (attribute[2] === undefined || this.attributes[attribute[1]] === attribute[2]) : this.tagName === part;
    });
  }
  querySelectorAll(selector) { return this.children.flatMap((child) => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  contains(node) { return node === this || this.children.some((child) => child.contains(node)); }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) ?? null; }
  getClientRects() { for (let node = this; node; node = node.parentElement) if (node.hidden || (node.tagName === 'dialog' && !node.open)) return []; return [{}]; }
  getBoundingClientRect() { this.boundsReads++; return this.bounds; }
  focus() { this.ownerDocument.activeElement = this; }
  addEventListener(name, listener) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(listener); }
  removeEventListener(name, listener) { this.listeners.get(name)?.delete(listener); }
  dispatch(name, values = {}) {
    const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...values };
    for (let node = this; node; node = event.bubbles ? node.parentElement : null) for (const listener of [...(node.listeners.get(name) ?? [])]) listener(event);
    return event;
  }
}

// Render only the fixture's section loop, conditions and translations; HTML structure and
// data hooks are taken from the real Liquid snippet, so markup/controller drift fails tests.
function renderSpotlight() {
  const output = (expression, profile) => {
    const values = { 'block.id': profile?.blockId, 'section.id': 'test-team', adviser: profile?.id, name: profile?.name, title: profile?.title, approach: profile?.approach, question: profile?.question, portrait_asset: `curtainsuk-adviser-${profile?.id}.webp` };
    const translation = expression.match(/^'([^']+)'\s*\|\s*t/);
    if (translation) return encode(translation[1].split('.').reduce((value, key) => value?.[key], locale)?.replaceAll('{{ name }}', profile?.name ?? '') ?? translation[1]);
    return encode(values[expression.split('|')[0].trim()] ?? '');
  };
  const renderBlock = (chunk, profile) => chunk
    .replace(/\{%\s*liquid[\s\S]*?%\}/g, '')
    .replace(/\{% unless block.id == default_adviser_id %\}([\s\S]*?)\{% endunless %\}/g, (_, content) => profile.id === 'jane' ? '' : content)
    .replace(/\{% if block.id == default_adviser_id %\}([\s\S]*?)\{% else %\}([\s\S]*?)\{% endif %\}/g, (_, yes, no) => profile.id === 'jane' ? yes : no)
    .replace(/\{% if portrait_advisers contains adviser %\}([\s\S]*?)\{% else %\}[\s\S]*?\{% endif %\}/g, '$1')
    .replace(/\{% render 'curtainsuk-adviser-art'[^%]*%\}/g, `<img src="curtainsuk-adviser-${profile.id}.webp" alt="Synthetic portrait of ${profile.name}">`)
    .replace(/\{\{\s*([\s\S]*?)\s*\}\}/g, (_, expression) => output(expression, profile));
  return spotlightMarkup
    .replace(/\{% doc %\}[\s\S]*?\{% enddoc %\}/g, '')
    .replace(/\{%\s*liquid[\s\S]*?%\}/g, '')
    .replace(/\{% for block in section.blocks %\}([\s\S]*?)\{% endfor %\}/g, (_, chunk) => profiles.map((profile) => renderBlock(chunk, profile)).join(''))
    .replace(/\{\{\s*([\s\S]*?)\s*\}\}/g, (_, expression) => output(expression));
}

function parseHtml(markup, parent) {
  const stack = [parent];
  const voids = new Set(['br', 'hr', 'img', 'input', 'link', 'meta', 'source']);
  for (const [, closing, tag, rawAttributes] of markup.matchAll(/<(\/?)([a-z][a-z0-9-]*)([^>]*?)>/gi)) {
    if (closing) { if (stack.at(-1).tagName === tag.toLowerCase()) stack.pop(); continue; }
    const attributes = {};
    for (const attribute of rawAttributes.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attributes[attribute[1]] = decode(attribute[2] ?? attribute[3] ?? attribute[4] ?? '');
    const element = stack.at(-1).append(new Element(tag, attributes));
    if (!voids.has(tag.toLowerCase()) && !rawAttributes.endsWith('/')) stack.push(element);
  }
}

function harness({ reducedMotion = false, finePointer = true, mediaSupported = true, intersection = 'supported' } = {}) {
  const document = new Element('#document');
  document.ownerDocument = document;
  document.body = document.append(new Element('body'));
  document.activeElement = document.body;
  const window = new Element('#window');
  const root = document.body.append(new Element('section', { 'data-advisory-team': '' }));
  parseHtml(renderSpotlight(), root);
  const spotlight = root.querySelector('[data-advisory-spotlight]');
  const stage = spotlight.querySelector('[data-spotlight-stage]');
  assert.ok(stage, 'Actual Liquid must expose the controller motion surface');
  const selectors = spotlight.querySelectorAll('[data-spotlight-select]');
  const panels = spotlight.querySelectorAll('[data-spotlight-panel]');
  assert.equal(selectors.length, 6);
  assert.equal(panels.length, 6);
  const revealTargets = [];
  for (const profile of profiles) {
    const card = root.append(new Element('article', { class: 'cukad__profile', id: `adviser-test-team-${profile.blockId}` }));
    revealTargets.push(card);
    card.append(new Element('template', { 'data-advisory-profile': profile.blockId, 'data-adviser': profile.blockId, 'data-name': profile.name, 'data-title': profile.title, 'data-intro': profile.opening, 'data-preparation': profile.preparation }));
  }
  const steps = root.append(new Element('ol', { class: 'cukad__journey-steps' }));
  for (let index = 0; index < 4; index++) revealTargets.push(steps.append(new Element('li')));
  revealTargets.push(root.append(new Element('div', { class: 'cukad__preview-visual' })));
  parseHtml(roomMarkup, root);
  const dialog = root.querySelector('[data-advisory-dialog]');
  dialog.open = false;
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.dispatch('close'); };
  const reduced = new Element('#media'); reduced.matches = reducedMotion;
  const fine = new Element('#media'); fine.matches = finePointer;
  const setMedia = (media, matches) => { media.matches = matches; media.dispatch('change'); };
  if (mediaSupported) window.matchMedia = (query) => query.includes('reduced-motion') ? reduced : fine;
  const frames = new Map();
  const cancelledFrames = [];
  let nextFrame = 1;
  window.requestAnimationFrame = (callback) => { const id = nextFrame++; frames.set(id, callback); return id; };
  window.cancelAnimationFrame = (id) => { cancelledFrames.push(id); frames.delete(id); };
  const flushFrame = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((callback) => callback(0)); };
  const observers = [];
  if (intersection !== 'absent') window.IntersectionObserver = class {
    constructor(callback) {
      if (intersection === 'constructor-throws') throw new Error('Observer unavailable');
      this.callback = callback; this.targets = new Set(); this.disconnected = false; observers.push(this);
    }
    observe(target) { if (intersection === 'observe-throws') throw new Error('Cannot observe'); this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); this.disconnected = true; }
    intersect(target, isIntersecting = true) { this.callback([{ target, isIntersecting }]); }
  };
  const forbiddenAccesses = [];
  const timers = new Map();
  let nextTimer = 1;
  const sandbox = { document, window, Date: { now: () => 1_000_000 }, setInterval(callback) { const id = nextTimer++; timers.set(id, callback); return id; }, clearInterval(id) { timers.delete(id); } };
  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB', 'navigator']) {
    const denied = () => { forbiddenAccesses.push(name); throw new Error(`Unexpected side effect: ${name}`); };
    Object.defineProperty(sandbox, name, { get: denied });
    Object.defineProperty(window, name, { get: denied });
  }
  Object.defineProperty(document, 'cookie', { get() { forbiddenAccesses.push('cookie'); throw new Error('Unexpected cookie access'); }, set() { forbiddenAccesses.push('cookie'); throw new Error('Unexpected cookie access'); } });
  const context = vm.createContext(sandbox);
  vm.runInContext(consultation, context, { filename: 'curtainsuk-advisory-team.js' });
  vm.runInContext(interactions, context, { filename: 'curtainsuk-advisory-interactions.js' });
  const click = (node) => node.dispatch('click', { bubbles: true });
  const select = (index) => { selectors[index].focus(); click(selectors[index].children[0]); };
  const key = (index, key) => { selectors[index].focus(); return selectors[index].dispatch('keydown', { key, bubbles: true }); };
  const move = (x = 400, y = 500, pointerType = 'mouse') => stage.dispatch('pointermove', { clientX: x, clientY: y, pointerType });
  return { document, window, root, spotlight, stage, selectors, panels, dialog, revealTargets, reduced, fine, setMedia, observers, frames, cancelledFrames, flushFrame, forbiddenAccesses, timers, select, click, key, move };
}

function assertSelection(h, index) {
  assert.equal(h.panels.filter((panel) => !panel.hidden).length, 1);
  assert.equal(h.panels[index].hidden, false);
  assert.equal(h.spotlight.dataset.activeAdviser, profiles[index].blockId);
  assert.deepEqual(h.selectors.map((button) => button.getAttribute('aria-pressed')), profiles.map((_, selected) => String(selected === index)));
  assert.equal(h.selectors[index].getAttribute('aria-controls'), h.panels[index].getAttribute('id'));
}

test('all six spotlight selections stay coherent and open the same adviser in the real consultation controller', () => {
  const h = harness();
  assertSelection(h, 0);
  assert.equal(h.spotlight.querySelector('[data-spotlight-controls]').hidden, false);
  assert.equal(h.spotlight.querySelector('[data-spotlight-status]').textContent, '', 'Initial page load does not announce a change');
  for (let index = 0; index < profiles.length; index++) {
    h.select(index);
    assertSelection(h, index);
    assert.equal(h.document.activeElement, h.selectors[index]);
    const profile = profiles[index];
    assert.equal(h.spotlight.querySelector('[data-spotlight-status]').textContent, `${profile.name} — ${profile.title}`);
    const preview = h.panels[index].querySelector('[data-advisory-open]');
    assert.equal(preview.dataset.adviser, profile.blockId);
    assert.equal(preview.hidden, false);
    assert.match(preview.getAttribute('aria-label'), new RegExp(profile.name));
    h.click(preview);
    assert.equal(h.dialog.open, true);
    assert.equal(h.dialog.querySelector('[data-advisory-name]').textContent, profile.name);
    assert.equal(h.dialog.querySelector('[data-advisory-title]').textContent, profile.title);
    h.dialog.close();
    assert.equal(h.document.activeElement, preview);
  }
  for (const index of [5, 2, 1, 4, 0, 3]) h.select(index);
  assertSelection(h, 3);
});

test('Arrow keys wrap, Home/End select their endpoints, and unrelated keys keep native behavior', () => {
  const h = harness();
  for (const [from, key, to] of [[0, 'ArrowLeft', 5], [5, 'ArrowRight', 0], [0, 'End', 5], [5, 'Home', 0], [0, 'ArrowRight', 1]]) {
    assert.equal(h.key(from, key).defaultPrevented, true);
    assertSelection(h, to);
    assert.equal(h.document.activeElement, h.selectors[to]);
  }
  assert.equal(h.key(1, 'Tab').defaultPrevented, false);
  assertSelection(h, 1);
  const outsideKey = h.panels[1].dispatch('keydown', { key: 'End', bubbles: true });
  assert.equal(outsideKey.defaultPrevented, false);
  assertSelection(h, 1);
});

test('reduced-motion startup preserves usable selection without reveal or pointer work', () => {
  const h = harness({ reducedMotion: true });
  h.move();
  assert.equal(h.frames.size, 0);
  assert.equal(h.observers.length, 0);
  assert.ok(h.revealTargets.every((target) => target.getClientRects().length > 0));
  h.select(4);
  assertSelection(h, 4);
});

test('live reduced-motion preference cancels pending work, removes effects and can safely re-enable observation', () => {
  const h = harness();
  const initialObserver = h.observers[0];
  initialObserver.intersect(h.revealTargets[0]);
  assert.equal(h.revealTargets[0].classList.contains('cukad-in-view'), true);
  h.move(); h.flushFrame();
  assert.notEqual(h.stage.style.getPropertyValue('--tilt-x'), '');
  h.move(100, 200);
  h.setMedia(h.reduced, true);
  assert.equal(h.frames.size, 0);
  assert.equal(initialObserver.disconnected, true);
  assert.ok(h.revealTargets.every((target) => !target.classList.contains('cukad-in-view')));
  assert.equal(h.stage.style.getPropertyValue('--tilt-x'), '');
  assert.equal(h.stage.style.getPropertyValue('--glow-y'), '');
  h.move();
  assert.equal(h.frames.size, 0);
  h.setMedia(h.reduced, false);
  assert.equal(h.observers.length, 2);
  assert.equal(h.observers[1].targets.size, h.revealTargets.length);
});

test('fine-pointer bursts coalesce into one frame; depth remains bounded and leave cancels it', () => {
  const h = harness();
  for (let index = 0; index < 50; index++) h.move(100 + index, 200 + index);
  h.move(10_000, -10_000);
  assert.equal(h.frames.size, 1);
  assert.equal(h.stage.boundsReads, 0, 'No synchronous layout reads for each pointer event');
  h.flushFrame();
  assert.equal(h.stage.boundsReads, 1);
  assert.equal(h.frames.size, 0, 'No perpetual animation loop');
  for (const property of ['--tilt-x', '--tilt-y']) {
    assert.match(h.stage.style.getPropertyValue(property), /deg$/);
    assert.ok(Math.abs(parseFloat(h.stage.style.getPropertyValue(property))) <= 6);
  }
  assert.equal(h.stage.style.getPropertyValue('--glow-x'), '100.0%');
  assert.equal(h.stage.style.getPropertyValue('--glow-y'), '0.0%');
  h.move();
  h.stage.dispatch('pointerleave');
  assert.equal(h.frames.size, 0);
  assert.equal(h.cancelledFrames.length, 1);
  assert.equal(h.stage.style.getPropertyValue('--tilt-x'), '');
  assert.equal(h.stage.style.getPropertyValue('--glow-x'), '');
});

test('coarse pointers and touch do no depth work; changing pointer capabilities clears active effects', () => {
  const coarse = harness({ finePointer: false });
  coarse.move();
  assert.equal(coarse.frames.size, 0);
  const h = harness();
  h.move(400, 500, 'touch');
  assert.equal(h.frames.size, 0);
  h.move(); h.flushFrame(); h.move();
  h.setMedia(h.fine, false);
  assert.equal(h.frames.size, 0);
  assert.equal(h.stage.style.getPropertyValue('--tilt-x'), '');
  h.move();
  assert.equal(h.frames.size, 0);
  const noMedia = harness({ mediaSupported: false });
  noMedia.move(); noMedia.select(5);
  assert.equal(noMedia.frames.size, 0);
  assertSelection(noMedia, 5);
});

test('missing or failing IntersectionObserver preserves readable content and spotlight operation', () => {
  for (const intersection of ['absent', 'constructor-throws', 'observe-throws']) {
    const h = harness({ intersection });
    assert.ok(h.revealTargets.every((target) => target.getClientRects().length > 0), intersection);
    assert.ok(h.revealTargets.every((target) => !target.classList.contains('cukad-in-view')), intersection);
    h.select(2);
    assertSelection(h, 2);
    if (intersection === 'observe-throws') assert.equal(h.observers[0].disconnected, true);
  }
});

test('observed content animates only on entry and completed targets stop being observed', () => {
  const h = harness();
  const observer = h.observers[0];
  const target = h.revealTargets[0];
  observer.intersect(target, false);
  assert.equal(target.classList.contains('cukad-in-view'), false);
  assert.equal(observer.targets.has(target), true);
  observer.intersect(target, true);
  assert.equal(target.classList.contains('cukad-in-view'), true);
  assert.equal(observer.targets.has(target), false);
  assert.equal(observer.targets.size, h.revealTargets.length - 1);
});

test('duplicate section load is idempotent and unload cleans up media, pointer, observer and pending frame work', () => {
  const h = harness();
  h.document.dispatch('shopify:section:load', { target: h.document.body });
  assert.equal(h.observers.length, 1);
  assert.equal(h.spotlight.listeners.get('click').size, 1);
  assert.equal(h.stage.listeners.get('pointermove').size, 1);
  h.document.dispatch('shopify:section:unload', { target: new Element('aside') });
  assert.equal(h.root.dataset.advisoryInteractionsReady, 'true');
  h.move();
  h.document.dispatch('shopify:section:unload', { target: h.document.body });
  assert.equal(h.frames.size, 0);
  assert.equal(h.observers[0].disconnected, true);
  assert.equal(h.spotlight.listeners.get('click').size, 0);
  assert.equal(h.spotlight.listeners.get('keydown').size, 0);
  assert.equal(h.stage.listeners.get('pointermove').size, 0);
  assert.equal(h.reduced.listeners.get('change').size, 0);
  assert.equal(h.fine.listeners.get('change').size, 0);
  assert.equal(h.root.dataset.advisoryInteractionsReady, undefined);
  h.setMedia(h.reduced, true); h.move();
  assert.equal(h.observers.length, 1);
  assert.equal(h.frames.size, 0);
  h.document.dispatch('shopify:section:load', { target: h.document.body });
  h.select(5);
  assertSelection(h, 5);
  assert.equal(h.spotlight.listeners.get('click').size, 1);
});

test('all interaction paths avoid model/network/storage APIs and keep controls outside aria-hidden ancestors', () => {
  const h = harness();
  for (const selector of h.selectors) {
    for (let node = selector; node; node = node.parentElement) assert.notEqual(node.getAttribute('aria-hidden'), 'true');
  }
  for (let index = 0; index < 6; index++) h.select(index);
  h.move(); h.flushFrame();
  h.setMedia(h.reduced, true); h.setMedia(h.reduced, false);
  h.observers.at(-1).intersect(h.revealTargets.at(-1));
  h.click(h.panels[5].querySelector('[data-advisory-open]'));
  h.dialog.close();
  h.document.dispatch('shopify:section:unload', { target: h.document.body });
  assert.deepEqual(h.forbiddenAccesses, []);
  assert.equal(h.timers.size, 0);
});
