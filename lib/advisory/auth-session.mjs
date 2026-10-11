import {createClient} from '@supabase/supabase-js';
import {fail} from './contracts.mjs';
import {EXISTING_PROJECT_REF} from './hosted-test.mjs';
// Server-only, official Auth API verification. No protected-schema SQL or
// privileged Auth key. Each call uses an isolated client and the explicit JWT.
export function createServerAuth({projectRef,publishableKey,fetchImpl=fetch}){
 if(projectRef!==EXISTING_PROJECT_REF||!/^sb_publishable_[A-Za-z0-9_-]{8,200}$/.test(publishableKey??''))fail('AUTH_CONFIGURATION_REQUIRED',503);
 const origin='https://'+projectRef+'.supabase.co';
 const boundedRequest=async(input,init={})=>{
  const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
  if(url.origin!==origin||!['/auth/v1/user','/auth/v1/.well-known/jwks.json'].includes(url.pathname)||url.search||url.username||url.password||(init.method??'GET').toUpperCase()!=='GET')fail('AUTH_REQUEST_REFUSED',503);
  const signal=AbortSignal.any([AbortSignal.timeout(4000),...(init.signal?[init.signal]:[])]);
  const response=await fetchImpl(url.toString(),{...init,signal,cache:'no-store',redirect:'error'});
  const chunks=[];let bytes=0;const reader=response.body?.getReader();
  try{if(reader)for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>65536)fail('AUTH_RESPONSE_TOO_LARGE',503);chunks.push(value);}}
  finally{await reader?.cancel();}
  return new Response(bytes?Buffer.concat(chunks):null,{status:response.status,headers:response.headers});
 };
 // The SDK logs thrown transport errors. Convert them to a generic Auth error
 // response first, so URLs, request headers or upstream exception data cannot
 // leak through third-party diagnostic logging. Never fall back to cached JWTs.
 const request=async(...args)=>{try{return await boundedRequest(...args);}catch{return new Response('{"message":"Auth verification unavailable"}',{status:503,headers:{'content-type':'application/json'}});}};
 const client=()=>createClient(origin,publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:request}}).auth;
 return Object.freeze({projectRef,verification:'supabase-auth-api-v1',getUser:token=>client().getUser(token),getClaims:token=>client().getClaims(token)});
}
