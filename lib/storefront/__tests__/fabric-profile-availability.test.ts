import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const theme = new URL('../../../shopify-theme/curtainsuk-dawn-16/', import.meta.url);
const script = readFileSync(new URL('assets/curtainsuk-profile-availability.js', theme), 'utf8');
const liquid = readFileSync(new URL('sections/curtainsuk-metaobject-fabric-discovery.liquid', theme), 'utf8');
const browseFallback = readFileSync(new URL('assets/curtainsuk-storefront.js', theme), 'utf8');
const janeEntry = readFileSync(new URL('assets/curtainsuk-jane-fabric-entry.js', theme), 'utf8');
const janeChat = readFileSync(new URL('assets/curtainsuk-jane-chat.js', theme), 'utf8');

async function profile(body: unknown, statusCode = 200, purchaseControlsEnabled = 'true', linkId = 'pt-4271-147') {
  const links = Array.from({ length: 8 }, () => ({
    dataset: { href: `/pages/curtain-visualiser?fabric=${linkId}` },
    href: undefined as string | undefined,
    attributes: new Set(['aria-disabled', 'tabindex']),
    removeAttribute(attribute: string) { this.attributes.delete(attribute); },
  }));
  const notice = { textContent: '' };
  const root = {
    dataset: { fabricMasterId: 'pt-4271-147', purchaseControlsEnabled, cukCurtainChecked: '' },
    querySelectorAll: () => links,
    querySelector: () => notice,
  };
  const calls: string[] = [];
  const document = {
    readyState: 'complete',
    querySelectorAll: () => [root],
    addEventListener: () => {},
  };
  const fetch = async (url: string) => {
    calls.push(url);
    return { ok: statusCode === 200, json: async () => body };
  };
  runInNewContext(script, { document, fetch });
  await new Promise(resolve => setImmediate(resolve));
  return { links, notice, calls };
}

test('fabric profile keeps every curtain entry inaccessible when retail stock is unavailable', async () => {
  const unavailable = await profile({ fabric: { id: 'pt-4271-147', orderReady: false } });
  assert.equal(unavailable.calls.length, 1);
  assert.ok(unavailable.calls[0].includes('browseGuide=1&fabric=pt-4271-147'));
  assert.ok(unavailable.links.every(link => link.href === undefined && link.attributes.has('aria-disabled')));
  assert.match(unavailable.notice.textContent, /not currently available/);
  for (const result of [await profile({ fabric: { id: 'another-fabric', orderReady: true } }), await profile({}, 503), await profile({ fabric: { id: 'pt-4271-147', orderReady: true } }, 200, 'false')]) {
    assert.ok(result.links.every(link => link.href === undefined));
  }
});

test('only an exact retail-ready fabric unlocks every curtain link, with no cross-fabric destination', async () => {
  const available = await profile({ fabric: { id: 'pt-4271-147', orderReady: true } });
  assert.ok(available.links.every(link => link.href === '/pages/curtain-visualiser?fabric=pt-4271-147' && !link.attributes.has('aria-disabled')));
  assert.equal(available.notice.textContent, '');
  const mismatchedLink = await profile({ fabric: { id: 'pt-4271-147', orderReady: true } }, 200, 'true', 'other-id');
  assert.ok(mismatchedLink.links.every(link => link.href === undefined));
});

test('the canonical fabric profile guards every curtain link and passes its exact ID to Jane', () => {
  assert.equal((liquid.match(/data-cuk-make-curtains/g) || []).length, 9); // Eight links plus the disabled-state style.
  assert.doesNotMatch(liquid, /<a[^>]+\shref="{{ make_curtains_url/);
  assert.match(liquid, /jane_fabric={{ metaobject\.fabric_master_id\.value \| url_encode }}/);
  assert.match(liquid, /curtainsuk-profile-availability\.js/);
  assert.match(browseFallback, /fabric\.orderReady === true \? `<a class="cuk-button" href="\$\{configureUrl\}">Make Curtains in This Fabric<\/a>` : '<button type="button" class="cuk-button" disabled>/);
  assert.match(browseFallback, /CurtainsUKJaneFabricHandoff\?\.mount\(detail, fabric\.id/);
});

test('Ask Jane retains an exact, unavailable fabric for a consented alternatives discussion', () => {
  const children: Array<{ href?: string; textContent?: string }> = [];
  const host = { querySelector: () => null, append: (...nodes: typeof children) => children.push(...nodes) };
  const detail = { querySelector: (selector: string) => selector === '.cuk-material-intro, .cuk-fabric-detail' ? host : null };
  const document = { createElement: () => ({ dataset: {}, setAttribute: () => {}, textContent: '', href: '' }) };
  const window = {} as { CurtainsUKJaneFabricHandoff: { mount: (detail: unknown, id: string, eligibility: unknown) => void } };
  runInNewContext(janeEntry, { document, window, encodeURIComponent });
  window.CurtainsUKJaneFabricHandoff.mount(detail, 'pt-4271-147', { browseReady: true, launchReady: true, orderReady: false });
  assert.equal(children[0].href, '/pages/meet-our-team?entry=fabric-detail&jane_fabric=pt-4271-147');
  assert.match(children[1].textContent || '', /not currently available.*alternatives/);
  assert.match(janeChat, /body\.fabric\.browseReady !== true \|\| body\.fabric\.launchReady !== true\) return/);
  assert.match(janeChat, /selectedFabric\.orderReady \? .* : 'I selected this fabric, but it is not currently available/);
});
