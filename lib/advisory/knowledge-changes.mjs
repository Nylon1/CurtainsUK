import {createHash} from 'node:crypto';
import {fail,FABRIC_ID} from './contracts.mjs';
import {EXISTING_PROJECT_REF} from './hosted-test.mjs';

// These are the dependencies of safeKnowledge, not commerce or supplier-stock
// columns. Do not subscribe to, drain or acknowledge the Browse dirty queue.
export const KNOWLEDGE_DEPENDENCIES=Object.freeze({
  fabric_colourways:['fabric_id','colour_name','design_id','brand_id'],
  fabric_designs:['display_name','collection_id','composition','full_width_mm','usable_width_mm','vertical_repeat_mm','horizontal_repeat_mm','pattern_match_type','usage_suitability','weight_gsm','care_instructions'],
  fabric_collections:['display_name'],supplier_brands:['display_name'],
  fabric_retail_profiles:['description','description_validated'],
  fabric_visual_knowledge_read_cache:['knowledge_state','visual_fields']
});
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
// An approved publication/export supplies exact affected IDs and evidence.
// This deliberately does not pretend timestamp polling is a lossless feed.
// Dependency fan-out must be resolved using existing indexed relationships by
// the publisher/operator. Oversized fan-outs are split into immutable pages.
export function prepareKnowledgeChanges({projectRef,events}){
  if(projectRef!==EXISTING_PROJECT_REF||!Array.isArray(events)||!events.length||events.length>120)fail('INVALID_CHANGE_MANIFEST');
  const ids=[],references=[];let ignored=0;
  for(const e of events){
    const allowed=KNOWLEDGE_DEPENDENCIES[e?.table];
    if(!allowed||!Array.isArray(e.columns)||!e.columns.length||e.columns.length>64||e.columns.some(c=>typeof c!=='string'||!/^[a-z_]{1,80}$/.test(c))||!['insert','update','delete'].includes(e.operation)||typeof e.evidenceReference!=='string'||!e.evidenceReference.trim()||e.evidenceReference.length>300||!/^[a-f0-9]{64}$/.test(e.evidenceSha256??''))fail('INVALID_CHANGE_MANIFEST');
    if(e.operation==='update'&&!e.columns.some(c=>allowed.includes(c))){ignored++;continue;}
    // Removed source facts need a separate tombstone/rollback review. Never
    // reinterpret a failed lookup as deletion or quietly leave it acknowledged.
    if(e.operation==='delete')fail('KNOWLEDGE_TOMBSTONE_REVIEW_REQUIRED',409);
    if(e.projectionsReady!==true||e.resolutionComplete!==true||!Array.isArray(e.fabricIds)||!e.fabricIds.length||e.fabricIds.length>120||e.fabricIds.some(id=>typeof id!=='string'||!new RegExp(FABRIC_ID).test(id)))fail('CHANGE_ID_RESOLUTION_REQUIRED',503);
    for(const id of e.fabricIds)if(!ids.includes(id))ids.push(id);
    if(ids.length>120)fail('CHANGE_MANIFEST_LIMIT',413);
    references.push({table:e.table,columns:[...e.columns].sort(),operation:e.operation,evidenceReference:e.evidenceReference,evidenceSha256:e.evidenceSha256,fabricIds:[...e.fabricIds]});
  }
  const payload={version:1,projectRef,scope:'changed-identities-only',ids,references};
  const hash=digest(payload);
  return {...payload,hash,snapshot:'advisory-changes-sha256:'+hash,expectedCount:ids.length,ignoredEvents:ignored,approved:false};
}
export function createKnowledgeChangeSource({manifest,attest,now=()=>Date.now()}){
  if(!Array.isArray(manifest?.references)||!manifest.references.length||manifest.references.length>120)fail('CHANGE_MANIFEST_INTEGRITY',503);
  const rebuilt=prepareKnowledgeChanges({projectRef:manifest.projectRef,events:manifest.references.map(r=>({...r,projectionsReady:true,resolutionComplete:true}))});
  if(rebuilt.hash!==manifest.hash||rebuilt.snapshot!==manifest.snapshot||JSON.stringify(rebuilt.ids)!==JSON.stringify(manifest.ids)||rebuilt.expectedCount!==manifest.expectedCount||typeof attest!=='function')fail('CHANGE_MANIFEST_INTEGRITY',503);
  const {ids,hash,snapshot,expectedCount}=rebuilt;
  return {snapshot,expectedCount,
    async page({cursor=null,snapshot:requested,limit=6,signal}){
      signal?.throwIfAborted();const offset=cursor?.offset??0;
      if(requested!==snapshot||limit!==6||!Number.isSafeInteger(offset)||offset<0||offset>ids.length||(offset!==ids.length&&offset%6!==0)||(cursor!==null&&(Object.keys(cursor).sort().join(',')!=='changeHash,offset'||cursor.changeHash!==hash)))fail('INVALID_INDEX_CURSOR',503);
      const end=Math.min(offset+6,ids.length);
      return {ids:ids.slice(offset,end),cursor:{offset:end,changeHash:hash},snapshot,done:end===ids.length};
    },
    async verifySnapshot(requested,{signal}={}){
      signal?.throwIfAborted();if(requested!==snapshot)return false;
      const a=await attest({manifest:structuredClone(rebuilt),signal});signal?.throwIfAborted();
      const age=now()-Date.parse(a?.observed_at);
      return a?.projectRef===EXISTING_PROJECT_REF&&a.changeHash===hash&&a.evidenceVerified===true&&a.projectionsReady===true&&a.resolutionComplete===true&&Number.isFinite(age)&&age>=0&&age<=60000;
    }
  };
}

export function remainingPopulationPlan({total,indexed,batchSeconds=[1.315,5],pauseSeconds=30}){
  if(!Number.isSafeInteger(total)||!Number.isSafeInteger(indexed)||indexed<0||total<indexed||!Array.isArray(batchSeconds)||batchSeconds.length!==2||batchSeconds.some(s=>!Number.isFinite(s)||s<0)||batchSeconds[1]<batchSeconds[0]||!Number.isFinite(pauseSeconds)||pauseSeconds<0)fail('INVALID_INPUT');
  const remaining=total-indexed,batches=Math.ceil(remaining/6),invocations=Math.ceil(batches/20);
  const pacingSeconds=Math.max(0,batches-1)*5,reviewPauses=Math.max(0,invocations-1)*pauseSeconds;
  return {total,indexed,remaining,batches,invocations,finalBatchSize:remaining?remaining%6||6:0,
    pacingSeconds,assumedReviewPauseSeconds:pauseSeconds,
    estimatedSeconds:batchSeconds.map(t=>Math.ceil(batches*t+pacingSeconds+reviewPauses)),
    assumptions:'First-batch 1.315s operator round trip is a lower-bound input, not representative throughput. Upper bound uses assumed 5s full batch. Additional approvals, source reads, safety stops and backup delays may take longer.',
    initialTranche:{identities:Math.min(remaining,120),batches:Math.min(batches,20),pacingSeconds:Math.max(0,Math.min(batches,20)-1)*5},
    maximumNarrowFactRequests:batches*3,fullRebuild:false,scheduleEnabled:false};
}
