// Identity-to-calibration references, not a second fabric catalogue. All customer
// names, imagery, availability and repeat specifications come from Fabric Master.
import {existingCommerceHandoffs} from './integration/links.mjs';
export const DEFAULT_FABRIC='sdg-f1541-01';
export const CALIBRATION_LINKS=Object.freeze({"sdg-f1541-01":"bergamot","pt-3697-770":"shambala","sdg-dstr237715":"sabu-stripe","sdg-f1239-30":"amalfi","pt-4049-629":"pt-4049-629","sdg-dpot236270":"sdg-dpot236270","sdg-disw236739":"sdg-disw236739","sdg-hmoe132237":"sdg-hmoe132237","sdg-f1774-01":"sdg-f1774-01","sdg-nhap121095":"sdg-nhap121095","sdg-nnue120710":"sdg-nnue120710","sdg-dm6f220306":"sdg-dm6f220306","sdg-nzac132925":"sdg-nzac132925","sdg-hmon132275":"sdg-hmon132275","sdg-mstr237705":"sdg-mstr237705","sdg-hqn3121135":"sdg-hqn3121135","pt-3828-953":"pt-3828-953","pt-3919-546":"pt-3919-546","pt-8773-518":"pt-8773-518","pt-3742-117":"pt-3742-117","pt-4008-705":"pt-4008-705","pt-3904-909":"pt-3904-909","pt-8759-406":"pt-8759-406","pt-4279-681":"pt-4279-681","pt-4315-907":"pt-4315-907","pt-5031-502":"pt-5031-502","pt-4202-924":"pt-4202-924","sdg-f1681-04":"sdg-f1681-04","sdg-ddif227155":"sdg-ddif227155"});
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
