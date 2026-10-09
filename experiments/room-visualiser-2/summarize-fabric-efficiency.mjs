import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const evidence='C:/Users/hamza/curtainsuk-visualiser-2-fabric-efficiency-evidence-20261009';
const gallery='C:/Users/hamza/curtainsuk-visualiser-2-four-rooms-evidence-20261009';
const previous='C:/Users/hamza/curtainsuk-visualiser-2-fabric-detail-evidence-20261009';
const median=values=>{const a=values.toSorted((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
async function summarize(path){
 const records=JSON.parse(await readFile(path,'utf8'));assert.equal(records.length,24);
 const summaries=[];
 for(const mobile of [false,true])for(const profile of ['STANDARD','FIXED140']){
  const row={profile,viewport:mobile?'narrow':'desktop'};
  for(const version of ['before','candidate']){
   const set=records.filter(r=>r.mobile===mobile&&r.profile===profile&&r.version===version);assert.equal(set.length,3);
   set.forEach(r=>{assert.equal(r.samples.length,20);assert.deepEqual(r.errors,[]);});
   row[version]={medianMs:median(set.map(r=>r.medianMs)),runMediansMs:set.map(r=>r.medianMs),validBatches:set.reduce((sum,r)=>sum+r.samples.length,0)};
  }
  row.deltaMs=row.candidate.medianMs-row.before.medianMs;summaries.push(row);
 }
 return summaries;
}
const protectedModules=[];
for(const name of ['fabric-detail.mjs','fabric-lighting-bridge.mjs','living.mjs','viewer-bridge.mjs','serve.mjs']){
 const current=await readFile('experiments/room-visualiser-2/'+name),old=await readFile(previous+'/source-snapshot/'+name);
 assert.ok(current.equals(old),'Live rendering changed: '+name);
 protectedModules.push({name,sha256:createHash('sha256').update(current).digest('hex'),unchangedSinceDetailApproval:true});
}
const result={date:'2026-10-09',decision:'Retain the approved fabric material. Reject the conditional shader candidate: no consistent GPU benefit.',conditions:'Living Room; three interleaved page runs per version/profile/viewport. Same Chrome/AMD ANGLE D3D11. Desktop1440x1000 DPR1; narrow390x844 deviceDPR2/internalDPR1.25. One browser process per profile/viewport, no competing test browser. Each run: four warm-up batches then20 valid timer-query batches of3 full renders, including shadow updates. Medians of run medians. These sustained/batched GPU figures are not directly comparable to the earlier isolated-frame figures. This is not a new cold-loading or physical-phone measurement.',candidateLabels:{before:'retained detail shader',candidate:'conditional shader (rejected)'},candidateProbe:await summarize(evidence+'/probe.json'),retainedComparisonLabels:{before:'original material before fabric detail',candidate:'retained approved detail material'},retainedComparison:await summarize(evidence+'/original-comparison/probe.json'),protectedModules,physicalIPhoneTested:false,published:false};
await writeFile(evidence+'/performance-summary.json',JSON.stringify(result,null,2));await writeFile(gallery+'/fabric-efficiency-summary.json',JSON.stringify(result,null,2));
try{await copyFile(gallery+'/performance-summary.json',evidence+'/gallery-performance-before.json',1);}catch(error){if(error.code!=='EEXIST')throw error;}
const data=JSON.parse(await readFile(gallery+'/performance-summary.json','utf8'));
data.fabricEfficiencyFollowup=result;
data.galleryHeadline='Fabric clarity retained. Last fresh-process desktop STANDARD Living Room result: 4.88s full page versus 5.10s before (three-run medians). Follow-up batched GPU tests: 6.62ms refined versus 6.73ms original on desktop; narrow STANDARD 3.08ms versus 2.96ms. The earlier isolated-frame 1.28ms desktop increase was not reproduced in this repeated test. Physical iPhone and customer-network checks remain outstanding.';
await writeFile(gallery+'/performance-summary.json',JSON.stringify(data,null,2));
console.log(JSON.stringify(result.retainedComparison));
