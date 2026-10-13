// One-time read-only backup sentinel. Database writes remain in the approved
// Codex operator session through its existing Supabase connector, never this PAT.
import {readFile,writeFile,appendFile,open,rename} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {readPrivateFile} from './jane-private-file.mjs';
import {OVERNIGHT_HOST_APPROVAL} from '../lib/advisory/host-window-policy.mjs';

const projectRef='hqysjumypgeapgmqkcrx';
const stopAt=Date.parse('2026-10-12T10:00:00Z');
const after=Date.parse('2026-10-11T18:55:39.439584Z');
const once=process.argv.includes('--once');
const statusPath=join(homedir(),'.codex','tmp',once?'jane-overnight-probe-'+Date.now()+'.json':'jane-overnight-status.json');
let state={version:1,projectRef,pid:process.pid,startedAt:new Date().toISOString(),
 status:'STARTING_READ_ONLY_BACKUP_WATCH',indexingStarted:false,hostedWrites:0,
 approvalReference:OVERNIGHT_HOST_APPROVAL.reference,stopAt:new Date(stopAt).toISOString(),
 recoveryOperator:'CurtainsUK owner (Nylon1), confirmed in this task',acceptedRpoSeconds:86400};
let saving=Promise.resolve();
function save(patch={}){return saving=saving.then(async()=>{
 state={...state,...patch,aliveAt:new Date().toISOString()};
 const temporary=statusPath+'.'+process.pid+'.tmp';
 await writeFile(temporary,JSON.stringify(state,null,2)+'\n',{mode:0o600});await rename(temporary,statusPath);
});}
function qualifying(b,now){
 const at=Date.parse(b.inserted_at);
 return b.status==='COMPLETED'&&b.is_physical_backup===true&&Number.isFinite(at)&&at>after&&at<=now&&now-at<=86400000;
}
async function check(){
 if(Date.now()>=stopAt)throw Error('OVERNIGHT_DEADLINE_REACHED');
 const saved=JSON.parse((await readFile(join(homedir(),'.codex','tmp','jane-monitoring-token-status.json'),'utf8')).replace(/^\uFEFF/,''));
 if(saved.status!=='saved')throw Error('MONITORING_ACCESS_UNAVAILABLE');
 const expected=resolve(homedir(),'.curtainsuk-jane-private-preview')+'\\';
 if(!resolve(saved.secretPath).startsWith(expected))throw Error('PRIVATE_PATH_INVALID');
 const secret=await readPrivateFile(saved.secretPath);
 const captured=Date.parse(secret.capturedAt),accessAge=Date.now()-captured;
 if(secret.projectRef!==projectRef||!/^sbp_fc[A-Za-z0-9_.-]{20,2000}$/.test(secret.token)||secret.declaredExpiryHours!==24||!Number.isFinite(accessAge)||accessAge<0||accessAge>23*3600000)throw Error('MONITORING_ACCESS_REVIEW_REQUIRED');
 const response=await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/backups`,{method:'GET',headers:{Authorization:`Bearer ${secret.token}`,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('BACKUP_HTTP_'+response.status);
 const chunks=[];let bytes=0;
 for await(const c of response.body){bytes+=c.length;if(bytes>250000)throw Error('BACKUP_RESPONSE_BOUND');chunks.push(c);}
 const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 if(!Array.isArray(data.backups)||data.backups.length>100||data.walg_enabled!==true)throw Error('BACKUP_RESPONSE_REVIEW_REQUIRED');
 const now=Date.now(),eligible=data.backups.filter(b=>qualifying(b,now)).sort((a,b)=>Date.parse(b.inserted_at)-Date.parse(a.inserted_at));
 const b=eligible[0]??data.backups.filter(b=>b.status==='COMPLETED').sort((a,b)=>Date.parse(b.inserted_at)-Date.parse(a.inserted_at))[0];
 const receipt={checkedAt:new Date(now).toISOString(),httpStatus:response.status,
 backup:b?{id:b.id,status:b.status,isPhysical:b.is_physical_backup,recoveryPoint:b.inserted_at}:null,
 backupConditionMet:eligible.length>0,walgEnabled:data.walg_enabled,pitrEnabled:data.pitr_enabled};
 await appendFile(join(dirname(saved.secretPath),'overnight-backup-receipts.jsonl'),JSON.stringify(receipt)+'\n',{mode:0o600});
 return receipt;
}
let handle,heartbeat;
try{
 if(!once){
  // Never steal a crash lock; a stopped operator must be reviewed explicitly.
  handle=await open(statusPath+'.lock','wx',0o600);
  await handle.writeFile(JSON.stringify({pid:process.pid,startedAt:state.startedAt}));await handle.sync();
 }
 await save();
 if(!once)heartbeat=setInterval(()=>save().catch(()=>{process.exit(1);}),30000);
 for(let n=0;n<73;n++){
  const receipt=await check();
  await save({...receipt,checks:n+1,status:receipt.backupConditionMet?'BACKUP_READY_OPERATOR_REQUIRED':'WAITING_FOR_COMPLETED_POST_WRITE_BACKUP'});
  if(once||receipt.backupConditionMet)break;
  // Bounded one-off watch, not a recurring catalogue refresh schedule.
  const remaining=Math.min(600000,stopAt-Date.now());
  if(remaining<=0)throw Error('OVERNIGHT_DEADLINE_REACHED');
  await new Promise(r=>setTimeout(r,remaining));
 }
}catch(error){
 const allowed=/^(OVERNIGHT_DEADLINE_REACHED|MONITORING_ACCESS_UNAVAILABLE|PRIVATE_PATH_INVALID|MONITORING_ACCESS_REVIEW_REQUIRED|BACKUP_HTTP_\d{3}|BACKUP_RESPONSE_BOUND|BACKUP_RESPONSE_REVIEW_REQUIRED)$/;
 const reason=error.code==='EEXIST'?'EXISTING_OPERATOR_LOCK':allowed.test(error.message)?error.message:'BACKUP_WATCH_FAILED';
 if(reason!=='EXISTING_OPERATOR_LOCK')await save({status:'STOPPED',reason}).catch(()=>{});
 process.exitCode=1;console.log(JSON.stringify({status:'STOPPED',reason}));
}finally{
 if(heartbeat)clearInterval(heartbeat);
 if(handle)await handle.close(); // preserve lock/evidence on both success and failure
 console.log(JSON.stringify({statusPath,status:state.status,pid:process.pid,indexingStarted:false}));
}
