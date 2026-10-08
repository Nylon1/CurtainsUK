/** Deterministic cross-supplier/source-width visual QA sample. */
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';

const i=process.argv.indexOf('--output');
if(i<0)throw Error('Pass --output <private-tranche-dir>');
const dir=resolve(process.argv[i+1]);
const lines=async name=>(await readFile(join(dir,name),'utf8')).trim().split(/\r?\n/).map(JSON.parse);
const ledger=await lines('ledger.jsonl'),snapshot=await lines('catalogue-snapshot.jsonl');
const pass=new Map(ledger.filter(row=>row.state==='V1_PASS').map(row=>[row.fabric_id,row]));
const rows=snapshot.filter(row=>pass.has(row.fabric_id));
const groups=new Map();
for(const row of rows){
  const key=`${row.supplier_id}|${row.pattern_class||'unknown'}`;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(row);
}
const picked=new Map();
function pick(row,reason){if(row&&!picked.has(row.fabric_id))picked.set(row.fabric_id,{fabricId:row.fabric_id,reason});}
for(const [key,group] of [...groups].sort(([a],[b])=>a.localeCompare(b))){
  group.sort((a,b)=>a.fabric_id.localeCompare(b.fabric_id));
  pick(group[Math.floor(group.length/2)],`supplier/pattern: ${key}`);
}
for(const [key,group] of [...groups].sort(([a],[b])=>a.localeCompare(b))){
  if(group.length<30)continue;
  pick(group[Math.floor(group.length/4)],`variation: ${key}`);
  if(picked.size<28)pick(group[Math.floor(3*group.length/4)],`variation: ${key}`);
}
const byWidth=rows.toSorted((a,b)=>(pass.get(a.fabric_id).width.cm-pass.get(b.fabric_id).width.cm)||a.fabric_id.localeCompare(b.fabric_id));
for(const index of [0,1,Math.floor(byWidth.length/2),byWidth.length-2,byWidth.length-1])pick(byWidth[index],`width boundary: ${pass.get(byWidth[index].fabric_id).width.cm} cm`);
for(let index=0;picked.size<30&&index<rows.length;index+=Math.max(1,Math.floor(rows.length/50)))
  pick(rows[index],'catalogue spread');
const selection=[...picked.values()].slice(0,30);
if(selection.length!==30)throw Error(`Only ${selection.length} distinct QA items`);
await writeFile(join(dir,'qa-selection.json'),JSON.stringify(selection,null,2)+'\n');
console.log(JSON.stringify({selected:selection.length,suppliers:Object.fromEntries([...new Set(selection.map(item=>pass.get(item.fabricId).supplier))].map(s=>[s,selection.filter(item=>pass.get(item.fabricId).supplier===s).length])),ids:selection.map(x=>x.fabricId)},null,2));
