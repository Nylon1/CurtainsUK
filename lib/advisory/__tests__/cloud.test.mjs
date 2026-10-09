import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import {createSessionCipher} from '../session-cipher.mjs';
import {PGlite} from '@electric-sql/pglite';
import {CloudSessionStore,verifyCloudPrincipal} from '../cloud-store.mjs';
import {createConsultationService} from '../service.mjs';
import {createMockProvider} from '../mock-provider.mjs';
import {createCloudConsultationHandler} from '../cloud-handler.mjs';
const code=c=>e=>e.code===c;
const command=(action,session=null,extra={})=>({action,requestId:randomUUID(),sessionId:session?.id??null,revision:session?.revision??null,text:null,context:null,consent:false,recoveryToken:null,...extra});
const catalogue={lookup:async()=>[],identities:async()=>[],retail:async()=>[]};
const cipher=createSessionCipher({activeKeyId:'test-key',keys:{'test-key':randomBytes(32)}});
async function database(){
  const db=new PGlite();
  await db.exec("create role authenticated;create role anon;create role service_role bypassrls;create schema auth;create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;");
  for(const file of ['schema.review.sql','runtime.review.sql'])await db.exec(await readFile(new URL('../'+file,import.meta.url),'utf8'));
  return db;
}
function store(db,owner){return new CloudSessionStore({ownerId:owner,cipher,rpc:async({p_owner,p_action,p_payload})=>{
  try{return {data:(await db.query('select advisory.runtime($1,$2,$3) as value',[p_owner,p_action,p_payload])).rows[0].value,error:null};}
  catch(error){return {data:null,error};}
}});}
test('cloud RPC persistence: consent, durable creation replay, recovery, ownership, revision and deletion',async()=>{
  const db=await database(),owner=randomUUID(),other=randomUUID();
  const a=store(db,owner),b=store(db,owner),foreign=store(db,other);
  const service=s=>createConsultationService({store:s,provider:createMockProvider(),catalogue});
  try{
    await db.exec('set role service_role');
    await assert.rejects(service(a).execute(owner,command('start')),code('CONSENT_REQUIRED'));
    const start=command('start',null,{consent:true});let {session}=await service(a).execute(owner,start);
    assert.equal((await service(b).execute(owner,start)).session.id,session.id);
    assert.equal(await foreign.get(session.id),null);
    const message=command('message',session,{text:'Warm contemporary living room with oak flooring.'});
    session=(await service(b).execute(owner,message)).session;
    assert.equal((await service(a).execute(owner,message)).replayed,true);
    assert.equal(session.messages.length,2);
    const encrypted=(await db.query('select state from advisory.consultations where id=$1',[session.id])).rows[0].state;
    assert.ok(encrypted.encrypted);assert.doesNotMatch(JSON.stringify(encrypted),/oak flooring|messages|recoveryHash|consentEvents/);
    const saved=await service(a).execute(owner,command('save',session,{consent:true}));
    await assert.rejects(service(foreign).execute(other,command('recover',null,{consent:true,recoveryToken:saved.recoveryToken})),code('SESSION_NOT_FOUND'));
    const recovered=await service(b).execute(owner,command('recover',null,{consent:true,recoveryToken:saved.recoveryToken}));
    assert.equal(recovered.recovered,true);assert.equal(recovered.session.messages.length,2);
    await assert.rejects(service(a).execute(owner,command('recover',null,{consent:true,recoveryToken:saved.recoveryToken})),code('SESSION_NOT_FOUND'));
    await service(b).execute(owner,command('delete',recovered.session));
    assert.equal(await a.get(session.id),null);
    await db.exec('reset role;set role authenticated');
    await assert.rejects(db.query('select * from advisory.consultations'),/permission denied/);
    await assert.rejects(db.query("select advisory.runtime($1,'get',$2)",[owner,{id:session.id}]),/permission denied/);
    await db.exec('reset role;set role anon');
    await assert.rejects(db.query('select * from advisory.evaluation_runs'),/permission denied/);
  }finally{await db.close();}
});
test('two workers: lease contention, expired lease fencing, CAS and released lease recovery',async()=>{
  const db=await database(),owner=randomUUID(),a=store(db,owner),b=store(db,owner);
  try{
    const create=createConsultationService({store:a,provider:createMockProvider(),catalogue});
    const {session}=await create.execute(owner,command('start',null,{consent:true}));
    let resumed;
    await a.locked(session.id,async()=>{
      await assert.rejects(b.locked(session.id,async()=>{}),code('CONSULTATION_BUSY'));
      const stale=await a.get(session.id);
      await db.query("update advisory.leases set expires_at=clock_timestamp()-interval '1 second' where owner_id=$1 and resource=$2",[owner,session.id]);
      await b.locked(session.id,async()=>{const fresh=await b.get(session.id);fresh.revision++;await b.commit(fresh,0);await assert.rejects(a.commit({...stale,revision:1},0),code('LEASE_LOST'));});
      stale.revision++;await assert.rejects(a.commit(stale,0),code('LEASE_LOST'));
    });
    await b.locked(session.id,async()=>{resumed=await b.get(session.id);assert.equal(resumed.revision,1);await assert.rejects(b.commit({...resumed,revision:2},0),code('REVISION_CONFLICT'));});
    assert.equal((await a.get(session.id)).revision,1);
  }finally{await db.close();}
});
test('distributed rate and durable spend limits: no reset on new worker, concurrent hard cap, ambiguous failures charged',async()=>{
  const db=await database(),owner=randomUUID(),a=store(db,owner),b=store(db,owner),run=randomUUID(),session=randomUUID();
  try{
    const results=await Promise.allSettled(Array.from({length:15},(_,i)=>(i%2?a:b).take()));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,12);
    assert.ok(results.filter(r=>r.status==='rejected').every(r=>r.reason.code==='RATE_LIMITED'));
    await db.query("insert into advisory.evaluation_runs(id,enabled,limit_micro,expires_at) values($1,true,1000000,clock_timestamp()+interval '1 hour')",[run]);
    const ba=a.budget(run,session),bb=b.budget(run,session);
    const reserves=await Promise.allSettled([ba.reserve(.6),bb.reserve(.6)]);
    assert.equal(reserves.filter(r=>r.status==='fulfilled').length,1);
    const receipt=reserves.find(r=>r.status==='fulfilled').value;
    await bb.settle(receipt,null); // uncertainty retains the complete reservation
    assert.equal((await db.query('select used_micro from advisory.evaluation_runs where id=$1',[run])).rows[0].used_micro,600000);
    await assert.rejects(ba.settle(receipt,0),code('INVALID_BUDGET_RECEIPT'));
    const last=await bb.reserve(.4);await bb.settle(last,.2);
    assert.equal((await db.query('select used_micro from advisory.evaluation_runs where id=$1',[run])).rows[0].used_micro,800000);
    await assert.rejects(store(db,owner).budget(run,session).reserve(.3),code('BUDGET_EXHAUSTED'));
    await assert.rejects(b.budget(run,randomUUID()).reserve(.3),code('BUDGET_EXHAUSTED')); // shared run cap, different consultation
    await assert.rejects(a.budget(randomUUID(),session).reserve(.01),code('BUDGET_EXHAUSTED'));
    await db.query("update advisory.evaluation_runs set expires_at=clock_timestamp()-interval '1 second' where id=$1",[run]);
    await assert.rejects(ba.reserve(.01),code('BUDGET_EXHAUSTED'));
  }finally{await db.close();}
});
test('verified cloud principals reject revoked, anonymous, forged owner and wrong issuer tokens',async()=>{
  const owner=randomUUID(),session=randomUUID(),issuer='https://test.supabase.co/auth/v1';
  const claims={sub:owner,role:'authenticated',session_id:session,iss:issuer,exp:Math.floor(Date.now()/1000)+60};
  const auth={getUser:async()=>({data:{user:{id:owner,is_anonymous:false,user_metadata:{owner:randomUUID()}}}}),getClaims:async()=>({data:{claims}})};
  const args={token:'signed-test-token',auth,issuer,sessionActive:async(u,s)=>u===owner&&s===session};
  assert.equal((await verifyCloudPrincipal(args)).owner,owner);
  await assert.rejects(verifyCloudPrincipal({...args,sessionActive:async()=>false}),code('UNAUTHORISED'));
  await assert.rejects(verifyCloudPrincipal({...args,issuer:'https://attacker.example'}),code('UNAUTHORISED'));
  await assert.rejects(verifyCloudPrincipal({...args,auth:{...auth,getUser:async()=>({data:{user:{id:owner,is_anonymous:true}}})}}),code('UNAUTHORISED'));
  await assert.rejects(verifyCloudPrincipal({...args,auth:{...auth,getClaims:async()=>({error:{message:'bad signature'}})}}),code('UNAUTHORISED'));
});
test('protected HTTP composition uses verified principal, consent and awaited distributed limits',async()=>{
  const db=await database(),owner=randomUUID(),sessionId=randomUUID(),issuer='https://test.supabase.co/auth/v1',previewKey='k'.repeat(32);
  try{
    const baseStore=store(db,owner);
    const options={cipher,env:{VERCEL_ENV:'preview',CURTAINSUK_ADVISORY_PREVIEW:'true',ADVISORY_PREVIEW_KEY:previewKey},origin:'https://preview.example',issuer,
      auth:{getUser:async()=>({data:{user:{id:owner}}}),getClaims:async()=>({data:{claims:{sub:owner,role:'authenticated',session_id:sessionId,iss:issuer,exp:Date.now()/1000+60}}})},
      sessionActive:async()=>true,readAccessToken:async()=> 'verified-test',csrfForSession:async()=> 'csrf-test',rpc:baseStore.rpc,catalogue,providerForSession:async()=>createMockProvider()};
    const request=(command,key=previewKey)=>new Request('https://preview.example/api',{method:'POST',headers:{origin:options.origin,'content-type':'application/json','x-advisory-preview-key':key,'x-advisory-csrf':'csrf-test'},body:JSON.stringify(command)});
    const handler=createCloudConsultationHandler(options);
    assert.equal((await handler(request(command('start',null,{consent:true}),'wrong'))).status,404);
    assert.equal((await createCloudConsultationHandler({...options,env:{...options.env,VERCEL_ENV:'production'}})(request(command('start',null,{consent:true})))).status,404);
    const r=await handler(request(command('start',null,{consent:true})));assert.equal(r.status,200);const {session}=await r.json();
    const reply=await handler(request(command('message',session,{text:'Warm contemporary curtains with oak flooring'})));assert.equal(reply.status,200);assert.equal((await reply.json()).session.messages.length,2);
    for(let i=0;i<10;i++)assert.equal((await handler(request(command('resume',session)))).status,200);
    assert.equal((await handler(request(command('resume',session)))).status,429);
    assert.equal((await createCloudConsultationHandler({...options,sessionActive:async()=>false})(request(command('resume',session)))).status,401);
  }finally{await db.close();}
});
