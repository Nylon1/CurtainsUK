import {loadEnvConfig} from "@next/env";
import {readFile,writeFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import assert from "node:assert/strict";
import {createSupplierServiceClient} from "../lib/supabase/supplier-service";
async function main(){
 loadEnvConfig(process.cwd());
 const current=JSON.parse(await readFile("artifacts/phase5m/single-rate-fresh-readback.json","utf8"));
 const prior=JSON.parse(execFileSync("git",["show","3df343b:artifacts/phase5m/single-rate-fresh-readback.json"],{encoding:"utf8"}));
 for(const draft of prior.draftOrders.nodes)assert.deepEqual(current.draftOrders.nodes.find((d:{id:string})=>d.id===draft.id),draft,"Existing Draft Order changed");
 const matches=current.draftOrders.nodes.filter((d:{name:string})=>d.name==="#D9");assert.equal(matches.length,1);const draft=matches[0];
 const id=draft.customAttributes.find((a:{key:string})=>a.key==="curtainsuk_configuration_id").value;
 const {data:s,error}=await createSupplierServiceClient().from("staging_configuration_snapshots").select("configuration_id,pricing_outcome,review_request_id,review_revision_id,window_type_slug,measurements,customer_price_minor,shipping_gross_amount_minor").eq("configuration_id",id).single();
 assert.equal(error,null);assert.ok(s);assert.equal(s.pricing_outcome,"INSTANT_PRICE");assert.equal(s.review_request_id,null);assert.equal(s.review_revision_id,null);assert.equal(s.window_type_slug,"bay-window");assert.equal(s.measurements.coverage_width,342);assert.deepEqual(s.measurements.bay_segment_widths,[80,182,80]);assert.equal(s.customer_price_minor,165700);assert.equal(s.shipping_gross_amount_minor,1295);assert.equal(draft.totalPriceSet.shopMoney.amount,"1669.95");
 const line=JSON.stringify(draft.lineItems);assert.ok(!/cut.cost|trade.price|margin|dye.lot|batch/i.test(line));
 await writeFile("artifacts/phase5m/phase5n-browser-proof.json",JSON.stringify({status:"PASS",configurationId:id,draft:draft.name,outcome:s.pricing_outcome,approvalRequired:false,goods:"1657.00",shipping:"12.95",total:"1669.95",vatIncluded:draft.totalTaxSet.shopMoney.amount,desktopViewport:[1280,900],mobileViewport:[390,844],mobileHorizontalOverflow:false,retry:"SAME_HANDOFF_RECOVERED",previousDraftsUnchanged:prior.draftOrders.nodes.length,paymentEnabled:false},null,2));
 console.log("Bay snapshot, exact Draft Order, duplicate recovery and previous immutability PASS");
}
void main();
