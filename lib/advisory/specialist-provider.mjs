import {AdvisoryError,fail} from './contracts.mjs';
import {readJsonLimited} from './catalogue.mjs';
import {usageCost} from './openai-provider.mjs';
import {needsSpecialistSearch,verifiedCitations} from './specialist-search.mjs';
import {specialistProfile} from './specialist-profiles.mjs';

const exactFallback='I cannot verify that exact specification from a current manufacturer or test source right now. If you share the model or document, I can help interpret it, but please confirm the detail with the manufacturer or a qualified specialist before relying on it.';

/** @param {{apiKey?:string,budget:{reserve:(usd:number)=>Promise<string>,settle:(id:string,usd:number|null)=>Promise<unknown>},fetchImpl?:typeof fetch,model?:string,enabled?:boolean}} options */
export function createSpecialistOpenAI({apiKey,budget,fetchImpl=fetch,model='gpt-6.1-sol',enabled=false}){
  if(typeof window!=='undefined'||!enabled||!apiKey?.startsWith('sk-')||model!=='gpt-6.1-sol'||!budget?.reserve||!budget?.settle)fail('MODEL_NOT_ACTIVATED',503);
  return {kind:'openai',async respond({adviser,session,message}){
    const profile=specialistProfile(adviser);
    const search=needsSpecialistSearch(message);
    const input=session.messages.map(item=>({role:item.role,content:item.text}));
    input.push({role:'user',content:message});
    const body={model,store:false,stream:false,reasoning:{effort:'low'},instructions:profile.instructions,
      input,max_output_tokens:1300,...(search?{tools:[{type:'web_search',search_context_size:'low'}],tool_choice:'required',max_tool_calls:5,include:['web_search_call.action.sources']}:{})};
    if(Buffer.byteLength(JSON.stringify(body))>64000)fail('CONTEXT_LIMIT',413);
    // Search calls cost extra and source tokens are variable. Reserve a
    // conservative amount in the existing durable ledger before every call.
    const receipt=await budget.reserve(search?0.30:0.06);
    let actual=null;
    try{
      let response;
      try{response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000),redirect:'error'});}catch{throw new AdvisoryError('MODEL_UNAVAILABLE',503);}
      if(!response.ok)fail('MODEL_UNAVAILABLE',503);
      const result=await readJsonLimited(response,400000);
      const calls=(result.output??[]).filter(item=>item.type==='web_search_call');
      if(calls.length>6)fail('TOOL_BUDGET_EXCEEDED',503);
      if(result.usage&&Number.isSafeInteger(result.usage.input_tokens)&&Number.isSafeInteger(result.usage.output_tokens))actual=usageCost(result.usage)+calls.length*0.01;
      if(result.status!=='completed')fail('MODEL_UNAVAILABLE',503);
      const text=(result.output??[]).filter(item=>item.type==='message'&&item.role==='assistant').flatMap(item=>item.content??[]).filter(item=>item.type==='output_text').map(item=>item.text).join('\n').trim();
      if(!text||text.length>3500)fail('INVALID_MODEL_RESPONSE',503);
      const proof=verifiedCitations(result);
      if(search&&(!proof.searched||!proof.citations.length))return {text:exactFallback,citations:[],searched:proof.searched,verified:false};
      return {text,citations:proof.citations,searched:proof.searched,verified:!search||proof.citations.length>0};
    }finally{
      // Unknown outcomes consume the full reservation. A failed settlement
      // is never represented as a free call or a successful reply.
      await budget.settle(receipt,actual);
    }
  }};
}

export function createSpecialistMock(){
  return {kind:'mock',async respond({adviser,message}){
    const p=specialistProfile(adviser);
    const replies={
      james:'The fitting depends on the track or pole, where it will be fixed and what the wall or ceiling is made from. Tell me what you know about those, and I can help narrow the options. An uncertain fixing needs an on-site check.',
      noah:'Let us record the raw measurements first, with units and clear start and end points. Measure the width at more than one position, then note the drop from the intended track or pole position. What type of window are you measuring?',
      natalie:'We can start with the window shape and how you want the curtains to work, even if your dimensions are approximate. I can help prepare the design brief; the specialist team would confirm the final design and quotation. What shape is the window?',
      ben:'First, is the problem echo inside this room or sound passing through a wall, window or doorway? Curtains may help soften reverberation, but they cannot be assumed to block external noise. Tell me where you hear the problem.'
    };
    return {text:needsSpecialistSearch(message)?exactFallback:replies[p.id],citations:[],searched:false,verified:false};
  }};
}
