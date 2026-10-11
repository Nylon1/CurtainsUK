import {fail} from './contracts.mjs';

// This exception belongs only to the owner's one-time eligible population.
// Sample freshness and every pressure/latency threshold remain unchanged.
export const OVERNIGHT_HOST_APPROVAL = Object.freeze({
  reference:'https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6114221325',
  sourceSnapshot:'eligible-identities-sha256:007a9a160c82d99817bd86665cdef4bd8534244517670a096ebe4b76f2ae90ed'
});
export function hostWindowLimit(approval) {
  if(approval===undefined)return 60000;
  if(approval?.reference!==OVERNIGHT_HOST_APPROVAL.reference||approval.sourceSnapshot!==OVERNIGHT_HOST_APPROVAL.sourceSnapshot)fail('HOST_WINDOW_APPROVAL_REQUIRED',403);
  return 120000;
}
