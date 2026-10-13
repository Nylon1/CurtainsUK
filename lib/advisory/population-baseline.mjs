import {createHash} from 'node:crypto';
import {open} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {fail,UUID} from './contracts.mjs';
import {validateEligibleManifest} from './eligible-manifest.mjs';
import {sameEvidence,evidenceHash} from './eligible-plan.mjs';
import {verifyUncommittedPlan} from './uncommitted-plan.mjs';

const digest=s=>createHash('sha256').update(s).digest('hex');
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const time=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const reject=()=>fail('POPULATION_BASELINE_REQUIRES_REVIEW',409);

// Read existing receipts only. No SQL, journal lock, checkpoint mutation,
// scheduler or dependency of the running population operator.
export async function preparePopulationBaseline({events,manifest,jobId,historical}){
 const scope=validateEligibleManifest(manifest);
 if(!new RegExp(UUID).test(jobId??'')||!new RegExp(UUID).test(historical?.job?.id??'')||historical.job.id===jobId||historical.job.processed!==6||historical.job.indexed!==6||!Array.isArray(historical.rows)||historical.rows.length!==6||!Array.isArray(historical.items)||historical.items.length!==6)reject();
 const historicalHash=evidenceHash(historical),known=new Map();
 for(const r of historical.rows){
  const receipt=historical.items.find(i=>i.fabric_id===r.fabric_id);
  if(known.has(r.fabric_id)||!sha(r.source_hash)||!time(r.indexed_at)||receipt?.after_hash!==r.source_hash||receipt.rolled_back!==false||receipt.before_row!==null||receipt.job_id!==historical.job.id)reject();
  known.set(r.fabric_id,r);
 }
 let pending=null,processed=0,batches=0,resolved=0,firstAt=null,lastAt=null;
 const rows=[],journalHash=createHash('sha256');
 for await(const e of events){
  if(!e||!time(e.at))reject();journalHash.update(JSON.stringify(e)+'\n');
  if(e.kind==='prepared'){
   const p=e.plan,end=Math.min(processed+6,scope.count),ids=manifest.ids.slice(processed,end);
   if(pending||processed===scope.count||p?.classification!=='ELIGIBLE_PLAN_NOT_EXECUTION'||p.jobId!==jobId||p.sourceSnapshot!==scope.snapshot||p.expectedCount!==scope.count||p.fromOffset!==processed||p.cursor?.offset!==end||p.cursor?.manifestHash!==scope.hash||p.complete!==(end===scope.count)||!sameEvidence(p.ids,ids)||!Array.isArray(p.items)||p.items.length!==ids.length||typeof p.sql!=='string'||digest(p.sql)!==p.sqlSha256||evidenceHash(p.historical)!==historicalHash)reject();
   for(const [n,item] of p.items.entries())if(item.id!==ids[n]||!sha(item.hash)||!sameEvidence(item.beforeRow,known.get(item.id)??null)||(item.beforeRow&&item.hash!==item.beforeRow.source_hash))reject();
   pending={plan:p,at:e.at};
  }else if(e.kind==='verified'){
   const p=pending?.plan,r=e.receipt;
   if(!p||e.sqlSha256!==p.sqlSha256||r?.processed!==p.cursor.offset||r.indexed!==p.cursor.offset||r.batches!==batches+1||r.complete!==p.complete||r.permissionRestored!==true||r.unchanged!==p.items.filter(i=>i.beforeRow!==null).length||Date.parse(e.at)<Date.parse(pending.at))reject();
   firstAt??=pending.at;lastAt=e.at;
   for(const i of p.items)rows.push({id:i.id,sourceHash:i.hash,verifiedAt:e.at,historical:i.beforeRow!==null});
   processed=r.processed;batches=r.batches;pending=null;
  }else if(e.kind==='expired-uncommitted'){
   if(!pending||pending.plan.sqlSha256!==e.sqlSha256)reject();
   const resolution=verifyUncommittedPlan(pending.plan,e.evidence,Date.parse(e.at));
   if(!sameEvidence(resolution,e.receipt))reject();resolved++;pending=null;
  }else reject();
 }
 // Admission allows evidence up to 60 seconds old. Include the historical
 // six-record baseline, not only this population's first new receipt.
 const lower=Math.min(...historical.rows.map(r=>Date.parse(r.indexed_at)),firstAt?Date.parse(firstAt):Infinity)-60000;
 return {classification:'LOCAL_JOURNAL_BASELINE_NOT_HOSTED_COVERAGE',projectRef:manifest.projectRef,jobId,sourceSnapshot:scope.snapshot,
  expected:scope.count,processed,batches,remaining:scope.count-processed,complete:processed===scope.count&&!pending,
  pendingWrite:pending!==null,expiredUncommittedResolutions:resolved,duplicateIds:0,
  populationStartedAt:new Date(lower).toISOString(),lastVerifiedAt:lastAt,rows,
  historicalOutsideManifest:historical.rows.filter(r=>!manifest.ids.includes(r.fabric_id)).map(r=>({id:r.fabric_id,sourceHash:r.source_hash})),
  journalEvidenceSha256:journalHash.digest('hex'),historicalSha256:historicalHash,hostedVerificationRequired:true,reconciliationComplete:false,hostedWrites:0};
}

// Freeze a completed newline boundary before opening the stream. A concurrent
// append is not consumed. Never take or remove the active operator's lock.
export async function readPopulationBaseline({journalPath,...options}){
 const handle=await open(journalPath,'r');let bytes,input,lines;
 try{const stat=await handle.stat();bytes=stat.size;if(!stat.isFile()||bytes===0||bytes>536870912)reject();
  const last=Buffer.alloc(1);await handle.read(last,0,1,bytes-1);if(last[0]!==10)reject();
  input=handle.createReadStream({start:0,end:bytes-1,encoding:'utf8',autoClose:false});
  lines=createInterface({input,crlfDelay:Infinity});
  async function* events(){for await(const line of lines){if(!line||Buffer.byteLength(line)>2097152)reject();let e;try{e=JSON.parse(line);}catch{reject();}yield e;}}
  return {...await preparePopulationBaseline({...options,events:events()}),frozenJournalBytes:bytes};
 }finally{lines?.close();input?.destroy();await handle.close();}
}
