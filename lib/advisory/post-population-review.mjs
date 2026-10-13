import {fail} from './contracts.mjs';
import {foundationsCases,foundationsRubric,EVALUATION_VERSION} from './evaluation-v4.mjs';

const query=(query,rest={})=>({query,colour:'',pattern:'',texture:'',composition:'',...rest});
export const RETRIEVAL_REVIEW_CASES=Object.freeze([
 {id:'warm-neutrals',input:query('ivory OR cream OR beige'),review:'Offer tonal alternatives around fixed oak and olive furnishings; facts must support returned colours.'},
 {id:'muted-olive',input:query('olive'),review:'Distinguish known colour from missing tone, saturation and lighting information.'},
 {id:'quiet-texture',input:query('weave OR texture'),review:'Explain subtle texture as an alternative to busy pattern without inventing a physical feel.'},
 {id:'restrained-pattern',input:query('geometric OR stripe'),review:'Discuss scale only where recorded; do not claim every result is small or calm.'},
 {id:'natural-composition',input:query('linen OR cotton',{composition:'linen OR cotton'}),review:'Use verified fibre composition and no invented durability, blackout or acoustic performance.'},
 {id:'spelling-equivalence',input:query('grey'),review:'Grey/gray spelling should not hide valid facts; preserve exact identities.'}
]);

// No model calls, customer sessions or writes. This gathers evidence for review,
// not a synthetic claim that interior design quality passed automatically.
export async function reviewPopulatedRetrieval({coverage,catalogue,wait=ms=>new Promise(r=>setTimeout(r,ms)),now=()=>Date.now()}){
 const age=now()-Date.parse(coverage?.observedAt);
 if(coverage?.complete!==true||coverage.expected!==11517||coverage.processed!==coverage.expected||coverage.verified!==coverage.expected||coverage.duplicateIds!==0||coverage.unresolvedWrites!==0||!Number.isFinite(age)||age<0||age>60000)fail('POPULATION_REVIEW_NOT_READY',409);
 const results=[];
 for(const [n,c] of RETRIEVAL_REVIEW_CASES.entries()){
   if(n)await wait(5000);
   const start=performance.now();let r;
   try{r=await catalogue.descriptive(c.input);}catch{
     results.push({id:c.id,status:'LOOKUP_FAILED',review:c.review});break;
   }
   if(!Array.isArray(r?.fabrics)||r.fabrics.length>6||new Set(r.fabrics.map(f=>f.id)).size!==r.fabrics.length||r.fabrics.some(f=>f.purchasable!==false||f.availability!=='KNOWLEDGE_ONLY_NOT_A_PURCHASE_OFFER'))fail('UNSAFE_RETRIEVAL_RESULT',503);
   results.push({id:c.id,status:r.fabrics.length?'HUMAN_RELEVANCE_REVIEW_REQUIRED':'NO_MATCH_REVIEW_REQUIRED',ids:r.fabrics.map(f=>f.id),sourceFacts:r.fabrics,elapsedMs:performance.now()-start,review:c.review});
 }
 return {classification:'READ_ONLY_RETRIEVAL_REVIEW_NOT_LAUNCH_APPROVAL',results,paidCalls:0,
   realModelEvaluation:{suite:EVALUATION_VERSION,scenarios:foundationsCases.length,state:'FRESH_BUDGET_AND_HUMAN_REVIEW_REQUIRED',rubric:foundationsRubric},launchApproved:false};
}
