import {createHash} from 'node:crypto';
import {fail,FABRIC_ID} from './contracts.mjs';
import {EXISTING_PROJECT_REF} from './hosted-test.mjs';

export const ELIGIBLE_POLICY='jane-published-customer-eligible-v1';
const digest=ids=>createHash('sha256').update(ids.join('\n')).digest('hex');
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const identities=ids=>Array.isArray(ids)&&ids.length>0&&ids.length<=20000&&new Set(ids).size===ids.length&&ids.every(id=>typeof id==='string'&&new RegExp(FABRIC_ID).test(id));

// Operator-only intersection. Never relabel the old all-Master manifest, cursor
// or receipts. Publication evidence does not grant permission to index or buy.
export function prepareEligibleManifest({candidates,publication,policySha256}){
 if(candidates?.projectRef!==EXISTING_PROJECT_REF||!identities(candidates.ids)||candidates.identity_count!==candidates.ids.length||digest(candidates.ids)!==candidates.identity_sha256||!sha(policySha256))fail('INVALID_ELIGIBLE_SOURCE',503);
 if(publication?.classification!=='PUBLICATION_RECONCILIATION_NOT_EXECUTION_APPROVAL'||publication.unmappedUrls?.length!==0||!identities(publication.candidateAndPublishedIds)||publication.candidateAndPublishedCount!==publication.candidateAndPublishedIds.length||digest(publication.candidateAndPublishedIds)!==publication.candidateAndPublishedSha256||!Array.isArray(publication.receipts)||!publication.receipts.length||publication.receipts.length>30||publication.receipts.some(r=>r.status!==200||!sha(r.sha256)||!/^https:\/\/www\.curtainsuk\.com\/sitemap_metaobject_pages_\d+\.xml$/.test(r.url)))fail('LIVE_PUBLICATION_EVIDENCE_REQUIRED',503);
 const chosen=new Set(publication.candidateAndPublishedIds),ids=candidates.ids.filter(id=>chosen.has(id));
 if(JSON.stringify(ids)!==JSON.stringify(publication.candidateAndPublishedIds))fail('ELIGIBLE_IDENTITY_ORDER_MISMATCH',503);
 const publicationSha256=createHash('sha256').update(JSON.stringify(publication.receipts.map(({url,sha256})=>({url,sha256})))).digest('hex');
 return {version:2,scope:ELIGIBLE_POLICY,projectRef:EXISTING_PROJECT_REF,source:'curtainsuk_private.fabric_colourways',
  identity_count:ids.length,identity_sha256:digest(ids),ids,policySha256,candidateSha256:candidates.identity_sha256,publicationSha256,
  observed_at:candidates.observed_at,publicationObservedAt:publication.observedAt,
  approvedForExecution:false,purchaseEligibility:'Revalidate through governed retail lookup for every recommendation',
  historicalCheckpointAction:'Preserve original job unchanged; start a different job at null cursor',
  excludedCandidateIds:candidates.ids.filter(id=>!chosen.has(id))};
}

export function validateEligibleManifest(m){
 if(m?.version!==2||m.scope!==ELIGIBLE_POLICY||m.projectRef!==EXISTING_PROJECT_REF||m.source!=='curtainsuk_private.fabric_colourways'||!identities(m.ids)||m.identity_count!==m.ids.length||digest(m.ids)!==m.identity_sha256||![m.policySha256,m.candidateSha256,m.publicationSha256].every(sha)||![m.observed_at,m.publicationObservedAt].every(t=>Number.isFinite(Date.parse(t))))fail('INVALID_ELIGIBLE_MANIFEST',503);
 // Bind the policy and evidence as well as IDs. An old all-Master offset cannot
 // be accepted even when an individual fabric happens to have the same index.
 const hash=createHash('sha256').update(JSON.stringify([m.scope,m.identity_sha256,m.policySha256,m.candidateSha256,m.publicationSha256])).digest('hex');
 return {hash,count:m.identity_count,snapshot:'eligible-identities-sha256:'+hash};
}

export function createEligibleManifestSource({manifest,attest,now=()=>Date.now()}){
 const {hash,count,snapshot}=validateEligibleManifest(manifest),ids=[...manifest.ids];
 if(typeof attest!=='function')fail('SOURCE_ATTESTATION_REQUIRED',503);
 const check=async(batchIds,signal)=>{
  signal?.throwIfAborted();
  // The trusted operator must read current source/retail eligibility for these
  // exact IDs. Cached manifest membership is not evidence of current eligibility.
  const a=await attest({ids:batchIds,snapshot,signal});
  signal?.throwIfAborted();const age=now()-Date.parse(a?.observed_at);
  return Number.isFinite(age)&&age>=0&&age<=60000&&a?.projectRef===EXISTING_PROJECT_REF&&a.snapshot===snapshot&&a.policySha256===manifest.policySha256&&a.sourceUnchanged===true&&a.publicationUnchanged===true&&JSON.stringify(a.eligibleIds)===JSON.stringify(batchIds);
 };
 return {snapshot,expectedCount:count,
  async page({cursor=null,snapshot:requested,limit=6,signal}){
   if(requested!==snapshot||limit!==6)fail('INVALID_ELIGIBLE_INDEX_SOURCE',503);
   const offset=cursor===null?0:cursor.offset;
   if(!Number.isSafeInteger(offset)||offset<0||offset>count||(offset!==count&&offset%6!==0)||(cursor!==null&&(cursor.manifestHash!==hash||Object.keys(cursor).sort().join(',')!=='manifestHash,offset')))fail('INVALID_INDEX_CURSOR',503);
   const end=Math.min(offset+6,count),batch=ids.slice(offset,end);
   if(!await check(batch,signal))fail('ELIGIBILITY_CHANGED_REVIEW_REQUIRED',503);
   return {ids:batch,cursor:{manifestHash:hash,offset:end},snapshot,done:end===count};
  },
  async verifySnapshot(requested,{signal}={}){return requested===snapshot&&await check([],signal);}
 };
}
