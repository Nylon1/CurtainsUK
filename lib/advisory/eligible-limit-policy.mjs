import {fail} from './contracts.mjs';
import {OVERNIGHT_HOST_APPROVAL,hostWindowLimit} from './host-window-policy.mjs';

// Owner-approved exceptions for one exact initial population. General/default
// admission, other jobs, SQL timeouts and pressure limits remain unchanged.
export const EXTENDED_HOST_APPROVAL=Object.freeze({...OVERNIGHT_HOST_APPROVAL,
 latestSampleApprovalReference:'https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6118103282'});
export const EXTENDED_BATCH_APPROVAL=Object.freeze({
 reference:'https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6118124996',
 sourceSnapshot:OVERNIGHT_HOST_APPROVAL.sourceSnapshot,
 jobId:'ac425f78-f6ec-4623-97bb-df8763d79d5a'});
export function hostSampleMaxAge(approval){
 hostWindowLimit(approval);
 if(approval?.latestSampleApprovalReference===undefined)return 60000;
 if(approval.latestSampleApprovalReference!==EXTENDED_HOST_APPROVAL.latestSampleApprovalReference)fail('HOST_FRESHNESS_APPROVAL_REQUIRED',403);
 return 180000;
}
export function eligibleBatchMaxMs(approval){
 const a=approval?.batchLatencyApproval;if(a===undefined)return 10000;
 if(a.reference!==EXTENDED_BATCH_APPROVAL.reference||a.sourceSnapshot!==EXTENDED_BATCH_APPROVAL.sourceSnapshot||a.jobId!==EXTENDED_BATCH_APPROVAL.jobId||approval.jobId!==a.jobId||approval.sourceSnapshot!==a.sourceSnapshot||approval.expectedCount!==11517||approval.projectRef!=='hqysjumypgeapgmqkcrx')fail('BATCH_LATENCY_APPROVAL_REQUIRED',403);
 return 20000;
}
