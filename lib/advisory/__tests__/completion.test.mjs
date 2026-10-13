import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {createSessionCipher} from '../session-cipher.mjs';
import {createContextHandoff} from '../context-handoff.mjs';
import {customerLanguage} from '../customer-language.mjs';
import {CloudSessionStore} from '../cloud-store.mjs';
import {createCatalogue,createToolExecutor,safeKnowledge} from '../catalogue.mjs';
import {safeLinks} from '../guidance.mjs';
import {indexTerms} from '../knowledge-search.mjs';
import {hostedTestConfig,createHostedMockTrial} from '../hosted-test.mjs';
import {createServerAuth} from '../auth-session.mjs';
import {requireFreshEvaluationApproval,EVALUATION_VERSION,completionCases} from '../evaluation-v2.mjs';
import {JANE_VERSION,janeInstructions} from '../profiles.mjs';
import {foundationsCases,requireFreshEvaluationApproval as foundationsApproval} from '../evaluation-v3.mjs';
import {runEvaluation} from '../evaluation.mjs';
import {populationPlan,runPopulationSlice} from '../index-population.mjs';
import {assessHumanScorecard} from '../human-review.mjs';

test('human-review gate never turns missing scores or critical failures into approval',()=>{
 const complete={reviewer:'Invented evaluator',reviewedAt:'2026-10-11',notes:'Synthetic gate test only',scores:Array(8).fill(3),criticalFailures:[]};
 assert.equal(assessHumanScorecard(complete).passed,true);
 assert.equal(assessHumanScorecard({...complete,scores:Array(8).fill(null)}).status,'pending');
 assert.equal(assessHumanScorecard({...complete,scores:[2,...Array(7).fill(4)]}).passed,false);
 assert.equal(assessHumanScorecard({...complete,criticalFailures:['Invented product']}).passed,false);
 assert.equal(assessHumanScorecard({...complete,disputed:true}).requiresSecondReview,true);
});

test('population controller bounds each invocation, requires fresh approval and stops on a failed step',async()=>{
  const now=Date.now(),bundleHash='b'.repeat(64),approval={approved:true,projectRef:'hqysjumypgeapgmqkcrx',schema:'advisory',purpose:'bounded-advisory-index-only',ownerApprovalReference:'LOCAL_FIXTURE',jobId:randomUUID(),sourceAttestationReference:'fixture-only',sourceSnapshot:'fixture-v1',expectedCount:120,bundleHash,maxBatches:20,expiresAt:new Date(now+60000).toISOString()};
  let steps=0,waits=0;const worker={step:async(id,expected)=>{assert.equal(id,approval.jobId);assert.equal(expected.expectedCount,120);steps++;return {complete:false,read:6};}};
  const options={approval,bundleHash,worker,wait:async ms=>{assert.equal(ms,5000);waits++;},now:()=>now};
  assert.equal((await runPopulationSlice(options)).receipts.length,20);assert.equal(steps,20);assert.equal(waits,19);
  for(const delta of [{projectRef:'another'},{maxBatches:21},{expectedCount:1.5},{approved:false},{expiresAt:'2000-01-01'}])await assert.rejects(runPopulationSlice({...options,approval:{...approval,...delta}}),/INDEX_POPULATION_APPROVAL_REQUIRED/);
  assert.equal(steps,20);
  await assert.rejects(runPopulationSlice({...options,worker:{step:async()=>{throw Error('INDEX_THROTTLED');}}}),/INDEX_THROTTLED/);
  assert.equal(waits,19);assert.equal(populationPlan(120).maximumIdentitiesPerInvocation,120);
  assert.throws(()=>populationPlan(null),/EXACT_SOURCE_COUNT_REQUIRED/);
});

test('revised evaluation executes consented context and saved-return actions without paid calls',async()=>{
  const result=await runEvaluation({cases:foundationsCases,catalogue:{lookup:async()=>[],identities:async()=>[],retail:async()=>[],descriptive:async()=>({fabrics:[],coverage:{complete:false}})}});
  assert.equal(result.cases.length,20);
  const turns=result.cases.flatMap(c=>c.transcript);assert.equal(turns.filter(t=>t.advice).length,60);assert.ok(turns.every(t=>!t.error));
  assert.equal(turns.find(t=>t.action==='context').contexts,1);
  assert.equal(turns.find(t=>t.action==='recover').messages,2);
  assert.throws(()=>foundationsApproval({suiteVersion:EVALUATION_VERSION}),/NEW_OWNER_BUDGET_APPROVAL_REQUIRED/);
});

