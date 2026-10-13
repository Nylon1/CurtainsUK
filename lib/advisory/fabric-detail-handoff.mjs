import {FABRIC_ID,fail} from './contracts.mjs';
import {readJsonLimited,safeRetail} from './catalogue.mjs';

// Additive read-only adapter. Not part of, or imported by, the population worker.
// URL state supplies an identity, never trusted product facts or permission.
export function requireFabricIdentity(id){
  if(typeof id!=='string'||!new RegExp(FABRIC_ID).test(id))fail('INVALID_FABRIC_REFERENCE',400);
  return id;
}
export function createFabricDetailReader({fetchImpl=fetch}={}){
  return {async read(id){
    requireFabricIdentity(id);
    const params=new URLSearchParams({view:'retail',fabric:id});
    let response;
    try{response=await fetchImpl('https://www.curtainsuk.com/apps/curtainsuk-decision/catalog?'+params,{signal:AbortSignal.timeout(6000),redirect:'error'});}catch{fail('FABRIC_REFERENCE_UNAVAILABLE',503);}
    if(response.status===404)fail('FABRIC_REFERENCE_NOT_AVAILABLE',404);
    const data=await readJsonLimited(response,250000),row=data?.fabric;
    if(row?.id!==id)fail('FABRIC_REFERENCE_MISMATCH',503);
    const fabric=safeRetail(row);
    if(!fabric)fail('FABRIC_REFERENCE_NOT_AVAILABLE',404);
    const slug=new URL(fabric.url).pathname.slice('/pages/fabric/'.length);
    if(slug!==id&&!slug.startsWith(id+'-'))fail('FABRIC_REFERENCE_MISMATCH',503);
    return {...fabric,purchasable:false,availability:'Design reference only. Check current price and availability on the fabric page.',
      roomPreview:row.roomPreview?.available===true&&row.roomPreview.url===`/pages/room-visualiser?fabric=${encodeURIComponent(id)}`?row.roomPreview.url:null};
  }};
}

// Uses the existing consented context contract without changing the running
// indexer's contracts, service, catalogue adapter or model profile.
export function fabricDetailContext(id,consent){
  requireFabricIdentity(id);if(consent!==true)fail('CONSENT_REQUIRED',403);
  return {version:'1',source:'customer-notes',consent:true,room:null,fabricIds:[id],colours:[],heading:null,lighting:null,curtainPosition:null,preferences:[],references:['fabric-detail:v1'],feedback:'I selected this exact fabric on its detail page and would like to discuss it.'};
}
