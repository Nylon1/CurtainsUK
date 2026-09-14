/** Readback and in-memory price-change rehearsal. No fabricated supplier facts are persisted. */
import { loadEnvConfig } from "@next/env";
import { parseEnv,promisify } from "node:util";
import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { fabricMasterRecordById,verifiedCutCostMinor } from "../lib/fabric-master/repository";
import { toDecisionEngineFabric } from "../lib/fabric-master/decision-engine";
import { calculateStagingPriceForTest,type StagingPriceRequest } from "../lib/storefront/staging-pricing";

async function main(){
 loadEnvConfig(process.cwd());
 const {stdout}=await promisify(execFile)("shopify",["app","env","show","--no-color"],{shell:true,windowsHide:true,timeout:45000});
 const credentials=parseEnv(stdout),store="curtainsuk-dev.myshopify.com";
 assert.ok(credentials.SHOPIFY_API_KEY && credentials.SHOPIFY_API_SECRET,"Shopify CLI app credentials unavailable");
 const auth=await fetch(`https://${store}/admin/oauth/access_token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"client_credentials",client_id:credentials.SHOPIFY_API_KEY,client_secret:credentials.SHOPIFY_API_SECRET})});
 const token=await auth.json(); assert.ok(auth.ok&&token.access_token);
 const timings:{operation:string;ms:number}[]=[];
 async function gql(query:string,variables:Record<string,unknown>={}){
  const start=performance.now();const response=await fetch(`https://${store}/admin/api/2026-07/graphql.json`,{method:"POST",headers:{"Content-Type":"application/json","X-Shopify-Access-Token":token.access_token},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(30000)});
  const result=await response.json();assert.ok(response.ok&&!result.errors,JSON.stringify(result.errors));timings.push({operation:"shopify-read",ms:Math.round(performance.now()-start)});return result.data;
 }
 const safety=await gql('{shop{plan{partnerDevelopment} currencyCode taxesIncluded}}');assert.equal(safety.shop.plan.partnerDevelopment,true);assert.equal(safety.shop.currencyCode,"GBP");
 const db=createSupplierServiceClient();
 const readSnapshot=()=>db.from("staging_configuration_snapshots").select("*").eq("configuration_id","026eb64d-170b-445d-8c4c-1578c7337725").single();
 const before=await readSnapshot();assert.equal(before.error,null);const s=before.data;assert.ok(s);
 assert.equal(s.fabric_master_id,"pt-4262-770");assert.equal(s.customer_price_minor,60100);assert.equal(s.shipping_gross_amount_minor,1295);
 assert.equal(s.customer_summary.consultationContext.sessionId,"d8052224-4554-428c-9873-c94fefc665d4");assert.equal(s.customer_summary.consultationContext.strategyId,"overall");
 const query=`query($id:ID!){draftOrder(id:$id){id name status taxesIncluded customAttributes{key value} totalLineItemsPriceSet{shopMoney{amount currencyCode}} totalShippingPriceSet{shopMoney{amount}} totalPriceSet{shopMoney{amount}} totalTaxSet{shopMoney{amount}} lineItems(first:5){nodes{title quantity customAttributes{key value} originalUnitPriceSet{shopMoney{amount}}}} shippingAddress{zip countryCodeV2}}}`;
 const variables={id:"gid://shopify/DraftOrder/1611445469558"}; const initial=await gql(query,variables);const d=initial.draftOrder;
 assert.equal(d.name,"#D13");assert.equal(d.taxesIncluded,true);assert.equal(Number(d.totalLineItemsPriceSet.shopMoney.amount),601);assert.equal(Number(d.totalShippingPriceSet.shopMoney.amount),12.95);assert.equal(Number(d.totalPriceSet.shopMoney.amount),613.95);assert.equal(Number(d.totalTaxSet.shopMoney.amount),102.33);
 assert.equal(d.shippingAddress.zip.replace(/\s/g,""),"SW1A1AA");assert.equal(d.shippingAddress.countryCodeV2,"GB");
 const line=JSON.stringify(d.lineItems);assert.match(line,/Sadira/);assert.match(line,/Lagoon/);assert.match(line,/180/);assert.match(line,/210/);assert.match(line,/PENCIL PLEAT/);assert.match(line,/STANDARD/);assert.match(line,/PAIR/);assert.doesNotMatch(line,/supplier.?cost|cut.?trade|margin|dye.?lot|batch|aggregate.?metres/i);
 assert.ok(d.customAttributes.some((a:{key:string;value:string})=>a.key==="curtainsuk_configuration_id"&&a.value===s.configuration_id));
 const record=await fabricMasterRecordById(s.fabric_master_id);assert.ok(record);const cost=await verifiedCutCostMinor(record.supplier_id,record.supplier_sku);
 const input:StagingPriceRequest={windowSlug:"standard-window",measurementBasis:"TRACK_WIDTH",widthCm:180,dropCm:210,fabricId:s.fabric_master_id,heading:"PENCIL_PLEAT",lining:"STANDARD",construction:"PAIR",stackDirection:"SPLIT"};
 const original=calculateStagingPriceForTest(input,toDecisionEngineFabric(record,cost,"2026-09-14T08:48:17.000Z"));
 const revised=calculateStagingPriceForTest(input,toDecisionEngineFabric(record,cost+100,"2026-09-14T08:48:18.000Z"));
 assert.equal(original.totalAmountMinor,60100);assert.ok(revised.totalAmountMinor!>60100);assert.notEqual(revised.configurationId,original.configurationId);
 const after=await readSnapshot();assert.deepEqual(after.data,s);const repeated=await gql(query,variables);assert.deepEqual(repeated,initial);
 const report={checkedAt:new Date().toISOString(),configurationId:s.configuration_id,fabricId:s.fabric_master_id,draftOrder:d.name,draftOrderId:d.id,goodsMinor:60100,shippingMinor:1295,totalMinor:61395,vatIncludedMinor:10233,exactIdentity:"PASS",configurationDetails:"PASS",provenance:"PASS",privacy:"PASS",immutability:"PASS",newSimulatedConfigurationPriceMinor:revised.totalAmountMinor,priceSimulation:"IN_MEMORY_ONLY",supplierDataChanged:false,snapshotDigest:createHash("sha256").update(JSON.stringify(s)).digest("hex"),paymentEnabled:false,timings};
 await writeFile("artifacts/phase6-discovery/hci-sadira-order-proof.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

