// Offline evidence assembly. Never imports a model, credential or database.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {foundationsCases,EVALUATION_VERSION} from '../lib/advisory/evaluation-v4.mjs';

const [output,...inputs]=process.argv.slice(2);
if(!output||inputs.length<2)throw Error('Usage: node scripts/combine-jane-evaluations.mjs <output.json> <part1.json> <part2.json> ...');
const expected=foundationsCases.map(c=>c.id),seen=new Map(),sources=[];
let runLedger=null;
for(const path of inputs){
  const raw=await readFile(path,'utf8'),report=JSON.parse(raw);
  if(report.version!==EVALUATION_VERSION||report.mode!=='openai-broker'||report.retrievalSource!=='existing-hosted-index-and-live-governed-retail')throw Error('INCOMPATIBLE_EVALUATION_SOURCE');
  for(const c of report.cases??[]){
    if(!expected.includes(c.id)||seen.has(c.id))throw Error('DUPLICATE_OR_UNKNOWN_CASE');
    seen.set(c.id,c);
  }
  const current=report.ledger?.[0];
  if(!current||!Number.isSafeInteger(current.used_micro)||current.limit_micro!==5000000)throw Error('INVALID_SPEND_LEDGER');
  if(!runLedger||current.used_micro>runLedger.used_micro)runLedger=current;
  sources.push({path,sha256:createHash('sha256').update(raw).digest('hex'),caseIds:report.cases.map(c=>c.id),paidCalls:report.usage?.length??0,recordedUsedMicro:current.used_micro});
}
if(expected.some(id=>!seen.has(id))||seen.size!==expected.length)throw Error('INCOMPLETE_EVALUATION');
const cases=expected.map(id=>seen.get(id));
const result={version:EVALUATION_VERSION,mode:'openai-broker',retrievalSource:'existing-hosted-index-and-live-governed-retail',generatedAt:new Date().toISOString(),cases,sources,usageCount:sources.reduce((n,s)=>n+s.paidCalls,0),ledger:[runLedger],humanReview:{status:'PENDING_NAMED_REVIEW',note:'Owner reviewed the earlier profile only. New profile and full-index transcripts need named human assessment.'}};
await writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({cases:cases.length,adviceTurns:cases.flatMap(c=>c.transcript).filter(t=>t.advice).length,sourceFiles:inputs.length,usedMicro:runLedger.used_micro,output}));
