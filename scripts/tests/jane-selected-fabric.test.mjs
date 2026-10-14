import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = relative => readFileSync(path.join(root, relative), 'utf8');
const chat = read('shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-jane-chat.js');
const saxon = 'pt-7141-127';
const mellora = 'pt-1204-212';
const sessionId = '11111111-1111-4111-8111-111111111111';
const ownerBinding = 'a'.repeat(32);

class Node {
  constructor(tag = 'div') {
    this.tag = tag; this.children = []; this.listeners = new Map();
    this.hidden = false; this.disabled = false; this.checked = false; this.dataset = {};
    this.textContent = ''; this.value = ''; this.scrollTop = 0; this.scrollHeight = 1000;
  }
  get childElementCount() { return this.children.length; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
  emit(type, detail) { return this.listeners.get(type)?.({ detail, preventDefault() {} }); }
  querySelector() { return new Node('button'); }
  querySelectorAll(selector) { return selector.includes('assistant') ? this.children.filter(n => n.dataset?.role === 'assistant') : []; }
  getBoundingClientRect() { return { top: this.tag === 'dialog' ? 10 : 210 }; }
  scrollTo(options) { this.lastScroll = options; }
  closest() { return this; }
  focus() {}
  blur() { this.blurred = true; }
}

function room({ unavailable = false, failFirstMessage = false, unansweredContext = false } = {}) {
  const nodes = new Map();
  const node = name => { if (!nodes.has(name)) nodes.set(name, new Node()); return nodes.get(name); };
  const panel = { querySelector: selector => node(selector.match(/^\[data-jane-([^\]]+)\]$/)?.[1] ?? selector) };
  node('consent').closest = () => node('consent-label');
  node('form').querySelector = () => node('send');
  const dialog = new Node('dialog');
  dialog.querySelector = selector => selector === '[data-jane-chat]' ? panel : new Node();
  const location = { origin: 'https://www.curtainsuk.com', pathname: '/pages/meet-our-team', search: `?entry=fabric-detail&jane_fabric=${saxon}` };
  const document = { querySelectorAll: () => [dialog], createElement: tag => new Node(tag), addEventListener() {}, hidden: false };
  const requests = [];
  let failMessage = failFirstMessage;
  const saved = {
    id: sessionId, revision: unansweredContext ? 1 : 0,
    messages: [
      { role: 'user', text: 'How does Mellora look in my room?', at: 10 },
      { role: 'assistant', text: 'Mellora in Blush could work with the olive sofa.', at: 20 },
    ],
    contexts: unansweredContext ? [{ id: 'saxon-context', receivedAt: 50, value: { fabricIds: [saxon], references: ['fabric-detail:v1'] } }] : [{ id: 'mellora-context', receivedAt: 5, value: { fabricIds: [mellora], references: ['fabric-detail:v1'] } }],
  };
  const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
  async function fetch(url, options = {}) {
    if (url.includes('/catalog?')) return response({ fabric: { id: saxon, design: 'Saxon', colour: 'Oak', browseReady: true, launchReady: true, orderReady: !unavailable } });
    if (!options.method) return response({ csrf: 'csrf', ownerBinding });
    const body = JSON.parse(options.body); requests.push(body);
    if (body.action === 'resume') return response({ session: structuredClone(saved) });
    if (body.action === 'context') {
      assert.equal(body.context.fabricIds[0], saxon);
      saved.contexts.push({ id: 'saxon-context', receivedAt: 50, value: body.context }); saved.revision++;
      return response({ session: structuredClone(saved) });
    }
    if (body.action === 'message') {
      if (failMessage) { failMessage = false; return response({ error: 'MODEL_UNAVAILABLE' }, 503); }
      saved.messages.push({ role: 'user', text: body.text, at: 55 }, { role: 'assistant', text: 'Saxon Oak is the fabric to consider now.', at: 60 });
      saved.revision++;
      return response({ session: structuredClone(saved) });
    }
    throw Error(`Unexpected action: ${body.action}`);
  }
  const localStorage = { removeItem() {}, getItem: () => sessionId, setItem() {} };
  vm.runInNewContext(chat, { document, window: { addEventListener() {}, matchMedia: query => ({ matches: query.includes('max-width') }) }, location, localStorage, URL, URLSearchParams, fetch, crypto: { randomUUID }, structuredClone, requestAnimationFrame: callback => callback() }, { filename: 'curtainsuk-jane-chat.js' });
  const settle = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); };
  return { node, dialog, requests, saved, settle };
}