test('new evaluation requires fresh approval for this profile and suite before credentials or network',()=>{
  const a={approved:true,ownerApprovalReference:'invented-test-only',runId:randomUUID(),model:'gpt-6.1-sol',maxUsd:5,purpose:'invented-jane-evaluation',expiresAt:new Date(Date.now()+60000).toISOString()};
  assert.throws(()=>requireFreshEvaluationApproval(a),/NEW_OWNER_BUDGET_APPROVAL_REQUIRED/);
  assert.equal(requireFreshEvaluationApproval({...a,profileVersion:JANE_VERSION,suiteVersion:EVALUATION_VERSION}).maxUsd,5);
  assert.throws(()=>requireFreshEvaluationApproval({...a,profileVersion:JANE_VERSION,suiteVersion:EVALUATION_VERSION,maxUsd:6}),/NEW_OWNER_BUDGET_APPROVAL_REQUIRED/);
  assert.equal(completionCases.length,16);assert.equal(new Set(completionCases.map(c=>c.id)).size,16);
  assert.match(janeInstructions,/40–75 words/);assert.match(janeInstructions,/entire recorded conversation/);
  assert.match(janeInstructions,/Do not treat a suggestion as a solved problem/);
  assert.match(janeInstructions,/Do not use em dashes/);
});

test('Jane can guide a ready customer to the real curtain journey without granting purchase authority',async()=>{
  const executor=createToolExecutor({lookup:async()=>[],identities:async()=>[],retail:async()=>[],descriptive:async()=>({fabrics:[],coverage:{complete:false}})});
  const guide=await executor.execute('get_tool_guidance',{tool:'curtain-builder'});
  assert.equal(guide.data.url,'/pages/curtain-visualiser');
  assert.match(guide.data.text,/measurements/);
  assert.match(guide.data.text,/price and availability are checked/);
  assert.equal(executor.retail.size,0);
  assert.ok(safeLinks.some(link=>link.label==='Make Curtains'&&link.url==='https://www.curtainsuk.com/pages/curtain-visualiser'));
});

test('heading guidance distinguishes appearance from the automated purchase allowlist',async()=>{
  const executor=createToolExecutor({lookup:async()=>[],identities:async()=>[],retail:async()=>[],descriptive:async()=>({fabrics:[],coverage:{complete:false}})});
  const guide=await executor.execute('get_tool_guidance',{tool:'curtain-style'});
  assert.equal(guide.data.id,'guide:headings:v2');
  for(const heading of ['Wave','Double Pinch Pleat','Pencil Pleat','Eyelet'])assert.match(guide.data.text,new RegExp(heading));
  assert.match(guide.data.text,/a fitted track allows Pencil Pleat, Double Pinch Pleat or Wave/);
  assert.match(guide.data.text,/a fitted pole allows Pencil Pleat, Double Pinch Pleat or Eyelet/);
  assert.match(guide.data.text,/bay-window route requires an existing track and allows Pencil Pleat or Double Pinch Pleat/);
  assert.match(guide.data.text,/Triple Pinch Pleat and Tab Top.*not offered by the current automated checkout allowlist/);
  assert.match(guide.data.text,/Room Visualiser 2 has no customer heading selector/);
  assert.match(janeInstructions,/give as much detail as the customer asks for while keeping ordinary replies concise/);
});

test('Fabric Intelligence guidance reflects the actual guided edit and consent boundaries',async()=>{
  const executor=createToolExecutor({lookup:async()=>[],identities:async()=>[],retail:async()=>[],descriptive:async()=>({fabrics:[],coverage:{complete:false}})});
  const guide=await executor.execute('get_tool_guidance',{tool:'fabric-intelligence'});
  assert.equal(guide.data.id,'guide:fi:v2');
  assert.match(guide.data.text,/optional reference image step accepts one JPG, PNG or WebP up to 2 MB/);
  assert.match(guide.data.text,/five design directions/);
  assert.match(guide.data.text,/react separately to the direction and fabric/);
  assert.match(guide.data.text,/refine to a final shortlist once/);
  assert.match(guide.data.text,/cannot change Fabric Intelligence’s decisions or read its session automatically/);
});

test('Browse Fabrics guidance exposes governed filters without claiming stock or a final price',async()=>{
  const executor=createToolExecutor({lookup:async()=>[],identities:async()=>[],retail:async()=>[],descriptive:async()=>({fabrics:[],coverage:{complete:false}})});
  const guide=await executor.execute('get_tool_guidance',{tool:'browse-fabrics'});
  assert.equal(guide.data.id,'guide:browse:v1');
  assert.equal(guide.data.url,'/pages/fabric-library?view=browse-fabrics');
  for(const facet of ['Brand','Collections','Colour families','Patterns','Styles','Texture & character','Availability','Samples'])assert.ok(guide.data.text.includes(facet));
  assert.match(guide.data.text,/only when the governed options are enabled and populated/);
  assert.match(guide.data.text,/Current range is not a stock guarantee/);
  assert.match(guide.data.text,/Curtains from price is a guide/);
  assert.ok(safeLinks.some(link=>link.label==='Browse Fabrics'&&link.url==='https://www.curtainsuk.com/pages/fabric-library?view=browse-fabrics'));
});

