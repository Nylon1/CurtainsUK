import test from 'node:test';
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createSessionCipher} from '../session-cipher.mjs';
const waitFor=(child,type)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{child.off('message',listen);reject(Error('CHILD_TIMEOUT: '+type));},15000);
  const listen=m=>{if(m.type===type){clearTimeout(timer);child.off('message',listen);resolve(m);}};child.on('message',listen);
});
test('separate application processes share encrypted sessions, locks, recovery and rate limits', {timeout:60000},async()=>{
  const db=new PGlite(),children=[],owners=[randomUUID(),randomUUID()],previewKey=randomBytes(24).toString('hex');
  const config={type:'init',owners,authSession:randomUUID(),key:randomBytes(32).toString('base64'),previewKey};
  const start=async()=>{
    const child=fork(new URL('./fixtures/cloud-instance.mjs',import.meta.url),[],{stdio:['ignore','ignore','ignore','ipc'],execArgv:[]});children.push(child);
    child.on('message',async m=>{if(m.type!=='rpc')return;let value;try{value={data:(await db.query('select advisory.runtime($1,$2,$3) as value',[m.p.p_owner,m.p.p_action,m.p.p_payload])).rows[0].value};}catch(e){value={error:{message:e.message}};}if(child.connected)child.send({type:'rpc-result',id:m.id,value});});
    const ready=waitFor(child,'ready');child.send(config);return {...await ready,child};
  };
  const command=(action,session=null,extra={})=>({action,requestId:randomUUID(),sessionId:session?.id??null,revision:session?.revision??null,text:null,context:null,consent:false,recoveryToken:null,...extra});
  const request=async(instance,body,owner=owners[0])=>{const r=await fetch('http://127.0.0.1:'+instance.port,{method:'POST',headers:{origin:'https://local-test.example','content-type':'application/json','x-advisory-preview-key':previewKey,'x-advisory-csrf':'fixture-csrf',authorization:owner},body:JSON.stringify(body)});return {status:r.status,...await r.json()};};
  try{
    await db.exec("create role authenticated;create role anon;create role service_role bypassrls;create schema auth;create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;");
    for(const file of ['schema.review.sql','runtime.review.sql'])await db.exec(await readFile(new URL('../'+file,import.meta.url),'utf8'));
    const a=await start(),b=await start();assert.notEqual(a.pid,b.pid);
    let reply=await request(a,command('start',null,{consent:true}));assert.equal(reply.status,200);let session=reply.session;
    const message=command('message',session,{text:'Warm concurrent consultation with oak flooring'});
    const started=waitFor(a.child,'model-started'),inflight=request(a,message);await started;
    assert.equal((await request(b,command('message',session,{text:'A conflicting request'}))).status,409);
    a.child.send({type:'release-model'});reply=await inflight;assert.equal(reply.status,200);session=reply.session;
    assert.equal((await request(b,message)).replayed,true);
    assert.equal((await request(b,command('resume',session),owners[1])).status,404);
    const stored=(await db.query('select state from advisory.consultations where id=$1',[session.id])).rows[0].state;
    assert.ok(stored.encrypted);assert.doesNotMatch(JSON.stringify(stored),/oak flooring/);
    const saved=await request(a,command('save',session,{consent:true}));assert.equal(saved.status,200);
    a.child.kill();const restarted=await start();
    reply=await request(restarted,command('recover',null,{consent:true,recoveryToken:saved.recoveryToken}));assert.equal(reply.status,200);session=reply.session;assert.equal(session.messages.length,2);
    assert.equal((await request(b,command('recover',null,{consent:true,recoveryToken:saved.recoveryToken}))).status,404);
    // The two instances consume one shared owner limit, including pre-restart use.
    const responses=await Promise.all(Array.from({length:10},(_,i)=>request(i%2?b:restarted,command('resume',session))));
    assert.ok(responses.some(r=>r.status===429));assert.ok(responses.every(r=>[200,429].includes(r.status)||(r.status===409&&r.error==='CONSULTATION_BUSY')));
    const cipher=createSessionCipher({activeKeyId:'fixture',keys:{fixture:Buffer.from(config.key,'base64')}});
    const state=cipher.open((await db.query('select state from advisory.consultations where id=$1',[session.id])).rows[0].state);
    state.expiresAt=Date.now()-1000;
    await db.query('update advisory.consultations set state=$2,expires_at=to_timestamp($3::double precision/1000) where id=$1',[session.id,cipher.seal(state),state.expiresAt]);
    assert.equal((await db.query("select advisory.runtime($1,'get',$2) as value",[owners[0],{id:session.id}])).rows[0].value,null);
    await db.query("select advisory.runtime($1,'purgeExpired','{}')",[owners[0]]);
    assert.equal((await db.query('select count(*)::int n from advisory.consultations')).rows[0].n,0);
    await mkdir('artifacts/jane-completion',{recursive:true});await writeFile('artifacts/jane-completion/multi-instance.json',JSON.stringify({classification:'LOCAL_SEPARATE_NODE_PROCESSES_SHARED_PGLITE_NOT_HOSTED',instances:3,simultaneousInstances:2,checks:['encrypted-at-rest','lease-contention','idempotent-replay','foreign-owner-denied','process-restart-recovery','single-use-recovery','shared-rate-limit','expiry-and-purge'],result:'PASS'},null,2));
  }finally{for(const child of children)child.kill();await db.close();}
});
