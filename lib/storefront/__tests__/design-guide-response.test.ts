import test from 'node:test';
import assert from 'node:assert/strict';
import { designGuideResponse } from '../design-guide-response';
import { DESIGN_GUIDES } from '../design-guides';
import { designGuideUrl } from '../design-guide-url';
import { isShopifyProxyOperation } from '../security/shopify-proxy-operations';

test('all six Design Library links use the storefront proxy and render their intended content', async () => {
  assert.equal(isShopifyProxyOperation('design-guide'), true);
  assert.equal(Object.keys(DESIGN_GUIDES).length, 6);
  for (const [topic, guide] of Object.entries(DESIGN_GUIDES)) {
    const url = designGuideUrl(topic);
    assert.equal(new URL(url).host, 'www.curtainsuk.com');
    const response = designGuideResponse(new Request(url));
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, new RegExp(guide.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, /Browse fabrics/);
    assert.match(html, /Order fabric samples/);
    assert.match(html, /Return to Fabric Intelligence/);
    assert.doesNotMatch(html, /curtainsuk-production-api\.vercel\.app/);
  }
});

test('missing guide opens a useful storefront fallback', () => {
  const response = designGuideResponse(new Request(designGuideUrl('missing')));
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://www.curtainsuk.com/pages/fabric-library');
});

test('Design Library keeps room, colour and fabric context on the return and browse links', async () => {
  const url = designGuideUrl('colour-palettes', '?source=shop-by-window&space=lounge&direction=contrast&colour=%2382a988&fabric=sdg-f1740-05');
  const html = await designGuideResponse(new Request(url)).text();
  assert.match(html, /space=lounge&amp;direction=contrast&amp;colour=%2382a988&amp;fabric=sdg-f1740-05/);
  assert.match(html, /browse-fabrics&amp;fabric=sdg-f1740-05/);
});
