import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const manifest=JSON.parse(readFileSync('release/capabilities.json','utf8'));
const base=process.env.CURTAINSUK_SMOKE_CATALOG_URL||'https://www.curtainsuk.com/apps/curtainsuk-decision/catalog';
assert.equal(new URL(base).protocol,'https:');
const results=Object.fromEntries(manifest.requiredLiveCapabilities.map(k=>[k,{status:'BLOCKED',reason:'No approved non-purchasing deployed-runtime probe yet'}]));
const controls=[];
async function json(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(45000)});assert.equal(r.status,200);return r.json();}
try{
 for(const [state,ids] of [['COMPLETE',manifest.completeControls],['PARTIAL',manifest.partialControls],['PENDING',manifest.pendingControls]]){
  for(const id of ids){
   const u=new URL(base);for(const [k,v] of Object.entries({view:'retail',browseGuide:'1',knowledge:'1',fabric:id}))u.searchParams.set(k,v);
   const {fabric:f}=await json(u);assert.equal(f?.id,id);assert.ok(f.supplier&&f.brand&&f.design&&f.colour);
   if(state==='PENDING')assert.equal(f.intelligence?.dimensions?.length||0,0);
   else assert.ok(f.visualIntelligence&&f.intelligence?.dimensions?.length);
   if(id===manifest.fabricKnowledgeControl){assert.equal(f.visualIntelligence.pattern.category,'stripe');assert.equal(f.visualIntelligence.palette.temperature,'warm');}
   controls.push({id,state,status:'PASS'});
  }
 }
 results.fabricMaster={status:'PASS'};results.fabricKnowledge={status:'PASS'};
}catch{results.fabricKnowledge={status:'FAIL',reason:'Exact live stored-reading control failed'};}
try{
 const product=await json('https://www.curtainsuk.com/products/fabric-sample.js');
 const v=product.variants.find(v=>v.id===manifest.sampleVariantId);
 assert.equal(v.price,manifest.samplePriceMinor);assert.equal(v.available,true);
 results.samples={status:'BLOCKED',priceControl:'PASS',reason:'£2.50 live product verified; signed sample eligibility/handoff probe still required'};
}catch{results.samples={status:'FAIL',reason:'Live sample product/price/availability mismatch'};}
const report={timestamp:new Date().toISOString(),controls,capabilities:results,status:Object.values(results).every(x=>x.status==='PASS')?'PASS':'BLOCKED',writesPerformed:false};
mkdirSync('artifacts/production-gate',{recursive:true});writeFileSync('artifacts/production-gate/live.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(report.status!=='PASS')process.exitCode=1;
