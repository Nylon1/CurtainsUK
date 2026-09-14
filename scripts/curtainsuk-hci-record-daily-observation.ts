/** Staging-only, exact-identity portal evidence through the existing governed workflow. */
import { loadEnvConfig } from "@next/env";
import { loadEnvFile } from "node:process";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { fabricMasterRecordById, verifiedCutCostMinor } from "../lib/fabric-master/repository";
import { normalizeSupplierSnapshot } from "../lib/supplier-sync/normalize";
import { SupplierIntelligenceService } from "../lib/supplier-intelligence/service";
import { SupabaseSupplierIntelligenceRepository } from "../lib/supplier-intelligence/supabase-repository";
import { dailyStockDecision } from "../lib/storefront/daily-stock";

async function main() {
  loadEnvConfig(process.cwd()); loadEnvFile(".env.phase5e-staff");
  const url=process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  assert.equal(new URL(url).hostname,"hqysjumypgeapgmqkcrx.supabase.co");
  const observation=JSON.parse(await readFile(process.argv[2],"utf8"));
  assert.ok(Date.now()-Date.parse(observation.checkedAt)<3600000 && Date.parse(observation.checkedAt)<=Date.now(),"Fresh genuine observation required");
  assert.ok(Number.isFinite(observation.aggregateMetres) && observation.aggregateMetres>=0);
  const record=await fabricMasterRecordById(observation.fabricId); assert.ok(record);
  assert.equal(record.supplier_sku,observation.supplierSku);
  assert.equal(record.design_name,observation.design); assert.equal(record.colour_name,observation.colour);
  assert.equal(await verifiedCutCostMinor(record.supplier_id,record.supplier_sku),Math.round(Number(observation.cutPriceGbp)*100),"Changed price requires governed review; do not force the previous customer price");
  const db=createSupplierServiceClient();
  const auth=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false}});
  const signed=await auth.auth.signInWithPassword({email:process.env.PHASE5E_STAFF_EMAIL!,password:process.env.PHASE5E_STAFF_PASSWORD!});
  assert.equal(signed.error,null); const actor=signed.data.user!.id;
  await auth.auth.signOut({scope:"local"});
  const snapshotId=`hci-daily:${record.supplier_sku}:${createHash("sha256").update(JSON.stringify(observation)).digest("hex").slice(0,20)}`;
  const repo=new SupabaseSupplierIntelligenceRepository(); const service=new SupplierIntelligenceService(repo);
  if(!await repo.snapshot(snapshotId)) {
    const snapshot=normalizeSupplierSnapshot({snapshot_id:snapshotId,supplier_id:record.supplier_id,brand_id:record.brand_id,supplier_sku:record.supplier_sku,checked_at:observation.checkedAt,cut_trade_price:observation.cutPriceGbp,currency:"GBP",stock_unit:"METRE",aggregate_available_quantity:observation.aggregateMetres,batches:null,sample_available:observation.sampleAvailable,lifecycle_state:"UNKNOWN",source:{type:"MANUAL_PORTAL",name:"Owner-authorised exact-SKU Webtex aggregate stock observation",reference:`webtex:product:${record.supplier_sku}`},verification_status:"VERIFIED"});
    const saved=await service.ingest({snapshot,requiredPriceField:"CUT_TRADE_PRICE",run:{run_id:snapshotId,supplier_id:record.supplier_id,adapter_id:"prestigious-webtex",mode:"SHADOW",source_type:"MANUAL_PORTAL",source_name:snapshot.source.name,started_at:observation.checkedAt,completed_at:observation.checkedAt,status:"SUCCEEDED",snapshots_received:1,snapshots_appended:1,error_code:null,shopify_writes:0,production_schedule_created:false}});
    assert.equal(saved.validation.status,"VALIDATED",saved.validation.errors.join(","));
  }
  const {data:approval,error:approvalError}=await db.from("supplier_promotion_events").select("promotion_state").eq("snapshot_id",snapshotId).order("created_at",{ascending:false}).limit(1).single();
  assert.equal(approvalError,null);
  if(approval.promotion_state!=="APPROVED_FOR_PROJECTION") await service.manuallyApprove({snapshotId,approvedBy:actor,reason:"Owner-authorised HCI staging rehearsal: exact Sadira Lagoon identity; current aggregate free stock read in authenticated Webtex. No batches, reservation or supplier order. Current cut price matches approved basis."});
  const materialized=await db.rpc("materialize_daily_stock"); assert.equal(materialized.error,null);
  const position=await db.rpc("daily_stock_position",{p_supplier:record.supplier_id,p_sku:record.supplier_sku}); assert.equal(position.error,null); assert.ok(position.data);
  assert.equal(new Date(position.data.checkedAt).toISOString(),observation.checkedAt);
  assert.equal(position.data.aggregateMetres,observation.aggregateMetres);
  const decision=dailyStockDecision(position.data);
  const report={fabricId:record.fabric_id,snapshotId,checkedAt:observation.checkedAt,status:decision.status,availability:decision.availability,stale:decision.stale,aggregateOnly:true,priceBasisUnchanged:true,supplierOrders:0};
  await writeFile("artifacts/phase6-discovery/hci-sadira-daily-verification.json",JSON.stringify(report,null,2)); console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
