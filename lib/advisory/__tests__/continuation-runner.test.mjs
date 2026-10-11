import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runContinuationTranche} from '../continuation-runner.mjs';
import {createIndexJournal} from '../index-journal.mjs';
import {validateSourceManifest} from '../source-manifest.mjs';
const manifest=JSON.parse(await readFile(new URL('../../../artifacts/jane-pro-readiness-20261011/source-manifest.json',import.meta.url),'utf8'));
const m=validateSourceManifest(manifest),projectRef=manifest.projectRef;
function fixture(){
 let time=Date.now(),pending=null,held=false,writes=0,waits=0,committed=null;
 const bundleHash='a'.repeat(64),implementationSha256='b'.repeat(64);
 const approval={approved:true,projectRef,schema:'advisory',purpose:'bounded-advisory-index-only',ownerApprovalReference:'LOCAL SYNTHETIC ONLY',sourceAttestationReference:'LOCAL SYNTHETIC ONLY',jobId:'11111111-1111-4111-8111-111111111111',bundleHash,sourceSnapshot:m.snapshot,expectedCount:m.count,maxBatches:20,expiresAt:new Date(time+600000).toISOString(),implementationSha256,continuation:{startOffset:6,startingBatches:1,endOffset:126},temporaryRoleUse:{approved:true,member:'postgres',role:'advisory_indexer',grantor:'postgres',scope:'same-transaction-revoke-before-commit',ownerApprovalReference:'LOCAL ONLY'}};
 const job={id:approval.jobId,source_snapshot:m.snapshot,expected_count:m.count,cursor:{offset:6,manifestHash:m.hash},processed:6,indexed:6,batches:1,status:'ready',complete:false,failures:0};
 const journal={exclusive:async fn=>{if(held)throw Error('locked');held=true;try{return await fn();}finally{held=false;}},pending:async()=>pending,prepared:async plan=>{assert.equal(pending,null);pending=structuredClone(plan);},verified:async plan=>{assert.equal(pending.sqlSha256,plan.sqlSha256);pending=null;}};
 const options={manifest,approval,bundleHash,implementationSha256,journal,now:()=>time,
  wait:async ms=>{assert.equal(ms,5000);waits++;time+=ms;},
  readCheckpoint:async()=>({projectRef,observed_at:new Date(time).toISOString(),job:structuredClone(job)}),
  measure:async()=>({projectRef,source:'trusted-operator-telemetry',observedAt:time,windowMs:30000,cpuPercent:10,ioPercent:1,memoryPercent:62,diskPercent:50,connections:16,maxConnections:60,lockWaits:0,newDeadlocks:0,newDatabaseErrors:0,supplierRefreshActive:false}),
  readBatch:async({checkpoint})=>({attestation:{...manifest,observed_at:new Date(time).toISOString()},source:{projectRef,observed_at:new Date(time).toISOString(),records:manifest.ids.slice(checkpoint.job.cursor.offset,checkpoint.job.cursor.offset+6).map(fabric_id=>({fabric_id,colour_name:'Ivory',fabric_designs:{display_name:'SYNTHETIC TEST ONLY'}}))}}),
  submit:async sql=>{assert.equal(sql,pending.sql);writes++;committed=structuredClone(pending);Object.assign(job,{cursor:committed.cursor,processed:committed.cursor.offset,indexed:committed.cursor.offset,batches:job.batches+1});time+=10;},
  readBack:async()=>({job:structuredClone(job),permissionRestored:true,items:(committed?.items??[]).map(i=>({...i,receiptHash:i.hash,beforeRow:null,rolledBack:false}))})};
 return {options,job,counts:()=>({writes,waits,pending})};
}
test('automatic operator invocation stops at 20 batches and resumes the durable checkpoint without a schedule',async()=>{
 const f=fixture(),result=await runContinuationTranche(f.options);
 assert.equal(result.offset,126);assert.equal(result.receipts.length,20);assert.equal(f.counts().writes,20);assert.equal(f.counts().waits,19);assert.equal(f.counts().pending,null);
 const repeat=await runContinuationTranche(f.options);assert.equal(repeat.receipts.length,0);assert.equal(f.counts().writes,20);
 f.job.indexed=6;await assert.rejects(runContinuationTranche(f.options),/CHECKPOINT_CHANGED/);
});
test('lost COMMIT response is read back before continuation; uncommitted outcomes never trigger a blind retry',async()=>{
 const f=fixture(),submit=f.options.submit;let once=true;
 f.options.submit=async sql=>{await submit(sql);if(once){once=false;throw Error('simulated lost response');}};
 await assert.rejects(runContinuationTranche(f.options),/lost response/);assert.equal(f.counts().writes,1);assert.ok(f.counts().pending);
 const recovered=await runContinuationTranche(f.options);assert.equal(recovered.receipts[0].recovered,true);assert.equal(f.counts().writes,20);assert.equal(f.job.processed,126);
 const g=fixture();g.options.submit=async()=>{throw Error('network unavailable before commit');};
 await assert.rejects(runContinuationTranche(g.options),/network unavailable/);
 await assert.rejects(runContinuationTranche(g.options),/OUTCOME_REQUIRES_REVIEW/);assert.equal(g.counts().writes,0);assert.ok(g.counts().pending);
});
test('approval/code mismatch, load, source failure and permission mismatch stop further work',async()=>{
 const f=fixture();await assert.rejects(runContinuationTranche({...f.options,approval:{...f.options.approval,approved:false}}),/APPROVAL/);
 await assert.rejects(runContinuationTranche({...f.options,implementationSha256:'c'.repeat(64)}),/IMPLEMENTATION/);
 const measure=f.options.measure;f.options.measure=async()=>({...await measure(),supplierRefreshActive:true});
 await assert.rejects(runContinuationTranche(f.options),/RESOURCE_STOP/);assert.equal(f.counts().writes,0);
  f.options.measure=async()=>({...await measure(),windowMs:3600000});await assert.rejects(runContinuationTranche(f.options),/CURRENT_RESOURCE_WINDOW/);assert.equal(f.counts().writes,0);
 f.options.measure=measure;f.options.readBatch=async()=>{throw Error('source lookup failed');};
 await assert.rejects(runContinuationTranche(f.options),/source lookup failed/);assert.equal(f.counts().pending,null);
 const g=fixture(),back=g.options.readBack;g.options.readBack=async p=>({...await back(p),permissionRestored:false});
 await assert.rejects(runContinuationTranche(g.options),/OUTCOME_REQUIRES_REVIEW/);assert.equal(g.counts().writes,1);
 const h=fixture(),normal=h.options.measure;let samples=0;h.options.measure=async()=>({...await normal(),cpuPercent:++samples>1?80:10});
 await assert.rejects(runContinuationTranche(h.options),/RESOURCE_STOP/);assert.equal(h.counts().writes,1);assert.equal(h.counts().pending,null);
});
test('fsynced operator journal survives reopening, excludes another process and refuses truncated evidence',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'jane-journal-test-')),one=createIndexJournal(directory),two=createIndexJournal(directory);
 await one.exclusive(async()=>{
  await assert.rejects(two.exclusive(async()=>{}),/LOCKED/);assert.equal(await one.pending(),null);
  await one.prepared({sqlSha256:'local-fixture',sql:'SYNTHETIC NO EXECUTION'});
 });
 await two.exclusive(async()=>{const plan=await two.pending();assert.equal(plan.sqlSha256,'local-fixture');await two.verified(plan,{synthetic:true});assert.equal(await two.pending(),null);});
 const previous=await readFile(path.join(directory,'journal.jsonl'),'utf8');
 await writeFile(path.join(directory,'journal.jsonl'),previous+'{"kind":');
 await assert.rejects(one.exclusive(()=>one.pending()),/JOURNAL_REQUIRES_REVIEW/);
});
