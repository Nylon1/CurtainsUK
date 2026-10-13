import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const theme = path.join(repository, 'shopify-theme/curtainsuk-dawn-16');
const read = (file) => readFileSync(path.join(theme, file), 'utf8');
const themeJson = (text) => JSON.parse(text.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ''));
const controller = read('assets/curtainsuk-advisory-team.js');
const roomMarkup = read('snippets/curtainsuk-advisory-room.liquid');
const ids = ['jane', 'anne', 'noah', 'james', 'ben', 'natalie'];
const profiles = ids.map((id) => JSON.parse(readFileSync(path.join(repository, `docs/specialist-advisory/${id}.v1.json`), 'utf8')));
const camel = (name) => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

// This small DOM adapter supplies only platform behavior used by the real controller.
// The dialog tree is parsed from its actual Liquid snippet, including hidden and disabled controls.
class Element {
  constructor(tag, attributes = {}) {
    this.tagName = tag.toLowerCase();
    this.attributes = attributes;
    this.dataset = Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith('data-')).map(([key, value]) => [camel(key.slice(5)), value]));
    this.children = [];
    this.listeners = new Map();
    this.style = {};
    this.hidden = Object.hasOwn(attributes, 'hidden');
    this.disabled = Object.hasOwn(attributes, 'disabled');
    this.textContent = '';
    this.value = Number(attributes.value ?? 0);
  }
  append(child) {
    child.parentElement = this;
    child.setDocument(this.ownerDocument);
    this.children.push(child);
    return child;
  }
  setDocument(document) {
    this.ownerDocument = document;
    this.children.forEach((child) => child.setDocument(document));
  }
  matches(selector) {
    return selector.split(',').some((part) => {
      part = part.trim();
      if (part === 'button:not([disabled])') return this.tagName === 'button' && !this.disabled;
      if (part === 'a[href]') return this.tagName === 'a' && Object.hasOwn(this.attributes, 'href');
      const attribute = part.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
      return attribute ? Object.hasOwn(this.attributes, attribute[1]) && (attribute[2] === undefined || this.attributes[attribute[1]] === attribute[2]) : this.tagName === part;
    });
  }
  querySelectorAll(selector) {
    return this.children.flatMap((child) => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  contains(node) { return node === this || this.children.some((child) => child.contains(node)); }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) ?? null; }
  getClientRects() {
    for (let node = this; node; node = node.parentElement) if (node.hidden || (node.tagName === 'dialog' && !node.open)) return [];
    return [{}];
  }
  focus() { if (!this.disabled) this.ownerDocument.activeElement = this; }
  addEventListener(name, listener) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(listener);
  }
  removeEventListener(name, listener) { this.listeners.get(name)?.delete(listener); }
  dispatch(name, values = {}) {
    const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...values };
    for (const listener of [...(this.listeners.get(name) ?? [])]) listener(event);
    return event;
  }
}

function parseDialog(markup, parent) {
  const stack = [parent];
  const voidTags = new Set(['br', 'hr', 'img', 'input', 'link', 'meta', 'source']);
  for (const match of markup.matchAll(/<(\/?)([a-z][a-z0-9-]*)([^>]*?)>/gi)) {
    const [, closing, tag, rawAttributes] = match;
    if (closing) { if (stack.at(-1).tagName === tag.toLowerCase()) stack.pop(); continue; }
    const attributes = {};
    for (const attribute of rawAttributes.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      attributes[attribute[1]] = attribute[2] ?? attribute[3] ?? attribute[4] ?? '';
    }
    const node = stack.at(-1).append(new Element(tag, attributes));
    if (!voidTags.has(tag.toLowerCase()) && !rawAttributes.endsWith('/')) stack.push(node);
  }
}

