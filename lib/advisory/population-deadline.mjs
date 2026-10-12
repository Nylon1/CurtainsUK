import {fail} from './contracts.mjs';

// Direct owner instruction in this thread, recorded on the PR. This removes
// only the calendar cutoff for this exact one-time job, never evidence expiry.
export const UNTIL_COMPLETE_APPROVAL=Object.freeze({
 kind:'one-time-until-complete',
 recordReference:'https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6122415089',
 ownerInstruction:'Proceed with no deadline',
 projectRef:'hqysjumypgeapgmqkcrx',
 jobId:'ac425f78-f6ec-4623-97bb-df8763d79d5a',
 sourceSnapshot:'eligible-identities-sha256:007a9a160c82d99817bd86665cdef4bd8534244517670a096ebe4b76f2ae90ed',
 expectedCount:11517
});

export function populationDeadline(approval,now=Date.now()){
 const scope=approval?.completionApproval;
 if(scope!==undefined){
  if(!scope||approval.expiresAt!==null||Object.keys(scope).length!==Object.keys(UNTIL_COMPLETE_APPROVAL).length||Object.entries(UNTIL_COMPLETE_APPROVAL).some(([key,value])=>scope[key]!==value)||['projectRef','jobId','sourceSnapshot','expectedCount'].some(key=>approval[key]!==scope[key]))fail('COMPLETION_SCOPE_APPROVAL_REQUIRED',403);
  return Infinity;
 }
 const deadline=Date.parse(approval?.expiresAt);
 if(!Number.isFinite(deadline)||deadline<=now||deadline>now+86400000)fail('INDEX_POPULATION_APPROVAL_REQUIRED',403);
 return deadline;
}

export function requireOperationDeadline(deadline,approval,code){
 if(Number.isFinite(deadline))return deadline;
 if(deadline===Infinity&&approval?.completionApproval&&populationDeadline(approval)===Infinity)return deadline;
 fail(code,503);
}
