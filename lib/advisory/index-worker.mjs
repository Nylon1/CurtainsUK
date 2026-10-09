import {createKnowledgeIndex} from './knowledge-search.mjs';
import {fail,FABRIC_ID,UUID} from './contracts.mjs';
// Operator-only, one bounded batch per invocation. transaction must use one
// connection. No automatic bootstrap/backfill, source writes or scheduled loop.
export function createIndexWorker({transaction,catalogue,source,now=()=>Date.now()}){
  return {async step(jobId){
    if(!new RegExp(UUID).test(jobId))fail('INVALID_INPUT');const started=now();
    return transaction(async tx=>{
      const job=(await tx.query('select * from advisory.index_jobs where id=$1 for update nowait',[jobId])).rows[0];
      if(!job)fail('INDEX_JOB_NOT_APPROVED',403);
      if(job.complete)return {complete:true,processed:job.processed,indexed:job.indexed,replayed:true};
      const page=await source.page({cursor:job.cursor,snapshot:job.source_snapshot,limit:6});
      if(!Array.isArray(page.ids)||page.ids.length>6||new Set(page.ids).size!==page.ids.length||page.ids.some(id=>!new RegExp(FABRIC_ID).test(id))||typeof page.done!=='boolean'||(!page.done&&(!page.ids.length||JSON.stringify(page.cursor)===JSON.stringify(job.cursor)))||page.snapshot!==job.source_snapshot)fail('INVALID_INDEX_SOURCE',503);
      const records=await catalogue.lookup(page.ids);
      if(records.length!==page.ids.length||records.some(r=>!page.ids.includes(r.id))||new Set(records.map(r=>r.id)).size!==records.length)fail('INCOMPLETE_INDEX_BATCH',503);
      for(const id of page.ids){
        const receipt=await tx.query('insert into advisory.index_job_items(job_id,fabric_id) values($1,$2) on conflict do nothing returning fabric_id',[jobId,id]);
        if(receipt.rows.length!==1)fail('DUPLICATE_INDEX_PAGE',503);
      }
      const index=createKnowledgeIndex({query:tx.query.bind(tx)}),update=await index.updateBatch(records);
      const processed=job.processed+page.ids.length,indexed=job.indexed+records.length;
      if(job.expected_count!==null&&processed>job.expected_count)fail('SOURCE_COVERAGE_CHANGED',503);
      // An exhausted page is insufficient to claim full-master coverage. Require
      // an exact approved denominator and source-snapshot attestation as well.
      const complete=page.done&&Number.isSafeInteger(job.expected_count)&&processed===job.expected_count&&await source.verifySnapshot(job.source_snapshot);
      await tx.query('update advisory.index_jobs set cursor=$2,processed=$3,indexed=$4,complete=$5,batches=batches+1,updated_at=now() where id=$1',[jobId,page.cursor,processed,indexed,complete]);
      return {complete,processed,indexed,expected:job.expected_count,changed:update.changed,read:page.ids.length,batches:job.batches+1,elapsedMs:now()-started,sourceExhausted:page.done};
    });
  }};
}