function harness({ modalSupported = true, failOpen = false } = {}) {
  const document = new Element('#document');
  document.ownerDocument = document;
  document.hidden = false;
  document.body = document.append(new Element('body'));
  document.body.style.overflow = 'auto';
  document.activeElement = document.body;
  const window = new Element('#window');
  const root = document.body.append(new Element('section', {
    'data-advisory-team': '', 'data-wait-status': 'Preview preparation has started.',
    'data-room-status': 'Illustrative room preview. No live AI service.', 'data-unavailable': 'The preview is unavailable.',
  }));
  const buttons = new Map();
  for (const profile of profiles) {
    root.append(new Element('template', {
      'data-advisory-profile': profile.id, 'data-adviser': profile.id, 'data-name': profile.name,
      'data-title': profile.specialism, 'data-intro': profile.introductionExample, 'data-preparation': profile.questioning[0],
    }));
    const button = root.append(new Element('button', { 'data-advisory-open': '', 'data-adviser': profile.id, hidden: '' }));
    button.append(new Element('span'));
    buttons.set(profile.id, button);
  }
  const error = root.append(new Element('p', { 'data-advisory-error': '', hidden: '' }));
  parseDialog(roomMarkup, root);
  const dialog = root.querySelector('[data-advisory-dialog]');
  assert.ok(dialog, 'The actual snippet must supply the dialog');
  dialog.open = false;
  if (modalSupported) dialog.showModal = () => { if (failOpen) throw new Error('Dialog unavailable'); dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.dispatch('close'); };
  const timers = new Map();
  let now = 1_000_000;
  let nextTimer = 1;
  const forbiddenAccesses = [];
  const sandbox = {
    document, window,
    Date: { now: () => now },
    setInterval(callback, milliseconds) { const id = nextTimer++; timers.set(id, { callback, milliseconds }); return id; },
    clearInterval(id) { timers.delete(id); },
  };
  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB', 'navigator']) {
    const denied = () => { forbiddenAccesses.push(name); throw new Error(`Unexpected preview side effect: ${name}`); };
    Object.defineProperty(sandbox, name, { get: denied });
    Object.defineProperty(window, name, { get: denied });
  }
  Object.defineProperty(document, 'cookie', { get() { forbiddenAccesses.push('cookie-read'); throw new Error('Unexpected cookie read'); }, set() { forbiddenAccesses.push('cookie-write'); throw new Error('Unexpected cookie write'); } });
  vm.runInNewContext(controller, sandbox, { filename: 'curtainsuk-advisory-team.js' });
  const part = (name) => dialog.querySelector(`[data-advisory-${name}]`);
  const click = (node) => root.dispatch('click', { target: node });
  const open = (id = 'jane') => { const button = buttons.get(id); button.focus(); click(button.children[0]); return button; };
  const advance = (milliseconds, runTimers = true) => { now += milliseconds; if (runTimers) for (const timer of [...timers.values()]) timer.callback(); };
  const key = (shiftKey = false) => dialog.dispatch('keydown', { key: 'Tab', shiftKey });
  return { document, window, root, dialog, buttons, error, part, click, open, advance, key, timers, forbiddenAccesses };
}

test('real controller waits for 30 seconds of elapsed time, never interval count', () => {
  const h = harness();
  h.open();
  assert.equal(h.dialog.open, true);
  assert.equal(h.part('waiting').hidden, false);
  assert.equal(h.part('room').hidden, true);
  assert.equal(h.part('countdown').textContent, '30');
  assert.equal(h.part('progress').value, 0);
  for (let count = 0; count < 150; count++) h.advance(0);
  assert.equal(h.part('countdown').textContent, '30');
  h.advance(29_999);
  assert.equal(h.part('room').hidden, true);
  assert.equal(h.part('countdown').textContent, '1');
  assert.ok(h.part('progress').value < 30);
  h.advance(1);
  assert.equal(h.part('waiting').hidden, true);
  assert.equal(h.part('room').hidden, false);
  assert.equal(h.part('countdown').textContent, '0');
  assert.equal(h.part('progress').value, 30);
  assert.equal(h.document.activeElement, h.part('room-title'));
  assert.equal(h.timers.size, 0);
});

test('backgrounded tab catches up on visibility restoration and pageshow', () => {
  for (const event of ['visibilitychange', 'pageshow']) {
    const h = harness();
    h.open();
    h.document.hidden = true;
    h.advance(45_000, false);
    h.document.dispatch('visibilitychange');
    assert.equal(h.part('room').hidden, true);
    h.document.hidden = false;
    (event === 'pageshow' ? h.window : h.document).dispatch(event);
    assert.equal(h.part('room').hidden, false, event);
    assert.equal(h.timers.size, 0);
  }
});

test('close restores focus and scroll; reopening starts a fresh full interval', () => {
  const h = harness();
  const opener = h.open();
  assert.equal(h.document.body.style.overflow, 'hidden');
  h.advance(20_000);
  h.click(h.part('close'));
  assert.equal(h.dialog.open, false);
  assert.equal(h.document.activeElement, opener);
  assert.equal(h.document.body.style.overflow, 'auto');
  assert.equal(h.timers.size, 0);
  h.advance(60_000);
  h.open('anne');
  assert.equal(h.part('name').textContent, 'Anne');
  assert.equal(h.part('countdown').textContent, '30');
  assert.equal(h.part('room').hidden, true);
  h.advance(29_000);
  assert.equal(h.part('room').hidden, true);
  h.advance(1_000);
  assert.equal(h.part('room').hidden, false);
});

test('skip enters the labelled room and native Escape closure restores its opener', () => {
  const h = harness();
  const opener = h.open('ben');
  h.click(h.part('skip'));
  assert.equal(h.part('room').hidden, false);
  assert.equal(h.part('status').textContent, h.root.dataset.roomStatus);
  assert.equal(h.timers.size, 0);
  assert.equal(h.document.activeElement, h.part('room-title'));
  // Browsers close a native modal dialog on Escape and emit close.
  h.dialog.close();
  assert.equal(h.document.activeElement, opener);
  assert.equal(h.document.body.style.overflow, 'auto');
});

