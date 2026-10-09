import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {createSessionCipher} from '../session-cipher.mjs';
import {createContextHandoff} from '../context-handoff.mjs';
import {customerLanguage} from '../customer-language.mjs';
import {CloudSessionStore} from '../cloud-store.mjs';
import {createCatalogue,safeKnowledge} from '../catalogue.mjs';
import {indexTerms} from '../knowledge-search.mjs';
import {hostedTestConfig,createHostedMockTrial} from '../hosted-test.mjs';
import {requireFreshEvaluationApproval,EVALUATION_VERSION,completionCases} from '../evaluation-v2.mjs';
import {JANE_VERSION,janeInstructions} from '../profiles.mjs';

test('new evaluation requires fresh approval for this profile and suite before credentials or network',()=>{
  const a={approved:true,ownerApprovalReference:'invented-test-only',runId:randomUUID(),model:'gpt-6.1-sol',maxUsd:5,purpose:'invented-jane-evaluation',expiresAt:new Date(Date.now()+60000).toISOString()};
  assert.throws(()=>requireFreshEvaluationApproval(a),/NEW_OWNER_BUDGET_APPROVAL_REQUIRED/);
  assert.equal(requireFreshEvaluationApproval({...a,profileVersion:JANE_VERSION,suiteVersion:EVALUATION_VERSION}).maxUsd,5);
  assert.throws(()=>requireFreshEvaluationApproval({...a,profileVersion:JANE_VERSION,suiteVersion:EVALUATION_VERSION,maxUsd:6}),/NEW_OWNER_BUDGET_APPROVAL_REQUIRED/);
  assert.equal(completionCases.length,16);assert.equal(new Set(completionCases.map(c=>c.id)).size,16);
  assert.match(janeInstructions,/40–90 words/);assert.match(janeInstructions,/Do not use em dashes/);
});

test('hosted composition rejects production, unapproved project, missing encryption and cross-project clients',()=>{
  const ref='abcdefghijklmnopqrst',env={VERCEL_ENV:'preview',CURTAINSUK_ADVISORY_PREVIEW:'true',ADVISORY_TEST_PROJECT_REF:ref,ADVISORY_APPROVED_TEST_PROJECT_REF:ref,ADVISORY_TEST_ORIGIN:'https://preview.example',ADVISORY_DATA_KEY:randomBytes(32).toString('base64'),ADVISORY_CSRF_KEY:randomBytes(32).toString('base64')};
  assert.equal(hostedTestConfig(env).ref,ref);
  for(const delta of [{VERCEL_ENV:'production'},{ADVISORY_TEST_PROJECT_REF:'hqysjumypgeapgmqkcrx',ADVISORY_APPROVED_TEST_PROJECT_REF:'hqysjumypgeapgmqkcrx'},{ADVISORY_APPROVED_TEST_PROJECT_REF:'different'},{ADVISORY_DATA_KEY:''},{ADVISORY_TEST_ORIGIN:'https://preview.example/path'}])assert.throws(()=>hostedTestConfig({...env,...delta}));
  assert.throws(()=>createHostedMockTrial({env,auth:{projectRef:ref},rpc:{projectRef:'wrong'}}),/HOSTED_CLIENT_MISMATCH/);
});

