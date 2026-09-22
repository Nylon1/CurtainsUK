import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const OWNER = 'Nylon1';
const APPROVAL_PREFIX = 'OWNER_APPROVED_POLICY_CHANGE';

export function hasExactOwnerApproval(comments, head) {
  return comments.some(comment =>
    comment.user?.login === OWNER &&
    typeof comment.body === 'string' &&
    comment.body.trim() === `${APPROVAL_PREFIX} ${head}`
  );
}

export async function requireCurrentHeadOwnerApproval({repository, number, head, token, fetchImpl = fetch}) {
  assert.match(repository || '', /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
  assert.match(String(number || ''), /^[1-9][0-9]*$/);
  assert.match(head || '', /^[a-f0-9]{40}$/);
  assert.ok(token, 'GitHub token is required for owner approval verification');

  const headers = {Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28'};
  const api = async path => {
    const response = await fetchImpl(`https://api.github.com/repos/${repository}/${path}`, {headers});
    assert.equal(response.status, 200, `GitHub approval lookup failed for ${path}`);
    return response.json();
  };

  const pr = await api(`pulls/${number}`);
  assert.equal(pr.head?.sha, head, 'Policy check is stale: PR HEAD changed');
  assert.equal(pr.base?.ref, 'release/production', 'Owner approval applies only to the production release PR');

  for (let page = 1; page <= 100; page++) {
    const comments = await api(`issues/${number}/comments?per_page=100&page=${page}`);
    assert.ok(Array.isArray(comments), 'GitHub returned invalid PR comments');
    if (hasExactOwnerApproval(comments, head)) return;
    if (comments.length < 100) break;
  }
  assert.fail(`Explicit ${OWNER} approval comment for current PR HEAD ${head} is required`);
}

export async function runPolicyCheck() {
  const base = process.env.POLICY_BASE_SHA;
  const head = process.env.POLICY_HEAD_SHA;
  for (const sha of [base, head]) assert.match(sha || '', /^[a-f0-9]{40}$/);
  const changes = execFileSync('git', ['diff', '--name-only', base, head], {encoding: 'utf8'}).trim().split('\n');
  const protectedPath = path =>
    path.startsWith('release/') || path.startsWith('.github/') || path.includes('/__tests__/') ||
    ['package.json', 'package-lock.json'].includes(path);

  if (!changes.some(protectedPath)) return;
  assert.ok(existsSync('release/policy-change.json'), 'Protected changes need an OWNER_APPROVED_POLICY_CHANGE record');
  const decision = JSON.parse(readFileSync('release/policy-change.json', 'utf8'));
  assert.equal(decision.classification, APPROVAL_PREFIX);
  for (const key of ['previousRule', 'newRule', 'reason', 'ownerApprovedDecision']) {
    assert.ok(typeof decision[key] === 'string' && decision[key].trim().length > 10, `Missing ${key}`);
  }
  // The candidate's record cannot approve itself. Verify GitHub's author and current PR HEAD.
  await requireCurrentHeadOwnerApproval({
    repository: process.env.GITHUB_REPOSITORY,
    number: process.env.PR_NUMBER,
    head,
    token: process.env.GITHUB_TOKEN,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await runPolicyCheck();
}
