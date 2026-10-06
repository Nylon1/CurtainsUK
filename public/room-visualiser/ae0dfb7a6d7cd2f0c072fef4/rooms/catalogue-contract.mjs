// Identity-to-calibration references, not a second fabric catalogue. All customer
// names, imagery, availability and repeat specifications come from Fabric Master.
import {existingCommerceHandoffs} from './integration/links.mjs';
export const DEFAULT_FABRIC='sdg-f1541-01';
export const CALIBRATION_LINKS=Object.freeze({"sdg-f1541-01": "bergamot", "pt-3697-770": "shambala", "sdg-dstr237715": "sabu-stripe", "sdg-f1239-30": "amalfi"});
export const validFabricId=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,150}$/.test(id);
export function previewPlan(record,references){
  const engineId=CALIBRATION_LINKS[record?.id],reference=references.find(f=>f.id===engineId);
  const unavailable=reason=>({state:'unavailable',engineId:null,reason});
  if(!validFabricId(record?.id))return unavailable('FABRIC_UNAVAILABLE');
  if(/HALF|OFFSET|STAGGER|BRICK/i.test(record.patternMatchType||''))return unavailable('UNSUPPORTED_LATTICE');
  if(!reference)return unavailable('IMAGE_CALIBRATION_UNKNOWN');
  // A changed production specification invalidates the approval; never change
  // catalogue repeats or silently keep using an old texture scale.
  if(reference.mode==='patterned'){
    for(const [field,expected] of [['horizontalRepeatMm',reference.hRepeat],['verticalRepeatMm',reference.vRepeat]]){
      if(!Number.isFinite(record[field])||record[field]<=0||Math.abs(record[field]/10-expected)>1e-9)return unavailable('CALIBRATION_SPEC_CHANGED');
    }
  }
  return{state:'ready',engineId,reason:null};
}
export function fabricActions(record){
  if(!validFabricId(record?.id))return{profile:null,sample:null,make:null,sampleAvailable:false,orderReady:false};
  // Review navigation delegates ordering to the current native profile and
  // configurator. Their existing server rules revalidate stock, samples/prices.
  try{const links=existingCommerceHandoffs(record);return {profile:links.viewFabric,sample:links.sample,make:links.makeCurtains,sampleAvailable:record.sampleAvailable===true,orderReady:record.orderReady===true};}
  catch{return {profile:null,sample:null,make:null,sampleAvailable:false,orderReady:false};}
}
