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
    headers: { Origin: base, ...(cookie ? {Cookie:cookie} : {}), ...(body instanceof FormData || body === undefined ? {} : {'Content-Type':'application/json'}) },
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
const anon = await api('/api/admin/reviews'); assert.equal(anon.status,401);
const reviewed = await api('/api/admin/reviews',undefined,staff.cookie); assert.equal(reviewed.status,200,JSON.stringify(reviewed.data));
for (const path of ['/api/admin/shipping-rates','/api/admin/prestigious-stock','/api/admin/supplier-imports/preview','/api/admin/review-evidence/maintenance']) {
  assert.equal((await api(path,undefined,staff.cookie)).status,403,path);
}
report.checks.push({name:'anonymous denied; reviewer queue allowed; commercial and maintenance routes denied',status:'PASS'});
// Separate synthetic ordinary customer proves that authentication alone is insufficient.
const customerEmail = `phase5e-customer-${randomUUID()}@curtainsuk.invalid`;
const customerPassword = randomBytes(36).toString('base64url');
const customerCreated = await service.auth.admin.createUser({email:customerEmail,password:customerPassword,email_confirm:true});
assert.equal(customerCreated.error,null);
const customer = await authCookie(customerEmail,customerPassword);
assert.equal((await api('/api/admin/reviews',undefined,customer.cookie)).status,403);
assert.equal((await api('/admin/reviews',undefined,customer.cookie)).status,403);
await customer.client.auth.signOut();
await service.auth.admin.updateUserById(customerCreated.data.user.id,{ban_duration:'876000h'});
report.checks.push({name:'ordinary customer denied and synthetic customer disabled after test',status:'PASS'});

