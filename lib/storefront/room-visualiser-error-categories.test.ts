import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import {parseJourneyBatch} from './customer-journey';

const root = process.cwd();
const parentScript = readFileSync(path.join(root,
  'shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-room-visualiser.js'), 'utf8');
const html = readFileSync(path.join(root, 'lib/room-visualiser/runtime/rooms/customer.html'), 'utf8');
const bridge = html.match(/<script>\s*\(\(\) => \{[\s\S]*?<\/script>/)?.[0]
  .replace(/^<script>|<\/script>$/g, '');
assert.ok(bridge);

test('embedded visualiser sends only fixed failure categories', () => {
  for (const [error, reason] of [
    ['WebGLRenderer: Error creating WebGL context for private@example.com', 'ROOM_FRAME_GRAPHICS_UNAVAILABLE'],
    ['TypeError: Failed to fetch dynamically imported module at private@example.com', 'ROOM_FRAME_MODULE_UNAVAILABLE'],
    ['Error: ROOM_MANIFEST_UNAVAILABLE at private@example.com', 'ROOM_FRAME_ASSET_UNAVAILABLE'],
    ['NetworkError: Failed to fetch private@example.com', 'ROOM_FRAME_NETWORK_UNAVAILABLE'],
    ['Unexpected private@example.com', 'ROOM_FRAME_RENDER_FAILED'],
  ]) {
    const messages: unknown[] = [];
    const window = {parent: {postMessage(message: unknown) {messages.push(message);}},
      roomProof: {loading: {state: {error}}}};
    const document = {querySelector(selector: string) {return selector === '#loading'
      ? {hidden: false} : {hidden: false};}};
    class MutationObserver {observe() {}}
    vm.runInNewContext(bridge, {window, document,
      location: {search: '?frameAttempt=1', origin: 'https://www.curtainsuk.com'},
      URLSearchParams, MutationObserver});
    assert.equal((messages[0] as {reason: string}).reason, reason);
    assert.doesNotMatch(JSON.stringify(messages), /private@example\.com/);
  }
});

test('page accepts only a category from its own current visualiser frame', () => {
  const listeners = new Map<string, (event: unknown) => void>();
  const reports: string[] = [];
  const frame = {dataset: {source: '/apps/curtainsuk-decision/room-visualiser'},
    contentWindow: {}, src: '', addEventListener() {}};
  const nodes: Record<string, unknown> = {
    '[data-room-frame]': frame, '[data-room-status]': {hidden: false},
    '[data-room-status-text]': {textContent: ''}, '[data-room-recovery]': {hidden: true},
    '[data-room-open]': {href: ''}, '[data-room-retry]': {
      addEventListener(_name: string, listener: (event: unknown) => void) {listeners.set('retry', listener);}},
  };
  const section = {dataset: {defaultRoom: 'living', initialised: '', state: ''},
    querySelector(selector: string) {return nodes[selector];}};
  const document = {
    querySelectorAll() {return [section];}, addEventListener() {},
    dispatchEvent(event: {detail: {reason: string}}) {reports.push(event.detail.reason);},
  };
  const window = {addEventListener(_name: string, listener: (event: unknown) => void) {
    listeners.set('message', listener);}, removeEventListener() {}};
  vm.runInNewContext(parentScript, {document, window,
    location: {origin: 'https://www.curtainsuk.com', search: ''}, URL, URLSearchParams,
    CustomEvent: class {detail: unknown; constructor(_name: string, options: {detail: unknown}) {
      this.detail = options.detail;}}, setTimeout: () => 1, clearTimeout() {}});
  const send = (origin: string, attempt: number, reason: string) => listeners.get('message')?.({
    origin, source: frame.contentWindow,
    data: {type: 'curtainsuk:room-frame', status: 'error', attempt, reason},
  });
  send('https://untrusted.example', 1, 'ROOM_FRAME_GRAPHICS_UNAVAILABLE');
  send('https://www.curtainsuk.com', 2, 'ROOM_FRAME_GRAPHICS_UNAVAILABLE');
  assert.deepEqual(reports, []);
  send('https://www.curtainsuk.com', 1, 'ROOM_FRAME_GRAPHICS_UNAVAILABLE');
  assert.deepEqual(reports, ['ROOM_FRAME_GRAPHICS_UNAVAILABLE']);
  listeners.get('retry')?.({});
  send('https://www.curtainsuk.com', 2, 'private@example.com');
  assert.deepEqual(reports, ['ROOM_FRAME_GRAPHICS_UNAVAILABLE', 'ROOM_FRAME_CHILD_ERROR']);
});

test('Error Centre records the category and rejects arbitrary child text', () => {
  const listeners = new Map<string, (event: unknown) => void>();
  const sent: string[] = [];
  const location = {origin: 'https://www.curtainsuk.com', hostname: 'www.curtainsuk.com',
    href: 'https://www.curtainsuk.com/pages/room-visualiser?fabric=private-value'};
  const window = {Shopify: {customerPrivacy: {analyticsProcessingAllowed: () => true}},
    fetch: async (_url: string, options: {body: string}) => {sent.push(options.body); return {ok: true};},
    addEventListener() {}};
  vm.runInNewContext(readFileSync(path.join(root,
    'shopify-theme/curtainsuk-dawn-16/assets/customer-journey.js'), 'utf8'), {
    window, location, URL, Promise,
    document: {readyState: 'complete', referrer: '',
      addEventListener(name: string, listener: (event: unknown) => void) {listeners.set(name, listener);}},
    sessionStorage: {getItem: () => null, setItem() {}, removeItem() {}},
    crypto: {randomUUID}, navigator: {},
    performance: {getEntriesByType: () => [], now: () => 0},
    setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {},
  });
  listeners.get('curtainsuk:room-frame-error')?.({detail: {reason: 'ROOM_FRAME_MODULE_UNAVAILABLE'}});
  const events = parseJourneyBatch(JSON.parse(sent.at(-1)!), 'Chrome/120');
  const failure = events.find(event => event.kind === 'ERROR');
  assert.equal(failure?.code, 'ROOM_FRAME_MODULE_UNAVAILABLE');
  assert.equal(failure?.error_detail?.reasonCode, 'ROOM_FRAME_MODULE_UNAVAILABLE');
  assert.deepEqual(failure?.error_detail?.request,
    {method: 'GET', route: '/apps/curtainsuk-decision/room-visualiser'});
  assert.doesNotMatch(sent.join(''), /private-value/);
  listeners.get('curtainsuk:room-frame-error')?.({detail: {reason: 'private@example.com'}});
  assert.equal(sent.length, 1);
});
