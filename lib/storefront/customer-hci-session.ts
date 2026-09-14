import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
export const CUSTOMER_HCI_COOKIE='__Host-cuk_consultation';
export const CUSTOMER_HCI_MAX_AGE=7*86400;
function mac(value:string,secret:string){
 if(secret.length<32) throw Error('HCI_CUSTOMER_SESSION_NOT_CONFIGURED');
 return createHmac('sha256',secret).update('curtainsuk:customer-session:v1:'+value).digest('base64url');
}
export function issueCustomerSession(secret:string,now=Math.floor(Date.now()/1000)){
 const owner=randomUUID(),payload=`${owner}.${now+CUSTOMER_HCI_MAX_AGE}`;
 return {owner,token:`${payload}.${mac(payload,secret)}`};
}
export function verifyCustomerSession(token:string|undefined,secret:string,now=Math.floor(Date.now()/1000)):string|null{
 if(secret.length<32)throw Error('HCI_CUSTOMER_SESSION_NOT_CONFIGURED');
 if(!token||token.length>180)return null;
 const parts=token.split('.');
 if(parts.length!==3||! /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(parts[0]))return null;
 const expiry=Number(parts[1]);
 if(!Number.isSafeInteger(expiry)||expiry<=now||expiry>now+CUSTOMER_HCI_MAX_AGE)return null;
 const expected=Buffer.from(mac(parts.slice(0,2).join('.'),secret)),actual=Buffer.from(parts[2]);
 return actual.length===expected.length&&timingSafeEqual(actual,expected)?parts[0]:null;
}
export function customerOriginAllowed(origin:string|null,configured:string){
 try {const u=new URL(configured);return u.protocol==='https:'&&u.origin===configured&&origin===configured;}catch{return false;}
}
export function customerHciEnabled(env=process.env){
 return env.CURTAINSUK_HCI_CUSTOMER_ENABLED==='true'&&env.CURTAINSUK_HCI_INTEGRATION_ENABLED==='true'
  && ['STAGING','PRODUCTION'].includes(env.CURTAINSUK_DEPLOYMENT_STAGE??'')
  && customerOriginAllowed(env.CURTAINSUK_HCI_CUSTOMER_ORIGIN??null,env.CURTAINSUK_HCI_CUSTOMER_ORIGIN??'');
}
