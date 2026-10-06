// A single, resumable publication entrypoint. A protected PR/deployment is the
// deliberate boundary between preparation and public read-back; no customer
// request ever runs this code or builds source artwork.
import {spawnSync,execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {MAX_BATCH_SIZE} from './core.mjs';

const values=process.argv.slice(2);
const arg=name=>{const index=values.indexOf(`--${name}`);return index<0?null:values[index+1]};
const queue=arg('queue'),ledger=arg('ledger'),reports=arg('report-dir');
const stage=values.includes('--stage'),verify=values.includes('--verify-live');
if(!queue||!ledger||!reports||stage===verify)
  throw Error('Pass --queue, --ledger, --report-dir and exactly one of --stage or --verify-live');
const batchSize=Number(arg('batch-size')||25);
if(!Number.isInteger(batchSize)||batchSize<1||batchSize>MAX_BATCH_SIZE)throw Error(`Batch size must be 1–${MAX_BATCH_SIZE}`);
await mkdir(resolve(reports),{recursive:true});
const report=join(resolve(reports),verify?'live.json':'stage.json');
const node=process.execPath;
function run(program,args){
  const result=spawnSync(program,args,{stdio:'inherit',shell:false,env:process.env});
  if(result.error)throw result.error;
  if(result.status!==0)throw Error(`${program} ${args[0]} exited ${result.status}`);
}
function packageTool(name,args){
  if(process.platform==='win32')run(node,[join(dirname(node),'node_modules/npm/bin',`${name}-cli.js`),...args]);
  else run(name,args);
}
let ledgerState;
try{ledgerState=JSON.parse(await readFile(resolve(ledger),'utf8'));}
catch(error){
  if(error.code!=='ENOENT'||verify)throw error;
  const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const protectedHead=execFileSync('git',['rev-parse','origin/release/production'],{encoding:'utf8'}).trim();
  const manifestDirty=spawnSync('git',['diff','--quiet','--','lib/room-visualiser/assets.json']).status!==0;
  if(head!==protectedHead||manifestDirty)throw Error('Initialize a new ledger only from the clean protected manifest');
  const manifest=JSON.parse(await readFile('lib/room-visualiser/assets.json','utf8'));
  ledgerState={version:1,published:manifest.fabrics.map(entry=>entry.fabricId),staged:[]};
  await writeFile(resolve(ledger),JSON.stringify(ledgerState,null,2)+'\n');
}
if(stage){
  if(!ledgerState.staged.length){
    run(node,['scripts/room-visualiser-publication/run.mjs','--queue',resolve(queue),'--ledger',resolve(ledger),
      '--batch-size',String(batchSize),'--report',report,'--stage']);
  }else if(!values.includes('--resume-staged')){
    throw Error('A staged batch awaits protected release. Use --resume-staged to rerun quality checks.');
  }
  run(node,['scripts/room-visualiser-publication/preflight-staged.mjs',resolve(queue),resolve(ledger),report]);
  run(node,['scripts/build-room-visualiser.mjs']);
  run(node,['scripts/room-visualiser-publication/verify-assets.mjs']);
  run(node,['--test','tests/room-visualiser/publication-policy.test.mjs']);
  packageTool('npm',['test']);packageTool('npx',['tsc','--noEmit']);packageTool('npm',['run','build']);
  const staged=JSON.parse(await readFile(resolve(ledger),'utf8')).staged;
  const stageReport=JSON.parse(await readFile(report,'utf8'));
  console.log(JSON.stringify({state:'READY_FOR_PROTECTED_RELEASE',attempted:stageReport.attempted,staged:staged.length,newlyHeld:stageReport.newlyHeld,
    next:'Merge green protected PR, deploy READY, then run this same entrypoint with --verify-live.'}));
}else{
  if(!ledgerState.staged.length)throw Error('No staged batch to verify');
  run(node,['scripts/room-visualiser-publication/run.mjs','--queue',resolve(queue),'--ledger',resolve(ledger),
    '--batch-size',String(batchSize),'--report',report,'--verify-live']);
  const result=JSON.parse(await readFile(report,'utf8'));
  if(result.liveFaults||result.staged)throw Error('Public read-back incomplete; stop the next batch');
  console.log(JSON.stringify({state:'LIVE_VERIFIED',publishedThisBatch:ledgerState.staged.length,
    liveVisualiserTotal:result.liveVisualiserTotal,held:result.held,remaining:result.remaining}));
}
