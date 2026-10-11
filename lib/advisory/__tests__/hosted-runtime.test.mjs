import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomBytes,randomUUID,sign} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {createHostedRuntime} from '../hosted-runtime.mjs';
import {verifyTrialGrant,MIGRATION_SHA256} from '../trial-grant.mjs';
import {databaseConfig,createPgTransaction} from '../pg-transaction.mjs';
import {createPrivateAdvisoryRpc} from '../private-rpc.mjs';
import {runHostedChecks} from '../../../scripts/jane-hosted-check.mjs';
import {createTrialPassword,trialAccessSql,trialAccessRollback} from '../trial-access.mjs';

const ref='hqysjumypgeapgmqkcrx',project='prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA';
function fixture(){
 const {privateKey,publicKey}=generateKeyPairSync('ed25519'),owners=[randomUUID(),randomUUID()],authSession=randomUUID();
 const env={VERCEL_ENV:'preview',VERCEL_PROJECT_ID:project,VERCEL_DEPLOYMENT_ID:'dpl_syntheticTest',VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),VERCEL_URL:'jane-fixture.vercel.app',CURTAINSUK_ADVISORY_PREVIEW:'true',ADVISORY_PREVIEW_KEY:randomBytes(32).toString('hex'),ADVISORY_TEST_PROJECT_REF:ref,ADVISORY_TEST_SCHEMA:'advisory',ADVISORY_ACTIVE_DATA_KEY_ID:'fixture',ADVISORY_DATA_KEYS_JSON:JSON.stringify({fixture:randomBytes(32).toString('base64')}),ADVISORY_CSRF_KEY:randomBytes(32).toString('base64'),ADVISORY_TRIAL_PUBLIC_KEY:publicKey.export({type:'spki',format:'pem'})};
 const approval={version:1,projectRef:ref,vercelProjectId:project,deploymentId:env.VERCEL_DEPLOYMENT_ID,sourceCommit:env.VERCEL_GIT_COMMIT_SHA,previewOrigin:'https://'+env.VERCEL_URL,schema:'advisory',bundleHash:MIGRATION_SHA256,mode:'synthetic-mock-only',migrationVerified:true,deploymentProtectionVerified:true,ownerApprovalReference:'LOCAL_FIXTURE_ONLY',syntheticOwnerIds:owners,issuedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+600000).toISOString()};
 const mint=a=>{const b=Buffer.from(JSON.stringify(a)).toString('base64url');return b+'.'+sign(null,Buffer.from(b),privateKey).toString('base64url');};
 const request=(body,{owner=owners[0],csrf='',grant=mint(approval),origin=approval.previewOrigin,...overrides}={})=>new Request(approval.previewOrigin+'/api/advisory/consultation',{method:'POST',headers:{origin,'content-type':'application/json','x-advisory-preview-key':env.ADVISORY_PREVIEW_KEY,'x-advisory-trial-grant':grant,authorization:'Bearer '+owner,'x-advisory-csrf':csrf,...overrides},body:JSON.stringify(body)});
 return {env,approval,owners,authSession,mint,request};
}

test('trial grant requires signature, exact deployment/source and a maximum one-hour lifetime',()=>{
 const f=fixture();assert.equal(verifyTrialGrant(f.mint(f.approval),f.env).mode,'synthetic-mock-only');
 for(const delta of [{sourceCommit:'b'.repeat(40)},{deploymentId:'dpl_other'},{previewOrigin:'https://wrong.vercel.app'},{bundleHash:'b'.repeat(64)},{expiresAt:new Date(Date.now()-1).toISOString()},{expiresAt:new Date(Date.now()+7200000).toISOString()},{issuedAt:new Date(Date.now()+60000).toISOString()}])assert.throws(()=>verifyTrialGrant(f.mint({...f.approval,...delta}),f.env),/TRIAL_APPROVAL_REQUIRED/);
 for(const token of [null,'x'.repeat(7001),f.mint(f.approval)+'.extra',f.mint(f.approval).replace(/^./,'!'),fixture().mint(f.approval)])assert.throws(()=>verifyTrialGrant(token,f.env),/TRIAL_APPROVAL_REQUIRED/);
 for(const delta of [{VERCEL_ENV:'production'},{VERCEL_PROJECT_ID:'prj_other'},{VERCEL_GIT_COMMIT_SHA:'a'.repeat(41)},{VERCEL_URL:'jane-fixture.vercel.app/evil'}])assert.throws(()=>verifyTrialGrant(f.mint(f.approval),{...f.env,...delta}),/TRIAL_APPROVAL_REQUIRED/);
});