test('cloud ciphertext binds owner, identity, revision and expiry; rotation reads old records, no plaintext fallback',()=>{
  const old=randomBytes(32),fresh=randomBytes(32),before=createSessionCipher({activeKeyId:'old',keys:{old}}),after=createSessionCipher({activeKeyId:'new',keys:{old,new:fresh}});
  const record={id:randomUUID(),owner:randomUUID(),revision:1,saved:true,expiresAt:Date.now()+10000,startRequest:randomUUID(),messages:[{text:'private-room-marker'}],summary:{palette:['olive']}};
  const encoded=before.seal(record);assert.doesNotMatch(JSON.stringify(encoded),/private-room-marker|olive/);assert.deepEqual(after.open(encoded),record);
  assert.equal(after.seal(record).encrypted.keyId,'new');assert.notEqual(before.seal(record).encrypted.data,encoded.encrypted.data);
  for(const changed of [{owner:randomUUID()},{revision:2},{expiresAt:record.expiresAt+1},{id:randomUUID()}])assert.throws(()=>after.open({...encoded,...changed}),/INVALID_STORED_RECORD/);
  assert.throws(()=>after.open(record),/INVALID_STORED_RECORD/);assert.throws(()=>createSessionCipher({activeKeyId:'x',keys:{x:randomBytes(16)}}),/STORAGE_KEY_REQUIRED/);
  assert.throws(()=>createSessionCipher({activeKeyId:'other',keys:{other:fresh}}).open(encoded),/INVALID_STORED_RECORD/);
});
test('cloud read fails closed before RPC without encryption configuration',async()=>{
  const store=new CloudSessionStore({ownerId:randomUUID(),rpc:()=>assert.fail('No plaintext RPC read')});
  await assert.rejects(store.get(randomUUID()),/STORAGE_KEY_REQUIRED/);
});
test('consented handoff is bound to customer, consultation and expiry; rejects invented visualiser controls',()=>{
  let at=Date.now();const handoff=createContextHandoff({secret:randomBytes(32),now:()=>at});
  const owner=randomUUID(),sessionId=randomUUID(),requestId=randomUUID();
  const context={version:'1',source:'room-visualiser',consent:true,room:'lounge',fabricIds:[],colours:['olive'],heading:null,lighting:'daylight',curtainPosition:50,preferences:[],references:[],feedback:'Too busy'};
  const ticket=handoff.issue({owner,sessionId,requestId,context});
  assert.deepEqual(handoff.consume(ticket,{owner,sessionId,revision:2}).context,context);
  assert.throws(()=>handoff.consume(ticket,{owner:randomUUID(),sessionId,revision:2}),/INVALID_HANDOFF/);
  assert.throws(()=>handoff.consume(ticket,{owner,sessionId:randomUUID(),revision:2}),/INVALID_HANDOFF/);
  assert.throws(()=>handoff.consume(ticket+'x',{owner,sessionId,revision:2}),/INVALID_HANDOFF/);
  assert.throws(()=>handoff.issue({owner,sessionId,requestId,context:{...context,heading:'wave'}}),/UNSUPPORTED_CONTEXT_CONTROL/);
  assert.throws(()=>handoff.issue({owner,sessionId,requestId,context:{...context,consent:false}}),/INVALID_INPUT/);
  at+=300001;assert.throws(()=>handoff.consume(ticket,{owner,sessionId,revision:2}),/INVALID_HANDOFF/);
});
test('customer wording removes internal feedback codes without changing provenance',()=>{
  const response={text:'Try MORE_LIKE_THIS or NOT_QUITE.',nextSteps:['NOT_FOR_ME'],evidenceIds:['guide:fi:v1'],fabricIds:['test-id'],stage:'refine'};
  const safe=customerLanguage(response);assert.equal(safe.text,'Try more like this or not quite right.');assert.deepEqual(safe.nextSteps,['not for me']);assert.deepEqual(safe.evidenceIds,response.evidenceIds);assert.match(response.text,/MORE_LIKE_THIS/);
  const concise=customerLanguage({...response,text:'Try warm ivory — it softens the contrast.',alternatives:['Muted clay—a warmer contrast']});assert.doesNotMatch(JSON.stringify(concise),/—/);assert.equal(concise.text,'Try warm ivory, it softens the contrast.');
});
test('safe extended fabric facts and bounded keyset pages omit commercial fields',async()=>{
  const record=safeKnowledge({fabric_id:'test-id',fabric_designs:{weight_gsm:210,full_width_mm:1400,care_instructions:['Dry clean'],usage_suitability:['curtains'],costing_price:999}},{knowledge_state:'COMPLETE',visual_fields:{patternScale:{value:'small'},visualWeight:{value:'light'},lightness:{value:'pale'}}});
  const indexed=indexTerms(record);assert.match(indexed.text,/210 gsm/);assert.match(indexed.text,/1400 mm width/);assert.match(indexed.pattern,/small/);assert.doesNotMatch(JSON.stringify(record),/costing_price|999/);
  const catalogue=createCatalogue({url:'https://hqysjumypgeapgmqkcrx.supabase.co',key:'fake-only',fetchImpl:async url=>{const p=new URL(url).searchParams;assert.equal(p.get('limit'),'6');assert.equal(p.get('fabric_id'),'gt.test-a');assert.equal(p.get('order'),'fabric_id.asc');assert.equal(p.has('offset'),false);return Response.json([{fabric_id:'test-b'}]);}});
  assert.deepEqual(await catalogue.identityPage('test-a'),{ids:['test-b'],cursor:'test-b',exhausted:true});
  await assert.rejects(catalogue.identityPage('bad;sql'),/INVALID_INPUT/);
});
