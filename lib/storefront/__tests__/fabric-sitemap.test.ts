import assert from 'node:assert/strict';
import { test } from 'node:test';
import { load } from 'cheerio';
import manifest from '../../../generated/fabric-profile-sitemap.json';
import {
  escapeFabricSitemapXml,
  FABRIC_SITEMAP_MAX_BYTES,
  FABRIC_SITEMAP_MAX_URLS,
  renderFabricSitemapXml,
  validateFabricSitemapEntries,
} from '../fabric-sitemap';
import { SHOPIFY_PROXY_OPERATION_POLICY, isShopifyProxyOperation } from '../security/shopify-proxy-operations';
import { fabricSitemapResponse } from '../fabric-sitemap-response';
import { publishedFabricProfileUrl } from '../../fabric-master/fabric-profile-links';

test('dedicated Fabric sitemap is GET-only within the Shopify proxy', () => {
  assert.equal(isShopifyProxyOperation('fabric-sitemap'), true);
  assert.deepEqual(SHOPIFY_PROXY_OPERATION_POLICY['fabric-sitemap'].methods, ['GET']);
  assert.equal(SHOPIFY_PROXY_OPERATION_POLICY['fabric-sitemap'].maximumBytes, 0);
});

test('live-generated manifest produces one valid XML URL per canonical Fabric Profile', () => {
  assert.equal(manifest.version, 1);
  assert.equal(manifest.profileCount, 10_208);
  assert.equal(manifest.profiles.length, manifest.profileCount);
  validateFabricSitemapEntries(manifest.profiles, manifest.profileCount);
  assert.deepEqual(manifest.profiles.map((entry) => entry.canonicalUrl),
    [...manifest.profiles.map((entry) => entry.canonicalUrl)].sort());
  const xml = renderFabricSitemapXml(manifest.profiles, manifest.profileCount);
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  const $ = load(xml, { xmlMode: true });
  assert.equal($('urlset').attr('xmlns'), 'http://www.sitemaps.org/schemas/sitemap/0.9');
  const urls = $('urlset > url > loc').toArray().map((node) => $(node).text());
  assert.equal(urls.length, 10_208);
  assert.deepEqual(urls, manifest.profiles.map((entry) => entry.canonicalUrl));
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.every((url) => url.startsWith('https://www.curtainsuk.com/pages/fabric/')));
  assert.ok(Buffer.byteLength(xml, 'utf8') < FABRIC_SITEMAP_MAX_BYTES);
});

test('published Fabric Profile lookup uses the same authoritative manifest as the sitemap', () => {
  assert.equal(
    publishedFabricProfileUrl('pt-1204-212'),
    'https://www.curtainsuk.com/pages/fabric/pt-1204-212-mellora-blush',
  );
  assert.equal(publishedFabricProfileUrl('not-a-published-fabric'), null);
});

test('sitemap response uses XML content type and the deterministic generated body', async () => {
  const first = fabricSitemapResponse();
  const second = fabricSitemapResponse();
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('content-type'), 'application/xml; charset=utf-8');
  assert.equal(await first.text(), await second.text());
});

test('XML escapes reserved characters and handles more than 10,000 URLs', () => {
  assert.equal(escapeFabricSitemapXml('a&b<c>d"e\'f'), 'a&amp;b&lt;c&gt;d&quot;e&apos;f');
  const entries = Array.from({ length: 10_001 }, (_, i) => ({
    fabricMasterId: `fabric-${i}`,
    canonicalUrl: `https://www.curtainsuk.com/pages/fabric/fabric-${i}`,
  }));
  const xml = renderFabricSitemapXml(entries, entries.length);
  assert.equal((xml.match(/<url>/g) ?? []).length, 10_001);
  assert.ok(Buffer.byteLength(xml, 'utf8') < FABRIC_SITEMAP_MAX_BYTES);
});

test('sitemap fails closed on duplicates, noncanonical URLs, count and protocol limits', () => {
  const one = { fabricMasterId: 'one', canonicalUrl: 'https://www.curtainsuk.com/pages/fabric/one' };
  assert.throws(() => validateFabricSitemapEntries([one], 2), /COUNT_MISMATCH/);
  assert.throws(() => validateFabricSitemapEntries([one, one], 2), /DUPLICATE_ID/);
  assert.throws(() => validateFabricSitemapEntries([one, { ...one, fabricMasterId: 'two' }], 2), /DUPLICATE_URL/);
  assert.throws(() => validateFabricSitemapEntries([{ ...one, canonicalUrl: 'https://other.example/pages/fabric/one' }], 1), /INVALID_OR_DUPLICATE_URL/);
  assert.throws(() => validateFabricSitemapEntries([{ ...one, canonicalUrl: `${one.canonicalUrl}?variant=1` }], 1), /NONCANONICAL_URL/);
  assert.throws(() => validateFabricSitemapEntries(Array.from({ length: FABRIC_SITEMAP_MAX_URLS + 1 }, () => one), FABRIC_SITEMAP_MAX_URLS + 1), /URL_LIMIT/);
});
