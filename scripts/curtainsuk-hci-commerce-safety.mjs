import {readFileSync,writeFileSync} from 'node:fs';
import {parseEnv,promisify} from 'node:util';
import {execFile} from 'node:child_process';
import assert from 'node:assert/strict';
const env=parseEnv(readFileSync('.env.hci-commerce-preview','utf8'));
for(const key of ['CURTAINSUK_SHOPIFY_CHECKOUT_STORE','CURTAINSUK_SHOPIFY_CHECKOUT_CLIENT_ID','CURTAINSUK_SHOPIFY_CHECKOUT_CLIENT_SECRET']) env[key]=env[key]?.trim();
const cliCredentials=process.argv.includes('--cli') || env.CURTAINSUK_SHOPIFY_CHECKOUT_CLIENT_ID==='[SENSITIVE]';
if(cliCredentials) {
 const {stdout}=await promisify(execFile)('shopify',['app','env','show','--no-color'],{shell:true,windowsHide:true,timeout:45000});
 const current=parseEnv(stdout);
 env.CURTAINSUK_SHOPIFY_CHECKOUT_CLIENT_ID=current.SHOPIFY_API_KEY;
 env.CURTAINSUK_SHOPIFY_CHECKOUT_CLIENT_SECRET=current.SHOPIFY_API_SECRET;
}
const store=env.CURTAINSUK_SHOPIFY_CHECKOUT_STORE;
assert.equal(store,'curtainsuk-dev.myshopify.com');
const auth=await fetch(`https://${store}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:env.CURTAINSUK_SHOPIFY_CHECKOUT_CLIENT_ID,client_secret:env.CURTAINSUK_SHOPIFY_CHECKOUT_CLIENT_SECRET}),signal:AbortSignal.timeout(30000)});
assert.ok(auth.headers.get('content-type')?.includes('json'),`Token endpoint returned HTTP ${auth.status} without JSON`);
const token=await auth.json();
assert.ok(auth.ok && token.access_token,'Development-store authentication failed');
const response=await fetch(`https://${store}/admin/api/2026-07/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token.access_token},body:JSON.stringify({query:'{ shop { name currencyCode taxesIncluded plan { partnerDevelopment displayName } } }'}),signal:AbortSignal.timeout(30000)});
assert.ok(response.headers.get('content-type')?.includes('json'),`Shop read returned HTTP ${response.status} without JSON`);
const result=await response.json();
assert.equal(result.data?.shop?.plan?.partnerDevelopment,true,'Development-store safety gate failed');
const report={checkedAt:new Date().toISOString(),store,shop:result.data.shop,credentialSource:cliCredentials?'current Shopify CLI app':'private preview environment',paymentSettingsChanged:false,draftOrdersCreated:0};
writeFileSync('artifacts/phase6-discovery/hci-commerce-payment-safety.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
