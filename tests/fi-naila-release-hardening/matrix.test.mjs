import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { allOrderedReactionHistories, pairwiseCases, prices, questionsFI, questionsNaila, reactions } from './matrix.mjs';
import { verifyPersistedCalibration } from './persisted-history.mjs';
import { gzipSync } from 'node:zlib';

const definitions = JSON.parse(await readFile(new URL('./scenarios.json', import.meta.url), 'utf8'));

test('scenario definitions and ordered reaction space remain complete', () => {
  assert.deepEqual(reactions, definitions.calibration.reactions);
  assert.deepEqual(prices, definitions.priceBands);
  assert.deepEqual(questionsFI, definitions.questions.fabricIntelligence);
  assert.deepEqual(questionsNaila, definitions.questions.naila);
  const all = allOrderedReactionHistories();
  assert.equal(all.length, 4096);
  assert.equal(new Set(all.map(sequence => sequence.join('|'))).size, 4096);
  const pairwise = pairwiseCases();
  assert.equal(pairwise.length, 28);
  assert.equal(new Set(pairwise.map(sequence => sequence.join('|'))).size, 28);
  const pairs = new Set();
  for (const sequence of pairwise) for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++)
    pairs.add(`${i}:${j}:${sequence[i]}:${sequence[j]}`);
  assert.equal(pairs.size, 240);
  assert.equal(definitions.automatedScenarios.length, 11);
  assert.equal(definitions.observationOnlyScenarios.length, 4);
});

test('saved-history checker distinguishes equal final profiles by six ordered events and revisions', () => {
  const fabricHistory = Array.from({ length: 6 }, (_, index) => `fabric-${index}`);
  const sequence = ['LOVE', 'LIKE', 'NOT_SURE', 'DISLIKE', 'LOVE', 'LIKE'];
  const testCase = { id: 'synthetic', sequence,
    calibration: { startingRevision: 8, revisionHistory: [9, 10, 11, 12, 13, 14], fabricHistory } };
  const versions = sequence.map((_, index) => ({ revision: 9 + index,
    private_state: { hciStateCompressed: gzipSync(JSON.stringify({ eyeReactions: sequence.slice(0, index + 1)
      .map((reaction, position) => ({ reaction, fabricMasterId: fabricHistory[position] })) })).toString('base64') } }));
  assert.equal(verifyPersistedCalibration(testCase, versions).revisions.length, 6);
  const wrongOrder = structuredClone(versions);
  wrongOrder[3].private_state = { eyeReactions: [
    ...sequence.slice(0, 3).map((reaction, position) => ({ reaction, fabricMasterId: fabricHistory[position] })),
    { reaction: 'LOVE', fabricMasterId: fabricHistory[3] },
  ] };
  assert.throws(() => verifyPersistedCalibration(testCase, wrongOrder), /ordered reaction\/fabric mismatch/);
  const wrongRevision = structuredClone(versions);
  wrongRevision[5].revision = 15;
  assert.throws(() => verifyPersistedCalibration(testCase, wrongRevision), /saved revision mismatch/);
});