const standard = {windowSlug:'standard-window',measurementBasis:'TRACK_WIDTH',widthCm:200,dropCm:220,fabricId:'pt-4270-147',heading:'PENCIL_PLEAT',lining:'STANDARD',construction:'PAIR',stackDirection:'SPLIT'};
for (const fabricId of ['pt-4270-147','pt-4269-147','sdg-dapgpa203']) {
  const configuration = {...standard,fabricId};
  const priced = await proxy('price',configuration); assert.equal(priced.status,200,JSON.stringify(priced.data));
  assert.ok(priced.data.totalAmountMinor > 0);
  const handoff = await proxy('checkout-handoff',{configuration,configurationId:priced.data.configurationId,customerAccepted:true,shippingRegion:'UK_MAINLAND',parcelClass:'STANDARD'});
  assert.equal(handoff.data.prepared,false,JSON.stringify(handoff.data));
  assert.equal(handoff.data.shopifyWritePerformed,false);
  assert.equal(handoff.data.paymentEnabled,false);
  report.cases.push({name:`Standard ${fabricId}`,priceGrossMinor:priced.data.totalAmountMinor,fabricMetres:priced.data.fabricMetres,checkout:'BLOCKED',blockers:handoff.data.blockers});
}
for (const [name,configuration] of [
  ['Bay',{...standard,windowSlug:'bay-window',widthCm:undefined,bayTrackOrPoleFitted:true,bayNumberOfSections:3,baySegmentWidthsCm:[80,180,80]}],
  ['Manual Quote',{...standard,widthCm:700}],
]) {
  const calculation = await proxy('price',configuration); assert.equal(calculation.status,200);
  if (name==='Manual Quote') assert.equal(calculation.data.totalAmountMinor,null);
  const form = new FormData();
  for (const [key,value] of Object.entries({configuration:JSON.stringify(configuration),calculation:JSON.stringify(calculation.data),contactName:`Phase 5E ${name}`,contactEmail:'phase5e-rehearsal@curtainsuk.invalid',contactPhone:'',notes:'Synthetic staging rehearsal. Do not fulfil or contact.'})) form.set(key,value);
  const submitted = await proxy('review-request',form); assert.equal(submitted.status,201,JSON.stringify(submitted.data));
  const requestId = submitted.data.requestId;
  const detail = () => api(`/api/admin/reviews/${requestId}`,undefined,staff.cookie);
  let current = (await detail()).data.review;
  const original = structuredClone(current.revisions[0]);
  let latest = current.revisions.at(-1);
  const transition = (toState) => api(`/api/admin/reviews/${requestId}/transition`,{toState,expectedState:current.reviewState,latestRevisionId:latest.revisionId,reason:`Phase 5E ${toState}: synthetic staff rehearsal`},staff.cookie);
  let moved = await transition('UNDER_REVIEW'); assert.equal(moved.status,200,JSON.stringify(moved.data));
  current = moved.data.review; latest = current.revisions.at(-1);
  const gross = calculation.data.totalAmountMinor ?? 120000;
  const net = Math.round(gross/1.2);
  const amended = await api(`/api/admin/reviews/${requestId}/amend`,{previousRevisionId:latest.revisionId,specification:{...latest.specification,calculated_fabric_metres:calculation.data.fabricMetres,shipping_parcel_class:'STANDARD'},finalPrice:{netAmountMinor:net,vatAmountMinor:gross-net,grossAmountMinor:gross,vatRateBasisPoints:2000,currency:'GBP'},pricingRuleVersion:calculation.data.calculationVersion,reason:'Phase 5E synthetic staff quote; no manufacturing or commercial approval'},staff.cookie);
  assert.equal(amended.status,200,JSON.stringify(amended.data)); current=amended.data.review; latest=current.revisions.at(-1);
  moved = await transition('APPROVED'); assert.equal(moved.status,200,JSON.stringify(moved.data));
  current=moved.data.review; latest=current.revisions.at(-1);
  const ready = await api(`/api/admin/reviews/${requestId}/checkout`,{expectedState:'APPROVED',revisionId:latest.revisionId,reason:'Phase 5E readiness gate rehearsal'},staff.cookie);
  assert.equal(ready.status,409,JSON.stringify(ready.data));
  const after = (await detail()).data.review;
  assert.deepEqual(after.revisions[0],original);
  assert.ok(after.audit.filter(event => event.fromState !== null).every(event => event.actorLabel === process.env.PHASE5E_STAFF_ID));
  report.cases.push({name,requestId,staffApproval:'PASS',checkout:'BLOCKED',blockers:after.checkout.blockedReasons,originalImmutable:true});
}
const specialist = {windowSlug:'apex-window',measurements:{coverage_width:300,peak_height:300,left_vertical:200,right_vertical:200,left_slope:180.278,right_slope:180.278},fabricId:'pt-4269-147',heading:'WAVE',lining:'BLACKOUT',construction:'PAIR',fixingPosition:'Ceiling-mounted curtain track inside the reveal',stackDirection:'SPLIT',photoNames:['phase5e-safe-window.png']};
const specialistCalculation = await proxy('specialist-review',specialist);
assert.equal(specialistCalculation.status,200,JSON.stringify(specialistCalculation.data));
const specialistForm = new FormData();
for (const [key,value] of Object.entries({configuration:JSON.stringify(specialist),calculation:JSON.stringify(specialistCalculation.data),contactName:'Phase 5E Apex',contactEmail:'phase5e-apex@curtainsuk.invalid',contactPhone:'',notes:'Synthetic one-pixel PNG, no personal data. Scanner must fail closed.'})) specialistForm.set(key,value);
specialistForm.set('photos',new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8yoAAAAASUVORK5CYII=','base64')],'phase5e-safe-window.png',{type:'image/png'}));
const apexSubmitted = await proxy('review-request',specialistForm);
assert.equal(apexSubmitted.status,201,JSON.stringify(apexSubmitted.data));
const apexId = apexSubmitted.data.requestId;
let apex = (await api(`/api/admin/reviews/${apexId}`,undefined,staff.cookie)).data.review;
const apexOriginal = structuredClone(apex.revisions[0]);
assert.ok(apex.evidence.length > 0 && apex.evidence.every(item => item.securityState === 'QUARANTINED'));
for (const toState of ['NEEDS_INFORMATION','UNDER_REVIEW']) {
  const changed = await api(`/api/admin/reviews/${apexId}/transition`,{toState,expectedState:apex.reviewState,latestRevisionId:apex.revisions.at(-1).revisionId,reason:'Phase 5E synthetic geometry follow-up rehearsal'},staff.cookie);
  assert.equal(changed.status,200,JSON.stringify(changed.data)); apex=changed.data.review;
}
const apexAmended = await api(`/api/admin/reviews/${apexId}/amend`,{previousRevisionId:apex.revisions.at(-1).revisionId,specification:{...apex.revisions.at(-1).specification,customer_follow_up_recorded:true,calculated_fabric_metres:20,shipping_parcel_class:'SPECIALIST'},finalPrice:{netAmountMinor:100000,vatAmountMinor:20000,grossAmountMinor:120000,vatRateBasisPoints:2000,currency:'GBP'},pricingRuleVersion:'phase5e-synthetic-staff-quote',reason:'Synthetic training quote only; evidence is still quarantined'},staff.cookie);
assert.equal(apexAmended.status,200,JSON.stringify(apexAmended.data)); apex=apexAmended.data.review;
const apexApproval = await api(`/api/admin/reviews/${apexId}/transition`,{toState:'APPROVED',expectedState:apex.reviewState,latestRevisionId:apex.revisions.at(-1).revisionId,reason:'Phase 5E validate evidence gate blocks approval'},staff.cookie);
assert.equal(apexApproval.status,409,JSON.stringify(apexApproval.data));
assert.deepEqual(apex.revisions[0],apexOriginal);
report.cases.push({name:'Apex',requestId:apexId,informationRequest:'PASS',newRevision:'PASS',safeEvidence:'QUARANTINED',approval:'BLOCKED',blockers:[apexApproval.data.error],originalImmutable:true});
for (const configuration of [{...standard,widthCm:-1},{...standard,fabricId:'unavailable-phase5e-fabric'}]) {
  const invalid = await proxy('price',configuration); assert.equal(invalid.status,400);
  assert.equal(typeof invalid.data.totalAmountMinor,'undefined');
}
report.checks.push({name:'invalid measurements and unavailable fabric show no numeric price',status:'PASS'});
await staff.client.auth.signOut();
mkdirSync('artifacts/phase5e',{recursive:true});
writeFileSync('artifacts/phase5e/api-rehearsal.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
