import assert from 'node:assert/strict';
import test from 'node:test';
import { validSampleToSaleStaffForm } from '../sample-to-sale-staff-form';

function form(headers: Record<string, string>, url = 'https://internal.vercel.app/admin/sample-to-sale') {
  return new Request(url, { method: 'POST', headers: {
    host: 'curtainsuk-production-api.vercel.app',
    'content-type': 'application/x-www-form-urlencoded',
    'content-length': '48',
    'sec-fetch-site': 'same-origin',
    ...headers,
  } });
}

test('accepts a same-origin staff form when the runtime URL uses a deployment host', () => {
  assert.equal(validSampleToSaleStaffForm(form({ origin: 'https://curtainsuk-production-api.vercel.app' })), true);
  assert.equal(validSampleToSaleStaffForm(form({})), true);
});

test('rejects cross-site, untrusted-host and oversized code-issue forms', () => {
  assert.equal(validSampleToSaleStaffForm(form({ origin: 'https://example.com' })), false);
  assert.equal(validSampleToSaleStaffForm(form({ origin: 'https://curtainsuk-production-api.vercel.app', 'sec-fetch-site': 'cross-site' })), false);
  assert.equal(validSampleToSaleStaffForm(form({ host: 'example.com', origin: 'https://example.com' })), false);
  assert.equal(validSampleToSaleStaffForm(form({ 'content-length': '513' })), false);
  assert.equal(validSampleToSaleStaffForm(form({ 'content-type': 'text/plain' })), false);
});
