/** Read-only preflight of the Browse-selected V1 source facts. */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {preflight} from './policy.mjs';

const i=process.argv.indexOf('--snapshot');
if(i<0)throw Error('Pass --snapshot <catalogue-snapshot.jsonl>');
const rows=(await readFile(resolve(process.argv[i+1]),'utf8')).trim().split(/\r?\n/).map(JSON.parse);
if(rows.length!==2500||new Set(rows.map(row=>row.fabric_id)).size!==2500)
  throw Error('Expected 2,500 distinct candidates');
const standard=JSON.parse(await readFile('lib/room-visualiser/assets.json','utf8'));
const standardIds=new Set(standard.fabrics.map(row=>row.fabricId));
const issues=new Map(),suppliers=new Map(),bases=new Map();
for(const row of rows){
  const issue=preflight(row,standardIds)??'SOURCE_FETCH_REQUIRED';
  issues.set(issue,(issues.get(issue)??0)+1);
  suppliers.set(row.supplier_id,(suppliers.get(row.supplier_id)??0)+1);
  bases.set(row.selection_basis,(bases.get(row.selection_basis)??0)+1);
}
console.log(JSON.stringify({
  rows:rows.length,
  issues:Object.fromEntries(issues),
  suppliers:Object.fromEntries(suppliers),
  selectionBasis:Object.fromEntries(bases),
  requiresByteLevelImageQA:issues.get('SOURCE_FETCH_REQUIRED')??0,
},null,2));
