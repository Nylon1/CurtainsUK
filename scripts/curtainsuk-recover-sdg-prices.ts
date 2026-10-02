import { createHash, randomUUID } from "node:crypto";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { SdgPortalSession } from "../lib/supplier-sync/adapters/sdg-portal-session";
import { SDG_PORTAL_DETAIL_URL } from "../lib/supplier-sync/adapters/sanderson-design-group";
import { normalizeSupplierSnapshot } from "../lib/supplier-sync/normalize";
import { validateSupplierIntelligenceSnapshot } from "../lib/supplier-intelligence/validation";
import { createValidationEvent } from "../lib/supplier-intelligence/promotion";

const SUPPLIER="sanderson-design-group";
const SOURCE="SDG authenticated trade portal Product/detail live price recovery";
const READ_BATCH=100;
const WRITE_BATCH=25;
const APPROVAL_BATCH=10;
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));

type Identity={supplier_sku:string;brand_id:string;lifecycle_state:"CURRENT"|"UNKNOWN"};
type PriceRow={supplierSku:string;brandId:string;lifecycleState:"CURRENT"|"UNKNOWN";checkedAt:string;unitPrice:number};

async function targetMissing():Promise<Identity[]>{
  const db=createSupplierServiceClient();
  const manifest:Identity[]=[];
  for(let offset=0;;offset+=1000){
    const {data,error}=await db.from("fabric_colourways")
      .select("supplier_sku,brand_id,lifecycle_state")
      .eq("supplier_id",SUPPLIER).eq("price_verification_status","VERIFIED")
      .neq("lifecycle_state","DISCONTINUED").order("supplier_sku").range(offset,offset+999);
    if(error)throw new Error("SDG_PRICE_RESUME_MANIFEST_READ_FAILED");
    manifest.push(...((data??[]) as Identity[]));
    if((data??[]).length<1000)break;
  }
  if(manifest.length!==6700)throw new Error(`SDG_PRICE_RESUME_MANIFEST_CHANGED:${manifest.length}`);
  const recovered=new Set<string>();
  for(let offset=0;;offset+=1000){
    const {data,error}=await db.from("supplier_snapshots").select("supplier_sku")
      .eq("supplier_id",SUPPLIER).eq("source_name",SOURCE).order("supplier_sku").range(offset,offset+999);
    if(error)throw new Error("SDG_PRICE_RESUME_RECOVERY_READ_FAILED");
    for(const row of data??[])recovered.add(row.supplier_sku);
    if((data??[]).length<1000)break;
  }
  const missing=manifest.filter(x=>!recovered.has(x.supplier_sku));
  if(missing.length!==200)throw new Error(`SDG_PRICE_RESUME_TARGET_CHANGED:${missing.length}`);
  return missing;
}

async function fetchBatch(session:SdgPortalSession,batch:Identity[]):Promise<PriceRow[]>{
  let response:Response|undefined;
  for(let attempt=1;attempt<=3;attempt++){
    const token=await session.getBearerToken();
    try{
      response=await fetch(SDG_PORTAL_DETAIL_URL,{
        method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({price:true,stock:false,options:false,productCriteria:batch.map(x=>({productCode:x.supplier_sku,orderUnit:"",orderQuantity:1}))}),
        cache:"no-store",signal:AbortSignal.timeout(20000)
      });
    }catch{if(attempt===3)throw new Error("SDG_PRICE_RESUME_NETWORK_FAILED");await sleep(attempt*1000);continue;}
    if(response.status===401||response.status===403)throw new Error("SDG_PRICE_RESUME_AUTH_FAILED");
    if(response.status===429){if(attempt===3)throw new Error("SDG_PRICE_RESUME_RATE_LIMITED");await sleep(attempt*5000);continue;}
    if(response.status>=500&&attempt<3){await sleep(attempt*1000);continue;}
    break;
  }
  if(!response?.ok)throw new Error(`SDG_PRICE_RESUME_HTTP_${response?.status??"NO_RESPONSE"}`);
  const payload:unknown=await response.json();
  if(!Array.isArray(payload))throw new Error("SDG_PRICE_RESUME_SHAPE_CHANGED");
  const requested=new Map(batch.map(x=>[x.supplier_sku,x]));
  const seen=new Set<string>(),rows:PriceRow[]=[];const checkedAt=new Date().toISOString();
  for(const raw of payload){
    const item=raw as Record<string,unknown>;
    const sku=typeof item?.productCode==="string"?item.productCode:"";
    const id=requested.get(sku);
    const unit=typeof item?.productStockUnit==="string"?item.productStockUnit.trim().toLowerCase():"";
    const unitPrice=typeof item?.unitPrice==="number"?item.unitPrice:Number.NaN;
    const linePrice=typeof item?.linePrice==="number"?item.linePrice:Number.NaN;
    if(!id||seen.has(sku)||unit!=="metre"||!Number.isFinite(unitPrice)||unitPrice<=0||Math.round(unitPrice*100)!==Math.round(linePrice*100))throw new Error(`SDG_PRICE_RESUME_INVALID:${sku||"UNKNOWN"}`);
    seen.add(sku);rows.push({supplierSku:sku,brandId:id.brand_id,lifecycleState:id.lifecycle_state,checkedAt,unitPrice});
  }
  if(rows.length!==batch.length)throw new Error(`SDG_PRICE_RESUME_COVERAGE:${batch.length}:${rows.length}`);
  return rows;
}

