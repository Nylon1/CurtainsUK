/** Read-only replay of exported real catalogue specifications; no price invented or supplier writes. */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import baseline from '../lib/fabric-master/__tests__/commercial-records.json';
import type {FabricMasterRecord} from '../lib/fabric-master/types';
import {toDecisionEngineFabric,toReviewFabricIdentity} from '../lib/fabric-master/decision-engine';
import {fabricReadiness} from '../lib/fabric-master/readiness';
import {calculatePriceConfirmationReview} from '../lib/storefront/staging-pricing';
const inputPath=process.argv[2];
if(!inputPath) throw Error('Supply a local read-only Fabric Master specification export');
const rows=JSON.parse(readFileSync(inputPath,'utf8')) as Partial<FabricMasterRecord>[];
let calculated=0,halfDrop=0,missingWidth=0;
const failures:{id:string;reason:string}[]=[];
for(const row of rows){
 const fabric={...baseline[0],...row} as FabricMasterRecord;
 if(!fabricReadiness(fabric).calculatorReady){
  if(fabric.pattern_match_type==='HALF_DROP_MATCH')halfDrop++;else missingWidth++;
  continue;
 }
 try{
  const spec=toDecisionEngineFabric(fabric,null,'2026-09-15');
  assert.equal(spec.usableWidthMm,fabric.full_width_mm);
  const result=calculatePriceConfirmationReview({windowSlug:'standard-window',measurementBasis:'TRACK_WIDTH',widthCm:180,dropCm:210,fabricId:fabric.fabric_id,heading:'PENCIL_PLEAT',lining:'STANDARD',construction:'PAIR',stackDirection:'SPLIT'},toReviewFabricIdentity(fabric),spec);
  assert.ok(result.fabricMetres!>0);assert.ok(result.fabricWidths!>0);
  assert.equal(result.totalAmountMinor,null);
  calculated++;
 }catch(error){failures.push({id:fabric.fabric_id,reason:error instanceof Error?error.message:'Unknown'});}
}
console.log(JSON.stringify({records:rows.length,calculated,halfDrop,missingWidth,failures},null,2));
if(failures.length)process.exitCode=1;
