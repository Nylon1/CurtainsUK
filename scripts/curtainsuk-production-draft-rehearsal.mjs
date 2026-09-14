/** One operator-only rehearsal. Never imported by a route or sent to a browser. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {parseEnv} from 'node:util';
import nextEnv from '@next/env';
import {createSupplierServiceClient} from '../lib/supabase/supplier-service.ts';
import {prepareStagingCheckoutHandoff} from '../lib/storefront/checkout-gates.ts';
import {buildShopifyDraftOrderContract,assertShopifyDraftOrderFinancials} from '../lib/storefront/shopify-draft-order-core.ts';

const store='carpetup.myshopify.com',directory='artifacts/phase6-discovery/private/production-gate';
const ledgerPath=directory+'/rehearsal.json';
const tag='CUK_PRODUCTION_TEST_GATE_20260914';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const financials=`taxesIncluded presentmentCurrencyCode totalLineItemsPriceSet{presentmentMoney{amount currencyCode}} subtotalPriceSet{presentmentMoney{amount currencyCode}} totalShippingPriceSet{presentmentMoney{amount currencyCode}} totalTaxSet{presentmentMoney{amount currencyCode}} totalDiscountsSet{presentmentMoney{amount currencyCode}} totalPriceSet{presentmentMoney{amount currencyCode}}`;
// Deliberately never request invoiceUrl, customer records, or a payment operation.
const fields=`id name status tags customAttributes{key value} lineItems(first:5){nodes{title quantity sku customAttributes{key value}}} ${financials}`;
async function main(){
 nextEnv.loadEnvConfig(process.cwd());
 assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'https://hqysjumypgeapgmqkcrx.supabase.co');
 const a=parseEnv(execFileSync('shopify',['app','env','show','--no-color'],{shell:true,encoding:'utf8',timeout:45000}));
 const auth=await fetch(`https://${store}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:a.SHOPIFY_API_KEY,client_secret:a.SHOPIFY_API_SECRET}),signal:AbortSignal.timeout(15000)});
 assert.equal(auth.ok,true,'TOKEN_EXCHANGE_FAILED');const token=(await auth.json()).access_token;
 async function gql(query,variables={}){const r=await fetch(`https://${store}/admin/api/2026-07/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(20000)});assert.equal(r.ok,true,`SHOPIFY_HTTP_${r.status}`);const d=await r.json();assert.ok(!d.errors,'SHOPIFY_GRAPHQL_ERRORS');return d.data;}
 const identity=await gql('{shop{id name myshopifyDomain primaryDomain{host}} currentAppInstallation{accessScopes{handle}}}');
 assert.equal(identity.shop.id,'gid://shopify/Shop/25645514861');assert.equal(identity.shop.primaryDomain.host,'www.curtainsuk.com');assert.equal(identity.shop.myshopifyDomain,store);
 assert.ok(identity.currentAppInstallation.accessScopes.some(s=>s.handle==='write_draft_orders'),'DRAFT_SCOPE_NOT_GRANTED');
 mkdirSync(directory,{recursive:true});
 let ledger=existsSync(ledgerPath)?JSON.parse(readFileSync(ledgerPath,'utf8')):null;
 if(ledger?.status==='VERIFIED_AND_DELETED'){console.log(JSON.stringify({...ledger,replay:'NO_NEW_DRAFT'},null,2));return;}
 const db=createSupplierServiceClient();
 const query=()=>db.from('staging_configuration_snapshots').select('*').eq('fabric_master_id','pt-4262-770').eq('customer_price_minor',60100).eq('shipping_gross_amount_minor',1295).order('recorded_at',{ascending:false}).limit(1).single();
 const {data:r,error}=await query();assert.ok(!error&&r,'IMMUTABLE_SADIRA_SNAPSHOT_REQUIRED');
 const snapshot={snapshotId:r.snapshot_id,configurationId:r.configuration_id,reviewRequestId:r.review_request_id,reviewRevisionId:r.review_revision_id,outcome:r.pricing_outcome,windowType:r.window_type_slug,measurements:r.measurements,fabricMasterId:r.fabric_master_id,supplierSku:r.supplier_sku,heading:r.heading,lining:r.lining,construction:r.construction,calculatedFabricMetres:Number(r.calculated_fabric_metres),pricingRuleVersion:r.pricing_rule_version,customerPrice:{netAmountMinor:r.net_amount_minor,vatAmountMinor:r.vat_amount_minor,grossAmountMinor:r.customer_price_minor,vatRateBasisPoints:r.vat_rate_basis_points,currency:'GBP'},availability:r.availability_state,shipping:{region:r.shipping_region,parcelClass:r.shipping_parcel_class,status:'READY',grossAmountMinor:r.shipping_gross_amount_minor,currency:'GBP',postcode:'SW1A1AA',shownSeparately:true,countsTowardGoodsMinimum:false,message:'Delivery'},customerAcceptedAt:r.customer_accepted_at,recordedAt:r.recorded_at};
 const contract=buildShopifyDraftOrderContract({handoff:prepareStagingCheckoutHandoff({handoffId:'7033417a-d8c5-4ab6-9b1c-ecb359190e93',snapshot,preparedAt:r.recorded_at}),fabricLabel:'Prestigious Textiles — Sadira — Lagoon'});
 const input={...contract.input,visibleToCustomer:false,tags:[...contract.input.tags,tag,'CURTAINSUK_TEST'],note:`CURTAINSUK TEST — INTERNAL VERIFICATION ONLY. DO NOT INVOICE, PAY OR FULFIL. Configuration ${snapshot.configurationId}.`};
 assert.ok(!input.email&&!input.customerId,'NO_CUSTOMER_ATTACHMENT');
 const digest=hash(input),snapshotDigest=hash(r);
 if(ledger){assert.equal(ledger.digest,digest,'REHEARSAL_CONFIGURATION_CHANGED');assert.equal(ledger.snapshotDigest,snapshotDigest);}
 const calculated=await gql(`mutation($input:DraftOrderInput!){draftOrderCalculate(input:$input){calculatedDraftOrder{${financials}} userErrors{field message}}}`,{input});
 assert.equal(calculated.draftOrderCalculate.userErrors.length,0,'CALCULATE_REJECTED');
 console.log(JSON.stringify({calculated:calculated.draftOrderCalculate.calculatedDraftOrder,expected:contract.expected}));
 assertShopifyDraftOrderFinancials(calculated.draftOrderCalculate.calculatedDraftOrder,contract.expected);
 if(!process.argv.includes('--create')){console.log(JSON.stringify({status:'CALCULATE_PASS',store,expected:contract.expected,snapshotId:snapshot.snapshotId}));return;}
 const find=async()=>{const d=await gql(`query($query:String!){draftOrders(first:2,query:$query){nodes{${fields}}}}`,{query:`tag:${tag}`});assert.ok(d.draftOrders.nodes.length<=1,'DUPLICATE_REHEARSAL_DRAFTS');return d.draftOrders.nodes[0];};
 let draft=ledger?.draftId?(await gql(`query($id:ID!){draftOrder(id:$id){${fields}}}`,{id:ledger.draftId})).draftOrder:await find();
 if(!draft){
  assert.ok(!ledger,'UNCERTAIN_CREATE_DO_NOT_RECREATE');
  ledger={status:'CREATING',digest,snapshotDigest,store};writeFileSync(ledgerPath,JSON.stringify(ledger,null,2),{flag:'wx'});
  const created=await gql(`mutation($input:DraftOrderInput!){draftOrderCreate(input:$input){draftOrder{${fields}} userErrors{field message}}}`,{input});
  assert.equal(created.draftOrderCreate.userErrors.length,0,'CREATE_REJECTED');draft=created.draftOrderCreate.draftOrder;
  ledger={...ledger,draftId:draft.id,draftName:draft.name,status:'CREATED'};writeFileSync(ledgerPath,JSON.stringify(ledger,null,2));
 }
 const validate=d=>{assert.ok(d&&d.status==='OPEN');assert.ok(d.tags.includes(tag));assertShopifyDraftOrderFinancials(d,contract.expected);for(const expected of input.customAttributes)assert.ok(d.customAttributes.some(a=>a.key===expected.key&&a.value===expected.value),'CONFIGURATION_ATTRIBUTE_MISMATCH');assert.equal(d.lineItems.nodes.length,1);assert.deepEqual(d.lineItems.nodes[0].customAttributes,input.lineItems[0].customAttributes);assert.equal(d.lineItems.nodes[0].sku,input.lineItems[0].sku);};
 ledger={...ledger,draftId:draft.id,draftName:draft.name,status:'CREATED'};writeFileSync(ledgerPath,JSON.stringify(ledger,null,2));
 validate(draft);
 // Repeat the same operator request by recorded ID, never by creating again.
 const replay=(await gql(`query($id:ID!){draftOrder(id:$id){${fields}}}`,{id:draft.id})).draftOrder;validate(replay);assert.equal(replay.id,draft.id);assert.equal(hash(replay),hash(draft),'DRAFT_MUTATED');
 const {data:after,error:afterError}=await query();assert.ok(!afterError);assert.equal(hash(after),snapshotDigest,'CONFIGURATION_MUTATED');
 // Only this exact, labelled, still-open rehearsal draft may be removed.
 const removed=await gql('mutation($input:DraftOrderDeleteInput!){draftOrderDelete(input:$input){deletedId userErrors{field message}}}',{input:{id:draft.id}});
 assert.equal(removed.draftOrderDelete.userErrors.length,0,'CLEANUP_FAILED');assert.equal(removed.draftOrderDelete.deletedId,draft.id);
 assert.equal((await gql('query($id:ID!){draftOrder(id:$id){id}}',{id:draft.id})).draftOrder,null);
 ledger={...ledger,status:'VERIFIED_AND_DELETED',verifiedAt:new Date().toISOString(),configurationId:snapshot.configurationId,fabricMasterId:snapshot.fabricMasterId,expected:contract.expected,idempotency:'PASS',immutability:'PASS',invoiceSent:false,paymentUrlExposed:false,orderCompleted:false};writeFileSync(ledgerPath,JSON.stringify(ledger,null,2));console.log(JSON.stringify(ledger,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
