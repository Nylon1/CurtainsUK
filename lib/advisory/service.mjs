import {randomUUID} from 'node:crypto';
import {parseCommand,validate,responseSchema,fail} from './contracts.mjs';
import {createToolExecutor} from './catalogue.mjs';
import {token,digest,equal} from './security.mjs';
import {JANE_VERSION,SHARED_VERSION} from './profiles.mjs';
import {safeLinks} from './guidance.mjs';
export function createConsultationService({store,provider,catalogue,now=()=>Date.now(),telemetry=()=>{}}){
  if(!store?.locked)fail('ATOMIC_STORAGE_REQUIRED',500);
  const view=record=>({id:record.id,revision:record.revision,adviser:'jane',provider:provider.kind,profileVersion:JANE_VERSION,saved:record.saved,expiresAt:record.expiresAt,
    messages:record.messages,summary:record.summary,contexts:record.contexts.map(c=>({id:c.id,value:c.value,receivedAt:c.receivedAt})),links:safeLinks,notice:provider.kind==='mock'?'Scripted development demonstration. No model is connected.':'AI development consultation; not a live customer service.'});
  const ownerRecord=async(owner,id)=>{const r=await store.get(id);if(!r||!equal(r.owner,owner))fail('SESSION_NOT_FOUND',404);if(r.expiresAt<=now()){await store.remove(id);fail('SESSION_NOT_FOUND',404);}return r;};
  async function reply(record,message){
    const executor=createToolExecutor(catalogue);
    const result=validate(responseSchema,await provider.respond({session:structuredClone(record),message,execute:executor.execute}));
    if(result.evidenceIds.some(id=>!executor.evidence.has(id))||result.fabricIds.some(id=>!executor.retail.has(id)))fail('UNSUPPORTED_MODEL_EVIDENCE',503);
    if(/(?:£|\$)\s*\d|(?:I|we) (?:can )?guarantee|guaranteed (?:delivery|colour)|\b\d+ (?:in stock|units available)\b/i.test(JSON.stringify(result)))fail('UNSUPPORTED_COMMERCIAL_CLAIM',503);
    return {result,citations:result.evidenceIds.map(id=>executor.evidence.get(id)),fabrics:result.fabricIds.map(id=>executor.retail.get(id))};
  }
  return {async execute(owner,input){
    if(typeof owner!=='string'||owner.length<32||owner.length>100)fail('UNAUTHORISED',401);
    const c=parseCommand(input),started=now();
    if(c.action==='start')return store.locked('owner:'+owner,async()=>{
      // Bounded review store; a multi-instance deployment must supply a durable
      // creation/idempotency implementation before this service is connected.
      if(store.records){for(const r of store.records.values()){if(r.expiresAt<=now()){await store.remove(r.id);continue;}if(r.owner===owner&&r.startRequest===c.requestId)return {session:view(r)};}if(store.records.size>=100)fail('PREVIEW_STORAGE_LIMIT',503);}
      const id=randomUUID(),record={id,owner,revision:0,adviser:'jane',profileVersion:JANE_VERSION,sharedVersion:SHARED_VERSION,startRequest:c.requestId,saved:false,recoveryHash:null,createdAt:now(),expiresAt:now()+86400000,messages:[],contexts:[],summary:null,receipts:[],consentEvents:[]};
      await store.commit(record,null);return {session:view(record)};
    });
    const id=c.action==='recover'?c.recoveryToken.split('.')[0]:c.sessionId;
    return store.locked(id,async()=>{
      if(c.action==='recover'){
        const r=await store.get(id);
        if(!r?.saved||r.expiresAt<=now()||!r.recoveryHash||!equal(r.recoveryHash,digest(c.recoveryToken)))fail('SESSION_NOT_FOUND',404);
        const expected=r.revision;r.owner=owner;r.recoveryHash=null;r.revision++;r.receipts=[];
        r.consentEvents.push({purpose:'recover',noticeVersion:'advisory-preview-v1',at:now()});
        await store.commit(r,expected);return {session:view(r),recovered:true,recoveryConsumed:true};
      }
      const r=await ownerRecord(owner,id);
      if(c.action==='resume')return {session:view(r)};
      const requestDigest=digest(JSON.stringify(c));const previous=r.receipts.find(p=>p.id===c.requestId);
      if(previous){if(previous.digest!==requestDigest)fail('IDEMPOTENCY_CONFLICT',409);return {session:view(r),replayed:true};}
      if(r.revision!==c.revision)fail('REVISION_CONFLICT',409);
      if(c.action==='delete'){await store.remove(id);return {deleted:true};}
      const expected=r.revision;let recoveryToken;
      if(c.action==='context'){
        if(r.contexts.length>=12)fail('CONTEXT_LIMIT',413);
        const known=await catalogue.lookup(c.context.fabricIds);const ids=new Set(known.map(f=>f.id));
        if(c.context.fabricIds.some(id=>!ids.has(id)))fail('UNKNOWN_FABRIC_ID',400);
        r.contexts.push({id:randomUUID(),receivedAt:now(),classification:'customer_supplied_not_commercial_authority',value:c.context});
        r.consentEvents.push({purpose:'design-context',noticeVersion:'advisory-preview-v1',at:now()});
      }
      if(c.action==='message'||c.action==='summary'){
        if(r.messages.length>=82||(c.action==='message'&&r.messages.length>=80))fail('CONTEXT_LIMIT',413);
        const message=c.action==='summary'?'Please summarise our current design direction and next steps.':c.text;
        const {result,citations,fabrics}=await reply(r,message);
        r.messages.push({id:randomUUID(),role:'user',text:message,at:now()},{id:randomUUID(),role:'assistant',text:result.text,advice:result,citations,fabrics,at:now()});
        r.summary={version:1,updatedAt:now(),palette:result.palette,patternDirection:result.patternDirection,textureDirection:result.textureDirection,alternatives:result.alternatives,openQuestions:result.questions,nextSteps:result.nextSteps};
      }
      if(c.action==='save'){
        r.saved=true;recoveryToken=r.id+'.'+token();r.recoveryHash=digest(recoveryToken);
        r.consentEvents.push({purpose:'save',noticeVersion:'advisory-preview-v1',at:now()});
      }
      r.revision++;if(r.saved)r.expiresAt=now()+90*86400000;
      r.consentEvents=r.consentEvents.slice(-100);
      r.receipts.push({id:c.requestId,digest:requestDigest});r.receipts=r.receipts.slice(-100);
      await store.commit(r,expected);
      // No message text, contact details, raw tokens or tool payloads in logs.
      try{telemetry({event:'advisory_operation',action:c.action,provider:provider.kind,durationMs:now()-started,messageCount:r.messages.length});}catch{}
      return {session:view(r),...(recoveryToken?{recoveryToken}:{}),...(c.action==='save'?{saved:true}:{})};
    });
  }};
}
