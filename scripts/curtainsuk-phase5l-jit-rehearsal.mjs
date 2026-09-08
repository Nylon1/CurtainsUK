import assert from 'node:assert/strict';
import { loadEnvFile } from 'node:process';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

loadEnvFile('.env.local'); loadEnvFile('.env.phase5e-staff'); loadEnvFile('.env.phase5e-local');
const base = 'http://localhost:3205';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(url, 'https://hqysjumypgeapgmqkcrx.supabase.co');
const service = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
let syntheticAddress = `198.51.100.${1 + Math.floor(Math.random()*200)}`;
const report = { checkedAt: new Date().toISOString(), environment: 'LOCAL_APP_WITH_STAGING_DATABASE', remoteShopifyWrites: 0, checks: [], cases: [] };
async function authCookie(email, password) {
  const jar = new Map();
  const client = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...jar].map(([name,value]) => ({name,value})), setAll: values => values.forEach(({name,value}) => jar.set(name,value)) },
  });
  const {error} = await client.auth.signInWithPassword({email,password});
  assert.equal(error, null);
  return { client, cookie: [...jar].map(([name,value]) => `${name}=${value}`).join('; ') };
}
async function api(path, body, cookie) {
  const response = await fetch(`${base}${path}`, { method: body === undefined ? 'GET' : 'POST',
    headers: { Origin: base, "x-vercel-forwarded-for": syntheticAddress, ...(cookie ? {Cookie:cookie} : {}), ...(body instanceof FormData || body === undefined ? {} : {'Content-Type':'application/json'}) },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body), redirect: 'manual' });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = { nonJson: true }; }
  return {status:response.status,data};
}
async function proxy(operation, body) {
  const query = new URLSearchParams({shop:'carpetup.myshopify.com',path_prefix:'/apps/curtainsuk-decision',timestamp:String(Math.floor(Date.now()/1000)),nonce:randomUUID()});
  const canonical = [...query].map(([k,v])=>`${k}=${v}`).sort().join('');
  query.set('signature',createHmac('sha256',process.env.PHASE5E_LOCAL_PROXY_SECRET).update(canonical).digest('hex'));
  return api(`/api/staging/shopify-proxy/${operation}?${query}`,body);
}

const staff = await authCookie(process.env.PHASE5E_STAFF_EMAIL,process.env.PHASE5E_STAFF_PASSWORD);
const configuration={windowSlug:'standard-window',measurementBasis:'TRACK_WIDTH',widthCm:200,dropCm:220,fabricId:'sdg-nmel130352',heading:'PENCIL_PLEAT',lining:'STANDARD',construction:'PAIR',stackDirection:'SPLIT'};
const calculation=await proxy('price',configuration);
assert.equal(calculation.status,200);assert.equal(calculation.data.totalAmountMinor,null);assert.equal(calculation.data.commercialState,'PRICE_CONFIRMATION_REQUIRED');
assert.equal(calculation.data.selectedFabric.id,configuration.fabricId);
const form=new FormData();
for(const [key,value] of Object.entries({configuration:JSON.stringify(configuration),calculation:JSON.stringify(calculation.data),contactName:'Phase 5L price confirmation',contactEmail:'phase5l-rehearsal@curtainsuk.invalid',contactPhone:'',notes:'Synthetic staging case; do not contact or fulfil.'}))form.set(key,value);
const submitted=await proxy('review-request',form);assert.equal(submitted.status,201,JSON.stringify(submitted.data));
const detail=await api(`/api/admin/reviews/${submitted.data.requestId}`,undefined,staff.cookie);assert.equal(detail.status,200);
const original=detail.data.review.revisions[0];
assert.equal(original.finalPrice,null);
const retried=await proxy('review-request',form);assert.equal(retried.data.requestId,submitted.data.requestId);
const invalid=await proxy('price',{...configuration,widthCm:-1});assert.equal(invalid.status,400);
const forged=await proxy('checkout-handoff',{configuration,configurationId:calculation.data.configurationId,customerAccepted:true,shippingRegion:'UK_MAINLAND',parcelClass:'STANDARD'});
assert.equal(forged.data.prepared,false);assert.equal(forged.data.shopifyWritePerformed,false);
report.cases.push({name:'Real unpriced SDG fabric',fabricId:configuration.fabricId,configurationId:calculation.data.configurationId,requestId:submitted.data.requestId,reference:submitted.data.reference,price:null,metres:calculation.data.fabricMetres,reviewPersisted:true,retryIdempotent:true,invalidMeasurementsRejected:true,checkoutBypassRejected:true});
await staff.client.auth.signOut();
writeFileSync('artifacts/phase5l/just-in-time-rehearsal.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
