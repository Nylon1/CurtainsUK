import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { visualiserPage, withRoomPreview } from '../../room-visualiser/server';

const theme = new URL('../../../shopify-theme/curtainsuk-dawn-16/', import.meta.url);
const source = readFileSync(new URL('assets/curtainsuk-profile-curtain.js', theme), 'utf8');
const origin = 'https://www.curtainsuk.com';
const fabricId = 'sdg-f1325-02';

function harness() {
  const events: Record<string, Function> = {}, clicks: Record<string, Function> = {};
  const messages: unknown[] = [], retries: unknown[] = [];
  let intersect: Function = () => {}, timer: Function = () => {};
  const child = { postMessage: (message: unknown, target: string) => messages.push({ message, target }) };
  const frame = { hidden: true, src: '', contentWindow: child, removeAttribute() { this.src = ''; } };
  const status = { textContent: '' }, motion = { textContent: '' }, scale = { textContent: '' };
  const poster = { hidden: false }, roomLink = { hidden: true };
  const buttons = ['open', 'stop', 'close', 'day', 'evening'].map(command => ({
    disabled: true,
    dataset: ['day', 'evening'].includes(command) ? { previewLight: command } : { previewCommand: command },
    attributes: {} as Record<string, string>,
    setAttribute(key: string, value: string) { this.attributes[key] = value; },
  }));
  const retry = { hidden: true, addEventListener: (name: string, handler: Function) => { clicks.retry = handler; } };
  const nodes: Record<string, unknown> = {
    iframe: frame, '[data-preview-status]': status, '[data-preview-motion]': motion,
    '[data-preview-scale]': scale, '[data-preview-poster]': poster,
    '[data-preview-retry]': retry, '[data-preview-room-link]': roomLink,
  };
  const page: any = {
    dataset: { fabricMasterId: fabricId }, querySelector: () => root,
    dispatchEvent: (event: unknown) => retries.push(event),
    closest() { return this; },
  };
  const root: any = {
    dataset: { loading: 'Loading', unavailable: 'Unavailable', single: 'Single width', floor: 'Floor length',
      open: 'Open', closed: 'Closed', stopped: 'Stopped', opening: 'Opening', closing: 'Closing' },
    closest: () => page,
    querySelector: (key: string) => nodes[key],
    querySelectorAll: (key: string) => key === '[data-preview-light]' ? buttons.slice(3) : buttons,
    addEventListener: (name: string, handler: Function) => { clicks[name] = handler; },
  };
  class Observer {
    constructor(handler: Function) { intersect = handler; }
    observe() {}
    disconnect() {}
  }
  const window = { IntersectionObserver: Observer, addEventListener: (name: string, fn: Function) => { events[name] = fn; } };
  const document = { readyState: 'complete', querySelectorAll: () => [root],
    addEventListener: (name: string, fn: Function) => { events[name] = fn; } };
  runInNewContext(source, {
    window, document, location: { origin }, IntersectionObserver: Observer,
    setTimeout: (fn: Function) => { timer = fn; return 1; }, clearTimeout() {},
    CustomEvent: class { constructor(public type: string) {} },
  });
  const available = (preview: unknown = { available: true, url: `/pages/room-visualiser?fabric=${fabricId}` }) =>
    events['cuk:room-preview']({ target: page, detail: { fabricId, preview } });
  const message = (state: string, overrides: object = {}) =>
    events.message({ origin, source: child, data: { type: 'cuk:fabric-curtain', fabricId, state, profile: 'single' }, ...overrides });
  const click = (index: number) => clicks.click({ target: { closest: () => buttons[index] } });
  return { available, message, click, near: () => intersect([{ isIntersecting: true }]),
    leave: () => intersect([{ isIntersecting: false }]), timeout: () => timer(), retry: () => clicks.retry(),
    frame, poster, status, motion, scale, buttons, roomLink, messages, retries };
}

