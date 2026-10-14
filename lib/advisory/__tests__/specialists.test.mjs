import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {MemoryStore} from '../store.mjs';
import {specialistIds,specialistProfile} from '../specialist-profiles.mjs';
import {needsSpecialistSearch} from '../specialist-search.mjs';
import {createSpecialistService} from '../specialist-service.mjs';
import {createSpecialistMock,createSpecialistOpenAI} from '../specialist-provider.mjs';

const base=(adviser,action,extra={})=>({adviser,action,requestId:randomUUID(),sessionId:null,revision:null,text:null,context:null,consent:false,recoveryToken:null,...extra});
const ownerA=randomUUID(),ownerB=randomUUID();

test('four distinct openings are free-text prompts, with no preset response contract',()=>{
  assert.deepEqual(specialistIds,['james','noah','natalie','ben']);
  assert.deepEqual(specialistIds.map(id=>specialistProfile(id).opening),[
    'Which track or pole are you fitting?',
    'What type of window are you measuring?',
    'What type of window do you need help with?',
    'What acoustic improvement are you looking for?'
  ]);
  for(const id of specialistIds){const p=specialistProfile(id);assert.equal(p.examples.length>=3,true);assert.match(p.instructions,/AI adviser/);assert.match(p.instructions,/manufacturer/);}
});

test('on-demand search admits exact specs but leaves ordinary consultation unsearched',()=>{
  assert.equal(needsSpecialistSearch('How might a bay window be measured?'),false);
  assert.equal(needsSpecialistSearch('What is the exact bracket spacing for model ABC-42?'),true);
  assert.equal(needsSpecialistSearch('Can you check the current manufacturer manual for my track?'),true);
  assert.equal(needsSpecialistSearch('How can I reduce echo?'),false);
  assert.equal(needsSpecialistSearch('What tested dB reduction does this curtain achieve?'),true);
});

test('each adviser saves, resumes, recovers once, isolates ownership and deletes',async()=>{
  for(const adviser of specialistIds){
    const store=new MemoryStore();
    const service=createSpecialistService({store,providerForSession:()=>createSpecialistMock()});
    await assert.rejects(()=>service.execute(ownerA,base(adviser,'start')),{code:'CONSENT_REQUIRED'});
    const started=await service.execute(ownerA,base(adviser,'start',{consent:true}));
    assert.equal(started.session.adviser,adviser);
    const id=started.session.id;
    await assert.rejects(()=>service.execute(ownerB,base(adviser,'resume',{sessionId:id,revision:0})),{code:'SESSION_NOT_FOUND'});
    const other=specialistIds.find(value=>value!==adviser);
    await assert.rejects(()=>service.execute(ownerA,base(other,'resume',{sessionId:id,revision:0})),{code:'SESSION_NOT_FOUND'});
    const said=await service.execute(ownerA,base(adviser,'message',{sessionId:id,revision:0,text:'Please help with this window.'}));
    assert.equal(said.session.messages.length,2);
    assert.equal((await service.execute(ownerA,base(adviser,'resume',{sessionId:id,revision:0}))).session.messages.length,2);
    const saved=await service.execute(ownerA,base(adviser,'save',{sessionId:id,revision:1,consent:true}));
    assert.match(saved.recoveryToken,new RegExp(`^${id}\\.`));
    await assert.rejects(()=>service.execute(ownerB,base(adviser,'recover',{consent:true,recoveryToken:saved.recoveryToken})),{code:'SESSION_NOT_FOUND'});
    const recovered=await service.execute(ownerA,base(adviser,'recover',{consent:true,recoveryToken:saved.recoveryToken}));
    assert.equal(recovered.recovered,true);
    await assert.rejects(()=>service.execute(ownerA,base(adviser,'recover',{consent:true,recoveryToken:saved.recoveryToken})),{code:'SESSION_NOT_FOUND'});
    assert.deepEqual(await service.execute(ownerA,base(adviser,'delete',{sessionId:id,revision:3})),{deleted:true});
    await assert.rejects(()=>service.execute(ownerA,base(adviser,'resume',{sessionId:id,revision:0})),{code:'SESSION_NOT_FOUND'});
  }
});

test('public consent records use the reviewed notice version, separately from private preview',async()=>{
  for(const publicMode of [false,true]){
    const store=new MemoryStore();
    const service=createSpecialistService({store,publicMode,providerForSession:()=>createSpecialistMock()});
    const started=await service.execute(ownerA,base('ben','start',{consent:true}));
    const record=await store.get(started.session.id);
    assert.equal(record.consentEvents[0].noticeVersion,publicMode?'specialists-public-v1':'specialists-preview-v1');
  }
});

