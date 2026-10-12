import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {prepareEligibleManifest,validateEligibleManifest} from '../eligible-manifest.mjs';
import {evidenceHash} from '../eligible-plan.mjs';
import {verifyCompletedPopulation} from '../population-verification.mjs';

const hash=s=>createHash('sha256').update(s).digest('hex'),h='a'.repeat(64),time='2026-10-12T22:00:00.000Z',now=Date.parse(time)+1000;
function fixture(count=11517){
 const ids=Array.from({length:count},(_,i)=>'fabric-'+String(i).padStart(5,'0'));
 const manifest=prepareEligibleManifest({policySha256:h,candidates:{projectRef:'hqysjumypgeapgmqkcrx',ids,identity_count:count,identity_sha256:hash(ids.join('\n')),observed_at:time},publication:{classification:'PUBLICATION_RECONCILIATION_NOT_EXECUTION_APPROVAL',observedAt:time,candidateAndPublishedIds:ids,candidateAndPublishedCount:count,candidateAndPublishedSha256:hash(ids.join('\n')),unmappedUrls:[],receipts:[{url:'https://www.curtainsuk.com/sitemap_metaobject_pages_1.xml',status:200,sha256:h}]}});
 const scope=validateEligibleManifest(manifest),jobId=randomUUID();
 const historical={job:{id:randomUUID()},items:[],rows:[...ids.slice(0,5),'excluded-history'].map(fabric_id=>({fabric_id,source_hash:h}))};
 const baseline={classification:'LOCAL_JOURNAL_BASELINE_NOT_HOSTED_COVERAGE',jobId,projectRef:manifest.projectRef,sourceSnapshot:scope.snapshot,expected:count,processed:count,remaining:0,complete:true,pendingWrite:false,duplicateIds:0,batches:Math.ceil(count/6),journalEvidenceSha256:h,historicalSha256:evidenceHash(historical),lastVerifiedAt:time,populationStartedAt:'2026-10-11T18:54:39.275Z',rows:ids.map((id,i)=>({id,sourceHash:h,historical:i<5})),historicalOutsideManifest:[{id:'excluded-history',sourceHash:h}]};
 const hosted={observedAt:time,job:{id:jobId,source_snapshot:scope.snapshot,expected_count:count,processed:count,indexed:count,batches:Math.ceil(count/6),complete:true,status:'exhausted',failures:0,cursor:{manifestHash:scope.hash,offset:count}},historical,receipts:count,matchedHashes:count,historicalNoops:5,newEligibleRows:count-5,totalKnowledge:count+1,permissionRestored:true,receiptIdentityHash:hash(ids.join('\n')),receiptContentHash:hash(ids.map(id=>id+':'+h).join('\n'))};
 return {manifest,baseline,historical,hosted,now};
}

test('exact 11,517 completion accepts the final three-record batch without approving reconciliation or launch',()=>{
 const r=verifyCompletedPopulation(fixture());assert.equal(r.batches,1920);assert.equal(r.verified,11517);assert.equal(r.complete,true);
 assert.equal(r.historicalNoops,5);assert.equal(r.historicalOutsideManifest,1);assert.equal(r.reconciliationComplete,false);
 assert.equal(r.launchApproved,false);assert.equal(r.hostedWrites,0);assert.equal(r.paidCalls,0);
});
test('partial, pending, stale, future and non-final receipts cannot become completion',()=>{
 const changes=[f=>f.baseline.complete=false,f=>f.baseline.pendingWrite=true,f=>f.baseline.processed--,
  f=>f.hosted.job.status='ready',f=>f.hosted.job.batches--,f=>f.hosted.job.cursor.offset--,
  f=>f.hosted.observedAt='2026-10-12T21:58:00Z',f=>f.hosted.observedAt='2026-10-12T22:01:00Z',
  f=>f.baseline.lastVerifiedAt='2026-10-12T22:00:00.500Z'];
 for(const change of changes){const f=fixture(15);change(f);assert.throws(()=>verifyCompletedPopulation(f),/FINAL_POPULATION_REQUIRES_REVIEW/);}
});
test('missing, duplicate, substituted or changed identities/hashes fail whole-job verification',()=>{
 const changes=[f=>f.baseline.rows.pop(),f=>f.baseline.rows[1].id=f.baseline.rows[0].id,
  f=>f.baseline.rows[7].id='unapproved-fabric',f=>f.baseline.rows[7].sourceHash='b'.repeat(64),
  f=>f.hosted.receiptIdentityHash='b'.repeat(64),f=>f.hosted.receiptContentHash='b'.repeat(64),
  f=>f.hosted.matchedHashes--,f=>f.hosted.receipts++,f=>f.hosted.totalKnowledge++,f=>f.hosted.job.source_snapshot='foreign'];
 for(const change of changes){const f=fixture(15);change(f);assert.throws(()=>verifyCompletedPopulation(f),/FINAL_POPULATION_REQUIRES_REVIEW/);}
});
test('history, no-op, rollback-count and permission drift fail closed without mutating evidence',()=>{
 const f=fixture(15),before=JSON.stringify(f);verifyCompletedPopulation(f);assert.equal(JSON.stringify(f),before);
 const changes=[g=>g.hosted.historical=structuredClone({...g.historical,changed:true}),g=>g.baseline.historicalSha256='b'.repeat(64),
  g=>g.baseline.historicalOutsideManifest=[],g=>g.baseline.rows[0].historical=false,g=>g.hosted.historicalNoops=0,
  g=>g.hosted.newEligibleRows++,g=>g.hosted.permissionRestored=false,g=>g.hosted.job.failures=1];
 for(const change of changes){const g=fixture(15);change(g);assert.throws(()=>verifyCompletedPopulation(g),/FINAL_POPULATION_REQUIRES_REVIEW/);}
});
