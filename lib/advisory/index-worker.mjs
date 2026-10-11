import {randomUUID} from 'node:crypto';
import {createKnowledgeIndex,indexTerms} from './knowledge-search.mjs';
import {fail,FABRIC_ID,UUID} from './contracts.mjs';
export const INDEX_LIMITS=Object.freeze({batch:6,intervalMs:5000,leaseMs:30000,readTimeoutMs:12000,maxInvocationBatches:20});
export function knowledgeFields(r){
  const v=r.visual??{};
  return {colour:!!r.colour,tone:!!(v.colourTemperature||v.lightness||v.saturation),pattern:!!v.patternClass,
    patternScale:!!v.patternScale,texture:!!(v.visualSurface?.length||v.character?.length),description:!!r.description,
    identity:!!r.id,design:!!r.design,collection:!!r.collection,brand:!!r.brand,
    composition:!!r.composition?.length,width:Number.isFinite(r.fullWidthMm),weight:Number.isFinite(r.weightGsm),
    verticalRepeat:Number.isFinite(r.verticalRepeatMm),horizontalRepeat:Number.isFinite(r.horizontalRepeatMm),care:!!r.careInstructions?.length,
    technical:!!(r.applications?.length||r.careInstructions?.length||r.patternMatch)};
}
// Operator-only. One bounded step, shared I/O gate, no automatic bootstrap,
// scheduler, credential discovery or writes to canonical source tables.
export function createIndexWorker({transaction,catalogue,source,now=null}){
  const transact=fn=>transaction(async tx=>{
    await tx.query("select set_config('statement_timeout','3000',true),set_config('lock_timeout','500',true)");
    return fn(tx);
  });
  let databaseTime=Date.now();
  const at=()=>now?now():databaseTime;
  const clock=()=>new Date(at()).toISOString();
  const lock=async(tx,token)=>{
    const gate=(await tx.query('select *,clock_timestamp() as database_now from advisory.index_gate where id=1 for update nowait')).rows[0];
    databaseTime=Date.parse(gate.database_now);
    if(token){if(gate.token!==token||Date.parse(gate.lease_until)<=at())fail('INDEX_LEASE_LOST',409);}
    else if((gate.token&&Date.parse(gate.lease_until)>at())||Date.parse(gate.next_at)>at())fail('INDEX_THROTTLED',429);
  };
  const release=async(tx,delay=INDEX_LIMITS.intervalMs)=>tx.query('update advisory.index_gate set token=null,lease_until=null,next_at=$1 where id=1',[new Date(at()+delay).toISOString()]);
  return {async step(jobId,expectation=null){
    if(!new RegExp(UUID).test(jobId))fail('INVALID_INPUT');
    const started=performance.now(),token=randomUUID();
    const job=await transact(async tx=>{
      await lock(tx);
      const j=(await tx.query('select * from advisory.index_jobs where id=$1 for update nowait',[jobId])).rows[0];
      if(!j)fail('INDEX_JOB_NOT_APPROVED',403);
      if(expectation&&(j.source_snapshot!==expectation.sourceSnapshot||j.expected_count!==expectation.expectedCount))fail('INDEX_APPROVAL_SOURCE_MISMATCH',403);
      if(j.complete||j.status==='exhausted')return {...j,replay:true};
      if(j.status!=='ready')fail('INDEX_JOB_STOPPED',409);
      await tx.query('update advisory.index_gate set token=$1,lease_until=$2,next_at=$2 where id=1',[token,new Date(at()+INDEX_LIMITS.leaseMs).toISOString()]);
      return j;
    });
    if(job.replay)return {complete:job.complete,processed:job.processed,indexed:job.indexed,sourceExhausted:true,replayed:true};
    try{
      const signal=AbortSignal.timeout(INDEX_LIMITS.readTimeoutMs);
      // No open SQL transaction while reading upstream. Actual catalogue reads
      // combine this signal with their per-request 4.5 second deadline.
      const reads=async()=>{
        const page=await source.page({cursor:job.cursor,snapshot:job.source_snapshot,limit:6,signal});
        if(!Array.isArray(page.ids)||page.ids.length>6||new Set(page.ids).size!==page.ids.length||page.ids.some(id=>!new RegExp(FABRIC_ID).test(id))||typeof page.done!=='boolean'||page.cursor===undefined||Buffer.byteLength(JSON.stringify(page.cursor))>2048||(!page.done&&(!page.ids.length||JSON.stringify(page.cursor)===JSON.stringify(job.cursor)))||page.snapshot!==job.source_snapshot)fail('INVALID_INDEX_SOURCE',503);
        const records=await (catalogue.lookupForIndex??catalogue.lookup)(page.ids,{signal});
        if(records.length!==page.ids.length||records.some(r=>!page.ids.includes(r.id))||new Set(records.map(r=>r.id)).size!==records.length)fail('INCOMPLETE_INDEX_BATCH',503);
        const attested=page.done&&Number.isSafeInteger(job.expected_count)?await source.verifySnapshot(job.source_snapshot,{signal}):false;
        return {page,records,attested};
      };
      let abort;
      const timeout=new Promise((_,reject)=>{abort=()=>reject(Error('INDEX_READ_TIMEOUT'));signal.addEventListener('abort',abort,{once:true});});
      let data;try{data=await Promise.race([reads(),timeout]);}finally{signal.removeEventListener('abort',abort);}
      const {page,records,attested}=data;
      return await transact(async tx=>{
        await lock(tx,token);
        const processed=job.processed+page.ids.length,indexed=job.indexed+records.length;
        if(job.expected_count!==null&&processed>job.expected_count)fail('SOURCE_COVERAGE_CHANGED',503);
        for(const r of records){
          const before=(await tx.query('select to_jsonb(k) as value from advisory.knowledge_search k where fabric_id=$1 for update',[r.id])).rows[0]?.value??null;
          const receipt=await tx.query('insert into advisory.index_job_items(job_id,fabric_id,before_row,after_hash,fields) values($1,$2,$3,$4,$5) on conflict do nothing returning fabric_id',[jobId,r.id,before,indexTerms(r).hash,knowledgeFields(r)]);
          if(receipt.rows.length!==1)fail('DUPLICATE_INDEX_PAGE',503);
        }
        const update=await createKnowledgeIndex({query:tx.query.bind(tx)}).updateBatch(records);
        const complete=page.done&&Number.isSafeInteger(job.expected_count)&&processed===job.expected_count&&attested===true;
        await tx.query('update advisory.index_jobs set cursor=$2,processed=$3,indexed=$4,complete=$5,batches=batches+1,updated_at=$6,status=$7,failures=0,last_error=null where id=$1',[jobId,JSON.stringify(page.cursor),processed,indexed,complete,clock(),page.done?'exhausted':'ready']);
        await release(tx);
        return {complete,processed,indexed,expected:job.expected_count,changed:update.changed,read:page.ids.length,batches:job.batches+1,elapsedMs:performance.now()-started,sourceExhausted:page.done};
      });
    }catch(error){
      // Stale workers cannot release replacement leases. Error records contain
      // no upstream response text, source content or customer data.
      await transact(async tx=>{
        const gate=(await tx.query('select token,clock_timestamp() as database_now from advisory.index_gate where id=1 for update')).rows[0];
        databaseTime=Date.parse(gate.database_now);
        if(gate.token!==token)return;
        await tx.query("update advisory.index_jobs set failures=failures+1,last_error='INDEX_BATCH_FAILED',updated_at=$2 where id=$1",[jobId,clock()]);
        await release(tx,Math.min(300000,30000*2**Math.min(job.failures,4)));
      });
      throw error;
    }
  },async rollback(jobId){
    if(!new RegExp(UUID).test(jobId))fail('INVALID_INPUT');
    return transact(async tx=>{
      await lock(tx);
      const job=(await tx.query('select * from advisory.index_jobs where id=$1 for update',[jobId])).rows[0];
      if(!job)fail('INDEX_JOB_NOT_APPROVED',403);
      const items=(await tx.query('select * from advisory.index_job_items where job_id=$1 and not rolled_back order by fabric_id limit 6 for update',[jobId])).rows;
      for(const item of items){
        const current=(await tx.query('select source_hash from advisory.knowledge_search where fabric_id=$1 for update',[item.fabric_id])).rows[0];
        if(current?.source_hash!==item.after_hash)fail('INDEX_ROLLBACK_CONFLICT',409);
        // Later jobs, including unchanged hashes, must be rolled back first.
        const later=(await tx.query('select 1 from advisory.index_job_items i where i.fabric_id=$1 and i.job_id<>$2 and not i.rolled_back and i.write_sequence > $3 limit 1',[item.fabric_id,jobId,item.write_sequence])).rows;
        if(later.length)fail('INDEX_ROLLBACK_CONFLICT',409);
        await tx.query('delete from advisory.knowledge_search where fabric_id=$1',[item.fabric_id]);
        if(item.before_row)await tx.query('insert into advisory.knowledge_search select * from jsonb_populate_record(null::advisory.knowledge_search,$1)',[item.before_row]);
        await tx.query('update advisory.index_job_items set rolled_back=true where job_id=$1 and fabric_id=$2',[jobId,item.fabric_id]);
      }
      const pending=(await tx.query('select 1 from advisory.index_job_items where job_id=$1 and not rolled_back limit 1',[jobId])).rows.length>0;
      await tx.query('update advisory.index_jobs set status=$2,complete=false,updated_at=$3 where id=$1',[jobId,pending?'rolling_back':'rolled_back',clock()]);
      await release(tx);
      return {restored:items.length,complete:!pending};
    });
  }};
}
