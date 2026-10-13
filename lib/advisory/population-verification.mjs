import {createHash} from 'node:crypto';
import {fail,UUID} from './contracts.mjs';
import {validateEligibleManifest} from './eligible-manifest.mjs';
import {sameEvidence,evidenceHash} from './eligible-plan.mjs';

const digest=s=>createHash('sha256').update(s).digest('hex');
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const reject=()=>fail('FINAL_POPULATION_REQUIRES_REVIEW',409);

// Independent final readback only. Not imported by the running population
// operator. A completed population does not establish source-change catch-up,
// current purchase eligibility, recommendation quality or launch approval.
export function verifyCompletedPopulation({manifest,baseline:b,historical,hosted:h,now=Date.now()}){
 const scope=validateEligibleManifest(manifest),n=scope.count,age=now-Date.parse(h?.observedAt);
 if(!Number.isFinite(age)||age<0||age>60000||!new RegExp(UUID).test(b?.jobId??'')||b.classification!=='LOCAL_JOURNAL_BASELINE_NOT_HOSTED_COVERAGE'||b.projectRef!==manifest.projectRef||b.sourceSnapshot!==scope.snapshot||b.expected!==n||b.processed!==n||b.remaining!==0||b.complete!==true||b.pendingWrite!==false||b.duplicateIds!==0||b.batches!==Math.ceil(n/6)||!sha(b.journalEvidenceSha256)||!Number.isFinite(Date.parse(b.lastVerifiedAt))||Date.parse(b.lastVerifiedAt)>Date.parse(h.observedAt)||!Number.isFinite(Date.parse(b.populationStartedAt))||Date.parse(b.populationStartedAt)>Date.parse(b.lastVerifiedAt))reject();
 if(!Array.isArray(b.rows)||b.rows.length!==n||!sameEvidence(b.rows.map(r=>r.id),manifest.ids)||b.rows.some(r=>!sha(r.sourceHash)||typeof r.historical!=='boolean')||!historical||b.historicalSha256!==evidenceHash(historical)||!sameEvidence(h.historical,historical)||!Array.isArray(historical.rows)||historical.rows.length!==6)reject();
 const previous=new Map(historical.rows.map(r=>[r.fabric_id,r.source_hash]));
 if(previous.size!==6||b.rows.some(r=>r.historical!==previous.has(r.id)||(r.historical&&r.sourceHash!==previous.get(r.id))))reject();
 const outside=historical.rows.filter(r=>!manifest.ids.includes(r.fabric_id)).map(r=>({id:r.fabric_id,sourceHash:r.source_hash}));
 if(!sameEvidence(b.historicalOutsideManifest,outside))reject();
 const noops=b.rows.filter(r=>r.historical).length,j=h?.job;
 if(j?.id!==b.jobId||j.source_snapshot!==scope.snapshot||j.expected_count!==n||j.processed!==n||j.indexed!==n||j.batches!==Math.ceil(n/6)||j.complete!==true||j.status!=='exhausted'||j.failures!==0||!sameEvidence(j.cursor,{manifestHash:scope.hash,offset:n})||h.receipts!==n||h.matchedHashes!==n||h.historicalNoops!==noops||h.newEligibleRows!==n-noops||h.totalKnowledge!==n+outside.length||h.permissionRestored!==true)reject();
 const rows=[...b.rows].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 const identityHash=digest(rows.map(r=>r.id).join('\n')),contentHash=digest(rows.map(r=>r.id+':'+r.sourceHash).join('\n'));
 if(identityHash!==h.receiptIdentityHash||contentHash!==h.receiptContentHash)reject();
 return {classification:'VERIFIED_POPULATION_NOT_RECONCILIATION_OR_LAUNCH_APPROVAL',projectRef:manifest.projectRef,jobId:b.jobId,
  observedAt:h.observedAt,expected:n,processed:n,verified:n,remaining:0,batches:Math.ceil(n/6),complete:true,
  duplicateIds:0,unresolvedWrites:0,historicalNoops:noops,historicalOutsideManifest:outside.length,
  permissionRestored:true,receiptIdentityHash:identityHash,receiptContentHash:contentHash,journalEvidenceSha256:b.journalEvidenceSha256,
  populationStartedAt:b.populationStartedAt,populationCompletedAt:b.lastVerifiedAt,
  reconciliationComplete:false,recommendationReviewRequired:true,launchApproved:false,hostedWrites:0,paidCalls:0};
}
