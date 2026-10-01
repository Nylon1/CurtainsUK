import test from 'node:test';
import assert from 'node:assert/strict';
import { premiumSessionStorageKey } from '../../../components/curtainsuk-premium-transport';
import {
  fiSessionStorageKey,
  isFiReadOnlyResumeConflict,
  nailaPresentationStorageKey,
  selectFiResumeSession,
} from '../../../components/curtainsuk-fi-session';

const fi = '11111111-1111-4111-8111-111111111111';
const legacy = '22222222-2222-4222-8222-222222222222';
const naila = '33333333-3333-4333-8333-333333333333';
const presentation = (sessionId: string) => JSON.stringify({ active: true, consultation: { sessionId } });

test('FI session storage is isolated from the historical shared key and Naila presentation cache', () => {
  assert.notEqual(fiSessionStorageKey, premiumSessionStorageKey);
  assert.notEqual(fiSessionStorageKey, nailaPresentationStorageKey);
  assert.notEqual(premiumSessionStorageKey, nailaPresentationStorageKey);
});

test('FI-specific session takes precedence over legacy shared state', () => {
  assert.equal(selectFiResumeSession(fi, legacy, presentation(legacy)), fi);
});

test('legacy FI sessions remain resumable during migration', () => {
  assert.equal(selectFiResumeSession(null, legacy, null), legacy);
});

test('legacy shared session is skipped when Naila presentation owns it', () => {
  assert.equal(selectFiResumeSession(null, legacy, presentation(legacy)), null);
});

test('a different Naila session does not suppress a legacy FI session', () => {
  assert.equal(selectFiResumeSession(null, legacy, presentation(naila)), legacy);
});

test('corrupt Naila presentation cache cannot claim a legacy FI session', () => {
  assert.equal(selectFiResumeSession(null, legacy, '{not-json'), legacy);
});

test('invalid FI-specific state falls back to a valid legacy FI session', () => {
  assert.equal(selectFiResumeSession('invalid', legacy, null), legacy);
});

test('invalid legacy session values are rejected', () => {
  assert.equal(selectFiResumeSession(null, 'invalid', null), null);
});

test('empty session state starts a fresh FI consultation', () => {
  assert.equal(selectFiResumeSession(null, null, null), null);
});

test('initial read-only FI resume 409 is classified as a recoverable resume conflict', () => {
  assert.equal(isFiReadOnlyResumeConflict(409, legacy, undefined, false), true);
});

test('an action 409 keeps the existing in-journey reconciliation path', () => {
  assert.equal(isFiReadOnlyResumeConflict(409, legacy, { type: 'answer' }, false), false);
});

test('established-view conflicts and non-409 responses are not initial resume conflicts', () => {
  assert.equal(isFiReadOnlyResumeConflict(409, legacy, undefined, true), false);
  assert.equal(isFiReadOnlyResumeConflict(200, legacy, undefined, false), false);
  assert.equal(isFiReadOnlyResumeConflict(409, null, undefined, false), false);
});
