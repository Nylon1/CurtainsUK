/** Reconcile read-only source facts to an already selected active-Browse ID tranche. */
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';

const args=process.argv.slice(2);
const arg=name=>{const index=args.indexOf(`--${name}`);return index<0?null:args[index+1];};
for(const required of ['selected','raw-dir','output'])if(!arg(required))throw Error(`Missing --${required}`);
const parseLines=bytes=>bytes.toString('utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const selected=parseLines(await readFile(resolve(arg('selected'))));
if(selected.length!==1000||new Set(selected.map(row=>row.fabric_id)).size!==1000||
   selected.some((row,index)=>row.candidate_order!==index+1))
  throw Error('Selected Browse tranche is not exactly 1,000 unique ordered IDs');
const names=(await readdir(resolve(arg('raw-dir')))).filter(name=>/^raw-\d{3}\.jsonl$/.test(name)).sort();
if(names.length!==10)throw Error(`Expected ten read-only 100-row source pages, got ${names.length}`);
const rows=[];
for(const name of names)rows.push(...parseLines(await readFile(join(resolve(arg('raw-dir')),name))));
if(rows.length!==1000||rows.some((row,index)=>
  row.fabric_id!==selected[index].fabric_id||row.candidate_order!==index+1))
  throw Error('Hydrated source rows do not match the exact Browse-selected ID order');
if(rows.some(row=>!row.supplier_id||!row.design_id))
  throw Error('A Browse-selected ID has no governed source record');
if(rows.some(row=>!(Number(row.horizontal_repeat_mm)>0||Number(row.vertical_repeat_mm)>0)))
  throw Error('A selected V1 ID has lost its repeat-metadata eligibility');
const generation=selected[0].browse_generation;
if(selected.some(row=>row.browse_generation!==generation))throw Error('Mixed Browse generations');
const body=rows.map((row,index)=>JSON.stringify({...row,browse_generation:selected[index].browse_generation})).join('\n')+'\n';
await writeFile(resolve(arg('output')),body,{flag:'wx'});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
console.log(JSON.stringify({
  selected:rows.length,browse_generation:generation,
  selected_snapshot_sha256:hash(await readFile(resolve(arg('selected')))),
  hydrated_snapshot_sha256:hash(body),
  suppliers:Object.fromEntries([...new Set(rows.map(row=>row.supplier_id))]
    .map(supplier=>[supplier,rows.filter(row=>row.supplier_id===supplier).length])),
  missing_approved_main:rows.filter(row=>!row.source_url).length,
  noncurrent_source_facts:rows.filter(row=>!row.staging_catalog_visible||!row.storefront_selectable||
    row.lifecycle_state==='DISCONTINUED').length
},null,2));
