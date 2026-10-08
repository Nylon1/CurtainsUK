/** Read-only tranche statistics from the private, reviewed ledger. */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';

const index=process.argv.indexOf('--output');
if(index<0||!process.argv[index+1])throw Error('Pass --output <private-tranche-dir>');
const dir=resolve(process.argv[index+1]);
const rows=(await readFile(join(dir,'final-ledger.jsonl'),'utf8')).trim().split(/\r?\n/).map(JSON.parse);
if(rows.length!==1000)throw Error(`Expected exactly 1,000 final classifications, got ${rows.length}`);
const states=['V1_PASS','SOURCE_REVIEW','INSUFFICIENT_COVERAGE','BAD_SOURCE_IMAGE','V1_RUNTIME_FAILURE'];
const count=values=>Object.fromEntries([...new Set(values)].sort().map(value=>[value,values.filter(item=>item===value).length]));
const bucket=(value,edges)=>{
  if(!Number.isFinite(value))return 'missing';
  for(let i=0;i<edges.length-1;i++)if(value>=edges[i]&&value<edges[i+1])return `${edges[i]}–<${edges[i+1]}`;
  return `${edges.at(-1)}+`;
};
const quantiles=values=>{
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
  const at=p=>sorted[Math.floor((sorted.length-1)*p)];
  return {count:sorted.length,min:at(0),p10:at(.1),median:at(.5),p90:at(.9),max:at(1)};
};
const supplierRows=Object.fromEntries([...new Set(rows.map(row=>row.supplier))].sort().map(supplier=>{
  const subset=rows.filter(row=>row.supplier===supplier);
  return [supplier,{attempted:subset.length,states:Object.fromEntries(states.map(state=>[state,subset.filter(row=>row.state===state).length]))}];
}));
const report={
  processed:rows.length,
  states:Object.fromEntries(states.map(state=>[state,rows.filter(row=>row.state===state).length])),
  suppliers:supplierRows,
  widthBasis:count(rows.map(row=>row.width?.basis??'missing')),
  widthCm:quantiles(rows.map(row=>row.width?.cm)),
  widthBucketsCm:count(rows.map(row=>bucket(row.width?.cm,[0,120,130,135,140,145,150,160,200]))),
  sourceHeightCm:quantiles(rows.map(row=>row.source_height_cm)),
  sourceHeightBucketsCm:count(rows.map(row=>bucket(row.source_height_cm,[0,100,110,120,130,140,160,200,300]))),
  sourceDimensions:count(rows.map(row=>row.source_width_px&&row.source_height_px?`${row.source_width_px}×${row.source_height_px}`:'missing')),
  holdReasons:count(rows.filter(row=>row.state!=='V1_PASS').map(row=>row.reason)),
  passBytes:rows.filter(row=>row.state==='V1_PASS').reduce((sum,row)=>sum+row.asset_bytes,0),
  passWidthsCm:quantiles(rows.filter(row=>row.state==='V1_PASS').map(row=>row.width?.cm)),
  passSourceHeightsCm:quantiles(rows.filter(row=>row.state==='V1_PASS').map(row=>row.source_height_cm)),
  frozenMeshVariations:count(rows.filter(row=>row.state==='V1_PASS').map(row=>`${row.mesh?.vertices}/${row.mesh?.triangles}/${row.mesh?.finishedPairWidthCm}/${row.mesh?.wavePitchCm}`)),
};
await writeFile(join(dir,'statistics.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