test('disabled production, invalid grant, origin and oversized body do no Auth/database work',async()=>{
 const f=fixture(),createResources=()=>assert.fail('No privileged resources permitted');
 const production=createHostedRuntime({env:{...f.env,VERCEL_ENV:'production'},createResources});assert.equal((await production.handle(f.request({action:'bootstrap'}))).status,404);
 const trial=createHostedRuntime({env:f.env,createResources});
 assert.equal((await trial.handle(f.request({action:'bootstrap'},{grant:'bad'}))).status,403);
 assert.equal((await trial.handle(f.request({action:'bootstrap'},{origin:'https://wrong.example'}))).status,403);
 assert.equal((await trial.handle(f.request({text:'x'.repeat(16001)}))).status,413);
});

test('wired runtime verifies owners, bootstraps CSRF and shares encrypted recovery across two instances', {timeout:60000},async()=>{
 const f=fixture(),db=new PGlite();let revoked=false,authUnavailable=false;
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
  await db.exec(await readFile(new URL('../../../supabase/migrations/20261011142747_jane_isolated_advisory.sql',import.meta.url),'utf8'));
  const rpc=createPrivateAdvisoryRpc({projectRef:ref,transaction:fn=>db.transaction(async tx=>{await tx.exec('set local role advisory_runtime');return fn(tx);})});
  const auth={projectRef:ref,verification:'supabase-auth-api-v1',getUser:async owner=>{if(authUnavailable)throw Error('private transport details');return revoked?{error:{message:'revoked'}}:{data:{user:{id:owner}}};},getClaims:async owner=>({data:{claims:{sub:owner,iss:'https://'+ref+'.supabase.co/auth/v1',aud:'authenticated',role:'authenticated',exp:Date.now()/1000+300,session_id:f.authSession}}})};
  const resources=()=>({auth,rpc,catalogue:{}}),a=createHostedRuntime({env:f.env,createResources:resources}),b=createHostedRuntime({env:f.env,createResources:resources});
  const call=async(instance,body,options)=>{const r=await instance.handle(f.request(body,options));return {status:r.status,...await r.json()};};
  assert.equal((await call(a,{action:'bootstrap'},{owner:randomUUID()})).status,403);
  const bootstrap=await call(a,{action:'bootstrap'});assert.equal(bootstrap.status,200);const csrf=bootstrap.csrf;
  const command=(action,s=null,extra={})=>({action,requestId:randomUUID(),sessionId:s?.id??null,revision:s?.revision??null,text:null,context:null,consent:false,recoveryToken:null,...extra});
  assert.equal((await call(a,command('start',null,{consent:true}))).status,403);
  assert.equal((await call(a,command('start'),{csrf})).status,403);
  let reply=await call(a,command('start',null,{consent:true}),{csrf});assert.equal(reply.status,200);let session=reply.session;
  const saved=await call(a,command('save',session,{consent:true}),{csrf});assert.equal(saved.status,200);
  const foreign=await call(b,{action:'bootstrap'},{owner:f.owners[1]});
  assert.equal((await call(b,command('resume',saved.session),{csrf:foreign.csrf,owner:f.owners[1]})).status,404);
  reply=await call(b,command('recover',null,{consent:true,recoveryToken:saved.recoveryToken}),{csrf});assert.equal(reply.status,200);session=reply.session;
  assert.equal((await call(a,command('recover',null,{consent:true,recoveryToken:saved.recoveryToken}),{csrf})).status,404);
  const stored=(await db.query('select state from advisory.consultations')).rows[0].state;assert.ok(stored.encrypted);assert.equal(stored.messages,undefined);
  revoked=true;assert.equal((await call(b,command('resume',session),{csrf})).status,401);revoked=false;authUnavailable=true;
  const failed=await call(b,command('resume',session),{csrf});assert.equal(failed.status,401);assert.doesNotMatch(JSON.stringify(failed),/private transport/);authUnavailable=false;
  assert.equal((await call(b,command('delete',session),{csrf})).status,200);
  assert.equal((await db.query('select count(*)::int n from advisory.consultations')).rows[0].n,0);
 }finally{await db.close();}
});

test('hosted protocol rehearsal uses the wired HTTP runtime and removes synthetic consultations', {timeout:60000},async()=>{
 const f=fixture(),db=new PGlite();
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
  await db.exec(await readFile(new URL('../../../supabase/migrations/20261011142747_jane_isolated_advisory.sql',import.meta.url),'utf8'));
  const rpc=createPrivateAdvisoryRpc({projectRef:ref,transaction:fn=>db.transaction(async tx=>{await tx.exec('set local role advisory_runtime');return fn(tx);})});
  const auth={projectRef:ref,verification:'supabase-auth-api-v1',getUser:async owner=>({data:{user:{id:owner}}}),getClaims:async owner=>({data:{claims:{sub:owner,iss:'https://'+ref+'.supabase.co/auth/v1',aud:'authenticated',role:'authenticated',exp:Date.now()/1000+300,session_id:f.authSession}}})};
  const runtimes=[0,1].map(()=>createHostedRuntime({env:f.env,createResources:()=>({auth,rpc,catalogue:{}})}));let at=0;
  const request=async({body,accessToken,csrf})=>{const response=await runtimes[at++%2].handle(f.request(body,{owner:accessToken,csrf}));return {status:response.status,body:await response.json()};};
  const result=await runHostedChecks({request,config:{accounts:f.owners.map(owner=>({owner,accessToken:owner}))}});
  assert.equal(result.result,'PASS');assert.equal(result.checks.length,14);
  assert.equal((await db.query('select count(*)::int n from advisory.consultations')).rows[0].n,0);
 }finally{await db.close();}
});

