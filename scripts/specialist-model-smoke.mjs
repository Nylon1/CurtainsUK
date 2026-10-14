import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {createSpecialistOpenAI} from '../lib/advisory/specialist-provider.mjs';
import {specialistProfile} from '../lib/advisory/specialist-profiles.mjs';

// Manual, synthetic-only evaluation. Requires a fresh approved budget and an
// output path outside Git. It never reads or prints a credential file.
const key=process.env.OPENAI_API_KEY;
const output=process.env.SPECIALIST_EVALUATION_OUTPUT;
if(!key||!output||!process.env.SPECIALIST_EVALUATION_APPROVAL||process.env.SPECIALIST_EVALUATION_PRIOR_USD===undefined||process.env.SPECIALIST_EVALUATION_PRIOR_JAMES_USD===undefined)throw Error('EVALUATION_CONFIGURATION_REQUIRED');
const globalCap=2,perRoleCap=.5;
const priorTotal=Number(process.env.SPECIALIST_EVALUATION_PRIOR_USD);
const priorJames=Number(process.env.SPECIALIST_EVALUATION_PRIOR_JAMES_USD);
if(!Number.isFinite(priorTotal)||!Number.isFinite(priorJames)||priorTotal<0||Math.abs(priorTotal-priorJames)>0.000001||priorTotal>=globalCap||priorJames>=perRoleCap)throw Error('INVALID_PRIOR_EVALUATION_LEDGER');
const charged=new Map([['james',priorJames]]),reserved=new Map(),receipts=new Map();
let total=priorTotal;
function budget(adviser){
  return {
    async reserve(usd){
      const pending=[...receipts.values()].reduce((sum,r)=>sum+r.amount,0);
      if(total+pending+usd>globalCap||((charged.get(adviser)??0)+(reserved.get(adviser)??0)+usd)>perRoleCap)throw Error('EVALUATION_BUDGET_EXHAUSTED');
      const id=`${adviser}:${receipts.size+1}`;
      receipts.set(id,{adviser,amount:usd});reserved.set(adviser,(reserved.get(adviser)??0)+usd);
      return id;
    },
    async settle(id,actual){
      const receipt=receipts.get(id);
      if(!receipt||receipt.adviser!==adviser)throw Error('INVALID_EVALUATION_RECEIPT');
      receipts.delete(id);reserved.set(adviser,(reserved.get(adviser)??0)-receipt.amount);
      const amount=actual===null?receipt.amount:actual;
      total+=amount;charged.set(adviser,(charged.get(adviser)??0)+amount);
      if(total>globalCap||charged.get(adviser)>perRoleCap)throw Error('EVALUATION_BUDGET_EXHAUSTED');
    }
  };
}

let scenarios=[
  {adviser:'james',questions:[
    'I need to fit curtains across a bay. Could a ceiling track work if the ceiling is plasterboard?',
    'What do current Forest Group KS installation instructions say about exact bracket spacing? Please link the original instructions.'
  ]},
  {adviser:'noah',questions:['I am measuring patio doors for curtains. Which raw measurements should I write down?']},
  {adviser:'natalie',questions:['I have a triangular gable window. Where should I begin before asking for a final design and quote?']},
  {adviser:'ben',questions:[
    'Do heavy curtains stop traffic noise entering, or mainly reduce echo in my room?',
    'What exact acoustic absorption value was reported for J&C Joel Coloured Wool Serge? Please cite the original product or test document, or say if it is unavailable.'
  ]}
];
if(process.env.SPECIALIST_EVALUATION_SKIP_JAMES==='true')scenarios=scenarios.filter(scenario=>scenario.adviser!=='james');
const report={type:'synthetic-four-specialist-model-smoke',at:new Date().toISOString(),model:'gpt-6.1-sol',approvedReference:process.env.SPECIALIST_EVALUATION_APPROVAL,
  capsUsd:{total:globalCap,perConsultation:perRoleCap},priorEstimatedUsd:priorTotal,scenarios:[],upstreamMetadata:[],estimatedUsd:null,completed:false};
try{
  for(const scenario of scenarios){
    const fetchImpl=async(...args)=>{
      const response=await fetch(...args);
      const metadata=await response.clone().json().catch(()=>({}));
      report.upstreamMetadata.push({adviser:scenario.adviser,httpStatus:response.status,responseStatus:metadata.status??null,
        webSearchCalls:Array.isArray(metadata.output)?metadata.output.filter(item=>item.type==='web_search_call').length:0});
      return response;
    };
    const provider=createSpecialistOpenAI({apiKey:key,budget:budget(scenario.adviser),enabled:true,fetchImpl});
    const session={messages:[]};
    const entry={adviser:scenario.adviser,profileVersion:specialistProfile(scenario.adviser).version,turns:[],estimatedUsd:null};
    report.scenarios.push(entry);
    const before=charged.get(scenario.adviser)??0;
    for(const question of scenario.questions){
      const answer=await provider.respond({adviser:scenario.adviser,session,message:question});
      entry.turns.push({question,answer:answer.text,citations:answer.citations,searched:answer.searched,verified:answer.verified});
      session.messages.push({role:'user',text:question},{role:'assistant',text:answer.text});
    }
    entry.estimatedUsd=(charged.get(scenario.adviser)??0)-before;
  }
  report.completed=true;
}catch(error){
  report.error=typeof error?.code==='string'?error.code:String(error?.message||'EVALUATION_FAILED').slice(0,80);
}finally{
  report.estimatedUsd=total;
  report.thisRunEstimatedUsd=total-priorTotal;
  report.unsettledReservations=receipts.size;
  const target=resolve(output);
  await mkdir(dirname(target),{recursive:true});
  await writeFile(target,JSON.stringify(report,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});
  process.stdout.write(JSON.stringify({completed:report.completed,turns:report.scenarios.reduce((n,s)=>n+s.turns.length,0),estimatedUsd:total,unsettledReservations:receipts.size,output:target,error:report.error??null})+'\n');
}
