import {randomUUID} from 'node:crypto';
import {fail,UUID} from './contracts.mjs';
import {INDEX_LIMITS} from './index-worker.mjs';
import {createKnowledgeIndex,indexTerms} from './knowledge-search.mjs';
import {verifyUpdateManifest} from './knowledge-update-source.mjs';
import {EXISTING_PROJECT_REF} from './hosted-test.mjs';

// Not imported by the population runner, agent tools, API or any scheduler.
// Activation needs a separately approved manifest AND bound production ports.
export function createKnowledgeUpdateWorker({transaction,readCurrent,verifyCurrent,admit,enabled=false,now=()=>Date.now()}){
  const enabledCheck=()=>{if(enabled!==true)fail('AUTOMATIC_UPDATES_DISABLED',403);};
  const transactionWithLimits=fn=>transaction(async tx=>{
    await tx.query("select set_config('statement_timeout','3000',true),set_config('lock_timeout','500',true)");return fn(tx);
  });
  const admission=async()=>{if(await admit()!==true)fail('UPDATE_ADMISSION_UNVERIFIED',503);};
  const authorise=(manifest,approval)=>{
    enabledCheck();
    if(approval?.projectRef!==EXISTING_PROJECT_REF||approval.manifestHash!==manifest.hash||approval.approved!==true||!Number.isFinite(Date.parse(approval.expiresAt))||Date.parse(approval.expiresAt)<=now()||typeof admit!=='function'||typeof readCurrent!=='function'||typeof verifyCurrent!=='function')fail('UPDATE_APPROVAL_REQUIRED',403);
  };
  const population=async(tx,id)=>{
    const p=(await tx.query('select complete,status,processed,expected_count from advisory.index_jobs where id=$1',[id])).rows[0];
    if(!p?.complete||p.status!=='exhausted'||p.processed!==p.expected_count)fail('POPULATION_NOT_FINISHED',409);
  };
  const release=async(tx,token)=>tx.query("update advisory.index_gate set token=null,lease_until=null,next_at=clock_timestamp()+interval '5 seconds' where id=1 and token=$1",[token]);
  const api={
    async register(input,approval){
      const manifest=verifyUpdateManifest(input);authorise(manifest,approval);
      if(!new RegExp(UUID).test(approval.populationJob??''))fail('UPDATE_APPROVAL_REQUIRED',403);
      await admission();
      return transactionWithLimits(async tx=>{
        await population(tx,approval.populationJob);
        const id=randomUUID();
        await tx.query('insert into advisory.knowledge_update_jobs(id,manifest_hash,manifest,population_job,expected,complete) values($1,$2,$3,$4,$5,$6) on conflict(manifest_hash) do nothing',[id,manifest.hash,JSON.stringify(manifest),approval.populationJob,manifest.ids.length,manifest.ids.length===0]);
        const j=(await tx.query('select * from advisory.knowledge_update_jobs where manifest_hash=$1',[manifest.hash])).rows[0];
        if(j.population_job!==approval.populationJob)fail('UPDATE_APPROVAL_REQUIRED',403);
        return {jobId:j.id,processed:j.cursor,complete:j.complete};
      });
    },
    async step(jobId,approval){
      enabledCheck();if(!new RegExp(UUID).test(jobId))fail('INVALID_INPUT');
      const snapshot=await transactionWithLimits(async tx=>(await tx.query('select * from advisory.knowledge_update_jobs where id=$1',[jobId])).rows[0]);
      if(!snapshot)fail('UPDATE_JOB_NOT_APPROVED',403);
      const manifest=verifyUpdateManifest(snapshot.manifest);authorise(manifest,approval);
      if(snapshot.population_job!==approval.populationJob)fail('UPDATE_APPROVAL_REQUIRED',403);
      await admission();const token=randomUUID();
      const job=await transactionWithLimits(async tx=>{
        await population(tx,snapshot.population_job);
        const g=(await tx.query('select *,clock_timestamp() as database_now from advisory.index_gate where id=1 for update nowait')).rows[0];
        const at=Date.parse(g.database_now);
        if((g.token&&Date.parse(g.lease_until)>at)||Date.parse(g.next_at)>at)fail('INDEX_THROTTLED',429);
        const j=(await tx.query('select * from advisory.knowledge_update_jobs where id=$1 for update nowait',[jobId])).rows[0];
        if(j.complete)return {...j,replay:true};
        if(j.cursor!==snapshot.cursor)fail('UPDATE_CURSOR_CHANGED',409);
        await tx.query("update advisory.index_gate set token=$1,lease_until=clock_timestamp()+interval '30 seconds' where id=1",[token]);return j;
      });
      if(job.replay)return {complete:true,processed:job.cursor,replayed:true};
      try{
        const ids=manifest.ids.slice(job.cursor,job.cursor+INDEX_LIMITS.batch);
        const signal=AbortSignal.timeout(INDEX_LIMITS.readTimeoutMs);
        // A timeout/404/empty partial response is never a tombstone.
        let cancel;
        const interrupted=new Promise((_,reject)=>{cancel=()=>reject(Error('INDEX_READ_TIMEOUT'));signal.addEventListener('abort',cancel,{once:true});});
        let records;try{records=await Promise.race([readCurrent(ids,{signal}),interrupted]);}finally{signal.removeEventListener('abort',cancel);}
        if(!Array.isArray(records)||records.length!==ids.length||new Set(records.map(r=>r.id)).size!==ids.length)fail('INCOMPLETE_UPDATE_SOURCE',503);
        for(const r of records){
          const age=now()-Date.parse(r.observedAt);
          if(!ids.includes(r.id)||r.projectRef!==EXISTING_PROJECT_REF||r.identityVerified!==true||r.projectionsReady!==true||!Number.isFinite(age)||age<0||age>60000||!/^[a-f0-9]{64}$/.test(r.sourceRevision??'')||!['eligible','withdrawn','deleted'].includes(r.state))fail('INCOMPLETE_UPDATE_SOURCE',503);
          if(r.state==='eligible'&&(r.record?.id!==r.id||r.record.purchasable!==false||r.record.availability!=='KNOWLEDGE_ONLY_NOT_A_PURCHASE_OFFER'))fail('UNSAFE_UPDATE_PROJECTION',503);
          if(r.state!=='eligible'&&(r.authoritativeAbsence!==true||r.record!==null))fail('UNVERIFIED_WITHDRAWAL',503);
        }
        await admission();authorise(manifest,approval);
        return await transactionWithLimits(async tx=>{
          const g=(await tx.query('select *,clock_timestamp() as database_now from advisory.index_gate where id=1 for update nowait')).rows[0];
          if(g.token!==token||Date.parse(g.lease_until)<=Date.parse(g.database_now))fail('INDEX_LEASE_LOST',409);
          const j=(await tx.query('select cursor from advisory.knowledge_update_jobs where id=$1 for update nowait',[jobId])).rows[0];
          if(j.cursor!==job.cursor)fail('UPDATE_CURSOR_CHANGED',409);
          // Trusted, bounded SQL attestation in this transaction. No network,
          // model SQL, or missing default that could silently waive freshness.
          if(await verifyCurrent(tx,records)!==true)fail('UPDATE_SOURCE_CHANGED',409);
          const index=createKnowledgeIndex({query:tx.query.bind(tx)});let changed=0,removed=0;
          for(const r of records){
            const before=(await tx.query('select to_jsonb(k) as value from advisory.knowledge_search k where fabric_id=$1 for update',[r.id])).rows[0]?.value??null;
            const after=r.state==='eligible'?indexTerms(r.record).hash:null;
            const outcome=after===null?(before?'withdrawn':'absent'):!before?'insert':before.source_hash===after?'unchanged':'update';
            if(after!==null)changed+=(await index.updateBatch([r.record])).changed;
            else if(before){await index.remove([r.id]);removed++;}
            await tx.query('insert into advisory.knowledge_update_receipts(job_id,fabric_id,before_row,after_hash,source_revision,outcome,observed_at) values($1,$2,$3,$4,$5,$6,$7)',[jobId,r.id,before,after,r.sourceRevision,outcome,r.observedAt]);
          }
          const cursor=job.cursor+ids.length,complete=cursor===manifest.ids.length;
          await tx.query('update advisory.knowledge_update_jobs set cursor=$2,complete=$3,updated_at=clock_timestamp() where id=$1',[jobId,cursor,complete]);
          await release(tx,token);return {processed:cursor,complete,read:ids.length,changed,removed};
        });
      }catch(e){
        // Never replay an uncertain commit. Caller reads job + receipts before
        // resuming. A stale worker cannot release another instance's lease.
        await transactionWithLimits(tx=>release(tx,token));throw e;
      }
    },
    async invoke(jobId,approval,{maxBatches=20,wait=ms=>new Promise(r=>setTimeout(r,ms))}={}){
      enabledCheck();if(!Number.isSafeInteger(maxBatches)||maxBatches<1||maxBatches>INDEX_LIMITS.maxInvocationBatches)fail('INDEX_INVOCATION_LIMIT',413);
      const results=[];for(let n=0;n<maxBatches;n++){if(n)await wait(INDEX_LIMITS.intervalMs);const r=await api.step(jobId,approval);results.push(r);if(r.complete)break;}return results;
    }
  };return api;
}
