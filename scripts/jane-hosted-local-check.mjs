// Real hosted Auth/database; two local application processes. This does NOT
// certify Vercel deployment protection or remote application hosting.
import {fork} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {sign,randomUUID} from 'node:crypto';
import {readPrivateFile} from './jane-private-file.mjs';
import {runHostedChecks} from './jane-hosted-check.mjs';
import {MIGRATION_SHA256} from '../lib/advisory/trial-grant.mjs';
import {createPgTransaction} from '../lib/advisory/pg-transaction.mjs';
const children=[];let pool;
try{
 const c=await readPrivateFile(process.env.ADVISORY_PRIVATE_TRIAL_PATH),ref=c.projectRef;
 const env={...c.env,VERCEL_ENV:'preview',VERCEL_PROJECT_ID:'prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA',VERCEL_DEPLOYMENT_ID:'dpl_localHarnessOnly',VERCEL_GIT_COMMIT_SHA:'0'.repeat(40),VERCEL_URL:'local-harness-only.vercel.app'};
 const approval={version:1,projectRef:ref,vercelProjectId:env.VERCEL_PROJECT_ID,deploymentId:env.VERCEL_DEPLOYMENT_ID,sourceCommit:env.VERCEL_GIT_COMMIT_SHA,previewOrigin:'https://'+env.VERCEL_URL,schema:'advisory',bundleHash:MIGRATION_SHA256,mode:'synthetic-mock-only',migrationVerified:true,deploymentProtectionVerified:true,ownerApprovalReference:'Approved synthetic local-process hosted-database trial, not Vercel attestation',syntheticOwnerIds:c.accounts.map(a=>a.owner),issuedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+1200000).toISOString()};
 const payload=Buffer.from(JSON.stringify(approval)).toString('base64url'),grant=payload+'.'+sign(null,Buffer.from(payload),c.signingKey).toString('base64url');
 const ports=[];
 for(let i=0;i<2;i++){
  const child=fork(new URL('./fixtures/jane-hosted-instance.mjs',import.meta.url),[],{stdio:['ignore','ignore','ignore','ipc'],execArgv:[]});children.push(child);
  const ready=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('INSTANCE_START_FAILED')),10000);child.once('message',m=>{clearTimeout(timer);resolve(m);});child.send({env});});ports.push(ready.port);
 }
 pool=createPgTransaction({env});let next=0,ciphertextReads=0;const observed=new Set();
 const request=async({body,accessToken,csrf})=>{
  const port=ports[next++%2];observed.add(port);
  const response=await fetch('http://127.0.0.1:'+port,{method:'POST',headers:{'content-type':'application/json',origin:approval.previewOrigin,authorization:'Bearer '+accessToken,'x-advisory-preview-key':env.ADVISORY_PREVIEW_KEY,'x-advisory-trial-grant':grant,...(csrf?{'x-advisory-csrf':csrf}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  const value=await response.json();
  if(response.status===200&&value.session?.id){
   const account=c.accounts.find(a=>a.accessToken===accessToken);
   const result=await pool.transaction(async tx=>{await tx.query("select set_config('advisory.owner',$1,true)",[account.owner]);return tx.query('select state from advisory.consultations where id=$1',[value.session.id]);});
   if(result.rows.length){const state=result.rows[0].state;if(!state.encrypted||state.messages||JSON.stringify(state).includes('oak flooring'))throw Error('HOSTED_ENCRYPTION_FAILED');ciphertextReads++;}
  }
  return {status:response.status,body:value};
 };
 const result=await runHostedChecks({request,config:{accounts:c.accounts}});
 const denied=await pool.transaction(async tx=>{await tx.query("select set_config('advisory.owner',$1,true)",[randomUUID()]);return tx.query('select count(*)::int n from advisory.consultations');});
 if(denied.rows[0].n!==0||observed.size!==2||ciphertextReads===0)throw Error('HOSTED_ISOLATION_FAILED');
 await writeFile(process.argv[2],JSON.stringify({...result,classification:'REAL_HOSTED_AUTH_DATABASE_TWO_LOCAL_APPLICATION_PROCESSES',checkedAt:new Date().toISOString(),applicationInstances:children.map(c=>c.pid),tls:'CA and hostname verified',databaseRole:'advisory_runtime',ciphertextReads,limitations:['Application processes ran locally, not on Vercel.','Auth revocation, expiry and failover need their separate checks.']},null,2),{flag:'wx'});
 console.log(JSON.stringify({result:'PASS',checks:result.checks.length,instances:2,ciphertextReads}));
}catch{console.error('HOSTED_DATABASE_TRIAL_INCOMPLETE: check secure operator context and cleanup before continuing.');process.exitCode=1;}
finally{await pool?.close();for(const child of children){if(child.connected)child.send({action:'close'});setTimeout(()=>child.kill(),2000).unref();}}
