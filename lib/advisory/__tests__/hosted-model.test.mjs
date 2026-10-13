import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createHostedModelTrial} from '../hosted-model.mjs';
import {createPrivateAdvisoryRpc,createPrivateAdvisoryKnowledgeSearch} from '../private-rpc.mjs';
import {createSessionCipher} from '../session-cipher.mjs';
import {CloudSessionStore} from '../cloud-store.mjs';
import {createCatalogue} from '../catalogue.mjs';

const ref='hqysjumypgeapgmqkcrx',origin='https://jane-review.example';
const command=(action,session=null,extra={})=>({requestId:randomUUID(),sessionId:session?.id??null,revision:session?.revision??null,action,text:null,context:null,consent:false,recoveryToken:null,...extra});

test('protected model chat saves real turns, budgets usage and rejects another owner', {timeout:60000},async()=>{
  const db=new PGlite(),owner=randomUUID(),other=randomUUID(),authSession=randomUUID(),runId=randomUUID();
  try{
    await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
    await db.exec(await readFile(new URL('../../../supabase/migrations/20261011142747_jane_isolated_advisory.sql',import.meta.url),'utf8'));
    await db.query("insert into advisory.evaluation_runs(id,enabled,limit_micro,expires_at) values($1,true,1000000,clock_timestamp()+interval '1 hour')",[runId]);
    const transaction=fn=>db.transaction(async tx=>{await tx.exec('set local role advisory_runtime');return fn(tx);});
    const rpc=createPrivateAdvisoryRpc({projectRef:ref,transaction});
    const auth={projectRef:ref,verification:'supabase-auth-api-v1',getUser:async token=>({data:{user:{id:token}}}),getClaims:async token=>({data:{claims:{sub:token,iss:'https://'+ref+'.supabase.co/auth/v1',aud:'authenticated',role:'authenticated',exp:Date.now()/1000+300,session_id:authSession}}})};
    const dataKey=randomBytes(32),csrfKey=randomBytes(32),env={VERCEL_ENV:'preview',CURTAINSUK_ADVISORY_PREVIEW:'true',ADVISORY_PREVIEW_KEY:'p'.repeat(32),ADVISORY_TEST_PROJECT_REF:ref,ADVISORY_TEST_SCHEMA:'advisory',ADVISORY_TEST_ORIGIN:origin,ADVISORY_TEST_DEPLOYMENT_ID:'dpl_fixture',ADVISORY_ACTIVE_DATA_KEY_ID:'test',ADVISORY_DATA_KEYS_JSON:JSON.stringify({test:dataKey.toString('base64')}),ADVISORY_CSRF_KEY:csrfKey.toString('base64'),ADVISORY_MODEL_PREVIEW:'true',ADVISORY_OPENAI_API_KEY:'sk-fixture-not-a-real-key'};
    const approval={projectRef:ref,schema:'advisory',bundleHash:'a'.repeat(64),mode:'synthetic-openai-only',migrationVerified:true,ownerApprovalReference:'LOCAL_TEST_ONLY',paidTestingApprovalReference:'LOCAL_FIXTURE_ONLY',syntheticOwnerIds:[owner,other],expiresAt:new Date(Date.now()+60000).toISOString(),deploymentProtectionVerified:true,vercelProjectId:'prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA',deploymentId:'dpl_fixture',previewOrigin:origin,evaluationRunId:runId};
    const providerFactory=({budget})=>({kind:'openai',respond:async()=>{const hold=await budget.reserve(.01);await budget.settle(hold,.005);return {text:'I hear you. A warm, quiet texture could soften the room. Does that feel closer to what you want?',stage:'investigate',palette:['warm ivory'],patternDirection:'restrained',textureDirection:'matte woven',alternatives:[],questions:[],nextSteps:[],evidenceIds:[],fabricIds:[]};}});
    const catalogue={lookup:async()=>[],identities:async()=>[],descriptive:async()=>({fabrics:[],coverage:{complete:false}}),retail:async()=>[]};
    assert.throws(()=>createHostedModelTrial({env,approval:{...approval,paidTestingApprovalReference:''},bundleHash:approval.bundleHash,auth,readAccessToken:()=>owner,rpc,catalogue,providerFactory}),/MODEL_NOT_ACTIVATED/);
    assert.throws(()=>createHostedModelTrial({env:{...env,ADVISORY_OPENAI_API_KEY:undefined},approval,bundleHash:approval.bundleHash,auth,readAccessToken:()=>owner,rpc,catalogue,providerFactory}),/MODEL_NOT_ACTIVATED/);
    const handler=createHostedModelTrial({env,approval,bundleHash:approval.bundleHash,auth,readAccessToken:req=>req.headers.get('authorization')?.slice(7),rpc,catalogue,providerFactory});
    const csrf=createHmac('sha256',csrfKey).update(owner+':'+authSession).digest('base64url');
    const call=async(body,who=owner,csrfValue=csrf)=>{const response=await handler(new Request(origin+'/api/advisory/consultation',{method:'POST',headers:{origin,'content-type':'application/json',authorization:'Bearer '+who,'x-advisory-preview-key':env.ADVISORY_PREVIEW_KEY,'x-advisory-csrf':csrfValue},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()};};
    const started=await call(command('start',null,{consent:true}));assert.equal(started.status,200);
    const session=started.body.session;assert.equal(session.provider,'openai');
    const sent=await call(command('message',session,{text:'My living room feels too cold.'}));assert.equal(sent.status,200);assert.equal(sent.body.session.messages.length,2);
    assert.match(sent.body.session.messages[1].text,/warm, quiet texture/);
    const otherCsrf=createHmac('sha256',csrfKey).update(other+':'+authSession).digest('base64url');
    assert.equal((await call(command('resume',sent.body.session),other,otherCsrf)).status,404);
    const ciphertext=(await db.query('select state from advisory.consultations where id=$1',[session.id])).rows[0].state;
    assert.ok(ciphertext.encrypted);assert.doesNotMatch(JSON.stringify(ciphertext),/living room|quiet texture/);
    assert.equal((await db.query('select used_micro from advisory.evaluation_runs where id=$1',[runId])).rows[0].used_micro,5000);
    assert.equal((await call(command('delete',sent.body.session))).status,200);
    assert.equal((await db.query('select count(*)::int n from advisory.consultations')).rows[0].n,0);
    const cipher=createSessionCipher({activeKeyId:'test',keys:{test:dataKey}});
    const store=new CloudSessionStore({rpc,ownerId:owner,cipher});assert.equal(typeof store.budget,'function');
  }finally{await db.close();}
});

test('bounded hosted search uses only the reviewed function and validated terms',async()=>{
  const seen=[];const search=createPrivateAdvisoryKnowledgeSearch({projectRef:ref,transaction:fn=>fn({query:async(sql,params)=>{seen.push({sql,params});return sql.includes('current_user')?{rows:[{role:'advisory_runtime'}]}:{rows:[{fabric_id:'pt-3697-770'}]};}})});
  const result=await search.search({query:'warm woven',colour:'ivory',pattern:'',texture:'matte',composition:''});
  assert.deepEqual(result.ids,['pt-3697-770']);assert.equal(seen.length,2);assert.match(seen[1].sql,/advisory\.knowledge_search/);assert.match(seen[1].sql,/ts_rank_cd/);
  await assert.rejects(search.search({query:'x',colour:'',pattern:'',texture:'',composition:''}),/INVALID_INPUT/);
});

test('server-only Supabase secret is sent as apikey, never a fake bearer JWT',async()=>{
  let reads=0;
  const catalogue=createCatalogue({url:'https://'+ref+'.supabase.co',key:'sb_secret_fixture123',fetchImpl:async(_url,init)=>{
    reads++;assert.equal(init.headers.apikey,'sb_secret_fixture123');assert.equal(init.headers.Authorization,undefined);
    return Response.json([]);
  }});
  assert.deepEqual(await catalogue.lookup(['pt-3697-770']),[]);
  assert.equal(reads,3);
});
