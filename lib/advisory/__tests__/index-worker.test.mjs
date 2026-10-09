import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {createIndexWorker} from '../index-worker.mjs';
import {createKnowledgeIndex} from '../knowledge-search.mjs';
test('incremental worker checkpoints atomically, resumes failures and measures truthful coverage/performance',async()=>{
  const db=new PGlite(),id=randomUUID(),records=Array.from({length:120},(_,i)=>({id:'fixture-'+String(i).padStart(4,'0'),colour:i%2?'Muted olive':'Warm ivory',description:'Calm natural woven curtains',composition:[{material:'cotton'}],weightGsm:210,fullWidthMm:1400,visual:{patternScale:'small',patternClass:'botanical',visualSurface:['matte']}}));
  const metrics={classification:'SYNTHETIC_LOCAL_FIXTURE_NOT_MASTER_COVERAGE',records:records.length,lookups:0,largestRead:0};let failure=true;
  try{
    await db.exec('create schema advisory;create role anon;create role authenticated;create role service_role;');
    for(const f of ['search.review.sql','index-worker.review.sql'])await db.exec(await readFile(new URL('../'+f,import.meta.url),'utf8'));
    await db.query('insert into advisory.index_jobs(id,source_snapshot,expected_count) values($1,$2,$3)',[id,'fixture-v1',records.length]);
    const source={page:async({cursor,limit,snapshot})=>{const offset=cursor??0;return {ids:records.slice(offset,offset+limit).map(r=>r.id),cursor:Math.min(offset+limit,records.length),done:offset+limit>=records.length,snapshot};},verifySnapshot:async s=>s==='fixture-v1'};
    const catalogue={lookup:async ids=>{metrics.lookups++;metrics.largestRead=Math.max(metrics.largestRead,ids.length);if(failure&&ids[0]==='fixture-0006')throw Error('SIMULATED_READ_FAILURE');return records.filter(r=>ids.includes(r.id));}};
    const worker=()=>createIndexWorker({transaction:db.transaction.bind(db),catalogue,source});
    assert.equal((await worker().step(id)).processed,6);
    await assert.rejects(worker().step(id),/SIMULATED_READ_FAILURE/);
    assert.equal((await db.query('select processed from advisory.index_jobs where id=$1',[id])).rows[0].processed,6);
    failure=false;let last;const started=performance.now();for(let i=0;i<19;i++)last=await worker().step(id);
    assert.equal(last.processed,120);assert.equal(last.complete,true);assert.equal((await worker().step(id)).replayed,true);
    metrics.indexMs=performance.now()-started;metrics.batches=last.batches;
    const index=createKnowledgeIndex({query:db.query.bind(db)}),times=[];
    for(let i=0;i<12;i++){const start=performance.now();const result=await index.search({query:'olive OR ivory',colour:'',pattern:'botanical',texture:'matte',composition:'cotton'});assert.equal(result.ids.length,6);times.push(performance.now()-start);}
    metrics.searchMedianMs=times.sort((a,b)=>a-b)[6];metrics.indexBytes=Number((await db.query("select pg_total_relation_size('advisory.knowledge_search') as bytes")).rows[0].bytes);
    await db.exec('set enable_seqscan=off');metrics.plan=(await db.query("explain (analyze,buffers,format json) select fabric_id from advisory.knowledge_search where document @@ websearch_to_tsquery('english','olive OR ivory') limit 6")).rows[0]['QUERY PLAN'];
    assert.match(JSON.stringify(metrics.plan),/advisory_knowledge_terms/);
    const partial=randomUUID();await db.query('insert into advisory.index_jobs(id,source_snapshot) values($1,$2)',[partial,'unmeasured']);
    const partialWorker=createIndexWorker({transaction:db.transaction.bind(db),catalogue:{lookup:async()=>[]},source:{page:async()=>({ids:[],cursor:null,done:true,snapshot:'unmeasured'}),verifySnapshot:async()=>true}});
    assert.equal((await partialWorker.step(partial)).complete,false);
    const duplicate=randomUUID();await db.query('insert into advisory.index_jobs(id,source_snapshot,expected_count) values($1,$2,2)',[duplicate,'duplicate-page']);
    const repeated=createIndexWorker({transaction:db.transaction.bind(db),catalogue:{lookup:async()=>[records[0]]},source:{page:async({cursor})=>({ids:[records[0].id],cursor:(cursor??0)+1,done:cursor===1,snapshot:'duplicate-page'}),verifySnapshot:async()=>true}});
    assert.equal((await repeated.step(duplicate)).processed,1);
    await assert.rejects(repeated.step(duplicate),/DUPLICATE_INDEX_PAGE/);
    assert.equal((await db.query('select processed from advisory.index_jobs where id=$1',[duplicate])).rows[0].processed,1);
    await mkdir('artifacts/jane-completion',{recursive:true});await writeFile('artifacts/jane-completion/index-performance.json',JSON.stringify(metrics,null,2));
  }finally{await db.close();}
});
