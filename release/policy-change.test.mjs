import assert from 'node:assert/strict';
import test from 'node:test';
import {hasExactOwnerApproval, requireCurrentHeadOwnerApproval} from './policy-change.mjs';

const head = 'a'.repeat(40);
const oldHead = 'b'.repeat(40);
const approval = `OWNER_APPROVED_POLICY_CHANGE ${head}`;

function apiWith(comments, currentHead = head) {
  return async url => ({
    status: 200,
    json: async () => url.includes('/pulls/')
      ? {head: {sha: currentHead}, base: {ref: 'release/production'}}
      : comments,
  });
}

const check = (comments, currentHead = head) => requireCurrentHeadOwnerApproval({
  repository: 'Nylon1/CurtainsUK',
  number: 20,
  head,
  token: 'test-token',
  fetchImpl: apiWith(comments, currentHead),
});

test('accepts only an exact owner comment on the current PR head', async () => {
  assert.equal(hasExactOwnerApproval([{user: {login: 'Nylon1'}, body: approval}], head), true);
  await check([{user: {login: 'Nylon1'}, body: ` ${approval}\n`}]);
});

test('missing, wrong-author and wrong-SHA comments fail closed', async () => {
  for (const comments of [
    [],
    [{user: {login: 'someone-else'}, body: approval}],
    [{user: {login: 'Nylon1'}, body: `OWNER_APPROVED_POLICY_CHANGE ${oldHead}`}],
    [{user: {login: 'Nylon1'}, body: `${approval} extra`}],
  ]) {
    await assert.rejects(check(comments), /Explicit Nylon1 approval comment/);
  }
});

test('a stale workflow HEAD fails even when its old SHA has an owner comment', async () => {
  await assert.rejects(check([{user: {login: 'Nylon1'}, body: approval}], oldHead), /PR HEAD changed/);
});

test('checks later comment pages without accepting a stale owner comment', async () => {
  const firstPage = Array.from({length: 100}, () => ({user: {login: 'Nylon1'}, body: `OWNER_APPROVED_POLICY_CHANGE ${oldHead}`}));
  await requireCurrentHeadOwnerApproval({
    repository: 'Nylon1/CurtainsUK', number: 20, head, token: 'test-token',
    fetchImpl: async url => ({
      status: 200,
      json: async () => url.includes('/pulls/')
        ? {head: {sha: head}, base: {ref: 'release/production'}}
        : url.includes('page=2')
          ? [{user: {login: 'Nylon1'}, body: approval}]
          : firstPage,
    }),
  });
});

test('GitHub lookup errors fail closed', async () => {
  await assert.rejects(requireCurrentHeadOwnerApproval({
    repository: 'Nylon1/CurtainsUK', number: 20, head, token: 'test-token',
    fetchImpl: async () => ({status: 403}),
  }), /GitHub approval lookup failed/);
});