test('new fabric starts a distinct, consented reply while preserving prior conversation', async () => {
  const h = room();
  h.dialog.emit('curtainsuk:jane-room-open', { identity: 'jane' }); await h.settle();
  assert.match(h.node('fabric-description').textContent, /Saxon Oak/);
  assert.match(h.node('log').children.at(-1).textContent, /Selected Saxon.*Earlier conversation/);
  assert.equal(h.node('fabric-share').hidden, false);
  h.node('fabric-share').emit('click'); await h.settle();
  assert.equal(h.requests.filter(r => r.action === 'context').length, 0);
  assert.equal(h.requests.filter(r => r.action === 'message').length, 0);
  h.node('fabric-consent').checked = true;
  h.node('fabric-share').emit('click'); await h.settle();
  assert.deepEqual(h.requests.filter(r => r.action !== 'resume').map(r => r.action), ['context', 'message']);
  assert.match(h.requests.at(-1).text, new RegExp(saxon));
  assert.match(h.requests.at(-1).text, /focus on this fabric/);
  assert.equal(h.saved.messages.length, 4);
  assert.match(h.saved.messages[1].text, /Mellora/);
  assert.match(h.saved.messages.at(-1).text, /Saxon Oak/);
  assert.match(h.node('log').children.find(n => n.className === 'cukad-room__jane-topic').textContent, /Now discussing Saxon · Oak/);
  assert.equal(h.node('fabric-share').hidden, true);
  assert.equal(h.dialog.lastScroll.top, 184);
});

test('an interrupted fabric reply resumes from the saved context without a second share', async () => {
  const h = room({ failFirstMessage: true, unansweredContext: true, unavailable: true });
  h.dialog.emit('curtainsuk:jane-room-open', { identity: 'jane' }); await h.settle();
  assert.match(h.node('fabric-description').textContent, /Not currently available/);
  h.node('fabric-consent').checked = true;
  h.node('fabric-share').emit('click'); await h.settle();
  assert.equal(h.requests.filter(r => r.action === 'context').length, 0);
  assert.equal(h.node('fabric-share').hidden, false);
  h.node('fabric-share').emit('click'); await h.settle();
  const messages = h.requests.filter(r => r.action === 'message');
  assert.equal(messages.length, 2);
  assert.equal(messages[0].requestId, messages[1].requestId);
  assert.equal(h.saved.contexts.length, 1);
  assert.equal(h.node('fabric-share').hidden, true);
});

test('Browse cards link to the exact Jane handoff and no Ask Naila product controls remain', () => {
  const source = read('shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-jane-fabric-entry.js');
  const appended = [];
  const host = { querySelector: () => null, append: item => appended.push(item) };
  const card = { querySelector: selector => selector === '.cuk-fabric__actions' ? host : null };
  const window = {};
  vm.runInNewContext(source, { window, document: { createElement: () => ({ dataset: {}, setAttribute() {} }) } });
  window.CurtainsUKJaneFabricHandoff.mountCard(card, saxon, { browseReady: true, launchReady: true, orderReady: false });
  assert.equal(appended[0].href, `/pages/meet-our-team?entry=fabric-detail&jane_fabric=${saxon}`);
  assert.equal(appended[0].textContent, 'Ask Jane about this fabric');
  window.CurtainsUKJaneFabricHandoff.mountCard(card, '../invalid', { browseReady: true, launchReady: true });
  assert.equal(appended.length, 1);
  assert.doesNotMatch(read('components/naila-browse-entry.ts'), /Ask Naila about this fabric/);
  assert.doesNotMatch(read('shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-naila.js'), /Ask Naila about this fabric/);
});
