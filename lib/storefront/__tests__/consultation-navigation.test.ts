import test from 'node:test';
import assert from 'node:assert/strict';
import { consultationFabricLinks, isPremiumConsultationPath, shopifyConsultationHandoff } from '../consultation-navigation';
import { fullUrl } from '../../sitemap-utils';

test('only the premium consultation omits the secondary storefront frame', () => {
  assert.equal(isPremiumConsultationPath('/curtain-consultation-premium'), true);
  assert.equal(isPremiumConsultationPath('/curtain-consultation-premium/'), true);
  for (const path of ['/', '/fabrics', '/configure', '/curtain-consultation'])
    assert.equal(isPremiumConsultationPath(path), false);
});

test('fabric exploration uses the published profile and keeps the exact identity in every studio', () => {
  const id = 'sdg-f1325-02';
  const profile = `https://www.curtainsuk.com/pages/fabric/${id}-abeja-ivory`;
  const links = consultationFabricLinks(id, profile);
  assert.equal(links.details, profile);
  assert.equal(links.making, `${profile}?makingStep=1#cuk-making-studio`);
  for (const [key, pathname] of [['room', '/pages/room-visualiser'], ['cushions', '/pages/cushion-studio']] as const) {
    const url = new URL(links[key]);
    assert.equal(url.origin, 'https://www.curtainsuk.com');
    assert.equal(url.pathname, pathname);
    assert.deepEqual([...url.searchParams.entries()], [['fabric', id]]);
    assert.equal(url.hash, '', 'non-commerce exits do not carry a consultation token or profile');
  }
  const jane = new URL(links.jane);
  assert.equal(jane.pathname, '/pages/meet-our-team');
  assert.equal(jane.searchParams.get('entry'), 'fabric-detail');
  assert.equal(jane.searchParams.get('jane_fabric'), id);
});

test('missing, foreign or mismatched profile URLs use the exact-fabric fallback without inventing a Making Studio page', () => {
  for (const profile of [undefined, 'javascript:alert(1)', 'https://example.com/pages/fabric/sdg-f1325-02-abeja-ivory', '/pages/fabric/a-different-fabric', '/pages/fabric/sdg-f1325-020-wrong-id']) {
    const links = consultationFabricLinks('sdg-f1325-02', profile);
    assert.equal(links.details, 'https://www.curtainsuk.com/pages/fabric-library?fabric=sdg-f1325-02');
    assert.equal(links.making, null);
  }
});

test('consultation exits use the Shopify origin and preserve exact fabric context', () => {
  const context = {
    sessionId: '11111111-1111-4111-8111-111111111111', profileSummary: 'Calm, textured curtains',
    fabricMasterId: 'fabric-master-123', supplierSku: '4262/770', strategyId: 'tonal', commerceToken: 'signed-token',
  };
  assert.equal(fullUrl('/'), 'https://www.curtainsuk.com/');
  assert.equal(fullUrl('/pages/fabric-library'), 'https://www.curtainsuk.com/pages/fabric-library');
  for (const sample of [true, false]) {
    const url = new URL(shopifyConsultationHandoff({ ...context, sample }));
    assert.equal(url.origin, 'https://www.curtainsuk.com');
    assert.equal(url.pathname, sample ? '/pages/fabric-library' : '/pages/curtain-visualiser');
    assert.equal(url.searchParams.get('fabric'), context.fabricMasterId);
    assert.equal(url.searchParams.get('intent'), sample ? 'sample' : null);
    const handoff = JSON.parse(decodeURIComponent(url.hash.slice('#cuk_hci='.length)));
    assert.deepEqual(handoff, context);
    assert.equal(JSON.stringify(handoff).includes('vercel.app'), false);
  }
});
