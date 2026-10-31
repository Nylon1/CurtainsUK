import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = process.cwd();
const script = readFileSync(path.join(root, 'shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-room-visualiser.js'), 'utf8');
const html = readFileSync(path.join(root, 'lib/room-visualiser/runtime/rooms/customer.html'), 'utf8');
const liquid = readFileSync(path.join(root, 'shopify-theme/curtainsuk-dawn-16/sections/curtainsuk-room-visualiser.liquid'), 'utf8');

function parentFixture(search = '?fabric=fabric-one&room=bedroom') {
  const listeners = new Map<string, (event: any) => void>();
  const timers = new Map<number, {run: () => void; delay: number}>();
  const reports: string[] = [];
  let nextTimer = 0;
  const frame = {dataset: {source: '/apps/curtainsuk-decision/room-visualiser'}, src: '',
    contentWindow: {}, contentDocument: {URL: 'about:blank'},
    addEventListener(name: string, callback: (event: any) => void) { listeners.set(`frame:${name}`, callback); }};
  const status = {hidden: false};
  const label = {textContent: ''};
  const recovery = {hidden: true};
  const direct = {href: ''};
  const retry = {addEventListener(name: string, callback: (event: any) => void) { listeners.set(`retry:${name}`, callback); }};
  const nodes: Record<string, unknown> = {
    '[data-room-frame]': frame, '[data-room-status]': status,
    '[data-room-status-text]': label, '[data-room-recovery]': recovery,
    '[data-room-open]': direct, '[data-room-retry]': retry,
  };
  const section = {dataset: {defaultRoom: 'living', initialised: '', state: ''},
    querySelector(selector: string) { return nodes[selector]; }};
  const document = {
    querySelectorAll(selector: string) { return selector === '[data-cuk-room-tool]' ? [section] : []; },
    addEventListener(name: string, callback: (event: any) => void) { listeners.set(`document:${name}`, callback); },
    dispatchEvent(event: {detail: {reason: string}}) { reports.push(event.detail.reason); },
  };
  const window = {
    addEventListener(name: string, callback: (event: any) => void) { listeners.set(`window:${name}`, callback); },
    removeEventListener(name: string) { listeners.delete(`window:${name}`); },
  };
  vm.runInNewContext(script, {document, window, location: {origin: 'https://www.curtainsuk.com', search},
    URL, URLSearchParams, CustomEvent: class {detail: unknown; constructor(_name: string, options: {detail: unknown}) {this.detail = options.detail;}},
    setTimeout(run: () => void, delay: number) {const id = ++nextTimer; timers.set(id, {run, delay}); return id;},
    clearTimeout(id: number) {timers.delete(id);}});
  return {frame, status, label, recovery, direct, section, listeners, timers, reports,
    message(origin: string, source: unknown, attempt: number, state = 'ready') {
      listeners.get('window:message')?.({origin, source, data: {type: 'curtainsuk:room-frame', status: state, attempt}});
    },
    fireTimer(delay: number) {for (const [id, timer] of [...timers]) if (timer.delay === delay) {timers.delete(id); timer.run();}},
  };
}

test('iframe recovery keeps the chosen fabric and room in the direct link', () => {
  assert.match(liquid, /data-room-open/);
  const f = parentFixture();
  assert.equal(f.direct.href, 'https://www.curtainsuk.com/apps/curtainsuk-decision/room-visualiser?fabric=fabric-one&room=bedroom');
  assert.equal(new URL(f.frame.src).searchParams.get('frameAttempt'), '1');
  f.fireTimer(10000);
  assert.match(f.label.textContent, /open it in a new tab/);
  f.message('https://untrusted.example', f.frame.contentWindow, 1);
  f.message('https://www.curtainsuk.com', {}, 1);
  assert.equal(f.section.dataset.state, 'loading');
  f.message('https://www.curtainsuk.com', f.frame.contentWindow, 1);
  assert.equal(f.section.dataset.state, 'ready');
  assert.equal(f.status.hidden, true);
  assert.equal(f.timers.size, 0);
});

test('Bay Window links open Bay in the embedded and direct visualiser', () => {
  const f = parentFixture('?fabric=pt-1204-212&room=bay');
  const embedded = new URL(f.frame.src);
  assert.equal(embedded.searchParams.get('room'), 'bay');
  assert.equal(embedded.searchParams.get('fabric'), 'pt-1204-212');
  assert.equal(f.direct.href, 'https://www.curtainsuk.com/apps/curtainsuk-decision/room-visualiser?fabric=pt-1204-212&room=bay');
  f.listeners.get('retry:click')?.({});
  assert.equal(new URL(f.frame.src).searchParams.get('room'), 'bay');
  const invalid = new URL(parentFixture('?fabric=one&fabric=two&room=attic').frame.src);
  assert.equal(invalid.searchParams.has('room'), false);
  assert.deepEqual(invalid.searchParams.getAll('fabric'), ['one', 'two']);
});

test('blank frame reports a specific error and retry rejects stale ready signals', () => {
  const f = parentFixture();
  f.fireTimer(45000);
  assert.equal(f.section.dataset.state, 'error');
  assert.deepEqual(f.reports, ['ROOM_FRAME_ABOUT_BLANK']);
  assert.equal(f.recovery.hidden, false);
  f.listeners.get('retry:click')?.({});
  assert.equal(new URL(f.frame.src).searchParams.get('frameAttempt'), '2');
  f.message('https://www.curtainsuk.com', f.frame.contentWindow, 1);
  assert.equal(f.section.dataset.state, 'loading');
  f.message('https://www.curtainsuk.com', f.frame.contentWindow, 2, 'error');
  assert.equal(f.section.dataset.state, 'error');
  assert.deepEqual(f.reports, ['ROOM_FRAME_ABOUT_BLANK', 'ROOM_FRAME_CHILD_ERROR']);
});

test('embedded runtime sends only verified ready or failure states to its parent', () => {
  const bridge = html.match(/<script>\s*\(\(\) => \{[\s\S]*?<\/script>/)?.[0].replace(/^<script>|<\/script>$/g, '');
  assert.ok(bridge);
  const messages: unknown[] = [];
  const loading = {hidden: false};
  const retry = {hidden: true};
  let changed: (() => void) | undefined;
  const window = {parent: {postMessage(message: unknown, target: string) {messages.push({message, target});}},
    visualiserCustomer: {proof: {ready: false}}, roomProof: {ready: false}};
  const document = {querySelector(selector: string) {return selector === '#loading' ? loading : retry;}};
  class MutationObserver {constructor(callback: () => void) {changed = callback;} observe() {}}
  vm.runInNewContext(bridge, {window, document, location: {search: '?frameAttempt=7', origin: 'https://www.curtainsuk.com'},
    URLSearchParams, MutationObserver});
  assert.equal(messages.length, 0);
  loading.hidden = true;
  window.visualiserCustomer.proof.ready = true;
  window.roomProof.ready = true;
  changed?.(); changed?.();
  assert.deepEqual(JSON.parse(JSON.stringify(messages)), [{message: {type: 'curtainsuk:room-frame', status: 'ready', attempt: 7}, target: 'https://www.curtainsuk.com'}]);
  retry.hidden = false;
  changed?.();
  assert.equal(messages.length, 2);
  assert.equal((messages[1] as {message: {status: string}}).message.status, 'error');
});
