// Final synthetic checks against existing hosted Auth/Postgres. No model calls.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {readPrivateFile} from './jane-private-file.mjs';
import {createPgTransaction} from '../lib/advisory/pg-transaction.mjs';
import {createPrivateAdvisoryRpc} from '../lib/advisory/private-rpc.mjs';
import {createSessionCipher} from '../lib/advisory/session-cipher.mjs';
import {CloudSessionStore,verifyCloudPrincipal} from '../lib/advisory/cloud-store.mjs';
import {createServerAuth} from '../lib/advisory/auth-session.mjs';
import {createConsultationService} from '../lib/advisory/service.mjs';
import {createMockProvider} from '../lib/advisory/mock-provider.mjs';
const c=await readPrivateFile(process.env.ADVISORY_PRIVATE_TRIAL_PATH),pools=[];let created;
const checks=[];
try{
 const cipher=createSessionCipher({activeKeyId:c.env.ADVISORY_ACTIVE_DATA_KEY_ID,keys:Object.fromEntries(Object.entries(JSON.parse(c.env.ADVISORY_DATA_KEYS_JSON)).map(([k,v])=>[k,Buffer.from(v,'base64')]))});
 const stores=[0,1].map(()=>{const pool=createPgTransaction({env:c.env});pools.push(pool);const rpc=createPrivateAdvisoryRpc({...pool,projectRef:c.projectRef});return new CloudSessionStore({ownerId:c.accounts[0].owner,cipher,rpc});});
 const permissions=await pools[0].transaction(tx=>tx.query("select current_user as role,has_schema_privilege(current_user,'auth','USAGE') as auth_usage,has_schema_privilege(current_user,'curtainsuk_private','USAGE') as catalogue_usage,pg_has_role(session_user,'advisory_indexer','MEMBER') as indexer_membership,pg_has_role(session_user,'advisory_retention','MEMBER') as retention_membership"));
 assert.deepEqual(permissions.rows[0],{role:'advisory_runtime',auth_usage:false,catalogue_usage:false,indexer_membership:false,retention_membership:false});checks.push('hosted restricted role and no Auth/catalogue/indexer/retention privilege');
 const service=createConsultationService({store:stores[0],provider:createMockProvider(),catalogue:{}});
 const started=await service.execute(c.accounts[0].owner,{action:'start',requestId:randomUUID(),sessionId:null,revision:null,text:null,context:null,consent:true,recoveryToken:null});created=started.session.id;
 const state=await stores[0].get(created),expected=state.revision;state.revision++;state.expiresAt=Date.now()+5000;
 await stores[0].locked(created,()=>stores[0].commit(state,expected));
 await new Promise(resolve=>setTimeout(resolve,6000));assert.equal(await stores[1].get(created),null);await stores[1].purgeExpired();
 const remaining=await pools[0].transaction(async tx=>{await tx.query("select set_config('advisory.owner',$1,true)",[c.accounts[0].owner]);return tx.query('select count(*)::int n from advisory.consultations where id=$1',[created]);});assert.equal(remaining.rows[0].n,0);created=null;checks.push('hosted expiry denial and bounded owner purge');
 const limits=await Promise.allSettled(Array.from({length:13},(_,i)=>stores[i%2].take()));assert.ok(limits.some(x=>x.status==='rejected'&&x.reason.code==='RATE_LIMITED'));assert.ok(limits.filter(x=>x.status==='fulfilled').length<=12);checks.push('distributed rate ceiling across independent pools');
 if(process.env.ADVISORY_SYNTHETIC_BUDGET_RUN){
  const run=process.env.ADVISORY_SYNTHETIC_BUDGET_RUN,session=randomUUID(),budgets=stores.map(s=>s.budget(run,session));
  const reservations=await Promise.allSettled(budgets.map(b=>b.reserve(0.02)));assert.equal(reservations.filter(x=>x.status==='fulfilled').length,1);assert.equal(reservations.filter(x=>x.status==='rejected'&&x.reason.code==='BUDGET_EXHAUSTED').length,1);
  const winner=reservations.find(x=>x.status==='fulfilled').value;await budgets[1].settle(winner,null);await assert.rejects(budgets[0].reserve(0.001),/BUDGET_EXHAUSTED/);await assert.rejects(budgets[0].settle(winner,0),/INVALID_BUDGET_RECEIPT/);checks.push('hosted concurrent spend ceiling, ambiguous charge retained, duplicate settlement denied; simulated ledger only');
 }
 const account=c.accounts[1],auth=createServerAuth({projectRef:c.projectRef,publishableKey:c.env.ADVISORY_AUTH_PUBLISHABLE_KEY}),issuer='https://'+c.projectRef+'.supabase.co/auth/v1';
 await verifyCloudPrincipal({token:account.accessToken,auth,issuer});
 const client=createClient('https://'+c.projectRef+'.supabase.co',c.env.ADVISORY_AUTH_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const set=await client.auth.setSession({access_token:account.accessToken,refresh_token:account.refreshToken});assert.equal(set.error,null);
 const signedOut=await client.auth.signOut({scope:'local'});assert.equal(signedOut.error,null);
 await assert.rejects(verifyCloudPrincipal({token:account.accessToken,auth,issuer}),/UNAUTHORISED/);checks.push('real Auth sign-out rejects still-unexpired signed token');
 await writeFile(process.argv[2],JSON.stringify({classification:'HOSTED_AUTH_AND_DATABASE_BOUNDARIES',checkedAt:new Date().toISOString(),checks,permissions:permissions.rows[0],rateAccepted:limits.filter(x=>x.status==='fulfilled').length,result:'PASS',paidCalls:0},null,2),{flag:'wx'});
 console.log(JSON.stringify({result:'PASS',checks:checks.length}));
}catch(error){console.error(JSON.stringify({result:'HOSTED_BOUNDARY_CHECKS_INCOMPLETE',completed:checks,code:error.code??'CHECK_FAILED',check:error.code==='ERR_ASSERTION'?error.message.split('\n')[0]:undefined}));process.exitCode=1;}
finally{if(created&&pools[0]){const rpc=createPrivateAdvisoryRpc({...pools[0],projectRef:c.projectRef});const store=new CloudSessionStore({ownerId:c.accounts[0].owner,rpc});await store.locked(created,()=>store.remove(created)).catch(()=>{});}for(const pool of pools)await pool.close();}
