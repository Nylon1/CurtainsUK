import { createHash, randomUUID } from "node:crypto";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { SdgPortalSession } from "../lib/supplier-sync/adapters/sdg-portal-session";
import { SDG_PORTAL_DETAIL_URL } from "../lib/supplier-sync/adapters/sanderson-design-group";
import { normalizeSupplierSnapshot } from "../lib/supplier-sync/normalize";
import { validateSupplierIntelligenceSnapshot } from "../lib/supplier-intelligence/validation";
import { createValidationEvent } from "../lib/supplier-intelligence/promotion";

const SUPPLIER = "sanderson-design-group";
const SOURCE = "SDG authenticated trade portal Product/detail live price recovery";
const BATCH = 100;
const sleep = (ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));

type Identity={supplier_sku:string;brand_id:string;lifecycle_state:"CURRENT"|"UNKNOWN"};
type PriceRow={supplierSku:string;brandId:string;lifecycleState:"CURRENT"|"UNKNOWN";checkedAt:string;unitPrice:number};

async function identities():Promise<Identity[]>{
  const db=createSupplierServiceClient();
  const out:Identity[]=[];
  for(let offset=0;;offset+=1000){
    const {data,error}=await db.from("fabric_colourways")
      .select("supplier_sku,brand_id,lifecycle_state")
      .eq("supplier_id",SUPPLIER)
      .eq("price_verification_status","VERIFIED")
      .neq("lifecycle_state","DISCONTINUED")
      .order("supplier_sku")
      .range(offset,offset+999);
    if(error)throw new Error("SDG_PRICE_RECOVERY_MANIFEST_READ_FAILED");
    for(const row of data??[]){
      if(typeof row.supplier_sku!=="string"||typeof row.brand_id!=="string"||!["CURRENT","UNKNOWN"].includes(row.lifecycle_state))throw new Error("SDG_PRICE_RECOVERY_MANIFEST_INVALID");
      out.push(row as Identity);
    }
    if((data??[]).length<1000)break;
  }
  if(out.length!==6700||new Set(out.map(x=>x.supplier_sku)).size!==out.length)throw new Error(`SDG_PRICE_RECOVERY_MANIFEST_COVERAGE_CHANGED:${out.length}`);
  return out;
}

async function fetchBatch(session:SdgPortalSession,batch:Identity[]):Promise<PriceRow[]>{
  let response:Response|undefined;
  for(let attempt=1;attempt<=3;attempt++){
    const token=await session.getBearerToken();
    try{
      response=await fetch(SDG_PORTAL_DETAIL_URL,{
        method:"POST",
        headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({price:true,stock:false,options:false,productCriteria:batch.map(x=>({productCode:x.supplier_sku,orderUnit:"",orderQuantity:1}))}),
        cache:"no-store",
        signal:AbortSignal.timeout(20000),
      });
    }catch{
      if(attempt===3)throw new Error("SDG_PRICE_RECOVERY_NETWORK_FAILED");
      await sleep(attempt*1000);continue;
    }
    if(response.status===401||response.status===403)throw new Error("SDG_PRICE_RECOVERY_AUTH_FAILED");
    if(response.status===429){
      if(attempt===3)throw new Error("SDG_PRICE_RECOVERY_RATE_LIMITED");
      const seconds=Math.min(30,Math.max(1,Number(response.headers.get("retry-after")||attempt*5)));
      await sleep(seconds*1000);continue;
    }
    if(response.status>=500&&attempt<3){await sleep(attempt*1000);continue;}
    break;
  }
  if(!response?.ok)throw new Error(`SDG_PRICE_RECOVERY_HTTP_${response?.status??"NO_RESPONSE"}`);
  const payload:unknown=await response.json();
  if(!Array.isArray(payload))throw new Error("SDG_PRICE_RECOVERY_SHAPE_CHANGED");
  const requested=new Map(batch.map(x=>[x.supplier_sku,x]));
  const seen=new Set<string>(); const checkedAt=new Date().toISOString(); const rows:PriceRow[]=[];
  for(const raw of payload){
    if(!raw||typeof raw!=="object")throw new Error("SDG_PRICE_RECOVERY_SHAPE_CHANGED");
    const item=raw as Record<string,unknown>;
    const sku=typeof item.productCode==="string"?item.productCode:"";
    const identity=requested.get(sku);
    if(!identity||seen.has(sku))throw new Error("SDG_PRICE_RECOVERY_IDENTITY_MISMATCH");
    const unit=typeof item.productStockUnit==="string"?item.productStockUnit.trim().toLowerCase():"";
    const unitPrice=typeof item.unitPrice==="number"?item.unitPrice:Number.NaN;
    const linePrice=typeof item.linePrice==="number"?item.linePrice:Number.NaN;
    if(unit!=="metre"||!Number.isFinite(unitPrice)||unitPrice<=0||Math.round(unitPrice*100)!==Math.round(linePrice*100))throw new Error(`SDG_PRICE_RECOVERY_PRICE_INVALID:${sku}`);
    seen.add(sku);rows.push({supplierSku:sku,brandId:identity.brand_id,lifecycleState:identity.lifecycle_state,checkedAt,unitPrice});
  }
  if(rows.length!==batch.length)throw new Error(`SDG_PRICE_RECOVERY_BATCH_COVERAGE_CHANGED:${batch.length}:${rows.length}`);
  return rows;
}

