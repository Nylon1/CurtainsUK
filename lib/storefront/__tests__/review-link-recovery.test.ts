import assert from 'node:assert/strict';
import test from 'node:test';
import { canIssueReviewAcceptanceLink, REVIEW_STATES } from '../review-workflow';

test('acceptance links can be recovered only for approved or already-ready reviews with no other blocker', () => {
  assert.equal(canIssueReviewAcceptanceLink('APPROVED', []), true);
  assert.equal(canIssueReviewAcceptanceLink('READY_FOR_CHECKOUT', ['Checkout readiness is already recorded']), true);
  for (const state of REVIEW_STATES.filter(s => !['APPROVED', 'READY_FOR_CHECKOUT'].includes(s))) {
    assert.equal(canIssueReviewAcceptanceLink(state, []), false);
  }
  for (const blocker of ['Fabric availability must be confirmed', 'Email evidence must be reviewed for the current revision', 'A reviewed final price is required']) {
    assert.equal(canIssueReviewAcceptanceLink('APPROVED', [blocker]), false);
    assert.equal(canIssueReviewAcceptanceLink('READY_FOR_CHECKOUT', ['Checkout readiness is already recorded', blocker]), false);
  }
  assert.equal(canIssueReviewAcceptanceLink('APPROVED', ['Checkout readiness is already recorded']), false);
});
