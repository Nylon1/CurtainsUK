// Serial, bounded checks reuse existing dependencies on this constrained host.
import {spawnSync} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
const dir='artifacts/jane-completion';await mkdir(dir,{recursive:true});
const wasm=['--liftoff-only','--wasm-num-compilation-tasks=1','--test'];
const checks=[
 ['consultation',['--test','lib/advisory/__tests__/consultation.test.mjs','lib/advisory/__tests__/evaluation.test.mjs','lib/advisory/__tests__/completion.test.mjs']],
 ...['cloud RPC persistence','two workers','distributed rate','verified cloud principals','protected HTTP'].map((pattern,i)=>['cloud-'+(i+1),[...wasm,'--test-name-pattern='+pattern,'lib/advisory/__tests__/cloud.test.mjs']]),
 ...['knowledge-search','index-worker','storage-rls','multi-instance'].map(name=>[name,[...wasm,'lib/advisory/__tests__/'+name+'.test.mjs']]),
 ['phase1',['--test','scripts/tests/specialist-advisory.test.mjs','scripts/tests/specialist-advisory-interactions.test.mjs']],
 ['theme',['--import','tsx','--test','lib/storefront/__tests__/shopify-theme.test.ts']]
];
const results=[];
for(const [name,args] of checks){
 const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:90000,maxBuffer:2e6});const output=(r.stdout??'')+(r.stderr??'');
 await writeFile(dir+'/'+name+'-checks.log',output);const pass=Number(output.match(/(?:ℹ |# )pass (\d+)/)?.[1]??0);
 results.push({name,exitCode:r.status,pass,error:r.error?.message??null});console.log(JSON.stringify(results.at(-1)));
}
await writeFile(dir+'/tests.json',JSON.stringify({checkedAt:new Date().toISOString(),checks:results,totalPassed:results.reduce((n,r)=>n+r.pass,0),allPassed:results.every(r=>r.exitCode===0)},null,2));
if(results.some(r=>r.exitCode!==0))process.exitCode=1;
