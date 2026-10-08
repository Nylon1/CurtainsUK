/** Read-only image signal pass; writes separate local review evidence. */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {editorialBandSignal} from './source-quality.mjs';
const i=process.argv.indexOf('--output');
if(i<0)throw Error('Pass --output <private-tranche-dir>');
const dir=resolve(process.argv[i+1]);
const rows=(await readFile(join(dir,'ledger.jsonl'),'utf8')).trim().split(/\r?\n/).map(JSON.parse);
const results=[];
for(const row of rows){
  if(!row.asset_path)continue;
  const file=join(dir,'prepared-assets',row.asset_path.split('/').at(-1));
  const signal=await editorialBandSignal(await readFile(file));
  results.push({fabric_id:row.fabric_id,candidate_order:row.candidate_order,...signal});
}
await writeFile(join(dir,'source-quality.jsonl'),results.map(row=>JSON.stringify(row)).join('\n')+'\n');
console.log(JSON.stringify({audited:results.length,suspects:results.filter(r=>r.suspect).length,
  top:results.toSorted((a,b)=>b.contrast-a.contrast).slice(0,30).map(r=>({id:r.fabric_id,contrast:+r.contrast.toFixed(3),top:+r.topLightFraction.toFixed(3),body:+r.bodyLightFraction.toFixed(3)}))},null,2));
