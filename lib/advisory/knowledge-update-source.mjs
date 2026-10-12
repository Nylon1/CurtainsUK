import {createHash} from 'node:crypto';
import {fail,FABRIC_ID} from './contracts.mjs';
import {EXISTING_PROJECT_REF} from './hosted-test.mjs';

const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const id=v=>typeof v==='string'&&new RegExp(FABRIC_ID).test(v);
const ref=v=>typeof v==='string'&&v.length>0&&v.length<=200&&!/[\u0000-\u001f]/.test(v);
// Existing immutable records are evidence of a change, never product facts.
// Exact primary-key reads only. Discovery/closure of a complete publication
// window must be separately verified, not inferred from MAX(event_id) or time.
export const CHANGE_RECORD_SQL=Object.freeze({
  catalogue:`select observation_id as event_id,fabric_id,import_id,merge_action,lifecycle_state,history_complete,public_record_sha256 as evidence_hash from curtainsuk_private.fabric_catalogue_observations where observation_id=any($1::text[]) order by observation_id limit 6`,
  hybrid:`select event_id::text as event_id,fabric_id,registration_id::text,event_kind,source_document_sha256 as evidence_hash from curtainsuk_private.fabric_hybrid_registration_events where event_id=any($1::bigint[]) order by event_id limit 6`
});
export function createExistingChangeReader({query}){
  return {async read(source,eventIds){
    if(!Object.hasOwn(CHANGE_RECORD_SQL,source)||!Array.isArray(eventIds)||!eventIds.length||eventIds.length>6||new Set(eventIds).size!==eventIds.length||eventIds.some(v=>!ref(v)||(source==='hybrid'&&!/^[1-9][0-9]{0,18}$/.test(v))))fail('INVALID_CHANGE_RECORD_REQUEST');
    const {rows}=await query(CHANGE_RECORD_SQL[source],[eventIds]);
    if(rows.length!==eventIds.length||new Set(rows.map(r=>r.event_id)).size!==rows.length||rows.some(r=>!eventIds.includes(r.event_id)||!id(r.fabric_id)||!sha(r.evidence_hash)))fail('INCOMPLETE_CHANGE_HISTORY',503);
    return rows.map(r=>{
      if(source==='catalogue'&&(r.history_complete!==true||!['INSERT','UPDATE'].includes(r.merge_action)))fail('INCOMPLETE_CHANGE_HISTORY',503);
      if(source==='hybrid'&&!['STAGED','ACTIVATED','RETIRED'].includes(r.event_kind))fail('INVALID_CHANGE_HISTORY',503);
      return {source,sourceId:r.event_id,fabricId:r.fabric_id,evidenceSha256:r.evidence_hash,
        // Retirement of a visual classification is NOT fabric withdrawal.
        effect:source==='hybrid'&&r.event_kind==='STAGED'?'ignore':'recheck'};
    });
  }};
}

export function prepareUpdateManifest({projectRef,windowId,from,through,closureSha256,events}){
  if(projectRef!==EXISTING_PROJECT_REF||!ref(windowId)||!sha(closureSha256)||!Number.isFinite(Date.parse(from))||!Number.isFinite(Date.parse(through))||Date.parse(through)<Date.parse(from)||!Array.isArray(events)||events.length>120||!events.length)fail('INVALID_UPDATE_MANIFEST');
  const unique=new Map();
  for(const e of events){
    if(!['catalogue','hybrid','reconciliation','approved-publication'].includes(e?.source)||!ref(e.sourceId)||!id(e.fabricId)||!sha(e.evidenceSha256)||!['ignore','recheck'].includes(e.effect))fail('INVALID_UPDATE_MANIFEST');
    const safe={source:e.source,sourceId:e.sourceId,fabricId:e.fabricId,evidenceSha256:e.evidenceSha256,effect:e.effect};
    const key=JSON.stringify([safe.source,safe.sourceId,safe.fabricId]),old=unique.get(key);
    if(old&&JSON.stringify(old)!==JSON.stringify(safe))fail('CHANGE_EVIDENCE_CONFLICT',409);
    unique.set(key,safe);
  }
  const references=[...unique.values()].sort((a,b)=>JSON.stringify(a)<JSON.stringify(b)?-1:JSON.stringify(a)>JSON.stringify(b)?1:0);
  const ids=[...new Set(references.filter(e=>e.effect==='recheck').map(e=>e.fabricId))].sort();
  const body={version:1,projectRef,windowId,from,through,closureSha256,references,ids};
  return {...body,hash:hash(body),scheduleEnabled:false};
}
export function verifyUpdateManifest(m){
  const fresh=prepareUpdateManifest({...m,events:m?.references});
  if(fresh.hash!==m?.hash||JSON.stringify(fresh.ids)!==JSON.stringify(m.ids))fail('UPDATE_MANIFEST_CHANGED',409);
  return fresh;
}

