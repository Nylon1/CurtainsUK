/** Read-only staging preflight. Supplier commercial values stay in memory. */
import { loadEnvConfig } from "@next/env";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fabricMasterRecordById, verifiedCutCostMinor } from "../lib/fabric-master/repository";
import { toDecisionEngineFabric } from "../lib/fabric-master/decision-engine";
import { buildStagingRuleSet, prepareStagingConfiguration, calculateStagingPriceForTest, type StagingPriceRequest } from "../lib/storefront/staging-pricing";
import { calculatePrice } from "../lib/decision-engine/pricing-engine";
import { shippingPolicyBlockers, quoteOwnerApprovedCurtainShipping } from "../lib/storefront/shipping-owner-inputs";
import { STAGING_UK_SHIPPING_RULES } from "../lib/storefront/shipping";
import { SupplierIntelligenceService } from "../lib/supplier-intelligence/service";
import { SupabaseSupplierIntelligenceRepository } from "../lib/supplier-intelligence/supabase-repository";
import { allocateVatInclusiveRetailTotal } from "../lib/storefront/checkout-gates";

async function main() {
 loadEnvConfig(process.cwd());
 assert.equal(new URL(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname, "hqysjumypgeapgmqkcrx.supabase.co");
 assert.ok(shippingPolicyBlockers().length > 0, "Shipping policy is now populated: run the full Draft Order rehearsal instead of this blocked preflight");
 const record = await fabricMasterRecordById("sdg-dapgpa203"); assert.ok(record);
 const cost = await verifiedCutCostMinor(record.supplier_id, record.supplier_sku);
 const fabric = toDecisionEngineFabric(record, cost, record.source_effective_date ?? "");
 const rules = buildStagingRuleSet();
 const availability = new SupplierIntelligenceService(new SupabaseSupplierIntelligenceRepository());
 const base: StagingPriceRequest = {windowSlug:"standard-window",measurementBasis:"TRACK_WIDTH",widthCm:200,dropCm:220,fabricId:record.fabric_id,heading:"PENCIL_PLEAT",lining:"STANDARD",construction:"PAIR",stackDirection:"SPLIT"};
 const cases = [];
 for (const request of [base, {...base,lining:"BONDED" as const}, {...base,windowSlug:"bay-window",bayTrackOrPoleFitted:true,bayNumberOfSections:3,baySegmentWidthsCm:[80,180,80]}]) {
  const {configuration,windowType} = prepareStagingConfiguration(request,fabric);
  const result = calculatePrice({configuration,windowType,fabric,rules,mode:"CALIBRATION",shippingZone:"UK_MAINLAND"});
  const stock = await availability.projection({supplierId:record.supplier_id,supplierSku:record.supplier_sku,requirement:{quantity:result.fabricMetres,stock_unit:"METRE"}});
  const shipping=quoteOwnerApprovedCurtainShipping({postcode:"SW1A 1AA",selectedRegion:"UK_MAINLAND",fabricMetres:result.fabricMetres,maximumDropCm:220,rules:STAGING_UK_SHIPPING_RULES});
  const original=JSON.stringify(result);
  const newerFabric={...fabric,supplierCostPerMetre:{amountMinor:cost+100,currency:"GBP" as const}};
  const newerConfiguration=prepareStagingConfiguration(request,newerFabric).configuration;
  const newer=calculatePrice({configuration:newerConfiguration,windowType,fabric:newerFabric,rules,mode:"CALIBRATION",shippingZone:"UK_MAINLAND"});
  assert.equal(JSON.stringify(result),original); assert.ok(newer.total.amountMinor>result.total.amountMinor);
  const lining=result.components.find(c=>c.code==="LINING_MATERIAL")!;
  if(request.lining==="BONDED") { assert.equal(lining.netAmount.amountMinor,Number(lining.metadata?.metres)*500); assert.equal(result.components.some(c=>c.code.startsWith("INTERLINING_")),false); }
  cases.push({window:request.windowSlug,lining:request.lining,fabricId:record.fabric_id,metres:result.fabricMetres,fabricWidths:result.fabricWidths.totalWidths,price:allocateVatInclusiveRetailTotal(result.total.amountMinor),availability:stock?.availability ?? "UNKNOWN",shippingStatus:shipping.status,shippingGrossAmountMinor:shipping.grossAmountMinor,calculationImmutability:"PASS",newConfigurationUsesSimulatedPrice:true});
 }
 const manual=calculateStagingPriceForTest({...base,widthCm:700},fabric);
 assert.equal(manual.outcome,"MANUAL_QUOTE"); assert.equal(manual.totalAmountMinor,null);
 const report={checkedAt:new Date().toISOString(),pricingVersion:rules.version,fabric:record.fabric_id,cases,manualQuoteInitialPrice:null,shippingBlockers:shippingPolicyBlockers(),routes:{INSTANT_PRICE:"BLOCKED",PRICE_WITH_REVIEW:"BLOCKED",MANUAL_QUOTE:"BLOCKED"},reason:"Shipping matrix and operational rules are absent; staff approval/remote order steps not repeated past this prerequisite.",remoteDraftOrdersCreated:0,remoteOrderImmutability:"BLOCKED",supplierPriceWrites:0,supplierOrders:0,stagingDatabaseWrites:0};
 await mkdir("artifacts/phase5l-owner-inputs",{recursive:true});
 await writeFile("artifacts/phase5l-owner-inputs/preflight.json",JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:"PREFLIGHT_FAILED");process.exitCode=1;});