test('tiebacks and cushions are honest offline styling advice, never a fabricated online offer',async()=>{
  const executor=createToolExecutor({lookup:async()=>[],identities:async()=>[],retail:async()=>[],descriptive:async()=>({fabrics:[],coverage:{complete:false}})});
  const guide=await executor.execute('get_tool_guidance',{tool:'soft-furnishings'});
  assert.equal(guide.data.id,'guide:soft-furnishings:v1');
  assert.equal(guide.data.url,null);
  assert.match(guide.data.text,/not currently available as a self-service choice/);
  assert.match(guide.data.text,/Tiebacks hold curtains open/);
  assert.match(guide.data.text,/Cushions can repeat one colour/);
  assert.match(guide.data.text,/Do not offer an online tieback or cushion purchase link/);
  assert.equal(safeLinks.some(link=>link.id===guide.data.id),false);
});

test('hosted composition accepts only approved existing-project synthetic trials',()=>{
  const ref='hqysjumypgeapgmqkcrx',owner=randomUUID(),bundleHash='a'.repeat(64);
  const env={VERCEL_ENV:'preview',CURTAINSUK_ADVISORY_PREVIEW:'true',ADVISORY_TEST_PROJECT_REF:ref,ADVISORY_TEST_SCHEMA:'advisory',ADVISORY_TEST_ORIGIN:'https://preview.example',ADVISORY_ACTIVE_DATA_KEY_ID:'v1',ADVISORY_DATA_KEYS_JSON:JSON.stringify({v1:randomBytes(32).toString('base64')}),ADVISORY_CSRF_KEY:randomBytes(32).toString('base64')};
  const approval={projectRef:ref,schema:'advisory',bundleHash,mode:'synthetic-mock-only',migrationVerified:true,ownerApprovalReference:'SYNTHETIC_TEST_FIXTURE',syntheticOwnerIds:[owner],expiresAt:new Date(Date.now()+60000).toISOString()};
  Object.assign(env,{ADVISORY_TEST_DEPLOYMENT_ID:'dpl_localSyntheticFixture'});
  Object.assign(approval,{deploymentProtectionVerified:true,vercelProjectId:'prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA',deploymentId:env.ADVISORY_TEST_DEPLOYMENT_ID,previewOrigin:env.ADVISORY_TEST_ORIGIN});
  const options={approval,bundleHash},config=hostedTestConfig(env,options);
  assert.equal(config.ref,ref);assert.equal(config.principalAllowed({owner}),true);assert.equal(config.principalAllowed({owner:randomUUID()}),false);
  assert.throws(()=>hostedTestConfig(env),/MIGRATION_APPROVAL_REQUIRED/);
  for(const delta of [{deploymentProtectionVerified:false},{deploymentId:'dpl_wrong'},{vercelProjectId:'prj_wrong'},{previewOrigin:'https://wrong.example'}])assert.throws(()=>hostedTestConfig(env,{bundleHash,approval:{...approval,...delta}}),/PROTECTED_DEPLOYMENT_VERIFICATION_REQUIRED/);
  for(const delta of [{VERCEL_ENV:'production'},{ADVISORY_TEST_PROJECT_REF:'abcdefghijklmnopqrst'},{ADVISORY_TEST_SCHEMA:'public'},{ADVISORY_DATA_KEYS_JSON:'{}'},{ADVISORY_TEST_ORIGIN:'https://preview.example/path'}])assert.throws(()=>hostedTestConfig({...env,...delta},options));
  for(const delta of [{bundleHash:'b'.repeat(64)},{migrationVerified:false},{syntheticOwnerIds:[]},{mode:'openai'},{expiresAt:'2000-01-01'}])assert.throws(()=>hostedTestConfig(env,{bundleHash,approval:{...approval,...delta}}));
  assert.throws(()=>createHostedMockTrial({env,...options,auth:{projectRef:ref},rpc:{projectRef:ref,role:'service_role'}}),/HOSTED_CLIENT_MISMATCH/);
  const rpc=Object.assign(async()=>{throw Error('No calls while preparing a handler');},{projectRef:ref,role:'advisory_runtime',schema:'advisory'});
  assert.throws(()=>createHostedMockTrial({env,...options,auth:{projectRef:ref},rpc}),/HOSTED_CLIENT_MISMATCH/);
  const auth=createServerAuth({projectRef:ref,publishableKey:'sb_publishable_synthetic_fixture',fetchImpl:async()=>{throw Error('No calls while preparing a handler');}});
  assert.equal(typeof createHostedMockTrial({env,...options,auth,rpc}),'function');
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
