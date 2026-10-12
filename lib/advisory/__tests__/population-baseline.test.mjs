import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {prepareEligibleManifest,validateEligibleManifest} from '../eligible-manifest.mjs';
import {preparePopulationBaseline,readPopulationBaseline} from '../population-baseline.mjs';
import {verifyUncommittedPlan} from '../uncommitted-plan.mjs';

const hash=s=>createHash('sha256').update(s).digest('hex'),h='a'.repeat(64),base=Date.parse('2026-10-12T18:00:00Z');
const stamp=n=>new Date(base+n*1000).toISOString();
function fixture(count=13){
 const jobId=randomUUID(),oldId=randomUUID(),ids=Array.from({length:count},(_,i)=>'fabric-'+String(i).padStart(5,'0'));
 const manifest=prepareEligibleManifest({policySha256:h,candidates:{projectRef:'hqysjumypgeapgmqkcrx',ids,identity_count:count,identity_sha256:hash(ids.join('\n')),observed_at:stamp(0)},publication:{classification:'PUBLICATION_RECONCILIATION_NOT_EXECUTION_APPROVAL',observedAt:stamp(0),candidateAndPublishedIds:ids,candidateAndPublishedCount:count,candidateAndPublishedSha256:hash(ids.join('\n')),unmappedUrls:[],receipts:[{url:'https://www.curtainsuk.com/sitemap_metaobject_pages_1.xml',status:200,sha256:h}]}});
 const scope=validateEligibleManifest(manifest),oldIds=[...ids.slice(0,5),'excluded-history'];
 const historical={job:{id:oldId,processed:6,indexed:6},rows:oldIds.map(fabric_id=>({fabric_id,source_hash:h,indexed_at:stamp(-86400)})),items:oldIds.map(fabric_id=>({job_id:oldId,fabric_id,after_hash:h,rolled_back:false,before_row:null}))};
 const events=[];
 for(let offset=0;offset<count;offset+=6){
  const end=Math.min(count,offset+6),deadline=stamp(offset+60);
  const sql="begin;\nset local statement_timeout='3s';\nset local idle_in_transaction_session_timeout='5s';\nif clock_timestamp()>=convert_from(decode('"+Buffer.from(deadline).toString('hex')+"','hex'),'UTF8')::timestamptz then raise exception 'ELIGIBLE_ATTESTATION_EXPIRED'; end if;\ncommit;";
  const plan={classification:'ELIGIBLE_PLAN_NOT_EXECUTION',jobId,sourceSnapshot:scope.snapshot,expectedCount:count,fromOffset:offset,cursor:{offset:end,manifestHash:scope.hash},complete:end===count,ids:ids.slice(offset,end),historical,sql,sqlSha256:hash(sql),deadline,bundleHash:h,approval:{projectRef:manifest.projectRef,implementationSha256:h}};
  plan.items=plan.ids.map(id=>({id,hash:h,fields:{identity:true},beforeRow:historical.rows.find(r=>r.fabric_id===id)??null}));
  const receipt={processed:end,indexed:end,batches:Math.ceil(end/6),complete:end===count,permissionRestored:true,unchanged:plan.items.filter(i=>i.beforeRow).length};
  events.push({kind:'prepared',at:stamp(offset),plan},{kind:'verified',at:stamp(offset+1),sqlSha256:plan.sqlSha256,receipt});
 }
 return {manifest,jobId,historical,events};
}

test('complete journal produces only a local ID/hash baseline and includes earlier historical knowledge',async()=>{
 const f=fixture(),r=await preparePopulationBaseline(f);
 assert.equal(r.processed,13);assert.equal(r.complete,true);assert.equal(r.rows.length,13);assert.equal(r.pendingWrite,false);
 assert.equal(r.populationStartedAt,stamp(-86460));assert.equal(r.rows.filter(r=>r.historical).length,5);
 assert.deepEqual(r.historicalOutsideManifest,[{id:'excluded-history',sourceHash:h}]);
 assert.equal(r.hostedVerificationRequired,true);assert.equal(r.reconciliationComplete,false);assert.equal(r.hostedWrites,0);
 assert.doesNotMatch(JSON.stringify(r),/insert into|composition|wholesale|price/);
});

