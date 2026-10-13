import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const controller = readFileSync(path.join(repository, 'shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-jane-chat.js'), 'utf8');

function signedOutRoom(search = '') {
  const nodes = new Map();
  const node = name => {
    if (!nodes.has(name)) nodes.set(name, {
      hidden: false, disabled: false, checked: false, textContent: '', href: '',
      addEventListener() {}, replaceChildren() {}, querySelector() { return node('send'); },
      closest() { return node('consent-label'); },
    });
    return nodes.get(name);
  };
  const panel = { querySelector: selector => node(selector.match(/^\[data-jane-([^\]]+)\]$/)?.[1] ?? selector) };
  const dialog = {
    querySelector: selector => selector === '[data-jane-chat]' ? panel : node(selector),
    addEventListener() {},
  };
  const location = { origin: 'https://www.curtainsuk.com', pathname: '/pages/meet-our-team', search };
  const document = { querySelectorAll: () => [dialog], addEventListener() {} };
  vm.runInNewContext(controller, { document, window: { addEventListener() {} }, location, localStorage: { removeItem() {} }, URL, URLSearchParams }, { filename: 'curtainsuk-jane-chat.js' });
  return node;
}

test('signed-out Jane shows Shopify sign-in instead of consent and Start', () => {
  const node = signedOutRoom();
  assert.equal(node('start').hidden, true);
  assert.equal(node('consent-label').hidden, true);
  const login = new URL(node('signin').href, 'https://www.curtainsuk.com');
  assert.equal(login.pathname, '/customer_authentication/login');
  assert.equal(login.searchParams.get('return_to'), '/pages/meet-our-team?jane_return=1');
});

test('Shopify sign-in return carries only a valid selected fabric identity', () => {
  const selected = signedOutRoom('?entry=fabric-detail&jane_fabric=sdg-hiov134134');
  const login = new URL(selected('signin').href, 'https://www.curtainsuk.com');
  const returned = new URL(login.searchParams.get('return_to'), 'https://www.curtainsuk.com');
  assert.equal(returned.searchParams.get('entry'), 'fabric-detail');
  assert.equal(returned.searchParams.get('jane_fabric'), 'sdg-hiov134134');
  for (const query of ['?entry=fabric-detail&jane_fabric=../bad', '?entry=fabric-detail&jane_fabric=a&jane_fabric=b']) {
    const room = signedOutRoom(query);
    const target = new URL(new URL(room('signin').href, 'https://www.curtainsuk.com').searchParams.get('return_to'), 'https://www.curtainsuk.com');
    assert.equal(target.searchParams.has('jane_fabric'), false);
  }
});
