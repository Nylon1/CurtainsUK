import {randomUUID} from 'node:crypto';
import readline from 'node:readline';
import {fail,validate,tools} from './contracts.mjs';
import {safeKnowledge,safeRetail,readJsonLimited} from './catalogue.mjs';

// Local evaluation transport only. A supervising operator answers each request
// through the existing read-only Supabase connector. No database credential is
// placed in this process, and the transport is never included in a web route.
export function createEvaluationBroker({input=process.stdin,output=process.stdout,timeoutMs=20000}={}){
  const pending=new Map();
  // Console/PTY echo can bury the next request behind a large reference reply.
  // Raw mode keeps this local line protocol bidirectional without echoing data.
  const wasRaw=input.isRaw===true;
  if(input.isTTY&&input.setRawMode)input.setRawMode(true);
  input.resume?.();
  const lines=readline.createInterface({input,terminal:false});
  lines.on('line',line=>{
    let reply;try{reply=JSON.parse(line);}catch{return;}
    const item=pending.get(reply?.id);if(!item)return;
    if(reply.chunk){
      const {index,total,payload}=reply.chunk;
      if(!Number.isSafeInteger(index)||!Number.isSafeInteger(total)||total<1||total>100||index<0||index>=total||typeof payload!=='string'||payload.length>1200){
        clearTimeout(item.timer);pending.delete(reply.id);item.reject(Error('INVALID_BROKER_CHUNK'));return;
      }
      if(item.total!==undefined&&item.total!==total){clearTimeout(item.timer);pending.delete(reply.id);item.reject(Error('INVALID_BROKER_CHUNK'));return;}
      item.total=total;item.chunks??=Array(total);
      item.chunks[index]=payload;
      if(item.chunks.filter(x=>x!==undefined).length<total)return;
      try{reply={id:reply.id,...JSON.parse(item.chunks.join(''))};}catch{clearTimeout(item.timer);pending.delete(reply.id);item.reject(Error('INVALID_BROKER_CHUNK'));return;}
    }
    clearTimeout(item.timer);pending.delete(reply.id);
    if(reply.error)item.reject(Object.assign(Error(reply.error),{code:'KNOWLEDGE_UNAVAILABLE'}));
    else item.resolve(reply.data);
  });
  return {async request(operation,args){
    const id=randomUUID();
    const promise=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(Object.assign(Error('BROKER_TIMEOUT'),{code:'KNOWLEDGE_UNAVAILABLE'}));},timeoutMs);
      pending.set(id,{resolve,reject,timer});
    });
    output.write('ADVISORY_BROKER '+JSON.stringify({id,operation,args})+'\n');
    return promise;
  },close(){lines.close();if(input.isTTY&&input.setRawMode)input.setRawMode(wasRaw);for(const item of pending.values()){clearTimeout(item.timer);item.reject(Error('BROKER_CLOSED'));}pending.clear();}};
}

export function createBrokeredEvaluationCatalogue({broker,fetchImpl=fetch,coverage}){
  const call=(operation,args)=>broker.request(operation,args);
  const lookup=async ids=>{
    validate(tools.find(t=>t.name==='lookup_fabric_knowledge').parameters,{ids});
    if(!ids.length)return[];
    const rows=await call('lookup',{ids});
    if(!Array.isArray(rows)||rows.length>6||rows.some(r=>!ids.includes(r.fabric_id)))fail('INVALID_UPSTREAM_RESPONSE',503);
    return rows.map(r=>safeKnowledge(r.row,r.visual,r.profile));
  };
  return {lookup,
    async identities(prefix){
      validate(tools.find(t=>t.name==='find_fabric_identities').parameters,{prefix});
      const rows=await call('identities',{prefix});
      if(!Array.isArray(rows)||rows.length>6||rows.some(id=>typeof id!=='string'||!id.startsWith(prefix)))fail('INVALID_UPSTREAM_RESPONSE',503);
      return rows;
    },
    async descriptive(args){
      validate(tools.find(t=>t.name==='search_fabric_knowledge').parameters,args);
      const ids=await call('search',args);
      if(!Array.isArray(ids)||ids.length>6||ids.some(id=>typeof id!=='string'))fail('INVALID_UPSTREAM_RESPONSE',503);
      return {fabrics:await lookup(ids),coverage};
    },
    async retail(args){
      validate(tools.find(t=>t.name==='search_retail_fabrics').parameters,args);
      const params=new URLSearchParams({view:'retail',browseGuide:'1',query:args.query,colour:args.colour,pattern:args.pattern,page:'1'});
      let result;try{result=await readJsonLimited(await fetchImpl('https://www.curtainsuk.com/apps/curtainsuk-decision/catalog?'+params,{signal:AbortSignal.timeout(6000),redirect:'error'}),750000);}catch{fail('KNOWLEDGE_UNAVAILABLE',503);}
      if(!Array.isArray(result.fabrics)||result.fabrics.length>24)fail('INVALID_UPSTREAM_RESPONSE',503);
      return result.fabrics.slice(0,6).map(safeRetail).filter(Boolean);
    }};
}
