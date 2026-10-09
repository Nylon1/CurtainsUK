import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpenAIProvider} from '../openai-provider.mjs';
import {createMockProvider} from '../mock-provider.mjs';
import {runEvaluation,evaluationCases,humanRubric} from '../evaluation.mjs';
import {AdvisoryError} from '../contracts.mjs';
import {randomUUID} from 'node:crypto';
import {MemoryStore} from '../store.mjs';
import {createConsultationService} from '../service.mjs';
test('30-turn evaluation preserves mock baseline and requires separate human judgement',async()=>{
  const result=await runEvaluation({catalogue:{lookup:async()=>[],retail:async()=>[],identities:async()=>[]}});
  assert.equal(evaluationCases.length,10);assert.equal(result.cases.flatMap(c=>c.transcript).length,30);
  assert.ok(result.cases.every(c=>c.humanReview.status==='pending'));
  assert.ok(result.cases.flatMap(c=>c.transcript).every(t=>!t.error));
  assert.ok(humanRubric.criticalFailures.length>=4);
});
test('Responses can continue design advice after unavailable retrieval; standard pricing tier remains explicit',async()=>{
  const session={messages:[],contexts:[]};
  const advice=await createMockProvider().respond({session,message:'Warm contemporary room',execute:async()=>{}});
  let count=0;
  const provider=createOpenAIProvider({apiKey:'fake-only',allowPaidTest:true,budget:{reserve:async()=> 'held',settle:async()=>{}},fetchImpl:async(url,options)=>{
    const request=JSON.parse(options.body);assert.equal(request.service_tier,'default');assert.equal(request.store,false);
    if(++count===1)return Response.json({status:'completed',output:[{type:'function_call',call_id:'lookup-1',name:'search_fabric_knowledge',arguments:JSON.stringify({query:'olive',colour:'',pattern:'',texture:'',composition:''})}]});
    const tool=request.input.find(i=>i.type==='function_call_output');assert.equal(JSON.parse(tool.output).classification,'reference_unavailable');
    return Response.json({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(advice)}]}]});
  }});
  const result=await provider.respond({session,message:'Could we explore olive?',execute:async()=>{throw new AdvisoryError('KNOWLEDGE_INDEX_NOT_ACTIVATED',503);}});
  assert.equal(result.text,advice.text);assert.equal(count,2);
});

test('saved tool receipts preserve completed and unavailable searches in subsequent model turns',async()=>{
  const store=new MemoryStore(),owner='c'.repeat(64);
  const advice=await createMockProvider().respond({session:{messages:[],contexts:[]},message:'Warm contemporary room',execute:async()=>{}});
  const command=(action,session=null)=>({action,requestId:randomUUID(),sessionId:session?.id??null,revision:session?.revision??null,text:action==='message'?'Find soft olive fabrics':null,context:null,consent:false,recoveryToken:null});
  const service=createConsultationService({store,catalogue:{retail:async()=>[],descriptive:async()=>{throw new AdvisoryError('KNOWLEDGE_INDEX_NOT_ACTIVATED',503);}},provider:{kind:'mock',respond:async({execute})=>{
    await execute('search_retail_fabrics',{query:'olive',colour:'',pattern:''});
    await assert.rejects(execute('search_fabric_knowledge',{query:'olive',colour:'',pattern:'',texture:'',composition:''}),e=>e.code==='KNOWLEDGE_INDEX_NOT_ACTIVATED');
    return advice;
  }}});
  let session=(await service.execute(owner,command('start'))).session;
  session=(await service.execute(owner,command('message',session))).session;
  const stored=await store.get(session.id);
  assert.equal(stored.messages.at(-1).retrievals[0].status,'completed');
  assert.equal(stored.messages.at(-1).retrievals[0].resultCount,0);
  assert.equal(stored.messages.at(-1).retrievals[1].error,'KNOWLEDGE_INDEX_NOT_ACTIVATED');
  const provider=createOpenAIProvider({apiKey:'fake-only',allowPaidTest:true,budget:{reserve:async()=> 'held',settle:async()=>{}},fetchImpl:async(url,options)=>{
    const request=JSON.parse(options.body),history=JSON.parse(request.input.find(m=>m.role==='assistant').content);
    assert.deepEqual(history.serverRecordedRetrievals,stored.messages.at(-1).retrievals);
    assert.deepEqual(history.approvedFabricCards,[]);
    return Response.json({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(advice)}]}]});
  }});
  await provider.respond({session:stored,message:'Did you check?',execute:async()=>assert.fail('No fresh tool requested')});
});
