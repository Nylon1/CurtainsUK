import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { randomUUID } from 'node:crypto';

const script = readFileSync(new URL('../../shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-specialist-chat.js', import.meta.url), 'utf8');

test('a new mobile reply formats emphasis, shows thinking dots and scrolls to its first line', async () => {
  class Node {
    constructor(tag = 'div') {
      this.tag = tag; this.children = []; this.handlers = new Map(); this.dataset = {};
      this.hidden = false; this.disabled = false; this.checked = false;
      this.value = ''; this.textContent = ''; this.scrollTop = 0;
    }
    get childElementCount() { return this.children.length; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = [...nodes]; }
    addEventListener(name, callback) { this.handlers.set(name, callback); }
    emit(name, detail) { return this.handlers.get(name)?.({ detail, preventDefault() {} }); }
    querySelectorAll(selector) { return selector.includes('assistant') ? this.children.filter(n => n.dataset?.role === 'assistant') : []; }
    getBoundingClientRect() { return { top: this.tag === 'dialog' ? 10 : 210 }; }
    scrollTo(options) { this.lastScroll = options; }
    focus() {}
    blur() { this.blurred = true; }
  }
  const controls = new Map();
  const find = name => { if (!controls.has(name)) controls.set(name, new Node()); return controls.get(name); };
  find('consent').closest = () => new Node('label');
  const panel = { dataset: { specialistPublic: 'true' }, hidden: false,
    querySelector: selector => find(selector.slice('[data-specialist-'.length, -1)),
  };
  const dialog = new Node('dialog');
  dialog.querySelector = selector => selector === '[data-specialist-chat]' ? panel : null;
  const id = '11111111-1111-4111-8111-111111111111';
  const response = body => ({ ok: true, json: async () => body });
  let releaseMessage;
  const fetch = async (_url, options = {}) => {
    if (!options.method) return response({ csrf: 'csrf', ownerBinding: 'a'.repeat(32) });
    const command = JSON.parse(options.body);
    if (command.action === 'start') return response({ session: { id, adviser: 'james', revision: 1, messages: [] } });
    if (command.action === 'message') return new Promise(resolve => { releaseMessage = () => resolve(response({ session: {
      id, adviser: 'james', revision: 2, messages: [
        { role: 'user', text: command.text },
        { role: 'assistant', text: 'Use **manufacturer instructions** for the model.\n\nCheck the wall before drilling.' },
      ],
    } })); });
    throw Error(`Unexpected action ${command.action}`);
  };
  runInNewContext(script, {
    document: { querySelectorAll: () => [dialog], createElement: tag => new Node(tag), addEventListener() {}, hidden: false },
    window: { addEventListener() {}, matchMedia: query => ({ matches: query.includes('max-width') }) },
    location: { origin: 'https://www.curtainsuk.com' },
    localStorage: { getItem: () => null, setItem() {} },
    fetch, URL, URLSearchParams, Object, crypto: { randomUUID }, requestAnimationFrame: callback => callback(),
  });
  const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
  dialog.emit('curtainsuk:jane-room-open', { identity: 'james' }); await settle();
  find('consent').checked = true;
  find('start').emit('click'); await settle();
  find('input').value = 'How do I fit it?';
  find('form').emit('submit'); await settle();
  assert.equal(find('thinking').hidden, false);
  releaseMessage(); await settle();
  assert.equal(find('thinking').hidden, true);
  const [question, reply] = find('log').children;
  assert.equal(question.dataset.role, 'user');
  assert.equal(reply.dataset.role, 'assistant');
  assert.equal(reply.children[1].children[1].tag, 'strong');
  assert.equal(reply.children[1].children[1].textContent, 'manufacturer instructions');
  assert.equal(reply.children[2].children[0], 'Check the wall before drilling.');
  assert.equal(find('input').blurred, true);
  assert.equal(dialog.lastScroll.top, 184);
});
