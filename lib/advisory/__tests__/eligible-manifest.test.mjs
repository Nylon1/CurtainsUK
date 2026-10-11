import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {prepareEligibleManifest,validateEligibleManifest,createEligibleManifestSource} from '../eligible-manifest.mjs';
import {validateSourceManifest} from '../source-manifest.mjs';
import {createIndexWorker} from '../index-worker.mjs';
import {validatePopulationApproval} from '../index-population.mjs';
const projectRef='hqysjumypgeapgmqkcrx',at=Date.now(),h='b'.repeat(64),digest=ids=>createHash('sha256').update(ids.join('\n')).digest('hex');
function fixture(){
 const ids=Array.from({length:12},(_,i)=>'fixture-'+String(i).padStart(4,'0')),chosen=ids.slice(1,10);
 const candidates={projectRef,observed_at:new Date(at).toISOString(),ids,identity_count:ids.length,identity_sha256:digest(ids)};
 const publication={classification:'PUBLICATION_RECONCILIATION_NOT_EXECUTION_APPROVAL',observedAt:candidates.observed_at,unmappedUrls:[],candidateAndPublishedIds:chosen,candidateAndPublishedCount:chosen.length,candidateAndPublishedSha256:digest(chosen),receipts:[{url:'https://www.curtainsuk.com/sitemap_metaobject_pages_1.xml',status:200,sha256:h}]};
 return {candidates,publication,policySha256:h};
}
const admit=(m,ids)=>({projectRef,observed_at:new Date(at).toISOString(),snapshot:validateEligibleManifest(m).snapshot,policySha256:m.policySha256,sourceUnchanged:true,publicationUnchanged:true,eligibleIds:ids});

test('superseded proposal cannot be admitted by flipping its approval flag',()=>{
 assert.throws(()=>validatePopulationApproval({approved:true,executionProhibited:true}),/INDEX_SCOPE_SUPERSEDED/);
});

test('eligible manifest excludes unpublished IDs and cannot reuse a historical all-Master cursor',async()=>{
 const f=fixture(),m=prepareEligibleManifest(f),s=validateEligibleManifest(m),source=createEligibleManifestSource({manifest:m,now:()=>at,attest:async({ids})=>admit(m,ids)});
 assert.equal(s.count,9);assert.equal(m.approvedForExecution,false);assert.deepEqual(m.excludedCandidateIds,[f.candidates.ids[0],...f.candidates.ids.slice(10)]);
 assert.throws(()=>validateSourceManifest(m));
 await assert.rejects(source.page({snapshot:s.snapshot,cursor:{offset:6,manifestHash:f.candidates.identity_sha256}}),/INVALID_INDEX_CURSOR/);
 const a=await source.page({snapshot:s.snapshot}),b=await source.page({snapshot:s.snapshot,cursor:a.cursor});
 assert.equal(a.ids.length,6);assert.equal(b.ids.length,3);assert.equal(b.done,true);assert.deepEqual([...a.ids,...b.ids],m.ids);
 for(const changed of [{policySha256:'c'.repeat(64)},{publicationSha256:'c'.repeat(64)}])assert.notEqual(validateEligibleManifest({...m,...changed}).snapshot,s.snapshot);
});
test('missing publication evidence, identity tampering and unknown mappings fail closed',()=>{
 const f=fixture();
 for(const publication of [{...f.publication,receipts:[]},{...f.publication,unmappedUrls:['https://www.curtainsuk.com/pages/fabric/unmapped']},{...f.publication,candidateAndPublishedSha256:'0'.repeat(64)},{...f.publication,candidateAndPublishedCount:10}])assert.throws(()=>prepareEligibleManifest({...f,publication}));
 const ids=['not-a-candidate'],publication={...f.publication,candidateAndPublishedIds:ids,candidateAndPublishedCount:1,candidateAndPublishedSha256:digest(ids)};
 assert.throws(()=>prepareEligibleManifest({...f,publication}),/ELIGIBLE_IDENTITY_ORDER_MISMATCH/);
 assert.throws(()=>validateEligibleManifest({...prepareEligibleManifest(f),projectRef:'another-project'}));
});
test('each six-ID page rechecks live eligibility and rejects expiry, drift, omission and wrong project',async()=>{
 const m=prepareEligibleManifest(fixture()),s=validateEligibleManifest(m);
 for(const change of [{eligibleIds:[]},{sourceUnchanged:false},{publicationUnchanged:false},{observed_at:new Date(at-60001).toISOString()},{policySha256:'c'.repeat(64)},{projectRef:'another-project'}]){
  const source=createEligibleManifestSource({manifest:m,now:()=>at,attest:async({ids})=>({...admit(m,ids),...change})});
  await assert.rejects(source.page({snapshot:s.snapshot}),/ELIGIBILITY_CHANGED_REVIEW_REQUIRED/);
 }
});
test('existing worker resumes a separate eligible job without duplicate search rows or rewriting historical receipts',async()=>{
 const db=new PGlite();let clock=at;const oldId=randomUUID(),newId=randomUUID(),f=fixture(),m=prepareEligibleManifest(f),s=validateEligibleManifest(m);
 const records=f.candidates.ids.map(id=>({id,colour:'Ivory',composition:[],visual:{}}));
 try{
  await db.exec('create schema advisory;create role anon;create role authenticated;create role service_role;');
  for(const file of ['search.review.sql','index-worker.review.sql'])await db.exec(await readFile(new URL('../'+file,import.meta.url),'utf8'));
  await db.query('insert into advisory.index_jobs(id,source_snapshot,expected_count) values($1,$2,12)',[oldId,'historic-all-master-fixture']);
  const catalogue={lookup:async ids=>records.filter(r=>ids.includes(r.id))};
  const oldWorker=createIndexWorker({transaction:db.transaction.bind(db),catalogue,now:()=>clock,source:{page:async()=>({ids:f.candidates.ids.slice(0,6),cursor:6,snapshot:'historic-all-master-fixture',done:false})}});
  await oldWorker.step(oldId);clock+=5000;
  const history=await db.query('select * from advisory.index_job_items where job_id=$1 order by fabric_id',[oldId]);
  const oldJob=await db.query('select * from advisory.index_jobs where id=$1',[oldId]);
  await db.query('insert into advisory.index_jobs(id,source_snapshot,expected_count) values($1,$2,$3)',[newId,s.snapshot,s.count]);
  const source=createEligibleManifestSource({manifest:m,now:()=>at,attest:async({ids})=>admit(m,ids)});
  const worker=()=>createIndexWorker({transaction:db.transaction.bind(db),catalogue,source,now:()=>clock});
  const first=await worker().step(newId);assert.equal(first.processed,6);assert.equal(first.changed,1);clock+=5000;
  const last=await worker().step(newId);assert.equal(last.complete,true);assert.equal(last.indexed,9);
  assert.equal(Number((await db.query('select count(*) as n from advisory.knowledge_search')).rows[0].n),10); // nine eligible plus preserved historical excluded row
  assert.equal(Number((await db.query('select count(*) as n from advisory.index_job_items where job_id=$1 and before_row is not null',[newId])).rows[0].n),5);
  assert.deepEqual((await db.query('select * from advisory.index_job_items where job_id=$1 order by fabric_id',[oldId])).rows,history.rows);
  assert.deepEqual((await db.query('select * from advisory.index_jobs where id=$1',[oldId])).rows,oldJob.rows);
 }finally{await db.close();}
});
