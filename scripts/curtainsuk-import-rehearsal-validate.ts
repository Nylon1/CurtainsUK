// Offline only: imports the unchanged operational production validator.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {validateCandidate,reviewState,fingerprintHash,visualVocabulary,validateVisual,resolveFabricFingerprint} from '../lib/fabric-master/visual-enrichment';
async function main(){
const root=process.argv[2];if(!root)throw Error('REHEARSAL_DIRECTORY_REQUIRED');
const records=JSON.parse(await readFile(path.join(root,'prepared-records.json'),'utf8'));
const ledger=new Map(JSON.parse(await readFile(path.join(root,'snapshot/fabric_visual_enrichment_ledger.json'),'utf8')).map((x:any)=>[x.ledger_id,x]));
const counts:Record<string,any>={};
const blockers:Record<string,number>={};
for(const r of records){
  let validated=null,error=null;
  try{validated=validateCandidate(r.candidate);}catch(e){error=(e as Error).message;}
  // reviewState is invoked exactly; it evaluates review flags and confidence,
  // independently of the complete candidate envelope validation above.
  const state=reviewState(r.candidate,'RESOLVED');
  const reviewRules=Object.entries(r.candidate.observations).filter(([field,o]:any)=>field!=='patternScale'&&o.confidence==='REVIEW').map(([field])=>({field,rule:'RESOLVED_REVIEW_CONFIDENCE_REQUIRED',value:r.candidate.observations[field].value}));
  for(const flag of r.candidate.reviewFlags)reviewRules.push({field:'reviewFlags',rule:'REVIEW_FLAG_RETAINED',value:flag} as any);
  // A missing image context is reported separately from malformed field values.
  let fieldError=null;
  if(error){try{validateCandidate({...r.candidate,imageContext:r.candidate.imageContext??'REPEAT_VIEW'});}catch(e){fieldError=(e as Error).message;}}
  const category=error?(error==='INVALID_IMAGE_CONTEXT'&&r.candidate.imageContext===null?'OTHER_BLOCKER':'SCHEMA_INVALID'):state==='AUTO_APPROVED'?'AUTO_APPROVED':'REVIEW_REQUIRED';
  r.validation={production_candidate_valid:!error,production_candidate_error:error,field_validation_error:fieldError,review_state:state,review_rules:reviewRules,category,missing_target_image_context:r.candidate.imageContext===null};
  for(const rule of reviewRules){const key=`${rule.field}:${rule.rule}`;blockers[key]=(blockers[key]??0)+1;}
  if(error)blockers[error]=(blockers[error]??0)+1;
  r.proposed_ledger_payload.review_state=state;r.proposed_ledger_payload.approval_state=state==='AUTO_APPROVED'?'APPROVED':'PROPOSED';
  if(validated){
    r.proposed_ledger_payload.output_hash=fingerprintHash(validated);
    const outside=Object.keys(visualVocabulary).filter(k=>r.cohort!=='SDG_PENDING'&&!r.requested_missing_fields.includes(k)&&JSON.stringify(validated.observations[k as keyof typeof visualVocabulary])!==JSON.stringify(r.current_reading[k]));
    r.validator_normalisation_outside_delta=outside;
    // Do not overwrite the authoritative byte-preserved reading with normalisation.
    if(outside.length)r.publication_blockers.push('VALIDATOR_NORMALISATION_WOULD_CHANGE_KNOWN_FIELD');
  }
  if(r.proposed_ledger_payload.output){
    try{validateVisual(r.proposed_ledger_payload.output);r.existing_fingerprint_valid=true;}catch(e){r.existing_fingerprint_valid=false;r.existing_fingerprint_error=(e as Error).message;}
  }
  if(!r.proposed_ledger_payload.output&&r.cohort==='PARTIAL_NO_DELTA'&&validated&&r.old_component_ids.design&&r.old_component_ids.colourway){
    const d:any=ledger.get(r.old_component_ids.design),c:any=ledger.get(r.old_component_ids.colourway);
    try{
      const composed=resolveFabricFingerprint({design:d.output,colourway:c.output,analysedAt:new Date().toISOString()});
      if(fingerprintHash(composed.candidate)!==fingerprintHash(validated))throw Error('NATIVE_COMPOSITION_CHANGES_FINAL_READING');
      r.proposed_ledger_payload.output=composed;r.proposed_ledger_payload.analysed_at=composed.analysedAt;
      r.proposed_ledger_payload.output_hash=composed.outputHash;r.proposed_ledger_payload.evidence_id=composed.evidenceId;r.proposed_ledger_payload.visual_digest=composed.digest;
      r.proposed_ledger_payload.field_provenance=composed.fieldProvenance;
      r.native_composition_valid=true;validateVisual(composed);
    }catch(e){r.native_composition_valid=false;r.native_composition_error=(e as Error).message;}
  }
  if(!r.proposed_ledger_payload.output){
    // Candidate is retained even when no honest complete fingerprint can be built.
    const p=r.proposed_ledger_payload;
    const binding=p.analysis_asset_hash?{fabricId:p.fabric_id,canonicalFabricId:p.fabric_id,supplierId:p.supplier_id,brandId:p.brand_id,designId:p.design_id,sku:p.supplier_sku,imageReference:p.source_image_url,expectedImageHash:'sha256:'+p.analysis_asset_hash,sourceRecordKey:`fabric-master:${p.fabric_id}:${p.supplier_id}:${p.supplier_sku}:${p.source_image_hash}:${p.analysis_asset_hash}`}:null;
    r.proposed_ledger_payload.output={analysisLevel:'RESOLVED',candidate:r.candidate,fieldProvenance:p.field_provenance,source:'RESOLVED_COMPOSITION',authority:'composed',modelId:p.model_id,promptVersion:p.prompt_version,schemaVersion:p.schema_version,version:p.visual_version,vocabularyVersion:p.vocabulary_version,analysedAt:p.analysed_at,binding,imageContentHash:p.analysis_asset_hash?'sha256:'+p.analysis_asset_hash:null,outputHash:p.output_hash,evidenceId:null,digest:null,componentEvidenceIds:null};
    r.publication_blockers.push('COMPLETE_NATIVE_FINGERPRINT_ENVELOPE_NOT_CONSTRUCTIBLE_WITHOUT_PROVENANCE_DECISION');
  }
  const c=counts[r.cohort]??={total:0,AUTO_APPROVED:0,REVIEW_REQUIRED:0,SCHEMA_INVALID:0,OTHER_BLOCKER:0,review_logic_auto:0,review_logic_review:0,remain_partial_after_ledger_only:0,pending_after_ledger_only:0,new_resolved_record:0,no_new_record:0,fields_changed:0};
  c.total++;c[category]++;c[state==='AUTO_APPROVED'?'review_logic_auto':'review_logic_review']++;
  if(r.pending_failure_ids.length)c.pending_after_ledger_only++;else if(category!=='AUTO_APPROVED')c.remain_partial_after_ledger_only++;
  c[r.new_resolved_record_structurally_needed?'new_resolved_record':'no_new_record']++;c.fields_changed+=r.fields_changed.length;
}
const validator=await readFile('lib/fabric-master/visual-enrichment.ts');
await writeFile(path.join(root,'proposed-records.json'),JSON.stringify(records));
await writeFile(path.join(root,'validator-simulation.json'),JSON.stringify({validator_source:'lib/fabric-master/visual-enrichment.ts',operational_authority_sha:'194e87781d9ce973460beb94b08d1a0c83b9846c',validator_sha256:createHash('sha256').update(validator).digest('hex'),counts,blocking_rules:blockers,notes:['Categories are mutually exclusive. OTHER_BLOCKER is a missing target imageContext, not a guessed value.','Review logic counts independently evaluate every field set with the exact reviewState function.','No publication decision can bypass missing identity, provenance, fingerprint, or component evidence.']},null,2));
console.log(JSON.stringify({counts,blocking_rules:blockers},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