test('a prepared but unverified batch stays pending and never inflates coverage',async()=>{
 const f=fixture();f.events.pop();const r=await preparePopulationBaseline(f);
 assert.equal(r.processed,12);assert.equal(r.remaining,1);assert.equal(r.pendingWrite,true);assert.equal(r.complete,false);
});

test('duplicate, missing, foreign, tampered and out-of-order receipts cannot become a baseline',async()=>{
 const changes=[f=>f.events.splice(1,1),f=>f.events.splice(2,0,f.events[0]),f=>f.events[0].plan.jobId=randomUUID(),
 f=>f.events[0].plan.sql+='changed',f=>f.events[0].plan.items[0].id='wrong',f=>f.events[0].plan.sourceSnapshot='wrong',
 f=>f.events[1].receipt.permissionRestored=false,f=>f.events[1].receipt.batches=99,f=>f.events[1].receipt.complete=true,
 f=>f.events[1].at=stamp(-1),f=>f.events[2].plan.fromOffset=0,f=>f.events[2].plan.ids.reverse(),
 f=>f.historical.rows[0].indexed_at='unknown',f=>f.events[0].plan.items[0].hash='b'.repeat(64)];
 for(const change of changes){const f=fixture();change(f);await assert.rejects(preparePopulationBaseline(f),/REQUIRES_REVIEW/);}
});

test('expired-uncommitted evidence is verified and contributes no indexed identities',async()=>{
 const f=fixture(132),prefix=f.events.slice(0,40),pending=f.events[40],previousPlan=f.events[38].plan;
 const job={id:f.jobId,source_snapshot:previousPlan.sourceSnapshot,expected_count:132,processed:120,indexed:120,batches:20,cursor:previousPlan.cursor,complete:false,status:'ready',failures:0};
 const previousReadback={job,historical:f.historical,permissionRestored:true,items:previousPlan.items.map(i=>({...i,receiptHash:i.hash,rolledBack:false}))};
 const evidence={previousPlan,previousReadback,observations:[220,230].map(n=>({projectRef:f.manifest.projectRef,observedAt:stamp(n),job,historical:f.historical,permissionRestored:true,oldTransactions:0,preparedTransactions:0,knowledgeRows:[],jobItems:[],items:null}))};
 const receipt=verifyUncommittedPlan(pending.plan,evidence,base+240000);
 const resolved={kind:'expired-uncommitted',at:stamp(240),sqlSha256:pending.plan.sqlSha256,evidence,receipt};
 const r=await preparePopulationBaseline({...f,events:[...prefix,pending,resolved]});
 assert.equal(r.processed,120);assert.equal(r.pendingWrite,false);assert.equal(r.complete,false);assert.equal(r.expiredUncommittedResolutions,1);
 evidence.observations[0].knowledgeRows=[{fabric_id:'committed'}];
 await assert.rejects(preparePopulationBaseline({...f,events:[...prefix,pending,resolved]}));
});

test('read-only file snapshot preserves journal and existing operator lock; partial tail is refused',async()=>{
 const f=fixture(),dir=await mkdtemp(path.join(os.tmpdir(),'jane-baseline-test-')),journalPath=path.join(dir,'journal.jsonl');
 const content=f.events.map(e=>JSON.stringify(e)+'\n').join('');
 await writeFile(journalPath,content);await writeFile(path.join(dir,'operator.lock'),'synthetic active operator');
 const r=await readPopulationBaseline({...f,journalPath});assert.equal(r.frozenJournalBytes,Buffer.byteLength(content));assert.equal(r.processed,13);
 assert.equal(await readFile(journalPath,'utf8'),content);assert.equal(await readFile(path.join(dir,'operator.lock'),'utf8'),'synthetic active operator');
 await writeFile(journalPath,content+'{"kind":');await assert.rejects(readPopulationBaseline({...f,journalPath}),/REQUIRES_REVIEW/);
 // Keep this small synthetic evidence. No deletion of workspace/run artifacts.
});