// Compare existing saved receipts with an independently verified publication
// export. This is a metadata diff, not a catalogue query or a rebuild. A missing
// or partial export MUST NOT turn absent IDs into withdrawals.
export function reconcileKnowledgeSnapshot({baseline,current,proof}){
  if(proof?.projectRef!==EXISTING_PROJECT_REF||proof.complete!==true||proof.identityVerified!==true||proof.projectionsReady!==true||!sha(proof.evidenceSha256)||!Number.isFinite(Date.parse(proof.from))||!Number.isFinite(Date.parse(proof.through)))fail('RECONCILIATION_PROOF_REQUIRED',503);
  const map=rows=>{
    if(!Array.isArray(rows)||rows.length>100000)fail('INVALID_RECONCILIATION_INPUT');
    const m=new Map();for(const r of rows){if(!id(r?.id)||!sha(r.sourceHash)||m.has(r.id))fail('INVALID_RECONCILIATION_INPUT');m.set(r.id,r.sourceHash);}return m;
  };
  const before=map(baseline),after=map(current),added=[],changed=[],withdrawn=[];let unchanged=0;
  for(const [key,value] of after){if(!before.has(key))added.push(key);else if(before.get(key)!==value)changed.push(key);else unchanged++;}
  for(const key of before.keys())if(!after.has(key))withdrawn.push(key);
  return {added:added.sort(),changed:changed.sort(),withdrawn:withdrawn.sort(),unchanged,
    affected:[...added,...changed,...withdrawn].sort(),baselineCount:before.size,currentCount:after.size,evidenceSha256:proof.evidenceSha256,
    // Every affected ID still needs a fresh canonical read before mutation.
    authoritativeDeletion:false,hostedWrites:0};
}

export const REQUIRED_UPDATE_COVERAGE=Object.freeze(['identity','design','collection','brand','description','visual','eligibility','deletion']);
export function requireUpdateCatchup(proof,{populationStartedAt,populationCompletedAt},now=Date.now()){
  const age=now-Date.parse(proof?.observedAt);
  if(proof?.projectRef!==EXISTING_PROJECT_REF||!sha(proof.evidenceSha256)||proof.complete!==true||proof.projectionsReady!==true||proof.pendingChanges!==0||proof.unresolved!==0||!Number.isFinite(age)||age<0||age>60000||!Number.isFinite(Date.parse(populationStartedAt))||!Number.isFinite(Date.parse(populationCompletedAt))||!Number.isFinite(Date.parse(proof.from))||!Number.isFinite(Date.parse(proof.through))||Date.parse(proof.from)>Date.parse(populationStartedAt)||Date.parse(proof.through)<Date.parse(populationCompletedAt)||Date.parse(proof.through)>now||REQUIRED_UPDATE_COVERAGE.some(k=>proof.coverage?.[k]!==true))fail('UPDATE_CATCHUP_INCOMPLETE',409);
  return {reconciled:true,recommendationTestsRequired:true,launchApproved:false};
}