test('keyboard focus wraps using only currently visible, enabled dialog controls', () => {
  const h = harness();
  h.open();
  const close = h.part('close');
  const skip = h.part('skip');
  assert.equal(h.document.activeElement, close);
  assert.equal(h.key(true).defaultPrevented, true);
  assert.equal(h.document.activeElement, skip);
  assert.equal(h.key().defaultPrevented, true);
  assert.equal(h.document.activeElement, close);
  assert.equal(h.key().defaultPrevented, false, 'Interior tab movement is left to native browser navigation');
  h.click(skip);
  const returnButton = h.part('room').querySelector('[data-advisory-close]');
  assert.equal(h.key(true).defaultPrevented, true, 'Shift-Tab from the programmatically focused heading stays in the dialog');
  assert.equal(h.document.activeElement, returnButton);
  assert.equal(h.key().defaultPrevented, true);
  assert.equal(h.document.activeElement, close);
  assert.equal(h.key(true).defaultPrevented, true);
  assert.equal(h.document.activeElement, returnButton, 'Hidden skip and disabled send are excluded');
});

test('every adviser uses its own profile and the preview makes no network or persistence access', () => {
  const h = harness();
  for (const profile of profiles) {
    const button = h.buttons.get(profile.id);
    assert.equal(button.hidden, false);
    h.open(profile.id);
    assert.equal(h.part('name').textContent, profile.name);
    assert.equal(h.part('title').textContent, profile.specialism);
    assert.equal(h.part('example').textContent, profile.introductionExample);
    assert.equal(h.part('preparation').textContent, profile.questioning[0]);
    h.advance(30_000);
    h.click(h.part('room').querySelector('[data-advisory-close]'));
  }
  assert.deepEqual(h.forbiddenAccesses, []);
});

test('unsupported or failed modal opening keeps the page usable and exposes no fake chat', () => {
  const unsupported = harness({ modalSupported: false });
  assert.equal(unsupported.buttons.get('jane').hidden, true);
  assert.equal(unsupported.dialog.open, false);
  assert.equal(unsupported.timers.size, 0);
  const failure = harness({ failOpen: true });
  failure.open();
  assert.equal(failure.dialog.open, false);
  assert.equal(failure.error.hidden, false);
  assert.equal(failure.error.textContent, failure.root.dataset.unavailable);
  assert.equal(failure.timers.size, 0);
  assert.equal(failure.document.body.style.overflow, 'auto');
});

test('repeated section initialisation and unload do not duplicate timers or leak listeners', () => {
  const h = harness();
  h.document.dispatch('shopify:section:load', { target: h.document.body });
  h.open();
  assert.equal(h.timers.size, 1);
  h.click(h.buttons.get('anne'));
  assert.equal(h.part('name').textContent, 'Jane', 'An open consultation cannot be replaced by another opener');
  h.document.dispatch('shopify:section:unload', { target: h.document.body });
  assert.equal(h.timers.size, 0);
  assert.equal(h.dialog.open, false);
  assert.equal(h.document.body.style.overflow, 'auto');
  assert.equal(h.root.listeners.get('click').size, 0);
  assert.equal(h.document.listeners.get('visibilitychange').size, 0);
  assert.equal(h.window.listeners.get('pageshow').size, 0);
});

test('six versioned AI profiles, theme blocks and customer names agree; Jane is featured', () => {
  const template = themeJson(read('templates/page.meet-our-team.json'));
  const locale = themeJson(read('locales/en.default.json')).advisory_team;
  assert.ok(locale, 'The adviser translation namespace must exist');
  const section = template.sections.team;
  assert.deepEqual(section.block_order, ids);
  assert.deepEqual(Object.values(section.blocks).map((block) => block.settings.adviser), ids);
  assert.equal(section.blocks.jane.settings.featured, true);
  assert.equal(Object.values(section.blocks).filter((block) => block.settings.featured).length, 1);
  assert.equal(new Set(profiles.map((profile) => JSON.stringify(profile.voice))).size, 6);
  assert.equal(new Set(profiles.map((profile) => profile.introductionExample)).size, 6);
  for (const profile of profiles) {
    assert.equal(profile.status, 'designed_not_operational');
    assert.equal(profile.designation, 'AI adviser');
    assert.match(profile.profileVersion, /^\d+\.\d+\.\d+$/);
    assert.equal(locale[profile.id].name, profile.name);
    for (const field of ['title', 'intro', 'approach', 'expertise', 'question', 'preparation', 'opening']) assert.ok(locale[profile.id][field]?.trim(), `${profile.id}.${field}`);
  }
});

test('the English locale is additive against the verified production baseline', () => {
  const localePath = 'shopify-theme/curtainsuk-dawn-16/locales/en.default.json';
  const baseline = themeJson(execFileSync('git', ['show', `3649c879a4a5ddf88c2093a4172d20fbc58cd265:${localePath}`], { cwd: repository, encoding: 'utf8' }));
  const current = themeJson(read('locales/en.default.json'));
  assert.ok(current.advisory_team);
  delete current.advisory_team;
  assert.deepEqual(current, baseline, 'Existing production translations must remain unchanged');
});