test('the curtain engine loads only near the preview, after exact-fabric availability', () => {
  const h = harness();
  assert.equal(h.frame.src, '');
  h.available();
  assert.equal(h.frame.src, '');
  h.near();
  assert.equal(h.frame.src, `/apps/curtainsuk-decision/room-visualiser?fabric=${fabricId}&embed=fabric-profile`);
  assert.ok(h.buttons.every(button => button.disabled));
  h.message('ready', { origin: 'https://untrusted.example' });
  h.message('ready', { source: {} });
  h.message('ready', { data: { type: 'cuk:fabric-curtain', fabricId: 'other-fabric', state: 'ready' } });
  assert.ok(h.buttons.every(button => button.disabled), 'unrelated windows cannot unlock controls');
  h.message('ready');
  assert.ok(h.buttons.every(button => !button.disabled));
  assert.equal(h.poster.hidden, true);
  assert.equal(h.scale.textContent, 'Single width');
});

test('remote and lighting commands target only the current fabric frame without restarting it', () => {
  const h = harness(); h.near(); h.available(); h.message('ready');
  const url = h.frame.src;
  h.click(0); h.message('opening'); h.click(1); h.message('stopped');
  assert.equal(h.motion.textContent, 'Stopped');
  h.click(4); h.click(2); h.message('closing'); h.leave();
  assert.equal(h.frame.src, url);
  const sent = JSON.parse(JSON.stringify(h.messages));
  assert.deepEqual(sent.map((entry: any) => entry.message.command), ['day', 'open', 'stop', 'evening', 'close', 'stop']);
  assert.ok(sent.every((entry: any) => entry.target === origin && entry.message.fabricId === fabricId));
});

test('failed or mismatched previews cannot move; retry keeps the selected fabric', () => {
  const h = harness(); h.near();
  h.available({ available: true, url: '/pages/room-visualiser?fabric=other-fabric' });
  assert.equal(h.frame.src, ''); assert.equal(h.roomLink.hidden, true);
  h.click(0); assert.equal(h.messages.length, 0);
  h.retry(); assert.equal(h.retries.length, 1);
  h.available(); h.timeout();
  assert.equal(h.frame.src, ''); assert.equal(h.status.textContent, 'Unavailable');
  assert.ok(h.buttons.every(button => button.disabled));
  h.retry(); assert.match(h.frame.src, /fabric=sdg-f1325-02&embed=fabric-profile$/);
  h.message('ready'); h.message('error');
  assert.equal(h.poster.hidden, false); assert.equal(h.frame.src, '');
});

test('the motor demo keeps both released render profiles and leaves normal Room Visualiser HTML intact', async () => {
  assert.equal(withRoomPreview({ id: fabricId }).roomPreview.rendererProfile, 'FIXED140_SINGLE_WIDTH_V1');
  assert.equal(withRoomPreview({ id: 'pt-4049-629', horizontalRepeatMm: 353, verticalRepeatMm: 630 }).roomPreview.rendererProfile, 'STANDARD');
  const url = `${origin}/apps/curtainsuk-decision/room-visualiser?fabric=${fabricId}`;
  const full = await (await visualiserPage(new Request(url))).text();
  const original = readFileSync(new URL('../../room-visualiser/runtime/rooms/customer.html', import.meta.url), 'utf8');
  const standard = JSON.parse(readFileSync(new URL('../../room-visualiser/build.json', import.meta.url), 'utf8'));
  const fixed = JSON.parse(readFileSync(new URL('../../room-visualiser/fixed140-build.json', import.meta.url), 'utf8'));
  assert.equal(full, original.replaceAll('__VISUALISER_ASSET_BASE__', `https://curtainsuk-production-api.vercel.app${standard.assetBase}`)
    .replaceAll('__FIXED140_ASSET_BASE__', `https://curtainsuk-production-api.vercel.app${fixed.assetBase}`));
  const demo = await (await visualiserPage(new Request(`${url}&embed=fabric-profile`))).text();
  assert.doesNotMatch(demo, /__VISUALISER_ASSET_BASE__|__FIXED140_ASSET_BASE__/);
  assert.match(demo, /Your fabric in motion/);
  assert.match(demo, /createFixed140TravelSolver/);
  assert.match(demo, /await built\.setFabric\(entry\.id\)/);
});