test('model request searches only when needed, requires a cited source and accounts for tool cost',async()=>{
  const bodies=[],charges=[];
  const budget={reserve:async amount=>{charges.push(['reserve',amount]);return 'receipt';},settle:async(id,amount)=>charges.push(['settle',amount])};
  const fetchImpl=async(_url,options)=>{
    const body=JSON.parse(options.body);bodies.push(body);
    const search=!!body.tools;
    const output=search?[{type:'web_search_call',status:'completed',action:{sources:[{url:'https://maker.example/manual.pdf'}]}}]:[];
    output.push({type:'message',role:'assistant',content:[{type:'output_text',text:search?'The manual gives the tested arrangement.':'A ceiling fit could work, subject to your ceiling material.',annotations:search?[{type:'url_citation',url:'https://maker.example/manual.pdf',title:'Original manual'}]:[]} ]});
    return Response.json({status:'completed',output,usage:{input_tokens:100,output_tokens:50}});
  };
  const provider=createSpecialistOpenAI({apiKey:'sk-local-test-only',budget,fetchImpl,enabled:true});
  const session={messages:[]};
  const ordinary=await provider.respond({adviser:'james',session,message:'Would a ceiling fit suit a bay?'});
  assert.equal(ordinary.searched,false);assert.equal(bodies[0].tools,undefined);
  const exact=await provider.respond({adviser:'james',session,message:'Check the exact bracket spacing for model ABC-42.'});
  assert.equal(bodies[1].max_tool_calls,5);assert.equal(bodies[1].tools[0].type,'web_search');
  assert.deepEqual(exact.citations,[{title:'Original manual',url:'https://maker.example/manual.pdf'}]);
  assert.equal(charges[0][1],0.06);assert.equal(charges[2][1],0.30);assert.ok(charges[3][1]>=0.01);
});

test('uncited exact claim fails closed without pretending a search verified it',async()=>{
  const provider=createSpecialistOpenAI({apiKey:'sk-local-test-only',enabled:true,budget:{reserve:async()=>1,settle:async()=>{}},fetchImpl:async()=>Response.json({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'This track carries 500 kg.'}]}],usage:{input_tokens:50,output_tokens:40}})});
  const answer=await provider.respond({adviser:'james',session:{messages:[]},message:'What is the exact load limit of model ABC-42?'});
  assert.match(answer.text,/cannot verify/i);assert.equal(answer.citations.length,0);
});

test('model HTTP failure consumes its reservation without exposing provider details',async()=>{
  const settled=[];
  const provider=createSpecialistOpenAI({apiKey:'sk-local-test-only',enabled:true,budget:{reserve:async()=> 'receipt',settle:async(id,cost)=>settled.push([id,cost])},fetchImpl:async()=>new Response('private upstream detail',{status:500})});
  await assert.rejects(()=>provider.respond({adviser:'ben',session:{messages:[]},message:'How could curtains affect echo?'}),{code:'MODEL_UNAVAILABLE'});
  assert.deepEqual(settled,[['receipt',null]]);
});

test('a bounded multi-action manufacturer lookup retains original citations and charges every search action',async()=>{
  const settled=[];
  const provider=createSpecialistOpenAI({apiKey:'sk-local-test-only',enabled:true,
    budget:{reserve:async amount=>{assert.equal(amount,.30);return 'receipt';},settle:async(_id,cost)=>settled.push(cost)},
    fetchImpl:async()=>Response.json({status:'completed',output:[
      ...Array.from({length:4},(_,i)=>({type:'web_search_call',status:'completed',action:{sources:[{url:`https://maker.example/manual-${i}.pdf`}]}})),
      {type:'message',role:'assistant',content:[{type:'output_text',text:'The original manual gives this arrangement.',annotations:[{type:'url_citation',url:'https://maker.example/manual-3.pdf',title:'Manufacturer manual'}]}]}
    ],usage:{input_tokens:800,output_tokens:100}})});
  const answer=await provider.respond({adviser:'james',session:{messages:[]},message:'What is the exact bracket spacing in the current manual?'});
  assert.equal(answer.citations[0].url,'https://maker.example/manual-3.pdf');
  assert.ok(settled[0]>=.04);
});

test('all four roles can request one source-backed lookup without a manufacturer allowlist',async()=>{
  const requests=[];
  const provider=createSpecialistOpenAI({apiKey:'sk-local-test-only',enabled:true,budget:{reserve:async()=>randomUUID(),settle:async()=>{}},fetchImpl:async(_url,options)=>{
    const body=JSON.parse(options.body);requests.push(body);
    return Response.json({status:'completed',output:[{type:'web_search_call',status:'completed',action:{sources:[{url:'https://original-maker.example/current-document'}]}},{type:'message',role:'assistant',content:[{type:'output_text',text:'The current source describes this arrangement.',annotations:[{type:'url_citation',url:'https://original-maker.example/current-document',title:'Current source'}]}]}],usage:{input_tokens:150,output_tokens:55}});
  }});
  const cases=[
    ['james','How do I fit the Universal Track 734?'],
    ['noah','What does the current measuring manual say for model N-180?'],
    ['natalie','Is model ApexRail 550 compatible with this gable?'],
    ['ben','What tested dB rating applies to the acoustic curtain?']
  ];
  for(const [adviser,message] of cases){
    const answer=await provider.respond({adviser,session:{messages:[]},message});
    assert.equal(answer.searched,true);assert.equal(answer.citations.length,1);
  }
  assert.equal(requests.length,4);
  assert.ok(requests.every(request=>request.max_tool_calls===5&&request.tools?.[0]?.type==='web_search'));
  assert.equal(new Set(requests.map(request=>request.instructions)).size,4);
});
