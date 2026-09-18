/** Read exported canary DB results and exercise the approved requirement-specific policy. No remote writes. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {toDecisionEngineFabric} from '../lib/fabric-master/decision-engine';
import {buildStagingRuleSet,prepareStagingConfiguration} from '../lib/storefront/staging-pricing';
import {calculateFabricRequirement} from '../lib/decision-engine/pricing-engine';
import {curtainStockSufficient,sampleStockAvailable,dailyStockDecision} from '../lib/storefront/daily-stock';
function unpack(text:string){const s=JSON.parse(JSON.parse(text).content[0].text).result;return JSON.parse(s.slice(s.indexOf('[{'),s.lastIndexOf('}]')+2));}
async function main(){
 const dir='artifacts/sdg-portal-private/';
 const record=unpack(await readFile(dir+'high-fabric-spec.json','utf8'))[0].record;
 const fabric=toDecisionEngineFabric(record,null,'2026-09-18'); // Quantity calculation does not invent a price.
 const calculate=(widthCm:number,dropCm:number)=>{
  const input={windowSlug:'standard-window',measurementBasis:'TRACK_WIDTH' as const,widthCm,dropCm,fabricId:record.fabric_id,heading:'PENCIL_PLEAT' as const,lining:'STANDARD' as const,construction:'PAIR' as const,stackDirection:'SPLIT' as const};
  const {configuration,windowType}=prepareStagingConfiguration(input,fabric);
  const requirement=calculateFabricRequirement({configuration,windowType,fabric,rules:buildStagingRuleSet()});
  return {widthCm,dropCm,requiredMetres:requirement.fabricMetres,fullWidthMm:record.full_width_mm,repeatMm:record.vertical_repeat_mm};
 };
 const ordinary=calculate(180,210); const oversized=calculate(800,400);
 if(process.argv.includes('--calculate-only')){console.log(JSON.stringify({ordinary,oversized}));return;}
 const source=process.argv[2];assert.ok(source,'Supply the saved database result file');
 const raw=unpack(await readFile(source,'utf8'))[0];const proof=raw.canary_result??raw.verification;
 assert.ok(proof?.positions);
 const positions=Object.fromEntries(proof.positions.map((x:any)=>[x.fabric_id,x.position]));
 const high=positions['sdg-aarc520004'];const low=positions['sdg-aarc520020'];const zero=positions['sdg-ccf0874-01'];
 assert.ok(high&&low&&zero);assert.equal(positions['sdg-zald332703'],null);
 assert.ok(high.aggregateMetres>=30&&low.aggregateMetres>0&&low.aggregateMetres<30&&zero.aggregateMetres===0);
 assert.ok(oversized.requiredMetres>high.aggregateMetres-high.confirmedUsageMetres);
 assert.equal(curtainStockSufficient(high,ordinary.requiredMetres),true);
 assert.equal(curtainStockSufficient(high,oversized.requiredMetres),false);
 assert.equal(sampleStockAvailable(high),true);
 assert.equal(curtainStockSufficient(low,ordinary.requiredMetres),false);assert.equal(sampleStockAvailable(low),true);
 assert.equal(curtainStockSufficient(zero,ordinary.requiredMetres),false);assert.equal(sampleStockAvailable(zero),false);
 const unknown={aggregateMetres:null,confirmedUsageMetres:0,snapshotDate:null,discontinued:false};
 assert.equal(dailyStockDecision(unknown).status,'CHECK_AVAILABILITY');assert.equal(sampleStockAvailable(unknown),false);
 const report={passed:true,source,ordinary:{...ordinary,curtainAccepted:true},oversized:{...oversized,availableMetres:high.aggregateMetres-high.confirmedUsageMetres,curtainAccepted:false},low:{curtainAccepted:false,sampleAccepted:true},zero:{curtainAccepted:false,sampleAccepted:false},unknown:{state:'UNKNOWN',observationCreated:false},applicationDeploymentClaimed:false};
 await writeFile(dir+'canary-requirement-proof.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
