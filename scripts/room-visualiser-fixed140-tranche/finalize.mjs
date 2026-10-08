/** Merge machine scan and explicit source review into one unpublished ledger. */
import {readFile,writeFile,mkdir,rename,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const i=process.argv.indexOf('--output');
if(i<0)throw Error('Pass --output <private-tranche-dir>');
const dir=resolve(process.argv[i+1]);
const limit=Number(process.argv.includes('--limit')?process.argv[process.argv.indexOf('--limit')+1]:1000);
if(!Number.isSafeInteger(limit)||limit<1)throw Error('Invalid --limit');
const readJsonl=async name=>(await readFile(join(dir,name),'utf8')).trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const raw=await readJsonl('ledger.jsonl'),signals=await readJsonl('source-quality.jsonl');
const reviews=await readJsonl('source-review-decisions.jsonl'),backfills=await readJsonl('review-source-metadata.jsonl');
const visualReviews=await stat(join(dir,'visual-source-decisions.jsonl')).then(()=>readJsonl('visual-source-decisions.jsonl'),()=>[]);
if(raw.length!==limit||new Set(raw.map(row=>row.fabric_id)).size!==limit)throw Error(`Tranche is not exactly ${limit}`);
const signalById=new Map(signals.map(x=>[x.fabric_id,x])),reviewById=new Map(reviews.map(x=>[x.fabric_id,x]));
const visualById=new Map(visualReviews.map(x=>[x.fabric_id,x]));
const backfillById=new Map(backfills.map(x=>[x.fabric_id,x]));
if(reviews.length!==reviewById.size||signals.length!==signalById.size||visualReviews.length!==visualById.size)
  throw Error('Duplicate review evidence');
const suspects=signals.filter(x=>x.suspect);
if(suspects.some(x=>!reviewById.has(x.fabric_id))||
   reviews.some(x=>!signalById.get(x.fabric_id)?.suspect))throw Error('Every signal requires one explicit review decision');
for(const review of visualReviews){
  const row=raw.find(x=>x.fabric_id===review.fabric_id);
  if(row?.state!=='V1_PASS'||row.source_sha256!==review.source_sha256||
     review.state!=='BAD_SOURCE_IMAGE'||review.reason!=='STYLED_DRAPED_SOURCE'||
     review.method_version!=='plain-source-visual-review-v1'||
     reviewById.has(review.fabric_id))throw Error(`Invalid independent visual review: ${review.fabric_id}`);
}
const badDir=join(dir,'held-source-evidence');await mkdir(badDir,{recursive:true});
async function moveHeldSource(row){
  const filename=row.asset_path?.split('/').at(-1);
  if(!filename)throw Error('Rejected source has no prepared file');
  const from=join(dir,'prepared-assets',filename),to=join(badDir,filename);
  try{await stat(from);await rename(from,to);}
  catch(error){if(error.code!=='ENOENT'||!(await stat(to).catch(()=>null)))throw error;}
}
const final=[];
for(const row of raw){
  let result={...row};
  const backfill=backfillById.get(row.fabric_id);
  if(backfill){
    result={...result,source_sha256:backfill.source_sha256,
      source_width_px:backfill.source_width_px,source_height_px:backfill.source_height_px,
      source_height_cm:backfill.source_height_cm,asset_bytes:backfill.bytes};
    if(backfill.error)result.source_evidence_error=backfill.error;
  }
  const signal=signalById.get(row.fabric_id);
  if(row.state==='V1_PASS'&&!signal)throw Error(`No source audit for ${row.fabric_id}`);
  if(signal?.suspect){
    const decision=reviewById.get(row.fabric_id);
    result.source_review={...decision,signal:{topLightFraction:signal.topLightFraction,
      bodyLightFraction:signal.bodyLightFraction,bandStartFraction:signal.bandStartFraction}};
    if(decision.state==='BAD_SOURCE_IMAGE'){
      await moveHeldSource(row);
      result.state='BAD_SOURCE_IMAGE';result.reason=decision.reason;result.asset_path=null;
    }else if(decision.state!=='V1_PASS')throw Error('Unexpected source review decision');
  }
  const visualReview=visualById.get(row.fabric_id);
  if(visualReview){
    await moveHeldSource(row);
    result.state='BAD_SOURCE_IMAGE';result.reason=visualReview.reason;result.asset_path=null;
    result.visual_source_review=visualReview;
  }
  final.push(result);
}
const counts=Object.fromEntries(['V1_PASS','SOURCE_REVIEW','INSUFFICIENT_COVERAGE','BAD_SOURCE_IMAGE','V1_RUNTIME_FAILURE']
  .map(state=>[state,final.filter(row=>row.state===state).length]));
if(Object.values(counts).reduce((a,b)=>a+b,0)!==limit)throw Error('Classification total mismatch');
const candidateAssets=final.filter(row=>row.state==='V1_PASS');
for(const row of candidateAssets){
  const bytes=await readFile(join(dir,'prepared-assets',row.asset_path.split('/').at(-1)));
  if(createHash('sha256').update(bytes).digest('hex')!==row.source_sha256)throw Error(`Prepared source hash mismatch: ${row.fabric_id}`);
}
await writeFile(join(dir,'final-ledger.jsonl'),final.map(row=>JSON.stringify(row)).join('\n')+'\n');
await writeFile(join(dir,'proposed-assignments.jsonl'),candidateAssets.map(row=>JSON.stringify({
  fabricId:row.fabric_id,rendererProfile:'FIXED140_SINGLE_WIDTH_V1',usableWidthCm:row.width.cm,
  sourceWidthPx:row.source_width_px,sourceHeightPx:row.source_height_px,
  sourceImage:row.asset_path,sha256:row.source_sha256,
  reviewStatus:'TRANCHE_REVIEW_ONLY_NOT_CUSTOMER_ENABLED',
})).join('\n')+'\n');
const summary={processed:limit,counts,preparedSourceBytes:candidateAssets.reduce((sum,row)=>sum+row.asset_bytes,0),
  preparedUniqueAssets:new Set(candidateAssets.map(row=>row.source_sha256)).size,
  sourceQualitySignals:suspects.length,explicitReviewDecisions:reviews.length,
  independentVisualHolds:visualReviews.length,
  proposedAssignments:'proposed-assignments.jsonl',customerEnabled:0};
await writeFile(join(dir,'tranche-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
