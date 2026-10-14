import test from 'node:test';
import assert from 'node:assert/strict';
import {signShopifyAppProxyQuery} from '../../storefront/security/shopify-app-proxy-core';
import {createShopifySpecialistGateway,specialistOwner,specialistPreviewEnabled,specialistPublicEnabled} from '../specialist-gateway';
import {janeOwner} from '../shopify-gateway';

const now=Date.UTC(2026,9,14,12);
const shop='carpetup.myshopify.com';
const appSecret='local-app-secret-12345678901234567890';
const env={VERCEL_ENV:'preview',VERCEL_PROJECT_ID:'prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA',VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),ADVISORY_SPECIALISTS_APPROVED_COMMIT:'a'.repeat(40),ADVISORY_SPECIALISTS_RESTRICTED_PREVIEW:'true',ADVISORY_SPECIALISTS_TEST_CUSTOMER_IDS:'123,456',CURTAINSUK_SHOPIFY_APP_SECRET:appSecret,ADVISORY_OWNER_DERIVATION_KEY:'local-owner-key-12345678901234567890',ADVISORY_CSRF_KEY:'local-csrf-key-12345678901234567890'};
function url(id='123',adviser='noah'){
  const query=new URLSearchParams({shop,path_prefix:'/apps/curtainsuk-decision',timestamp:String(now/1000),logged_in_customer_id:id,adviser}).toString();
  return `https://preview.example/api/staging/shopify-proxy/specialists?${query}&signature=${signShopifyAppProxyQuery(query,appSecret)}`;
}
function fixture(changes:Record<string,string|undefined>={}){
  const calls:Array<{owner:string,command:unknown}>=[];
  const handle=createShopifySpecialistGateway({env:{...env,...changes},compiledCommit:'a'.repeat(40),now:()=>now,take:async()=>{},execute:async(owner,command)=>{calls.push({owner,command});return {ok:true};}});
  return {handle,calls};
}
test('preview gate and role owners are separate from Jane',()=>{
  assert.equal(specialistPreviewEnabled(env,'a'.repeat(40)),true);
  assert.equal(specialistPreviewEnabled({...env,ADVISORY_SPECIALISTS_APPROVED_COMMIT:'b'.repeat(40)},'a'.repeat(40)),false);
  assert.equal(specialistPreviewEnabled({...env,VERCEL_GIT_COMMIT_SHA:undefined,VERCEL_DEPLOYMENT_ID:undefined},'a'.repeat(40)),false);
  assert.notEqual(specialistOwner('123','james',env.ADVISORY_OWNER_DERIVATION_KEY),specialistOwner('123','noah',env.ADVISORY_OWNER_DERIVATION_KEY));
  assert.notEqual(specialistOwner('123','noah',env.ADVISORY_OWNER_DERIVATION_KEY),janeOwner(shop,'123',env.ADVISORY_OWNER_DERIVATION_KEY));
});
test('signed owner, consent transport and CSRF are checked for each role',async()=>{
  const {handle,calls}=fixture();
  const bootstrap=await handle(new Request(url()));
  assert.equal(bootstrap.status,200);
  const {csrf,ownerBinding}=await bootstrap.json();
  assert.match(ownerBinding,/^[a-f0-9]{32}$/);
  const body={adviser:'noah',action:'start'};
  const post=(address:string,token:string,origin='https://www.curtainsuk.com')=>handle(new Request(address,{method:'POST',headers:{origin,'content-type':'application/json','x-advisory-csrf':token},body:JSON.stringify(body)}));
  assert.equal((await post(url(),csrf)).status,200);
  assert.equal((await post(url('456'),csrf)).status,403);
  assert.equal((await post(url(),csrf,'https://evil.example')).status,403);
  assert.equal((await post(url('789'),csrf)).status,401);
  assert.equal((await post(url('123','james'),csrf)).status,400);
  assert.equal(calls.length,1);
});
test('bad signatures and disabled preview never execute a consultation',async()=>{
  const disabled=fixture({ADVISORY_SPECIALISTS_RESTRICTED_PREVIEW:'false'});
  assert.equal((await disabled.handle(new Request(url()))).status,404);
  const live=fixture();
  assert.equal((await live.handle(new Request(url().replace(/signature=[a-f0-9]+/,'signature='+'0'.repeat(64))))).status,401);
  assert.equal(live.calls.length,0);
});
test('public gate stays closed without exact release and separate budget approval',async()=>{
  const publicEnv={...env,VERCEL_ENV:'production',ADVISORY_SPECIALISTS_RESTRICTED_PREVIEW:'false',ADVISORY_SPECIALISTS_PUBLIC_ENABLED:'true',ADVISORY_SPECIALISTS_PROVIDER:'openai',ADVISORY_SPECIALISTS_PUBLIC_BUDGET_APPROVAL_REFERENCE:'OWNER_APPROVED_SPECIALISTS_PUBLIC_BUDGET_20261014'};
  assert.equal(specialistPublicEnabled(publicEnv,'a'.repeat(40)),true);
  for(const change of [
    {ADVISORY_SPECIALISTS_PUBLIC_ENABLED:'false'},
    {ADVISORY_SPECIALISTS_PUBLIC_BUDGET_APPROVAL_REFERENCE:undefined},
    {ADVISORY_SPECIALISTS_APPROVED_COMMIT:'b'.repeat(40)},
    {VERCEL_GIT_COMMIT_SHA:'b'.repeat(40)},
    {ADVISORY_SPECIALISTS_PROVIDER:'mock'},
    {VERCEL_ENV:'preview'},
    {ADVISORY_SPECIALISTS_RESTRICTED_PREVIEW:'true'}
  ])assert.equal(specialistPublicEnabled({...publicEnv,...change},'a'.repeat(40)),false);
  const active=fixture({...publicEnv,ADVISORY_SPECIALISTS_TEST_CUSTOMER_IDS:undefined});
  assert.equal((await active.handle(new Request(url('789')))).status,200);
  const blocked=fixture({...publicEnv,ADVISORY_SPECIALISTS_PUBLIC_BUDGET_APPROVAL_REFERENCE:undefined,ADVISORY_SPECIALISTS_TEST_CUSTOMER_IDS:undefined});
  assert.equal((await blocked.handle(new Request(url('789')))).status,404);
});
