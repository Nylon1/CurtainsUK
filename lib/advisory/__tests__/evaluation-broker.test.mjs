import test from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {createEvaluationBroker,createBrokeredEvaluationCatalogue} from '../evaluation-broker.mjs';

test('operator broker correlates bounded replies and fails closed on unavailable reference',async()=>{
  const input=new PassThrough(),output=new PassThrough(),broker=createEvaluationBroker({input,output,timeoutMs:1000});
  let buffer='';output.on('data',chunk=>{
    buffer+=chunk.toString();
    for(;;){const end=buffer.indexOf('\n');if(end<0)break;
      const line=buffer.slice(0,end);buffer=buffer.slice(end+1);
      const q=JSON.parse(line.slice('ADVISORY_BROKER '.length));
      input.write(JSON.stringify({id:q.id,data:q.operation==='search'?['pt-3697-502']:[]})+'\n');
    }
  });
  assert.deepEqual(await broker.request('search',{query:'Shambala'}),['pt-3697-502']);
  const catalogue=createBrokeredEvaluationCatalogue({broker,coverage:{complete:true}});
  assert.deepEqual(await catalogue.identities('pt-3697'),[]);
  await assert.rejects(catalogue.lookup(['invalid id']),{code:'INVALID_INPUT'});
  broker.close();
});

test('brokered catalogue retains product eligibility and live retail response checks',async()=>{
  const broker={request:async(operation)=>operation==='search'?['pt-3697-502']:operation==='lookup'?[{fabric_id:'pt-3697-502',row:{fabric_id:'pt-3697-502',colour_name:'Amber',fabric_designs:{display_name:'Shambala',composition:[{material:'cotton',percentage:8}]},supplier_brands:{display_name:'Prestigious Textiles'}},visual:{knowledge_state:'PARTIAL_GOVERNED',visual_fields:{}},profile:{description_validated:false}}]:[]};
  const catalogue=createBrokeredEvaluationCatalogue({broker,coverage:{complete:true},fetchImpl:async()=>new Response(JSON.stringify({fabrics:[]}))});
  const result=await catalogue.descriptive({query:'Shambala',colour:'',pattern:'',texture:'',composition:''});
  assert.equal(result.fabrics[0].id,'pt-3697-502');
  assert.equal(result.fabrics[0].purchasable,false);
  assert.deepEqual(await catalogue.retail({query:'Shambala',colour:'',pattern:''}),[]);
});

test('broker reconstructs a bounded multi-line reference response',async()=>{
  const input=new PassThrough(),output=new PassThrough(),broker=createEvaluationBroker({input,output,timeoutMs:1000});
  output.once('data',chunk=>{
    const q=JSON.parse(chunk.toString().slice('ADVISORY_BROKER '.length));
    const payload=JSON.stringify({data:[{id:'pt-3697-502',description:'woven '.repeat(200)}]});
    const parts=payload.match(/.{1,900}/g);
    parts.forEach((part,index)=>input.write(JSON.stringify({id:q.id,chunk:{index,total:parts.length,payload:part}})+'\n'));
  });
  const result=await broker.request('lookup',{ids:['pt-3697-502']});
  assert.equal(result[0].id,'pt-3697-502');
  broker.close();
});
