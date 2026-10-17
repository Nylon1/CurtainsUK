import assert from 'node:assert/strict';
import test from 'node:test';
import { createMyHomeStudies } from './my-home-thumbnails.mjs';

test('My Home renders selected artwork without changing the saved specification', async () => {
  const calls = [];
  const studies = createMyHomeStudies({
    threeUrl: '/three.module.js',
    createRenderer: () => ({
      render: async input => { calls.push(input); return { url: 'data:image/jpeg;base64,preview' }; },
      dispose() {},
    }),
  });
  const spec = {
    id: 'ordered-cushion', sizeId: 'square-50', fabricId: 'sdg-f1239-30',
    pipingFabricId: 'sdg-f1239-30', placementMm: { x: 325, y: 250 },
    quantity: 2,
  };
  const original = structuredClone(spec);
  const fabric = {
    id: spec.fabricId, imageUrl: 'https://cdn.shopify.com/test.jpg',
    previewReady: true, calibration: { physicalWidthMm: 1370, physicalHeightMm: 1000 },
  };
  const result = await studies.render(spec, [fabric]);
  assert.equal(result.selectedFabric, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].piece.spec, original);
  assert.equal(calls[0].fabrics[0], fabric);
  assert.deepEqual(spec, original);
});

test('My Home labels a neutral fallback when selected artwork cannot render', async () => {
  const calls = [];
  const studies = createMyHomeStudies({
    threeUrl: '/three.module.js',
    createRenderer: () => ({
      render: async input => {
        calls.push(input);
        return { url: calls.length === 1 ? null : 'data:image/jpeg;base64,neutral' };
      },
      dispose() {},
    }),
  });
  const spec = {
    id: 'ordered-cushion', sizeId: 'square-50', fabricId: 'selected',
    placementMm: { x: 325, y: 250 }, quantity: 1,
  };
  const result = await studies.render(spec, [{
    id: 'selected', imageUrl: 'https://cdn.shopify.com/test.jpg',
    previewReady: true, calibration: { physicalWidthMm: 1370, physicalHeightMm: 1000 },
  }]);
  assert.equal(result.selectedFabric, false);
  assert.match(result.label, /style study/);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].piece.spec.fabricId, 'my-home-neutral-study');
  assert.equal(spec.fabricId, 'selected');
});
