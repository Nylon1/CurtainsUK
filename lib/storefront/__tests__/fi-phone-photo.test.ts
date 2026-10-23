import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareFiPhonePhoto } from '../fi-phone-photo';

test('a large phone photo is resized and encoded below the existing analysis limit', async () => {
  const originalBitmap = globalThis.createImageBitmap;
  const originalDocument = globalThis.document;
  let closed = false;
  let outputWidth = 0;
  let outputHeight = 0;
  let attempts = 0;
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    value: async () => ({ width: 4032, height: 3024, close: () => { closed = true; } }),
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => ({
      width: 0,
      height: 0,
      getContext() { return { fillStyle: '', fillRect() {}, drawImage() {} }; },
      toBlob(callback: (output: Blob) => void) {
        outputWidth = this.width;
        outputHeight = this.height;
        attempts += 1;
        callback(new Blob([new Uint8Array(attempts === 1 ? 1_900_000 : 1_700_000)], { type: 'image/jpeg' }));
      },
    }) },
  });
  try {
    const output = await prepareFiPhonePhoto(new Blob([new Uint8Array(5_000_000)], { type: 'image/png' }));
    assert.equal(output.type, 'image/jpeg');
    assert.ok(output.size <= 1_800_000);
    assert.equal(outputWidth, 1600);
    assert.equal(outputHeight, 1200);
    assert.equal(attempts, 2, 'quality falls back before reducing image dimensions');
    assert.equal(closed, true);
  } finally {
    if (originalBitmap === undefined) Reflect.deleteProperty(globalThis, 'createImageBitmap');
    else Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: originalBitmap });
    if (originalDocument === undefined) Reflect.deleteProperty(globalThis, 'document');
    else Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
  }
});
