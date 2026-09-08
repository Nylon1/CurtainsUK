/** Targeted owner-authorised portal observation through the existing append-only workflow. */
import {loadEnvConfig} from "@next/env";
import {readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import assert from "node:assert/strict";
import {fabricMasterRecordById,verifiedCutCostMinor} from "../lib/fabric-master/repository";
import {toDecisionEngineFabric} from "../lib/fabric-master/decision-engine";
import {calculateStagingPriceForTest,type StagingPriceRequest} from "../lib/storefront/staging-pricing";
import {normalizeSupplierSnapshot} from "../lib/supplier-sync/normalize";
import {SupplierIntelligenceService} from "../lib/supplier-intelligence/service";
import {SupabaseSupplierIntelligenceRepository} from "../lib/supplier-intelligence/supabase-repository";
import type {DurableSupplierSyncRun} from "../lib/supplier-intelligence/types";

async function main(){
 loadEnvConfig(process.cwd());
 assert.equal(new URL(process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL??"").hostname,"hqysjumypgeapgmqkcrx.supabase.co");
 const o=JSON.parse(await readFile("artifacts/phase5l/private/sdg-pilot-observation.json","utf8"));
 const record=await fabricMasterRecordById(o.fabricId);assert.ok(record);
 assert.equal(record.supplier_sku,o.supplierSku);assert.equal(record.design_name,o.design);assert.equal(record.colour_name,o.colour);
 assert.ok(Date.now()-Date.parse(o.checkedAt)<60*60*1000 && Date.parse(o.checkedAt)<=Date.now());
 // This rehearsal refreshes an already approved net cut-price basis only when the
 // current one-metre trade quote matches it. A changed/uncertain basis needs review.
 const previous=await verifiedCutCostMinor(record.supplier_id,record.supplier_sku);
 assert.equal(previous,Math.round(Number(o.cutPriceGbp)*100),"CURRENT_PORTAL_PRICE_DIFFERS_FROM_APPROVED_BASIS");
 const configuration:StagingPriceRequest={windowSlug:"standard-window",measurementBasis:"TRACK_WIDTH",widthCm:200,dropCm:220,fabricId:record.fabric_id,heading:"PENCIL_PLEAT",lining:"STANDARD",construction:"PAIR",stackDirection:"SPLIT"};
 const calculation=calculateStagingPriceForTest(configuration,toDecisionEngineFabric(record,previous,o.checkedAt));
 assert.ok(o.selectedPieceMetres>=calculation.fabricMetres);
 const snapshotId=`phase5l:${record.supplier_sku}:${createHash("sha256").update(JSON.stringify(o)).digest("hex").slice(0,16)}`;
 const repository=new SupabaseSupplierIntelligenceRepository();const service=new SupplierIntelligenceService(repository);
 if(process.argv.includes("--apply") && !await repository.snapshot(snapshotId)){
  const snapshot=normalizeSupplierSnapshot({snapshot_id:snapshotId,supplier_id:record.supplier_id,brand_id:record.brand_id,supplier_sku:record.supplier_sku,checked_at:o.checkedAt,cut_trade_price:o.cutPriceGbp,currency:"GBP",stock_unit:"METRE",aggregate_available_quantity:o.aggregateMetres,batches:[{batch_reference:`${o.batchReference}; piece ${o.pieceReference}`,batch_available_quantity:o.selectedPieceMetres,pieces:1}],sample_available:true,lifecycle_state:"CURRENT",source:{type:"MANUAL_PORTAL",name:"Phase 5L exact-SKU one-metre trade quote matches approved net cut basis; selected single piece verified",reference:`sdg-trade:product:${record.supplier_sku}`},verification_status:"VERIFIED"});
  const run:DurableSupplierSyncRun={run_id:snapshotId,supplier_id:record.supplier_id,adapter_id:"phase5l-authorised-manual-pilot",mode:"SHADOW",source_type:"MANUAL_PORTAL",source_name:snapshot.source.name,started_at:o.checkedAt,completed_at:o.checkedAt,status:"SUCCEEDED",snapshots_received:1,snapshots_appended:1,error_code:null,shopify_writes:0,production_schedule_created:false};
  const ingested=await service.ingest({run,snapshot,requiredPriceField:"CUT_TRADE_PRICE"});assert.equal(ingested.validation.status,"VALIDATED");
  await service.manuallyApprove({snapshotId,approvedBy:"554dcc42-4bb0-4db1-8ae8-d97413051548",reason:"Codex operator under owner Phase 5L instruction: exact SKU current one-metre quote matches approved net price; one current piece exceeds calculated requirement. Staging only; no supplier order or reservation."});
 }
 const projection=await service.projection({supplierId:record.supplier_id,supplierSku:record.supplier_sku,requirement:{quantity:calculation.fabricMetres,stock_unit:"METRE"}});
 const saved=await repository.snapshot(snapshotId);
 const report={checkedAt:o.checkedAt,fabricId:record.fabric_id,configurationId:calculation.configurationId,requiredMetres:calculation.fabricMetres,customerGrossMinor:calculation.totalAmountMinor,priceBasisMatches:true,suitableSinglePiece:true,snapshotId,stockExpiresAt:saved?.stock_expires_at??null,availability:projection.availability,applied:Boolean(saved),supplierOrders:0,reservations:0,shipping:"OWNER_DECISION_REQUIRED"};
 await writeFile("artifacts/phase5l/sdg-pilot-verification.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e?.code??"PILOT_VERIFICATION_FAILED");process.exitCode=1;});
