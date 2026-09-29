import { mkdir } from 'node:fs/promises';

// Network tests create synthetic customer sessions. An explicit target and opt-in
// are required so a normal local or CI test run cannot write to a live gateway.
if (process.env.CUK_RELEASE_MATRIX_ALLOW_WRITES !== '1') {
  throw Error('Set CUK_RELEASE_MATRIX_ALLOW_WRITES=1 to run synthetic gateway sessions');
}
const supplied = process.env.CUK_RELEASE_MATRIX_TARGET;
if (!supplied) throw Error('Set CUK_RELEASE_MATRIX_TARGET to the exact Shopify-facing origin to test');
const parsed = new URL(supplied);
if (parsed.protocol !== 'https:' || parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) {
  throw Error('CUK_RELEASE_MATRIX_TARGET must be a bare HTTPS origin');
}
export const base = parsed.origin;
export const origin = process.env.CUK_RELEASE_MATRIX_ORIGIN || base;
export const results = new URL('./_results/', import.meta.url);
await mkdir(results, { recursive: true });
