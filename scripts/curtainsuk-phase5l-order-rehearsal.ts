/* eslint-disable @typescript-eslint/no-explicit-any -- resumable JSON diagnostic report, never public API data */
import { loadEnvConfig } from '@next/env';
import { loadEnvFile } from 'node:process';
import { parseEnv, promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createSupplierServiceClient } from '../lib/supabase/supplier-service';
import { currentStagingShippingRates, appendStagingShippingRate, loadStagingUkShippingRules } from '../lib/storefront/shipping-repository';
import { STAGING_SHIPPING_OWNER_INPUTS as policy, shippingPolicyBlockers, quoteOwnerApprovedCurtainShipping } from '../lib/storefront/shipping-owner-inputs';
import { calculateStagingPrice } from '../lib/storefront/server-staging-pricing';
import { createStagingReviewRequest } from '../lib/storefront/review-request-repository';
import { getStaffReviewRequest, appendStaffReviewRevision, transitionStaffReviewRequest, persistStagingCheckoutSnapshotAndHandoff } from '../lib/storefront/review-operations-repository';
import { allocateVatInclusiveRetailTotal, evaluateCheckoutGate, createImmutableConfigurationSnapshot, prepareStagingCheckoutHandoff } from '../lib/storefront/checkout-gates';
import { executeShopifyDraftOrder, SHOPIFY_DRAFT_ORDER_BY_ID_QUERY } from '../lib/storefront/shopify-draft-order-server';
import { buildShopifyDraftOrderContract } from '../lib/storefront/shopify-draft-order-core';
import { persistShopifyDraftOrderExecution } from '../lib/storefront/shopify-draft-order-repository';
import { stagingCheckoutIdentity } from '../lib/storefront/checkout-idempotency';
import { fabricMasterRecordById, verifiedCutCostMinor } from '../lib/fabric-master/repository';
import { toDecisionEngineFabric } from '../lib/fabric-master/decision-engine';
import { buildStagingRuleSet, prepareStagingConfiguration, type StagingPriceRequest } from '../lib/storefront/staging-pricing';
import { calculatePrice } from '../lib/decision-engine/pricing-engine';
import { SupplierIntelligenceService } from '../lib/supplier-intelligence/service';
import { SupabaseSupplierIntelligenceRepository } from '../lib/supplier-intelligence/supabase-repository';

