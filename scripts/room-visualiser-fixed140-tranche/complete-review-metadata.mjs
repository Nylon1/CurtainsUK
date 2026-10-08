/** Preserve exact source evidence for width-review and short-coverage rows.
 * Writes local evidence only; never alters the source or production registry.
 */
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {sourceKind} from './policy.mjs';
const i=process.argv.indexOf('--output');
if(i<0)throw Error('Pass --output <private-tranche-dir>');
const dir=resolve(process.argv[i+1]);
const rows=(await readFile(join(dir,'ledger.jsonl'),'utf8')).trim().split(/\r?\n/).map(JSON.parse)
  .filter(row=>(row.state==='SOURCE_REVIEW'&&!row.source_sha256)||row.state==='INSUFFICIENT_COVERAGE');
const held=join(dir,'held-source-evidence');
await mkdir(held,{recursive:true});
const evidence=[];
for(const row of rows){
  const entry={fabric_id:row.fabric_id,reason:row.reason,source_sha256:null,source_width_px:null,
    source_height_px:null,source_height_cm:null,bytes:0};
  try{
    const response=await fetch(row.source_url,{signal:AbortSignal.timeout(25000),
      headers:{'Accept':'image/jpeg,image/webp'}});
    if(!response.ok)throw Error(`HTTP_${response.status}`);
    const bytes=Buffer.from(await response.arrayBuffer()),kind=sourceKind(bytes);
    if(!kind)throw Error('NOT_JPEG_OR_WEBP');
    const metadata=await sharp(bytes).metadata();
    const hash=createHash('sha256').update(bytes).digest('hex');
    if(row.source_sha256&&row.source_sha256!==hash)throw Error('SOURCE_BYTES_CHANGED_SINCE_INITIAL_SCAN');
    const file=join(held,`${hash}.${kind.extension}`);
    try{await stat(file);}catch(error){if(error.code!=='ENOENT')throw error;await writeFile(file,bytes,{flag:'wx'});}
    Object.assign(entry,{source_sha256:hash,source_width_px:metadata.width,source_height_px:metadata.height,
      source_height_cm:metadata.height*row.width.cm/metadata.width,bytes:bytes.length,held_asset_file:file});
  }catch(error){entry.error=String(error.message);}
  evidence.push(entry);
}
await writeFile(join(dir,'review-source-metadata.jsonl'),evidence.map(row=>JSON.stringify(row)).join('\n')+'\n');
console.log(JSON.stringify({attempted:rows.length,complete:evidence.filter(row=>row.source_sha256).length,
  failures:evidence.filter(row=>row.error)},null,2));
