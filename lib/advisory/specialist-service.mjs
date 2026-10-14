import {randomUUID} from 'node:crypto';
import {UUID,requestSchema,validate,object,string,fail} from './contracts.mjs';
import {token,digest,equal} from './security.mjs';
import {specialistProfile} from './specialist-profiles.mjs';

const schema=object({...requestSchema.properties,adviser:string(10,{enum:['james','noah','natalie','ben']})});
const validId=new RegExp(UUID);

function parse(input){
  const c=validate(schema,input);
  if(!['start','message','resume','save','recover','delete'].includes(c.action))fail('INVALID_INPUT');
  if(c.action==='start'&&(c.sessionId!==null||c.revision!==null||!c.consent))fail('CONSENT_REQUIRED',403);
  if(c.action==='recover'){
    if(c.sessionId!==null||c.revision!==null||!c.consent||!c.recoveryToken)fail('INVALID_INPUT');
  }else if(c.action!=='start'&&(!c.sessionId||c.revision===null))fail('INVALID_INPUT');
  if((c.action==='message')!==(c.text!==null)||c.context!==null||(c.action!=='recover'&&c.recoveryToken!==null))fail('INVALID_INPUT');
  return c;
}

/** @param {{store:any,providerForSession:(args:{store:any,sessionId:string,adviser:string})=>any,now?:()=>number}} options */
export function createSpecialistService({store,providerForSession,now=()=>Date.now()}){
  if(!store?.locked||typeof providerForSession!=='function')fail('ATOMIC_STORAGE_REQUIRED',500);
  const view=record=>({id:record.id,revision:record.revision,adviser:record.adviser,profileVersion:record.profileVersion,saved:record.saved,expiresAt:record.expiresAt,messages:record.messages,summary:record.summary});
  const own=(record,owner,adviser)=>{
    if(!record||!equal(record.owner,owner)||record.adviser!==adviser||record.expiresAt<=now())fail('SESSION_NOT_FOUND',404);
    return record;
  };
  return {async execute(owner,input){
    if(!validId.test(owner))fail('UNAUTHORISED',401);
    const c=parse(input),profile=specialistProfile(c.adviser);
    if(c.action==='start')return store.locked(`owner:${owner}`,async()=>{
      const existing=await store.findStart?.(c.requestId);
      if(existing)return {session:view(own(existing,owner,c.adviser)),replayed:true};
      const record={id:randomUUID(),owner,adviser:c.adviser,profileVersion:profile.version,revision:0,startRequest:c.requestId,saved:true,recoveryHash:null,createdAt:now(),expiresAt:now()+90*86400000,messages:[],summary:null,receipts:[],consentEvents:[{purpose:'specialist-consultation',noticeVersion:'specialists-preview-v1',at:now()}]};
      await store.commit(record,null);
      return {session:view(record)};
    });
    const id=c.action==='recover'?c.recoveryToken.split('.')[0]:c.sessionId;
    return store.locked(id,async()=>{
      const record=own(await store.get(id),owner,c.adviser);
      if(c.action==='recover'){
        if(!record.recoveryHash||!equal(record.recoveryHash,digest(c.recoveryToken)))fail('SESSION_NOT_FOUND',404);
        const expected=record.revision;record.recoveryHash=null;record.revision++;
        record.consentEvents.push({purpose:'recover',noticeVersion:'specialists-preview-v1',at:now()});
        await store.commit(record,expected);
        return {session:view(record),recovered:true,recoveryConsumed:true};
      }
      if(c.action==='resume')return {session:view(record)};
      const key=digest(JSON.stringify(c)),receipt=record.receipts.find(item=>item.id===c.requestId);
      if(receipt){if(receipt.digest!==key)fail('IDEMPOTENCY_CONFLICT',409);return {session:view(record),replayed:true};}
      if(record.revision!==c.revision)fail('REVISION_CONFLICT',409);
      if(c.action==='delete'){await store.remove(id);return {deleted:true};}
      const expected=record.revision;let recoveryToken;
      if(c.action==='save'){
        if(!c.consent)fail('CONSENT_REQUIRED',403);
        recoveryToken=`${record.id}.${token()}`;
        record.recoveryHash=digest(recoveryToken);
        record.consentEvents.push({purpose:'recovery-code',noticeVersion:'specialists-preview-v1',at:now()});
      }
      if(c.action==='message'){
        if(record.messages.length>=80)fail('CONTEXT_LIMIT',413);
        const provider=await providerForSession({store,sessionId:record.id,adviser:c.adviser});
        const answer=await provider.respond({adviser:c.adviser,session:structuredClone(record),message:c.text});
        if(typeof answer?.text!=='string'||!answer.text.trim()||answer.text.length>3500||!Array.isArray(answer.citations)||answer.citations.length>4)fail('INVALID_MODEL_RESPONSE',503);
        record.messages.push({id:randomUUID(),role:'user',text:c.text,at:now()},{id:randomUUID(),role:'assistant',text:answer.text,citations:answer.citations,at:now()});
        record.summary={lastTopic:c.text.slice(0,200),updatedAt:now()};
      }
      record.revision++;record.expiresAt=now()+90*86400000;
      record.consentEvents=record.consentEvents.slice(-100);
      record.receipts.push({id:c.requestId,digest:key});record.receipts=record.receipts.slice(-100);
      await store.commit(record,expected);
      return {session:view(record),...(recoveryToken?{recoveryToken}:{})};
    });
  }};
}
