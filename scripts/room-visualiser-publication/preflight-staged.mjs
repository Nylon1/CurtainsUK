// Reconcile every pending fabric against the current public retail projection
// immediately before a protected release. No fabric or catalogue writes.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {verifyRetail} from './core.mjs';
const [queuePath,ledgerPath]=process.argv.slice(2);
if(!queuePath||!ledgerPath)throw Error('Pass queue and ledger paths');
const rows=new Map((await readFile(resolve(queuePath),'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse).map(row=>[row.fabricId,row]));
const ledger=JSON.parse(await readFile(resolve(ledgerPath),'utf8'));
const failures=[];
for(const id of ledger.staged){
  const row=rows.get(id);
  if(!row){failures.push({id,reason:'QUEUE_ID_MISSING'});continue;}
  try{
    const response=await fetch(`https://www.curtainsuk.com/apps/curtainsuk-decision/catalog?view=retail&visualiser=1&fabric=${encodeURIComponent(id)}`,
      {signal:AbortSignal.timeout(30_000)});
    if(!response.ok)throw Error(`HTTP_${response.status}`);
    const fabric=(await response.json()).fabric;
    const reason=verifyRetail(row,fabric,row.hRepeatCm>0?'straight':'plain');
    if(reason)failures.push({id,reason});
  }catch(error){failures.push({id,reason:String(error.message)});}
}
console.log(JSON.stringify({staged:ledger.staged.length,failures},null,2));
if(failures.length)process.exitCode=1;
