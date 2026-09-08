/** Real private price inputs are read in memory; reports contain customer totals and assertions only. */
import {loadEnvConfig} from "@next/env";
import {writeFile} from "node:fs/promises";
import assert from "node:assert/strict";
import {listFabricMasterRecords,verifiedCutCostMinor} from "../lib/fabric-master/repository";
import {toDecisionEngineFabric} from "../lib/fabric-master/decision-engine";
import {buildStagingRuleSet,prepareStagingConfiguration,type StagingPriceRequest} from "../lib/storefront/staging-pricing";
import {calculatePrice,calculateFabricRequirement} from "../lib/decision-engine/pricing-engine";
import {allocateVatInclusiveRetailTotal} from "../lib/storefront/checkout-gates";
import {forEachMediaRecord} from "../lib/fabric-master/media-batch-work";

let stage="environment";
async function main(){
 loadEnvConfig(process.cwd());
 assert.equal(new URL(process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL??"").hostname,"hqysjumypgeapgmqkcrx.supabase.co");
 stage="master records";
 const records=await listFabricMasterRecords({supplierId:"prestigious-textiles",storefrontOnly:true,stagingCatalogOnly:true,limit:500});
 stage="current approved prices";
 const prices=new Map<string,number>();const unavailable:string[]=[];
 await forEachMediaRecord(records,4,async record=>{
  try{prices.set(record.fabric_id,await verifiedCutCostMinor(record.supplier_id,record.supplier_sku));}
  catch(error){if(!(error instanceof Error)||error.message!=="PRICE_REQUIRES_VERIFICATION")throw error;unavailable.push(record.fabric_id);}
 });
 const designs=new Set<string>();const sample=records.filter(r=>{
  if(!prices.has(r.fabric_id)||!r.usable_width_mm||!["RANDOM_MATCH","STRAIGHT_MATCH"].includes(r.pattern_match_type??"")||designs.has(r.design_name)||designs.size>=6)return false;
  designs.add(r.design_name);return true;
 });
 assert.ok(sample.length>=3,"INSUFFICIENT_CURRENT_PRICE_DESIGNS");
 stage="matrix";
 const rules=buildStagingRuleSet();const results=[];const blocked=[];
 for(const record of sample){
  const cost=prices.get(record.fabric_id)!;const fabric=toDecisionEngineFabric(record,cost,record.source_effective_date??"");
  for(const heading of ["PENCIL_PLEAT","WAVE","DOUBLE_PINCH"] as const)
  for(const lining of ["STANDARD","BLACKOUT","THERMAL"] as const)
  for(const construction of ["PAIR","SINGLE"] as const)
  for(const [widthCm,dropCm] of [[120,150],[200,220],[350,280]]){
   const request:StagingPriceRequest={windowSlug:"standard-window",measurementBasis:"TRACK_WIDTH",widthCm,dropCm,fabricId:record.fabric_id,heading,lining,construction,stackDirection:construction==="PAIR"?"SPLIT":"LEFT"};
   const {configuration,windowType}=prepareStagingConfiguration(request,fabric);
   try{
    const result=calculatePrice({configuration,windowType,fabric,rules,shippingZone:"UK_MAINLAND",mode:"CALIBRATION"});
    const required=calculateFabricRequirement({configuration,windowType,fabric:{...fabric,supplierCostPerMetre:null},rules});
    const coverageMm=widthCm*10+(construction==="PAIR"?50:0);
    const baseWidthCount=Math.ceil(coverageMm*rules.headingRules[heading]!.fullnessFactor.value!/fabric.usableWidthMm);
    const widths=construction==="PAIR"&&baseWidthCount%2?baseWidthCount+1:baseWidthCount;
    assert.equal(result.fabricWidths.totalWidths,widths);
    assert.equal(required.fabricMetres,result.fabricMetres);
    const rawCut=dropCm*10+350;
    const cut=fabric.patternMatchType==="RANDOM_MATCH"?rawCut:Math.ceil(rawCut/fabric.verticalRepeatMm!)*fabric.verticalRepeatMm!;
    assert.equal(result.adjustedFabricCutLengthMm,cut);
    assert.ok(Math.abs(result.fabricMetres-Math.ceil(widths*cut/1000*10-1e-9)/10)<1e-8);
    const component=(code:string)=>result.components.find(c=>c.code===code)!;
    assert.equal(component("BASE_LABOUR").netAmount.amountMinor,widths*2500);
    assert.ok(Math.abs(component("HEADING_ADJUSTMENT").netAmount.amountMinor-widths*2500*(rules.headingRules[heading]!.priceFactor.value!-1))<1e-7);
    const liningCount=Math.ceil(coverageMm*rules.headingRules[heading]!.fullnessFactor.value!/1380);
    const liningWidths=construction==="PAIR"&&liningCount%2?liningCount+1:liningCount;
    const liningMetres=Math.ceil(liningWidths*(dropCm/100+0.35)*10-1e-9)/10;
    const direct=cost*result.fabricMetres+widths*2500*rules.headingRules[heading]!.priceFactor.value!+liningMetres*(lining==="STANDARD"?400:600);
    assert.ok(Math.abs(result.directCostNet.amountMinor-direct)<1e-6);
    const gross=Math.round((direct/0.65*1.2)/100)*100;
    assert.equal(result.total.amountMinor,gross);
    assert.ok(Math.abs(result.grossMarginPercent-35)<1e-7);
    const vat=allocateVatInclusiveRetailTotal(gross,2000);
    assert.equal(vat.netAmountMinor+vat.vatAmountMinor,gross);
    assert.equal(gross%100,0);
    const old=JSON.stringify(result);
    const newer=calculatePrice({configuration:{...configuration,id:crypto.randomUUID()},windowType,fabric:{...fabric,supplierCostPerMetre:{amountMinor:cost+100,currency:"GBP"}},rules,shippingZone:"UK_MAINLAND",mode:"CALIBRATION"});
    assert.equal(JSON.stringify(result),old);assert.ok(newer.total.amountMinor>result.total.amountMinor);
    results.push({fabricId:record.fabric_id,design:record.design_name,colour:record.colour_name,heading,lining,construction,widthCm,dropCm,fabricWidths:widths,fabricMetres:result.fabricMetres,cutLengthMm:cut,customerGrossMinor:gross,customerVatMinor:vat.vatAmountMinor,checks:"PASS",costChangeSimulation:"PASS_LOCAL_ONLY"});
   }catch(error){blocked.push({fabricId:record.fabric_id,heading,lining,construction,widthCm,dropCm,error:error instanceof Error?error.message:"CALCULATION_FAILED"});}
  }
 }
 const report={checkedAt:new Date().toISOString(),flaggedPriceReady:records.length,currentApprovedPriceBasis:prices.size,priceBasisUnavailable:unavailable,representativeDesigns:[...designs],matrixCases:results.length+blocked.length,passed:results.length,blocked,results,bondedInterlining:"OWNER_DECISION_REQUIRED: separate interlining is not an approved bonded-lining basis",shippingExcluded:true,supplierStockChecksPerformed:0,supplierDataChanged:false,remoteDraftOrderImmutability:"NOT_RUN",status:blocked.length?"BLOCKED":"PASS"};
 await writeFile("artifacts/phase5l/pricing-matrix.json",JSON.stringify(report,null,2));
 console.log(JSON.stringify({flaggedPriceReady:records.length,currentApprovedPriceBasis:prices.size,matrixCases:report.matrixCases,passed:results.length,blocked:blocked.length}));
}
main().catch(error=>{console.error(JSON.stringify({error:"PHASE5L_MATRIX_FAILED",stage,code:error?.code??null,message:String(error?.message??"").replace(/https?:\/\/\S+/g,"[URL]").slice(0,180)}));process.exitCode=1;});
