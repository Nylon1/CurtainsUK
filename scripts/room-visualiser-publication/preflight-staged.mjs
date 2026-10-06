// Reconcile every pending fabric against the public retail projection directly
// before protected release. Individual failures become HOLD; a systemic outage
// still stops publication. No fabric or catalogue writes.
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {verifyRetail} from './core.mjs';
import {holdPreflightFailures} from './ledger.mjs';

const [queuePath,ledgerPath,reportPath]=process.argv.slice(2);
if(!queuePath||!ledgerPath||!reportPath)throw Error('Pass queue, ledger and stage-report paths');
const rows=new Map((await readFile(resolve(queuePath),'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse).map(row=>[row.fabricId,row]));
const ledger=JSON.parse(await readFile(resolve(ledgerPath),'utf8'));
const failures=[];
async function fetchRetail(id){
  const url=`https://www.curtainsuk.com/apps/curtainsuk-decision/catalog?view=retail&visualiser=1&fabric=${encodeURIComponent(id)}`;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch(url,{signal:AbortSignal.timeout(30_000)});
      if(response.ok)return (await response.json()).fabric;
      if(![502,503,504].includes(response.status)||attempt===2)throw Error(`HTTP_${response.status}`);
    }catch(error){
      if(attempt===2||!['TimeoutError','TypeError'].includes(error.name))throw error;
    }
    await new Promise(done=>setTimeout(done,500*(attempt+1)));
  }
}
for(const id of ledger.staged){
  const row=rows.get(id);
  if(!row){failures.push({id,reason:'QUEUE_ID_MISSING'});continue;}
  try{
    const fabric=await fetchRetail(id);
    const reason=verifyRetail(row,fabric,row.hRepeatCm>0?'straight':'plain');
    if(reason)failures.push({id,reason});
  }catch(error){failures.push({id,reason:String(error.message)});}
}
if(!failures.length){console.log(JSON.stringify({staged:ledger.staged.length,failures:[]}));process.exit(0);}
const manifestPath=resolve('lib/room-visualiser/assets.json');
const runtimePath=resolve('lib/room-visualiser/runtime/fabrics.mjs');
const contractPath=resolve('lib/room-visualiser/runtime/rooms/catalogue-contract.mjs');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const report=JSON.parse(await readFile(resolve(reportPath),'utf8'));
const contract=await readFile(contractPath,'utf8');
const removed=holdPreflightFailures(ledger,manifest,report,failures);
const links=Object.fromEntries(manifest.fabrics.map(fabric=>[fabric.fabricId,fabric.id]));
const revisedContract=contract.replace(/^export const CALIBRATION_LINKS=.*;$/m,`export const CALIBRATION_LINKS=Object.freeze(${JSON.stringify(links)});`);
if(revisedContract===contract)throw Error('Preflight catalogue link update failed');
const fabrics=`export const FABRICS = ${JSON.stringify(manifest.fabrics)};\nfor(const fabric of FABRICS){fabric.image=new URL(fabric.image,import.meta.url).href;fabric.name=fabric.id;}\n`;
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
await writeFile(runtimePath,fabrics);
await writeFile(contractPath,revisedContract);
await writeFile(resolve(ledgerPath),JSON.stringify(ledger,null,2)+'\n');
await writeFile(resolve(reportPath),JSON.stringify(report,null,2)+'\n');
const retained=new Set(manifest.fabrics.map(entry=>entry.image));
const deleted=new Set();
for(const entry of removed){
  if(retained.has(entry.image)||deleted.has(entry.image))continue;
  if(!/^\/room-visualiser\/textures\/[a-f0-9]{64}\.webp$/.test(entry.image))throw Error('Unexpected generated texture path');
  const file=resolve('public',entry.image.slice(1));
  if(dirname(file)!==resolve('public/room-visualiser/textures'))throw Error('Generated texture escaped its directory');
  await unlink(file);
  deleted.add(entry.image);
}
console.log(JSON.stringify({staged:ledger.staged.length,heldIndividually:failures.length,failures},null,2));
