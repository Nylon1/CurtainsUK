import {createHmac,timingSafeEqual} from 'node:crypto';
import {parseCommand,fail,UUID} from './contracts.mjs';
// Inactive integration contract. Only call after a customer reviews selected
// fields. This is a signed permission receipt, not proof of product/price facts.
export function createContextHandoff({secret,now=()=>Date.now()}){
  if(!Buffer.isBuffer(secret)||secret.length!==32)fail('HANDOFF_KEY_REQUIRED',503);
  const signature=text=>createHmac('sha256',secret).update(text).digest('base64url');
  return {
    issue({owner,sessionId,requestId,context}){
      for(const id of [owner,sessionId,requestId])if(!new RegExp(UUID).test(id))fail('INVALID_INPUT');
      parseCommand({action:'context',requestId,sessionId,revision:0,text:null,context,consent:false,recoveryToken:null});
      const claims={version:1,audience:'curtainsuk-jane',owner,sessionId,requestId,context,expiresAt:now()+300000};
      const body=Buffer.from(JSON.stringify(claims)).toString('base64url');return body+'.'+signature(body);
    },
    consume(ticket,{owner,sessionId,revision}){
      if(typeof ticket!=='string'||ticket.length>14000)fail('INVALID_HANDOFF',400);
      try{const parts=ticket.split('.');if(parts.length!==2)throw Error();const [body,sig]=parts,a=Buffer.from(sig),b=Buffer.from(signature(body));if(a.length!==b.length||!timingSafeEqual(a,b))throw Error();
        const c=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));
        if(c.version!==1||c.audience!=='curtainsuk-jane'||c.owner!==owner||c.sessionId!==sessionId||c.expiresAt<=now()||c.expiresAt>now()+300000)throw Error();
        // The service's durable request receipt makes identical replay idempotent.
        return parseCommand({action:'context',requestId:c.requestId,sessionId,revision,text:null,context:c.context,consent:false,recoveryToken:null});
      }catch{fail('INVALID_HANDOFF',400);}
    }
  };
}
