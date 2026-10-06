import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const theme = 'shopify-theme/curtainsuk-dawn-16';
const script = readFileSync(`${theme}/assets/curtainsuk-room-preview-link.js`, 'utf8');

async function renderLink(id: string, result: unknown, ok = true) {
  const link = {hidden: true, style: {display: 'none'}};
  const status = {hidden: false, style: {display: ''}, textContent: 'Checking room preview…'};
  const root = {
    dataset: {fabricId: id, cukPreviewChecked: ''},
    querySelector(selector: string) {
      return selector === '[data-cuk-room-preview-link]' ? link : status;
    },
  };
  const requests: string[] = [];
  const document = {
    readyState: 'complete',
    querySelectorAll: () => [root],
    addEventListener: () => {},
  };
  runInNewContext(script, {
    window: {}, document,
    fetch: async (url: string) => {
      requests.push(url);
      return {ok, json: async () => result};
    },
    encodeURIComponent,
  });
  await new Promise(resolve => setImmediate(resolve));
  return {link, status, requests};
}

test('Shopify profile uses the retail catalogue as its only preview eligibility authority', async () => {
  const id = 'pt-4049-629';
  const url = `/pages/room-visualiser?fabric=${id}`;
  const supported = await renderLink(id, {fabric: {id, roomPreview: {available: true, url}}});
  assert.equal(supported.link.hidden, false);
  assert.equal(supported.status.hidden, true);
  assert.deepEqual(supported.requests, [`/apps/curtainsuk-decision/catalog?view=retail&visualiser=1&fabric=${id}`]);

  const unsupported = await renderLink('pt-4270-147', {fabric: {id: 'pt-4270-147', roomPreview: {available: false, url: null}}});
  assert.equal(unsupported.link.hidden, true);
  assert.equal(unsupported.status.textContent, 'Room preview not available for this fabric yet.');

  const mismatch = await renderLink(id, {fabric: {id: 'other-id', roomPreview: {available: true, url}}});
  assert.equal(mismatch.link.hidden, true);
  const unavailable = await renderLink(id, null, false);
  assert.equal(unavailable.link.hidden, true);
  assert.equal(unavailable.status.textContent, 'Room preview temporarily unavailable.');
});

test('Profile and optional theme entry both load dynamic link resolver', () => {
  for (const section of ['curtainsuk-metaobject-fabric-discovery.liquid', 'curtainsuk-visualiser-entry.liquid']) {
    const source = readFileSync(`${theme}/sections/${section}`, 'utf8');
    assert.match(source, /curtainsuk-room-preview-link\.js/);
    assert.match(source, /render 'curtainsuk-room-preview-link'/);
  }
  const snippet = readFileSync(`${theme}/snippets/curtainsuk-room-preview-link.liquid`, 'utf8');
  assert.doesNotMatch(snippet, /approved_preview_ids/);
  assert.match(snippet, /data-cuk-room-preview-link/);
});
