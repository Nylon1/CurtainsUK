import assert from 'node:assert/strict';
import {getStaffReviewRequest,transitionStaffReviewRequest} from '../lib/storefront/review-operations-repository';
import {loadEnvFile} from 'node:process';
import {loadEnvConfig} from '@next/env';
import {execFile} from 'node:child_process';
import {parseEnv,promisify} from 'node:util';
import {readFile,writeFile} from 'node:fs/promises';
import {claimShopifyDraftOrderCreation} from '../lib/storefront/shopify-draft-order-repository';
import {createSupplierServiceClient} from '../lib/supabase/supplier-service';
import {assertShopifyDraftOrderFinancials,type ShopifyDraftOrderFinancialNode} from '../lib/storefront/shopify-draft-order-core';
import {SupplierIntelligenceService} from '../lib/supplier-intelligence/service';
import {SupabaseSupplierIntelligenceRepository} from '../lib/supplier-intelligence/supabase-repository';

async function main(){
loadEnvConfig(process.cwd());
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname,'hqysjumypgeapgmqkcrx.supabase.co');
const baseline=JSON.parse(await readFile('artifacts/phase5l-owner-inputs/draft-rehearsal.json','utf8'));
const db=createSupplierServiceClient();
// Claim only the already completed D1 handoff: no order can be created here.
const d1=baseline.routes[0];
const {data:handoff,error:handoffError}=await db.from('staging_checkout_handoffs').select('handoff_id').eq('snapshot_id',d1.snapshotId).single();
assert.equal(handoffError,null);assert.ok(handoff);
const before=await db.from('staging_draft_creation_claims').select('handoff_id').eq('handoff_id',handoff.handoff_id);assert.equal(before.error,null);
const concurrent=await Promise.all(Array.from({length:20},()=>claimShopifyDraftOrderCreation(handoff.handoff_id)));
assert.equal(concurrent.filter(Boolean).length,before.data!.length ? 0 : 1);
assert.equal(await claimShopifyDraftOrderCreation(handoff.handoff_id),false);
const stockService=new SupplierIntelligenceService(new SupabaseSupplierIntelligenceRepository());
const stock=await Promise.all(Array.from({length:6},()=>stockService.projection({supplierId:'sanderson-design-group',supplierSku:'DAPGPA203',requirement:{quantity:31.7,stock_unit:'METRE'}})));
assert.ok(stock.every(s=>s.availability===stock[0].availability));
const {stdout}=await promisify(execFile)('shopify',['app','env','show','--no-color'],{shell:true,timeout:45000});
const app=parseEnv(stdout);assert.ok(app.SHOPIFY_API_KEY && app.SHOPIFY_API_SECRET);const store='curtainsuk-dev.myshopify.com';
const response=await fetch(`https://${store}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:app.SHOPIFY_API_KEY,client_secret:app.SHOPIFY_API_SECRET}),signal:AbortSignal.timeout(30000)});
const token=await response.json();assert.ok(response.ok && token.access_token,'Development authentication unavailable');
async function gql(query:string,variables={}){const r=await fetch(`https://${store}/admin/api/2026-07/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token.access_token},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(30000)});const result=await r.json();assert.ok(r.ok&&!result.errors,'Development read failed');return result.data;}
const shop=(await gql('{shop{myshopifyDomain currencyCode taxesIncluded plan{partnerDevelopment displayName}}}')).shop;
assert.equal(shop.myshopifyDomain,store);assert.equal(shop.plan.partnerDevelopment,true);assert.equal(shop.taxesIncluded,true);
const drafts=[];
for(const route of baseline.routes){
 const {draftOrder:node}=await gql(`query($id:ID!){draftOrder(id:$id){id name status tags customAttributes{key value} taxesIncluded presentmentCurrencyCode totalLineItemsPriceSet{presentmentMoney{amount currencyCode}} subtotalPriceSet{presentmentMoney{amount currencyCode}} totalShippingPriceSet{presentmentMoney{amount currencyCode}} totalTaxSet{presentmentMoney{amount currencyCode}} totalDiscountsSet{presentmentMoney{amount currencyCode}} totalPriceSet{presentmentMoney{amount currencyCode}}}}`,{id:route.draftOrderId});
 assert.equal(node.status,'OPEN');assert.equal(node.name,route.draftOrderName);
 assertShopifyDraftOrderFinancials(node as ShopifyDraftOrderFinancialNode,route.expected);
 drafts.push({name:node.name,id:node.id,goods:route.expected.goodsGrossAmountMinor,shipping:route.expected.shippingGrossAmountMinor,total:route.expected.orderGrossAmountMinor,vat:route.expected.orderVatAmountMinor,status:'PASS'});
}
loadEnvFile('.env.phase5e-staff');
const review=await getStaffReviewRequest('d20588fc-8bc1-437a-bf91-31fc3d18b70b');assert.ok(review);assert.equal(review.request.review_state,'APPROVED');
const repeatApprovals=await Promise.allSettled(Array.from({length:8},()=>transitionStaffReviewRequest({requestId:review.request.request_id,state:'APPROVED',actorId:process.env.PHASE5E_STAFF_ID!,reason:'Phase 5M controlled stale approval retry, must not append an event',expectedState:'UNDER_REVIEW',expectedLatestRevisionId:String(review.revisions.at(-1)!.revision_id)})));
assert.ok(repeatApprovals.every(r=>r.status==='rejected' && r.reason instanceof Error && r.reason.message==='REVIEW_CONFLICT'));
const afterReview=await getStaffReviewRequest(review.request.request_id);assert.deepEqual(afterReview,review);
const report={approvalRetries:{requests:8,duplicateRevisions:0,duplicateEvents:0,status:'PASS'},checkedAt:new Date().toISOString(),scope:'Staging persistence and read-only development Shopify verification; not browser checkout proof',developmentShop:shop,claims:{requests:20,newClaims:concurrent.filter(Boolean).length,retryCreatesClaim:false,status:'PASS'},stock:{requests:6,requirementMetres:31.7,publicAvailability:stock[0].availability,status:'PASS'},drafts,shopifyWrites:0,realPaymentsEnabled:false};
await writeFile('artifacts/phase5m/operational-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

}
main().catch(()=>{console.error("PHASE5M_OPERATIONAL_CHECK_FAILED");process.exitCode=1;});
