import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,webcrypto} from 'node:crypto';
import {createServerAuth} from '../auth-session.mjs';
import {verifyCloudPrincipal} from '../cloud-store.mjs';
import {createCloudConsultationHandler} from '../cloud-handler.mjs';

// Real installed Supabase SDK and cryptographic JWT verification, synthetic
// HTTP transport only. No credentials, Auth records, database or paid calls.
const projectRef='hqysjumypgeapgmqkcrx',origin='https://'+projectRef+'.supabase.co',issuer=origin+'/auth/v1';
const publishableKey='sb_publishable_synthetic_local_fixture';
const keys=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const jwk={...await webcrypto.subtle.exportKey('jwk',keys.publicKey),kid:randomUUID(),alg:'ES256',use:'sig'};
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
async function signed(overrides={}){
 const claims={sub:randomUUID(),session_id:randomUUID(),aud:'authenticated',role:'authenticated',iss:issuer,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600,...overrides};
 const body=encode({alg:'ES256',typ:'JWT',kid:jwk.kid})+'.'+encode(claims);
 return {claims,token:body+'.'+Buffer.from(await webcrypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,Buffer.from(body))).toString('base64url')};
}
function fixture(){
 const users=new Map(),revoked=new Set(),calls=[];let mode='normal';
 const fetchImpl=async(url,init)=>{
  calls.push({path:new URL(url).pathname,method:init.method??'GET'});
  assert.equal(new URL(url).origin,origin);assert.equal(init.cache,'no-store');assert.equal(init.redirect,'error');assert.ok(init.signal instanceof AbortSignal);
  assert.equal(new Headers(init.headers).get('apikey'),publishableKey);
  const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
  if(new URL(url).pathname.endsWith('/jwks.json'))return response({keys:[jwk]});
  assert.equal(new URL(url).pathname,'/auth/v1/user');
  const token=new Headers(init.headers).get('authorization')?.replace(/^Bearer /,'');
  if(mode==='unavailable')return response({message:'synthetic Auth outage'},503);
  if(mode==='oversize')return response({id:'x'.repeat(65537)});
  if(mode==='timeout')throw new DOMException('synthetic timeout','AbortError');
  if(mode==='redirect')return response({},302);
  if(revoked.has(token))return response({code:'session_not_found',message:'Synthetic revoked session'},403);
  return users.has(token)?response(users.get(token)):response({code:'user_not_found',message:'Synthetic missing user'},403);
 };
 const auth=createServerAuth({projectRef,publishableKey,fetchImpl});
 return {auth,users,revoked,calls,setMode:value=>{mode=value;},add:async overrides=>{const value=await signed(overrides);users.set(value.token,{id:value.claims.sub,is_anonymous:false,user_metadata:{owner:randomUUID()}});return value;}};
}
const denied={message:'UNAUTHORISED'};

test('official Auth SDK verifies real signatures, concurrent owners and revocation without protected SQL',async()=>{
 const f=fixture(),a=await f.add(),b=await f.add();
 const verify=token=>verifyCloudPrincipal({token,auth:f.auth,issuer});
 assert.deepEqual(await Promise.all([verify(a.token),verify(b.token)]),[a,b].map(({claims})=>({owner:claims.sub,sessionId:claims.session_id})));
 f.revoked.add(a.token);
 // An unexpired, correctly signed JWT is still insufficient after revocation.
 assert.ok((await f.auth.getClaims(a.token)).data.claims);
 await assert.rejects(verify(a.token),denied);assert.equal((await verify(b.token)).owner,b.claims.sub);
 f.users.delete(b.token);await assert.rejects(verify(b.token),denied);
 assert.equal(f.calls.filter(c=>c.path==='/auth/v1/user').length,5);
 assert.ok(f.calls.every(c=>['/auth/v1/user','/auth/v1/.well-known/jwks.json'].includes(c.path)&&c.method==='GET'));
});

test('official Auth SDK fails closed for invalid identity, signature, expiry, audience and session claims',async()=>{
 const f=fixture(),good=await f.add(),verify=token=>verifyCloudPrincipal({token,auth:f.auth,issuer});
 for(const claims of [{iss:'https://attacker.example'},{aud:'other'},{role:'service_role'},{session_id:'invalid'},{exp:Math.floor(Date.now()/1000)-1},{nbf:Date.now()/1000+600},{sub:'not-a-uuid'}]){
  const candidate=await f.add(claims);await assert.rejects(verify(candidate.token),denied);
 }
 f.users.set(good.token,{id:randomUUID()});await assert.rejects(verify(good.token),denied);
 f.users.set(good.token,{id:good.claims.sub,is_anonymous:true});await assert.rejects(verify(good.token),denied);
 const segments=good.token.split('.');segments[1]=encode({...good.claims,session_id:randomUUID()});
 const forged=segments.join('.');f.users.set(forged,{id:good.claims.sub});await assert.rejects(verify(forged),denied);
 for(const token of ['', ' ', 'not-a-jwt','x'.repeat(8193)])await assert.rejects(verify(token),denied);
});

test('Auth outages, bounded responses and configuration failures never fall back to claims alone',async t=>{
 const errors=t.mock.method(console,'error',()=>{});
 const f=fixture(),a=await f.add();
 for(const mode of ['unavailable','oversize','timeout','redirect']){
  f.setMode(mode);await assert.rejects(verifyCloudPrincipal({token:a.token,auth:f.auth,issuer}),denied);
 }
 assert.throws(()=>createServerAuth({projectRef:'another-project',publishableKey}),/AUTH_CONFIGURATION_REQUIRED/);
 for(const key of ['','sb_secret_synthetic','legacy-service-role-fixture'])assert.throws(()=>createServerAuth({projectRef,publishableKey:key}),/AUTH_CONFIGURATION_REQUIRED/);
 assert.equal(errors.mock.callCount(),0,'SDK must not log raw transport failures');
});

test('Auth failure stops protected HTTP before consultation reads, limits or model execution',async()=>{
 const f=fixture(),a=await f.add();f.revoked.add(a.token);let sideEffects=0;
 const handler=createCloudConsultationHandler({env:{VERCEL_ENV:'preview',CURTAINSUK_ADVISORY_PREVIEW:'true',ADVISORY_PREVIEW_KEY:'p'.repeat(32)},origin:'https://preview.example',auth:f.auth,issuer,
  readAccessToken:async()=>a.token,csrfForSession:async()=>{sideEffects++;},rpc:async()=>{sideEffects++;},providerForSession:async()=>{sideEffects++;}});
 const response=await handler(new Request('https://preview.example/api',{method:'POST',headers:{origin:'https://preview.example','content-type':'application/json','x-advisory-preview-key':'p'.repeat(32)},body:'{}'}));
 assert.equal(response.status,401);assert.equal(sideEffects,0);assert.doesNotMatch(await response.text(),/session_not_found|eyJ|supabase/i);
});