async function main(){
  const missing=await targetMissing();
  const session=new SdgPortalSession({email:process.env.SDG_TRADE_EMAIL??"",password:process.env.SDG_TRADE_PASSWORD??""});
  await session.login();
  const prices:PriceRow[]=[];
  for(let offset=0;offset<missing.length;offset+=READ_BATCH)prices.push(...await fetchBatch(session,missing.slice(offset,offset+READ_BATCH)));
  if(prices.length!==200||new Set(prices.map(x=>x.supplierSku)).size!==200)throw new Error("SDG_PRICE_RESUME_FULL_READ_FAILED");

  const db=createSupplierServiceClient();
  const approvalEvents:any[]=[];
  let written=0;
  for(let offset=0;offset<prices.length;offset+=WRITE_BATCH){
    const batch=prices.slice(offset,offset+WRITE_BATCH);
    const runId=`sdg-price-recovery-resume-20261002:${String(offset/WRITE_BATCH+1).padStart(3,"0")}:${randomUUID()}`;
    const eventAt=new Date().toISOString();
    const items=batch.map(row=>{
      const digest=createHash("sha256").update(JSON.stringify([row.supplierSku,row.checkedAt,row.unitPrice])).digest("hex").slice(0,20);
      const snapshot=normalizeSupplierSnapshot({
        snapshot_id:`sdg-price-recovery:${row.supplierSku}:${digest}`,
        supplier_id:SUPPLIER,brand_id:row.brandId,supplier_sku:row.supplierSku,checked_at:row.checkedAt,
        cut_trade_price:row.unitPrice.toFixed(2),currency:"GBP",stock_unit:null,aggregate_available_quantity:null,batches:null,
        next_due_date:null,next_due_quantity:null,sample_available:null,lifecycle_state:row.lifecycleState,
        source:{type:"MANUAL_PORTAL",name:SOURCE,reference:`sdg:Product/detail:price:${row.supplierSku}`},verification_status:"VERIFIED"
      });
      const validation=validateSupplierIntelligenceSnapshot(snapshot,{known_supplier:true,known_sku:true,allowed_currencies:["GBP"],allowed_stock_units:["METRE"],required_price_field:"CUT_TRADE_PRICE",freshness_policies:[]},new Date());
      if(validation.status!=="VALIDATED")throw new Error(`SDG_PRICE_RESUME_VALIDATION:${row.supplierSku}`);
      approvalEvents.push({event_id:`${snapshot.snapshot_id}:price-recovery-resume-policy`,snapshot_id:snapshot.snapshot_id,promotion_state:"APPROVED_FOR_PROJECTION",actor_type:"POLICY",actor_id:null,
        reason:"Completed 2026-10-02 SDG price incident recovery from fresh authorised Product/detail price:true evidence. No inference, stock write, supplier order or Shopify write.",rejection_reason:null,previous_approved_snapshot_id:null,created_at:new Date().toISOString()});
      return {snapshot:{...snapshot,run_id:runId,source_type:snapshot.source.type,source_name:snapshot.source.name,source_reference:snapshot.source.reference,
        validation_status:validation.status,validation_errors:validation.errors,stock_expires_at:validation.stock_expires_at,price_expires_at:validation.price_expires_at,lifecycle_expires_at:validation.lifecycle_expires_at,
        normalized_payload:{...snapshot,recovery:{incident:"2026-10-02-stock-retention-price-evidence-deletion",inferred:false,live_supplier_read:true,resume:true}}},
        validation_event:createValidationEvent(snapshot.snapshot_id,validation,eventAt)};
    });
    const run={run_id:runId,supplier_id:SUPPLIER,adapter_id:"sdg-live-price-recovery-resume",mode:"SHADOW",source_type:"MANUAL_PORTAL",source_name:SOURCE,
      started_at:batch[0].checkedAt,completed_at:batch[batch.length-1].checkedAt,status:"SUCCEEDED",snapshots_received:items.length,snapshots_appended:items.length,error_code:null,shopify_writes:0,production_schedule_created:false};
    const {error}=await db.rpc("append_supplier_snapshot_batch",{p_run:run,p_items:items});
    if(error)throw new Error("SDG_PRICE_RESUME_APPEND_FAILED");
    written+=items.length;
  }

  let approved=0;
  for(let offset=0;offset<approvalEvents.length;offset+=APPROVAL_BATCH){
    const chunk=approvalEvents.slice(offset,offset+APPROVAL_BATCH);
    const {error}=await db.from("supplier_promotion_events").insert(chunk);
    if(error)throw new Error("SDG_PRICE_RESUME_APPROVAL_FAILED");
    approved+=chunk.length;
  }

  const {count:recoveredCount,error:recoveredError}=await db.from("supplier_snapshots").select("snapshot_id",{count:"exact",head:true})
    .eq("supplier_id",SUPPLIER).eq("source_name",SOURCE);
  if(recoveredError||recoveredCount!==6700)throw new Error(`SDG_PRICE_RESUME_FINAL_RECOVERY_COUNT:${recoveredCount}`);

  console.log(JSON.stringify({outcome:"SUCCEEDED",targeted:missing.length,read:prices.length,written,approved,totalRecoverySnapshots:recoveredCount,shopifyWrites:0,stockWrites:0,supplierOrders:0}));
}
main().catch(e=>{console.error(JSON.stringify({outcome:"FAILED",code:e instanceof Error?e.message:"SDG_PRICE_RESUME_FAILED"}));process.exitCode=1;});
