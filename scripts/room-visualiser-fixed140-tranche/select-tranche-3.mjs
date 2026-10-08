/** Select the next unpublished V1 tranche strictly from the active Browse snapshot. */
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {eligibleBrowseIds} from './browse-selection.mjs';

const args=process.argv.slice(2);
const arg=name=>{const index=args.indexOf(`--${name}`);return index<0?null:args[index+1];};
for(const required of ['browse-dir','repeat-dir','output','generation']){
  if(!arg(required))throw Error(`Missing --${required}`);
}
const previousPaths=[];
for(let index=0;index<args.length;index++)if(args[index]==='--previous'){
  if(!args[index+1])throw Error('Missing path after --previous');
  previousPaths.push(resolve(args[index+1]));
}
if(!previousPaths.length)throw Error('Pass every previously processed V1 tranche with --previous');
const browseDir=resolve(arg('browse-dir'));
const output=resolve(arg('output'));
const parseLines=bytes=>bytes.toString('utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const browseFiles=(await readdir(browseDir)).filter(name=>/^browse-ids-\d{3}\.jsonl$/.test(name)).sort();
if(browseFiles.length===0)throw Error('No durable Browse ID snapshot files');
const browseRows=[];
for(const name of browseFiles)browseRows.push(...parseLines(await readFile(join(browseDir,name))));
const browseIds=browseRows.map(row=>row.fabric_id);
const browseSet=new Set(browseIds);
const repeatDir=resolve(arg('repeat-dir'));
const repeatFiles=(await readdir(repeatDir)).filter(name=>/^browse-repeat-ids-\d{3}\.jsonl$/.test(name)).sort();
if(repeatFiles.length===0)throw Error('No Browse-scoped repeat-metadata evidence');
const repeatRows=[];
for(const name of repeatFiles)repeatRows.push(...parseLines(await readFile(join(repeatDir,name))));
const repeatIds=new Set(repeatRows.map(row=>row.fabric_id));
if(repeatIds.size!==repeatRows.length)
  throw Error('Repeat-metadata evidence is duplicated or outside current Browse');
const standard=JSON.parse(await readFile(resolve('lib/room-visualiser/assets.json'),'utf8'));
const standardIds=new Set(standard.fabrics.map(row=>row.fabricId));
const v1=JSON.parse(await readFile(resolve('lib/room-visualiser/fixed140-assignments.json'),'utf8'));
const v1Ids=new Set(Object.keys(v1.assignments));
const priorRows=[];
for(const path of previousPaths){
  const tranche=parseLines(await readFile(path));
  if(tranche.length!==1000)throw Error(`Previous tranche is not exactly 1,000 rows: ${path}`);
  priorRows.push(...tranche);
}
const priorIds=new Set(priorRows.map(row=>row.fabric_id));
if(priorIds.size!==priorRows.length)throw Error('Previous tranche snapshots overlap or have duplicate IDs');
const {overlap,remaining,skippedPrior,eligible}=eligibleBrowseIds(
  browseIds,repeatIds,standardIds,v1Ids,priorIds);
if(eligible.length<1000)throw Error(`Only ${eligible.length} unassessed Browse IDs remain`);
const selected=eligible.slice(0,1000).map((fabric_id,index)=>({
  fabric_id,candidate_order:index+1,browse_generation:arg('generation')
}));
const body=selected.map(row=>JSON.stringify(row)).join('\n')+'\n';
await writeFile(output,body,{flag:'wx'});
const summary={
  browse_generation:arg('generation'),
  browse_rows:browseIds.length,browse_distinct_ids:browseSet.size,
  browse_ids_sha256:hash(browseIds.join('\n')+'\n'),
  browse_with_published_repeat:repeatIds.size,
  browse_repeat_ids_sha256:hash([...repeatIds].sort((a,b)=>a<b?-1:a>b?1:0).join('\n')+'\n'),
  standard_count:standardIds.size,v1_count:v1Ids.size,
  standard_v1_overlap:overlap.length,
  standard_in_browse:[...standardIds].filter(id=>browseSet.has(id)).length,
  v1_in_browse:[...v1Ids].filter(id=>browseSet.has(id)).length,
  standard_outside_browse:[...standardIds].filter(id=>!browseSet.has(id)).length,
  v1_outside_browse:[...v1Ids].filter(id=>!browseSet.has(id)).length,
  browse_without_renderer:remaining.length,
  previous_tranche_ids:priorIds.size,
  prior_unpublished_browse_ids:skippedPrior.length,
  unassessed_browse_pool:remaining.length-skippedPrior.length,
  unassessed_v1_repeat_eligible:eligible.length,
  selected:1000,first:selected[0].fabric_id,last:selected.at(-1).fabric_id,
  selected_ids_sha256:hash(selected.map(row=>row.fabric_id).join('\n')+'\n'),
  snapshot_sha256:hash(body)
};
console.log(JSON.stringify(summary,null,2));