async function main(){
  const manifest=await identities();
  const session=new SdgPortalSession({email:process.env.SDG_TRADE_EMAIL??"",password:process.env.SDG_TRADE_PASSWORD??""});
  await session.login();

  // Read and validate the complete cohort before any recovery write.
  const prices:PriceRow[]=[];
  for(let offset=0;offset<manifest.length;offset+=BATCH){
    prices.push(...await fetchBatch(session,manifest.slice(offset,offset+BATCH)));
    if((offset/BATCH+1)%10===0)console.log(JSON.stringify({event:"SDG_PRICE_RECOVERY_READ_PROGRESS",read:prices.length,total:manifest.length}));
  }
  if(prices.length!==manifest.length||new Set(prices.map(x=>x.supplierSku)).size!==manifest.length)throw new Error("SDG_PRICE_RECOVERY_FULL_COVERAGE_FAILED");

  const controls:Record<string,number>={"DAPGPA203":43.17,"F1740/03":21,"F1325/03":18.67,"F1681/03":16.33,"F1069/34":25.67};
  for(const [sku,expected] of Object.entries(controls)){
    const row=prices.find(x=>x.supplierSku===sku);
    if(!row||Math.round(row.unitPrice*100)!==Math.round(expected*100))throw new Error(`SDG_PRICE_RECOVERY_CONTROL_MISMATCH:${sku}`);
  }

  const db=createSupplierServiceClient();
  let written=0,approved=0;
  for(let offset=0;offset<prices.length;offset+=BATCH){
    const batch=prices.slice(offset,offset+BATCH);
    const batchNo=String(Math.floor(offset/BATCH)+1).padStart(3,"0");
    const runId=`sdg-price-recovery-20261002:${batchNo}:${randomUUID()}`;
    const eventAt=new Date().toISOString();
    const items=batch.map(row=>{
      const digest=createHash("sha256").update(JSON.stringify([row.supplierSku,row.checkedAt,row.unitPrice])).digest("hex").slice(0,20);
      const snapshot=normalizeSupplierSnapshot({
        snapshot_id:`sdg-price-recovery:${row.supplierSku}:${digest}`,
        supplier_id:SUPPLIER,brand_id:row.brandId,supplier_sku:row.supplierSku,
        checked_at:row.checkedAt,cut_trade_price:row.unitPrice.toFixed(2),currency:"GBP",
        stock_unit:null,aggregate_available_quantity:null,batches:null,next_due_date:null,next_due_quantity:null,
        sample_available:null,lifecycle_state:row.lifecycleState,
        source:{type:"MANUAL_PORTAL",name:SOURCE,reference:`sdg:Product/detail:price:${row.supplierSku}`},
        verification_status:"VERIFIED",
      });
      const validation=validateSupplierIntelligenceSnapshot(snapshot,{
        known_supplier:true,known_sku:true,allowed_currencies:["GBP"],allowed_stock_units:["METRE"],
        required_price_field:"CUT_TRADE_PRICE",freshness_policies:[],
      },new Date());
      if(validation.status!=="VALIDATED")throw new Error(`SDG_PRICE_RECOVERY_VALIDATION_FAILED:${row.supplierSku}:${validation.errors.join(",")}`);
      return {
        row,snapshot,validation,
        item:{snapshot:{...snapshot,run_id:runId,source_type:snapshot.source.type,source_name:snapshot.source.name,source_reference:snapshot.source.reference,
          validation_status:validation.status,validation_errors:validation.errors,stock_expires_at:validation.stock_expires_at,
          price_expires_at:validation.price_expires_at,lifecycle_expires_at:validation.lifecycle_expires_at,normalized_payload:{...snapshot,recovery:{incident:"2026-10-02-stock-retention-price-evidence-deletion",inferred:false,live_supplier_read:true,price_changed:null}}},
          validation_event:createValidationEvent(snapshot.snapshot_id,validation,eventAt)}
      };
    });

    const run={run_id:runId,supplier_id:SUPPLIER,adapter_id:"sdg-live-price-recovery",mode:"SHADOW",source_type:"MANUAL_PORTAL",source_name:SOURCE,
      started_at:batch[0].checkedAt,completed_at:batch[batch.length-1].checkedAt,status:"SUCCEEDED",snapshots_received:items.length,snapshots_appended:items.length,
      error_code:null,shopify_writes:0,production_schedule_created:false};

    const {error:appendError}=await db.rpc("append_supplier_snapshot_batch",{p_run:run,p_items:items.map(x=>x.item)});
    if(appendError)throw new Error("SDG_PRICE_RECOVERY_APPEND_FAILED");
    written+=items.length;

    const events=items.map(({snapshot})=>({
      event_id:`${snapshot.snapshot_id}:price-recovery-policy`,snapshot_id:snapshot.snapshot_id,promotion_state:"APPROVED_FOR_PROJECTION",
      actor_type:"POLICY",actor_id:null,
      reason:"Restored previously approved exact-SKU SDG cut-price evidence after accidental stock-retention deletion using a fresh authorised Product/detail price:true read. Five surviving controls matched exactly; no inference, stock write, supplier order or Shopify write.",
      rejection_reason:null,previous_approved_snapshot_id:null,created_at:new Date().toISOString()
    }));
    const {error:approvalError}=await db.from("supplier_promotion_events").insert(events);
    if(approvalError)throw new Error("SDG_PRICE_RECOVERY_APPROVAL_FAILED");
    approved+=events.length;

    // Read back the batch before continuing.
    const ids=items.map(x=>x.snapshot.snapshot_id);
    const {data:check,error:checkError}=await db.from("supplier_snapshots")
      .select("snapshot_id,supplier_sku,validation_status,prices:supplier_snapshot_prices!inner(cut_trade_price,currency)")
      .in("snapshot_id",ids);
    if(checkError||(check??[]).length!==ids.length)throw new Error("SDG_PRICE_RECOVERY_READBACK_FAILED");
    for(const row of check??[]){
      const expected=items.find(x=>x.snapshot.snapshot_id===row.snapshot_id)!;
      const rel=Array.isArray(row.prices)?row.prices[0]:row.prices;
      if(row.validation_status!=="VALIDATED"||rel?.currency!=="GBP"||Math.round(Number(rel?.cut_trade_price)*100)!==Math.round(expected.row.unitPrice*100))throw new Error("SDG_PRICE_RECOVERY_READBACK_MISMATCH");
    }
    if((offset/BATCH+1)%10===0)console.log(JSON.stringify({event:"SDG_PRICE_RECOVERY_WRITE_PROGRESS",written,approved,total:prices.length}));
  }

  if(written!==manifest.length||approved!==manifest.length)throw new Error("SDG_PRICE_RECOVERY_FINAL_COUNT_MISMATCH");
  console.log(JSON.stringify({outcome:"SUCCEEDED",manifest:manifest.length,read:prices.length,written,approved,controlsMatched:Object.keys(controls).length,shopifyWrites:0,stockWrites:0,supplierOrders:0}));
}
main().catch((e)=>{console.error(JSON.stringify({outcome:"FAILED",code:e instanceof Error?e.message:"SDG_PRICE_RECOVERY_FAILED"}));process.exitCode=1;});
