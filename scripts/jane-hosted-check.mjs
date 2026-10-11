// Real hosted synthetic requests only after provisioning, protection read-back
// and signed approval. No admin API, migrations, indexing or model calls.
// Vercel CLI authenticates through the operator's existing account. Application
// secrets enter curl through stdin, never command arguments, logs or receipts.
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {verifyTrialGrant} from '../lib/advisory/trial-grant.mjs';

const quote=s=>'"'+String(s).replaceAll('\\','\\\\').replaceAll('"','\\"').replaceAll('\r','\\r').replaceAll('\n','\\n')+'"';
export function curlRequest({cliPath,origin,grant,previewKey,accessToken,csrf,body}){
 return new Promise((resolve,reject)=>{
  const args=[cliPath,'curl','/api/advisory/consultation','--deployment',origin,'--scope','team_U8WXxsKS9LT2DmEllVkOpihz','--','--config','-'];
  const child=spawn(process.execPath,args,{stdio:['pipe','pipe','pipe'],windowsHide:true});let output='',bytes=0;
  const timer=setTimeout(()=>{child.kill();reject(Error('HOSTED_TRANSPORT_TIMEOUT'));},45000);
  child.stdout.on('data',b=>{bytes+=b.length;if(bytes>1000000){child.kill();reject(Error('HOSTED_RESPONSE_TOO_LARGE'));}else output+=b.toString();});
  child.stderr.resume(); // CLI diagnostics are not evidence and may contain URLs.
  child.on('error',()=>{clearTimeout(timer);reject(Error('HOSTED_TRANSPORT_UNAVAILABLE'));});
  child.on('close',code=>{clearTimeout(timer);if(code!==0)return reject(Error('HOSTED_TRANSPORT_FAILED'));try{const at=output.lastIndexOf('\nHTTP_STATUS:');resolve({status:Number(output.slice(at+13).trim()),body:JSON.parse(output.slice(0,at))});}catch{reject(Error('INVALID_HOSTED_RESPONSE'));}});
  child.stdin.on('error',()=>{});
  const headers={'Content-Type':'application/json',Origin:origin,Authorization:'Bearer '+accessToken,'x-advisory-preview-key':previewKey,'x-advisory-trial-grant':grant,...(csrf?{'x-advisory-csrf':csrf}:{})};
  child.stdin.end(['silent','show-error','max-time = 30','request = "POST"',...Object.entries(headers).map(([k,v])=>'header = '+quote(k+': '+v)),'data = '+quote(JSON.stringify(body)),'write-out = "\\nHTTP_STATUS:%{http_code}"'].join('\n'));
 });
}

export async function runHostedChecks({request,config}){
 const checks=[],sessions=new Map(),csrf=new Map();
 const check=(name,actual,expected)=>{assert.equal(actual,expected,name);checks.push({name,result:'PASS'});};
 const command=(action,s=null,extra={})=>({action,requestId:randomUUID(),sessionId:s?.id??null,revision:s?.revision??null,text:null,context:null,consent:false,recoveryToken:null,...extra});
 const call=(owner,body,extra={})=>request({...config,accessToken:config.accounts[owner].accessToken,csrf:csrf.get(owner),body,...extra});
 try{
  for(const owner of [0,1]){const r=await call(owner,{action:'bootstrap'});check('authenticated bootstrap '+owner,r.status,200);csrf.set(owner,r.body.csrf);}
  check('missing CSRF denied',(await call(0,command('start',null,{consent:true}),{csrf:''})).status,403);
  check('consent required',(await call(0,command('start'))).status,403);
  const started=await call(0,command('start',null,{consent:true}));check('durable start',started.status,200);let session=started.body.session;sessions.set(0,session);
  const turn=command('message',session,{text:'An invented room with oak flooring. I prefer a warm, calm palette.'});
  const reply=await call(0,turn);check('mock design reply',reply.status,200);session=reply.body.session;sessions.set(0,session);
  const replay=await call(0,turn);check('idempotent replay',replay.body.replayed,true);
  check('foreign consultation denied',(await call(1,command('resume',session))).status,404);
  const saved=await call(0,command('save',session,{consent:true}));check('save',saved.status,200);sessions.set(0,saved.body.session);
  const recovered=await call(0,command('recover',null,{consent:true,recoveryToken:saved.body.recoveryToken}));check('recovery',recovered.status,200);session=recovered.body.session;sessions.set(0,session);
  check('replayed recovery denied',(await call(0,command('recover',null,{consent:true,recoveryToken:saved.body.recoveryToken}))).status,404);
  // Separate authenticated owner avoids the intentionally small shared limit.
  const second=await call(1,command('start',null,{consent:true}));check('second owner start',second.status,200);sessions.set(1,second.body.session);
  const changes=await Promise.all(['Warmer colours please','Less pattern please'].map(text=>call(1,command('message',second.body.session,{text}))));
  check('concurrent revision has one winner',changes.filter(r=>r.status===200).length,1);
  check('concurrent revision conflict',changes.filter(r=>r.status===409).length,1);
  sessions.set(1,changes.find(r=>r.status===200).body.session);
  return {classification:'HOSTED_SYNTHETIC_APPLICATION_HTTP',checks,result:'PASS',limitations:['Concurrency does not prove distinct Vercel instances.','Physical ciphertext, expiry, revocation and connection-role inspection require separate hosted evidence.']};
 }finally{
  // Even a failed assertion attempts narrowly scoped deletion of created rows.
  // Keep IDs private if cleanup needs operator retry; never report success early.
  for(const [owner,session]of sessions){const r=await call(owner,command('delete',session));if(r.status!==200)throw Error('SYNTHETIC_CLEANUP_REQUIRED');}
 }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const config=JSON.parse(await readFile(process.env.ADVISORY_TRIAL_CONFIG_PATH,'utf8'));
  const approval=verifyTrialGrant(config.grant,config.vercelEnv);
  if(config.origin!==approval.previewOrigin||config.accounts?.length!==2||config.accounts.some(a=>!approval.syntheticOwnerIds.includes(a.owner))||new Set(config.accounts.map(a=>a.owner)).size!==2)throw Error();
  const result=await runHostedChecks({request:curlRequest,config});
  await writeFile(process.argv[2],JSON.stringify({...result,checkedAt:new Date().toISOString(),deploymentId:approval.deploymentId,sourceCommit:approval.sourceCommit},null,2),{flag:'wx'});
  console.log('HOSTED_SYNTHETIC_CHECKS_PASSED');
 }catch{console.error('HOSTED_CHECKS_INCOMPLETE: inspect secure operator context and synthetic cleanup; no success receipt written.');process.exitCode=1;}
}