const databaseEnv=()=>({ADVISORY_TEST_PROJECT_REF:ref,ADVISORY_DB_HOST:'db.'+ref+'.supabase.co',ADVISORY_DB_PORT:'5432',ADVISORY_DB_LOGIN:'advisory_trial_01234567',ADVISORY_DB_PASSWORD:randomBytes(32).toString('hex')});
test('temporary connection grant has no inherited access, expires, and rolls back without changing private roles',async()=>{
 const db=new PGlite(),role='advisory_trial_01234567',secret=createTrialPassword();
 try{
  await db.exec('create role postgres_operator createrole nosuperuser;set role postgres_operator;create role advisory_runtime nologin noinherit;');
  const sql=trialAccessSql({role,verifier:secret.verifier,expiresAt:new Date(Date.now()+3600000).toISOString()});
  assert.ok(!sql.includes(secret.password));await db.exec(sql);
  const r=(await db.query('select rolcanlogin,rolinherit,rolbypassrls,rolsuper,rolcreaterole,rolcreatedb,rolconnlimit from pg_roles where rolname=$1',[role])).rows[0];
  assert.deepEqual(r,{rolcanlogin:true,rolinherit:false,rolbypassrls:false,rolsuper:false,rolcreaterole:false,rolcreatedb:false,rolconnlimit:4});
  const membership=(await db.query('select a.admin_option,a.inherit_option,a.set_option from pg_auth_members a join pg_roles r on r.oid=a.roleid join pg_roles m on m.oid=a.member where r.rolname=$1 and m.rolname=$2',['advisory_runtime',role])).rows[0];
  assert.deepEqual(membership,{admin_option:false,inherit_option:false,set_option:true});
  await assert.rejects(db.exec(sql),/already exists/);await db.exec('rollback');
  await db.exec(trialAccessRollback(role));assert.equal((await db.query('select count(*)::int n from pg_roles where rolname=$1',[role])).rows[0].n,0);
  assert.equal((await db.query("select rolcanlogin from pg_roles where rolname='advisory_runtime'")).rows[0].rolcanlogin,false);
 }finally{await db.close();}
});
test('database pool configuration refuses privileged roles, alternate projects and TLS overrides',()=>{
 const env=databaseEnv(),config=databaseConfig(env);assert.equal(config.ssl.rejectUnauthorized,true);assert.equal(config.max,2);assert.equal(config.query_timeout,5000);
 for(const delta of [{ADVISORY_DB_HOST:'evil.example'},{ADVISORY_DB_LOGIN:'postgres'},{ADVISORY_DB_LOGIN:'advisory_runtime'},{ADVISORY_DB_PORT:'443'},{ADVISORY_TEST_PROJECT_REF:'other'},{ADVISORY_DB_PASSWORD:'short'}])assert.throws(()=>databaseConfig({...env,...delta}),/DATABASE_CONFIGURATION_REQUIRED/);
 const pooler=databaseConfig({...env,ADVISORY_DB_HOST:'aws-0-eu-central-1.pooler.supabase.com',ADVISORY_DB_PORT:'6543'});assert.equal(pooler.user,env.ADVISORY_DB_LOGIN+'.'+ref);assert.equal(pooler.ssl.servername,pooler.host);
});

test('transaction owns one connection, resets role locally, discards failures and never retries writes',async()=>{
 const env=databaseEnv();
 for(const failure of [null,'begin','identity','callback','commit','rollback']){
  const calls=[];let release,connects=0;
  class Pool{on(){} async connect(){connects++;return {query:async sql=>{calls.push(sql);if(sql===failure||(failure==='rollback'&&['commit','rollback'].includes(sql)))throw Error('credential should not escape');if(sql.startsWith('select session_user'))return {rows:[{login:env.ADVISORY_DB_LOGIN,role:env.ADVISORY_DB_LOGIN,owner:failure==='identity'?'stale-owner':null}]};return {rows:[]};},release:discard=>{release=discard;}};}async end(){}}
  const adapter=createPgTransaction({env,Pool});
  const run=()=>adapter.transaction(async()=>{if(failure==='callback')throw Error('sensitive SQL');return 42;});
  if(failure){await assert.rejects(run(),/^Error: STORAGE_UNAVAILABLE$/);assert.equal(release,true);assert.equal(calls.at(-1),'rollback');}
  else{assert.equal(await run(),42);assert.equal(release,false);assert.equal(calls.at(-1),'commit');assert.ok(calls.includes('set local role advisory_runtime'));}
  assert.equal(connects,1);await adapter.close();
 }
});
