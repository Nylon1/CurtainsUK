import test from 'node:test';
import assert from 'node:assert/strict';
import { browseCard } from '../browse-card';

test('compact cards retain identity, prices, evidence, stock gates and visualiser destination', () => {
  const source = {
    id: 'sdg-f1325-01', supplier: 'SDG', brand: 'Clarke & Clarke', collection: 'Eden',
    design: 'Abeja', colour: 'Blush', fabricProfileUrl: 'https://www.curtainsuk.com/pages/fabric/sdg-f1325-01-abeja-blush',
    imageReferences: ['https://cdn.shopify.com/first.jpg', 'https://cdn.shopify.com/detail.jpg'],
    images: [{url: 'https://cdn.shopify.com/first.jpg', width: 600, height: 600}],
    priceReady: true, currentStockConfirmed: false,
    sampleAvailable: true, orderReady: false, browseReady: true, launchReady: true,
    availability: 'Sample available; curtains awaiting supplier stock',
    browseGuide: { amountMinor: 5601, currency: 'GBP', policy: 'curtainsuk-browse-guide-v1' },
    curtainEstimate: {amountMinor:64700,currency:'GBP',includesVat:true,widthCm:200,dropCm:200},
    intelligence: { dimensions: [{ key: 'pattern', values: ['animal'] }], advice: [{ text: 'Detail-only guidance' }] },
    roomPreview: { available: true, url: '/pages/room-visualiser?fabric=sdg-f1325-01', assignment: { sourceImage: 'detail-only.webp' } },
    supplierFacts: { facts: ['Full specification'] }, metadata: { title: 'Detail title' },
    patterns: [], characters: [], description: 'Long detail-only description',
  };
  const card = browseCard(source as unknown as Parameters<typeof browseCard>[0]);
  assert.equal(card.id, source.id);
  assert.equal(card.fabricProfileUrl, source.fabricProfileUrl);
  assert.equal(card.sampleAvailable, true);
  assert.equal(card.orderReady, false);
  assert.equal(card.priceReady, true);
  assert.equal(card.currentStockConfirmed, false);
  assert.deepEqual(card.images, source.images, 'consultation comparison retains its first photograph');
  assert.equal(card.browseReady, true);
  assert.equal(card.launchReady, true);
  assert.equal(card.availability, source.availability);
  assert.deepEqual(card.browseGuide, source.browseGuide);
  assert.deepEqual(card.curtainEstimate, source.curtainEstimate);
  assert.deepEqual(card.intelligence?.dimensions, source.intelligence.dimensions);
  assert.deepEqual(card.roomPreview, { available: true, url: source.roomPreview.url });
  assert.deepEqual(card.imageReferences, [source.imageReferences[0]]);
  assert.ok(!('supplierFacts' in card) && !('metadata' in card) && !('description' in card));
  assert.equal(source.imageReferences.length, 2, 'full detail payload is not mutated');
});