const file='artifacts/phase5l-owner-inputs/draft-rehearsal.json';
// Stable identities survive interrupted runs. Contains no tokens, costs or invoice URLs.
let report:any={checkedAt:new Date().toISOString(),store:'curtainsuk-dev.myshopify.com',routes:[],shipping:[],remoteDraftOrdersCreated:0};
async function save(){await mkdir('artifacts/phase5l-owner-inputs',{recursive:true});await writeFile(file,JSON.stringify(report,null,2)+'\n');}
async function main(){
 loadEnvConfig(process.cwd());loadEnvFile('.env.phase5e-staff');loadEnvFile('.env.phase5e-local');
 assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname,'hqysjumypgeapgmqkcrx.supabase.co');
 try{report=JSON.parse(await readFile(file,'utf8'));}catch{}
 process.env.CURTAINSUK_STAGING_REVIEW_SIGNING_SECRET ||= randomUUID()+randomUUID();
 assert.deepEqual(shippingPolicyBlockers(),[]);
 const auth=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false}});
 const signed=await auth.auth.signInWithPassword({email:process.env.PHASE5E_STAFF_EMAIL!,password:process.env.PHASE5E_STAFF_PASSWORD!});
 assert.equal(signed.error,null);const actor=signed.data.user!.id;assert.equal(actor,process.env.PHASE5E_STAFF_ID);
 const rates=await currentStagingShippingRates();
 for(const rate of policy.rates){const old=rates.find(r=>r.region===rate.region&&r.parcelClass===rate.parcelClass)!;assert.ok(old);
 if(old.status==='VALIDATED' && old.grossAmountMinor!==rate.grossAmountMinor && Date.parse(old.effectiveFrom)>Date.parse(policy.approvedAt!))throw Error('NEWER_OWNER_RATE_MUST_NOT_BE_OVERWRITTEN');
 if(old.status!=='VALIDATED'||old.grossAmountMinor!==rate.grossAmountMinor)await appendStagingShippingRate({expectedCurrentRateVersionId:old.rateVersionId,region:old.region,parcelClass:old.parcelClass,grossAmountMinor:rate.grossAmountMinor,status:'VALIDATED',actorId:'00000000-0000-4000-8000-000000000052',reason:'Owner explicitly approved staging matrix on 2026-09-08; applied by Codex staging operator. '+policy.version});}
 report.shipping=await currentStagingShippingRates();assert.equal(report.shipping.length,9);await save();
 const {stdout}=await promisify(execFile)('shopify',['app','env','show','--no-color'],{shell:true,timeout:45000});const app=parseEnv(stdout);assert.ok(app.SHOPIFY_API_KEY);assert.ok(app.SHOPIFY_API_SECRET);const store=report.store;
 assert.equal(store,'curtainsuk-dev.myshopify.com');
 const tokenResponse=await fetch(`https://${store}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:app.SHOPIFY_API_KEY,client_secret:app.SHOPIFY_API_SECRET}),signal:AbortSignal.timeout(30000)});const token=await tokenResponse.json();assert.ok(token.access_token,'Development token unavailable');
 async function gql(query:string,variables={}){const r=await fetch(`https://${store}/admin/api/2026-07/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token.access_token},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(30000)});const d=await r.json();if(d.errors){console.error(JSON.stringify(d.errors));throw Error('SHOPIFY_READ_QUERY_FAILED');}return d.data;}
 const shop=(await gql('{shop{myshopifyDomain currencyCode taxesIncluded plan{partnerDevelopment displayName}}}')).shop;
 assert.equal(shop.myshopifyDomain,store);assert.equal(shop.plan.partnerDevelopment,true);assert.equal(shop.currencyCode,'GBP');assert.equal(shop.taxesIncluded,true);
 report.safety={checkedAt:new Date().toISOString(),...shop,paymentSettingsChanged:false,paymentBannerVerifiedAt:'2026-09-08',paymentBanner:'Development stores can only process test payments'};await save();
 const config={mode:'CREATE_TEST_DRAFT' as const,deploymentStage:'STAGING' as const,shopDomain:store,clientId:app.SHOPIFY_API_KEY,clientSecret:app.SHOPIFY_API_SECRET,realPaymentsDisabledConfirmed:true,requestTimeoutMs:30000};
 const record=await fabricMasterRecordById('sdg-dapgpa203');assert.ok(record);
 const cost=await verifiedCutCostMinor(record.supplier_id,record.supplier_sku);const fabric=toDecisionEngineFabric(record,cost,record.source_effective_date??'');const rules=buildStagingRuleSet();
 const stockService=new SupplierIntelligenceService(new SupabaseSupplierIntelligenceRepository());
 const base:StagingPriceRequest={windowSlug:'standard-window',measurementBasis:'TRACK_WIDTH',widthCm:200,dropCm:220,fabricId:record.fabric_id,heading:'PENCIL_PLEAT',lining:'STANDARD',construction:'PAIR',stackDirection:'SPLIT'};
const singleRateRatesByRegion:Record<string,number> = { UK_MAINLAND:1295, HIGHLANDS_ISLANDS:1995, NORTHERN_IRELAND:1995 };
const cases=[{name:'INSTANT_PRICE',request:base,postcode:'SW1A 1AA',region:'UK_MAINLAND',parcel:{lengthMm:1200,weightGrams:10000},requiresDeliveryReview:false},
 {name:'PRICE_WITH_REVIEW',request:{...base,windowSlug:'bay-window',bayTrackOrPoleFitted:true,bayNumberOfSections:3,baySegmentWidthsCm:[80,180,80]},postcode:'IV1 1AA',region:'HIGHLANDS_ISLANDS',parcel:{lengthMm:1200,weightGrams:10000},requiresDeliveryReview:false},
 {name:'MANUAL_QUOTE',request:{...base,widthCm:700,lining:'BONDED' as const},postcode:'BT1 1AA',region:'NORTHERN_IRELAND',parcel:{lengthMm:1900,weightGrams:21000,specialistHandling:true},requiresDeliveryReview:true}];
for(const c of cases){
  let saved=report.routes.find((r:any)=>r.route===c.name);if(!saved){saved={route:c.name,configurationId:randomUUID(),status:'BLOCKED'};report.routes.push(saved);await save();}
  const initial=await calculateStagingPrice(c.request);assert.equal(initial.outcome,c.name);
  const prepared=prepareStagingConfiguration(c.request,fabric);const calculation=calculatePrice({...prepared,fabric,rules,mode:'CALIBRATION',shippingZone:'UK_MAINLAND'});
  if(c.name==='MANUAL_QUOTE')assert.equal(initial.totalAmountMinor,null);
  const price=allocateVatInclusiveRetailTotal(calculation.total.amountMinor);
  const stock=await stockService.projection({supplierId:record.supplier_id,supplierSku:record.supplier_sku,requirement:{quantity:calculation.fabricMetres,stock_unit:'METRE'}});
  saved.metres=calculation.fabricMetres;saved.stock=stock.availability;saved.initialPrice=initial.totalAmountMinor;saved.price=price;await save();
  assert.ok(['FABRIC_AVAILABLE','LIMITED_AVAILABILITY'].includes(stock.availability),'QUANTITY_SPECIFIC_STOCK_NOT_CONFIRMED');
  const approvedDelivery = c.requiresDeliveryReview
    ? {
        postcode: c.postcode.replace(/\s/g, ""),
        region: c.region as "UK_MAINLAND" | "HIGHLANDS_ISLANDS" | "NORTHERN_IRELAND",
        grossAmountMinor: singleRateRatesByRegion[c.region],
        reason: "Owner-approved delivery confirmation for specialist/heavy configuration.",
      }
    : undefined;
  const shipping=quoteOwnerApprovedCurtainShipping({postcode:c.postcode,selectedRegion:c.region,fabricMetres:calculation.fabricMetres,maximumDropCm:220,packedParcel:c.parcel,requiresDeliveryReview:c.requiresDeliveryReview,approvedDelivery, rules:await loadStagingUkShippingRules()});assert.equal(shipping.status,'READY');
  saved.shipping=shipping;saved.parcelEvidence={kind:'SYNTHETIC_STAGING_PACKED_PARCEL',...c.parcel};await save();
  let reviewState:null|'READY_FOR_CHECKOUT'=null;let revisionId:string|null=null;let requestId:string|null=saved.reviewRequestId??null;
  let measurements:Record<string,unknown>={coverage_width:initial.totalCoverageWidthCm,finished_drop:220,...(c.request.baySegmentWidthsCm?{bay_segment_widths:c.request.baySegmentWidthsCm,number_of_sections:3,track_or_pole_fitted:true}:{})};
  if(c.name!=='INSTANT_PRICE'){
   if(!requestId){const receipt=await createStagingReviewRequest({configuration:c.request,clientCalculation:{...initial},contact:{name:'Staging '+c.name,email:'phase5l-orders@curtainsuk.invalid',notes:'Owner-authorised synthetic rehearsal. Do not contact, fulfil, reserve or collect payment. Packed parcel is a test fixture.'},files:{photos:[],drawing:null}});requestId=receipt.requestId;saved.reviewRequestId=requestId;saved.configurationId=receipt.configurationId;await save();}
   let d=(await getStaffReviewRequest(requestId))!;const original=JSON.stringify(d.revisions[0]);
   const transition=async(state:'UNDER_REVIEW'|'APPROVED'|'READY_FOR_CHECKOUT')=>{await transitionStaffReviewRequest({requestId:requestId!,state,actorId:actor,reason:'Owner-authorised safe staging rehearsal: '+state,expectedState:d.request.review_state,expectedLatestRevisionId:String(d.revisions.at(-1)!.revision_id)});d=(await getStaffReviewRequest(requestId!))!;};
   if(d.request.review_state==='PENDING')await transition('UNDER_REVIEW');
   if(d.request.review_state==='UNDER_REVIEW'){
    await appendStaffReviewRevision({requestId,specification:{...d.revisions.at(-1)!.specification as object,availability_state:stock.availability,calculated_fabric_metres:calculation.fabricMetres,shipping_parcel_class:shipping.parcelClass,packed_parcel:c.parcel,packing_evidence:'SYNTHETIC_STAGING_REHEARSAL',delivery_postcode:c.postcode,delivery_gross_amount_minor:shipping.grossAmountMinor,shipping_policy_version:policy.version},actorId:actor,reason:'Staging staff quote from current verified real fabric and pricing engine; combined bonded layer where selected; synthetic delivery parcel.',finalPrice:{...price,vatRateBasisPoints:2000},pricingRuleVersion:rules.version,expectedState:d.request.review_state,expectedLatestRevisionId:String(d.revisions.at(-1)!.revision_id)});
    d=(await getStaffReviewRequest(requestId))!;await transition('APPROVED');
   }
   if(d.request.review_state==='APPROVED')await transition('READY_FOR_CHECKOUT');
   assert.equal(d.request.review_state,'READY_FOR_CHECKOUT');assert.equal(JSON.stringify(d.revisions[0]),original);
   revisionId=String(d.revisions.at(-1)!.revision_id);reviewState='READY_FOR_CHECKOUT';measurements=d.request.measurements;
   saved.reviewRevisionId=revisionId;saved.originalSubmissionImmutable=true;saved.staffActor=actor;saved.auditStates=d.events.map(e=>e.review_state);await save();
  }
  const gate=evaluateCheckoutGate({outcome:initial.outcome,price,fabricPricingEligible:true,technicallyValid:true,availability:stock.availability,reviewState,customerAccepted:true,shipping});assert.equal(gate.eligible,true);
  const identity=stagingCheckoutIdentity(saved.configurationId);const now=new Date().toISOString();
  const snapshot=createImmutableConfigurationSnapshot({...identity,configurationId:saved.configurationId,reviewRequestId:requestId,reviewRevisionId:revisionId,outcome:initial.outcome,windowType:c.request.windowSlug,measurements,fabricMasterId:record.fabric_id,supplierSku:record.supplier_sku,heading:c.request.heading,lining:c.request.lining,construction:'PAIR',calculatedFabricMetres:calculation.fabricMetres,pricingRuleVersion:rules.version,customerPrice:price,availability:stock.availability,shipping,customerAcceptedAt:now,recordedAt:now,gate});
  const handoff=prepareStagingCheckoutHandoff({handoffId:identity.handoffId,snapshot,preparedAt:now});
  const fabricLabel=[record.brand_name,record.design_name,record.colour_name].join(' — ');
  await persistStagingCheckoutSnapshotAndHandoff({snapshot,customerSummary:{windowType:c.request.windowSlug,measurements,fabric:{brand:record.brand_name,collection:record.collection_name,design:record.design_name,colour:record.colour_name},heading:c.request.heading,lining:c.request.lining,construction:'PAIR',availability:stock.availability,...(reviewState?{reviewState}:{}),vatIncluded:true,deliveryShownSeparately:true},handoffId:handoff.handoffId,preparedBy:actor});
  const contract=buildShopifyDraftOrderContract({handoff,fabricLabel});
  saved.snapshotId=snapshot.snapshotId;saved.expected=contract.expected;await save();
  const diagnosticFetch:typeof fetch=async(url,init)=>{const response=await fetch(url,init);if(String(url).endsWith('/graphql.json')){const json=await response.clone().json();const errors=json.data?.draftOrderCalculate?.userErrors??json.data?.draftOrderCreate?.userErrors;if(errors?.length)console.error(JSON.stringify(errors));}return response;};
  const execution=await executeShopifyDraftOrder({contract,config,existingDraftOrderId:saved.draftOrderId,fetchImpl:diagnosticFetch});
  assert.notEqual(execution.status,'DISABLED');if(execution.status==='DISABLED')throw Error('UNEXPECTED_DISABLED');
  await persistShopifyDraftOrderExecution({handoff,execution,executedBy:actor});
  saved.draftOrderId=execution.draftOrderId;saved.draftOrderName=execution.draftOrderName;saved.status='BLOCKED';saved.remoteStatus=execution.status;await save();
  const details=(await gql('query($id:ID!){draftOrder(id:$id){id note2 shippingAddress{countryCodeV2 zip} lineItems(first:2){nodes{title sku quantity taxable requiresShipping customAttributes{key value}}}}}',{id:execution.draftOrderId})).draftOrder;
  assert.equal(details.lineItems.nodes.length,1);const line=details.lineItems.nodes[0];
  assert.deepEqual(line.customAttributes,contract.input.lineItems[0].customAttributes);assert.equal(line.sku,contract.input.lineItems[0].sku);assert.equal(line.quantity,1);assert.equal(line.taxable,true);assert.equal(line.requiresShipping,true);
  assert.equal(details.shippingAddress.countryCodeV2,'GB');assert.equal(details.shippingAddress.zip.replace(/\s/g,''),shipping.postcode);
  assert.doesNotMatch(JSON.stringify(details),/supplier.?cost|trade.?price|margin|dye.?lot|batch.?reference/i);saved.remoteConfigurationDetails='PASS';
  // Simulated price exists only in this process; no false supplier observation is persisted.
  const before=JSON.stringify(snapshot);const remoteBefore=await gql(SHOPIFY_DRAFT_ORDER_BY_ID_QUERY,{id:execution.draftOrderId});
  const newerFabric={...fabric,supplierCostPerMetre:{amountMinor:cost+100,currency:'GBP' as const}};
  const simulatedConfiguration=prepareStagingConfiguration(c.request,newerFabric);
  const newer=calculatePrice({...simulatedConfiguration,fabric:newerFabric,rules,mode:'CALIBRATION',shippingZone:'UK_MAINLAND'});
  assert.ok(newer.total.amountMinor>price.grossAmountMinor);assert.equal(JSON.stringify(snapshot),before);
  const remoteAfter=await gql(SHOPIFY_DRAFT_ORDER_BY_ID_QUERY,{id:execution.draftOrderId});assert.deepEqual(remoteAfter,remoteBefore);
  const reused=await executeShopifyDraftOrder({contract,config,existingDraftOrderId:execution.draftOrderId});assert.equal(reused.status,'EXISTING_TEST_DRAFT_REUSED');assert.equal(reused.draftOrderId,execution.draftOrderId);
  const persisted=await createSupplierServiceClient().from('staging_configuration_snapshots').select('customer_price_minor').eq('snapshot_id',snapshot.snapshotId).single();assert.equal(persisted.error,null);assert.equal(persisted.data!.customer_price_minor,price.grossAmountMinor);
  saved.status='PASS';saved.immutability='PASS';saved.newSimulatedConfigurationPriceMinor=newer.total.amountMinor;saved.newSimulatedConfigurationId=simulatedConfiguration.configuration.id;saved.idempotentReplay='PASS';await save();
  console.log(JSON.stringify({route:c.name,status:saved.status,draftOrder:saved.draftOrderName,expected:saved.expected,immutability:saved.immutability}));
 }
 report.remoteDraftOrdersRetained=report.routes.filter((r:any)=>r.draftOrderId).length;report.remoteDraftOrdersCreated=report.remoteDraftOrdersRetained+(report.removedDuplicate?1:0);report.supplierPriceWrites=0;report.supplierOrders=0;report.completedAt=new Date().toISOString();delete report.lastError;report.developmentTaxChanges={ukVatCalculation:true,vatOnShipping:true,registrationNumberSupplied:false,productionChanged:false};await save();await auth.auth.signOut();
}
main().catch(async e=>{report.lastError=e instanceof Error?e.message:'REHEARSAL_FAILED';await save();console.error(report.lastError);process.exitCode=1;});
