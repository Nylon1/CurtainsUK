import { createHash } from "node:crypto";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { SdgPortalSession } from "../lib/supplier-sync/adapters/sdg-portal-session";
import { SDG_PORTAL_DETAIL_URL } from "../lib/supplier-sync/adapters/sanderson-design-group";

type Target = { supplier_sku: string; brand_id: string };
type Product = Record<string, unknown>;

const CONTROL = new Map<string, number>([
  ["DAPGPA203",43.17],["F1069/34",25.67],["F1325/03",18.67],["F1681/03",16.33],["F1740/03",21.00],
]);

async function targets(): Promise<Target[]> {
  const db = createSupplierServiceClient();
  const rows: Target[] = [];
  for (let offset=0;;offset+=1000) {
    const {data,error}=await db.from("fabric_colourways")
      .select("supplier_sku,brand_id,lifecycle_state,price_verification_status,staging_catalog_visible,storefront_selectable")
      .eq("supplier_id","sanderson-design-group")
      .neq("lifecycle_state","DISCONTINUED")
      .eq("price_verification_status","VERIFIED")
      .or("staging_catalog_visible.eq.true,storefront_selectable.eq.true")
      .order("supplier_sku").range(offset,offset+999);
    if(error) throw new Error("SDG_PRICE_CENSUS_MANIFEST_FAILED");
    for(const row of data??[]) rows.push({supplier_sku:String(row.supplier_sku),brand_id:String(row.brand_id)});
    if((data??[]).length<1000) break;
  }
  const unique=new Map(rows.map(r=>[r.supplier_sku,r]));
  if(unique.size!==rows.length) throw new Error("SDG_PRICE_CENSUS_DUPLICATE_SKU");
  return [...unique.values()];
}

async function request(session:SdgPortalSession, part:Target[], depth=0):Promise<{products:Product[]; exceptions:{sku:string;reason:string}[]}> {
  if(depth>10) return {products:[],exceptions:part.map(x=>({sku:x.supplier_sku,reason:"SPLIT_DEPTH_EXCEEDED"}))};
  let response:Response|undefined;
  for(let attempt=0;attempt<3;attempt++){
    const token=await session.getBearerToken();
    try{
      response=await fetch(SDG_PORTAL_DETAIL_URL,{
        method:"POST",
        headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({price:true,stock:false,options:false,productCriteria:part.map(({supplier_sku})=>({productCode:supplier_sku,orderUnit:"",orderQuantity:1}))}),
        cache:"no-store",signal:AbortSignal.timeout(20000),
      });
    }catch{
      if(attempt===2) throw new Error("SDG_PRICE_CENSUS_NETWORK_FAILED");
      await new Promise(r=>setTimeout(r,(attempt+1)*1000)); continue;
    }
    if(response.status===401||response.status===403) throw new Error("SDG_PRICE_CENSUS_AUTH_FAILED");
    if(response.status===429){
      if(attempt===2) throw new Error("SDG_PRICE_CENSUS_RATE_LIMITED");
      await new Promise(r=>setTimeout(r,(attempt+1)*5000)); continue;
    }
    if(response.status>=500 && attempt<2){await new Promise(r=>setTimeout(r,(attempt+1)*1000));continue;}
    break;
  }
  if(response?.status===404){
    if(part.length===1) return {products:[],exceptions:[{sku:part[0].supplier_sku,reason:"HTTP_404"}]};
    const mid=Math.floor(part.length/2);
    const [a,b]=await Promise.all([request(session,part.slice(0,mid),depth+1),request(session,part.slice(mid),depth+1)]);
    return {products:[...a.products,...b.products],exceptions:[...a.exceptions,...b.exceptions]};
  }
  if(!response?.ok) throw new Error(`SDG_PRICE_CENSUS_HTTP_${response?.status??"NO_RESPONSE"}`);
  const payload:unknown=await response.json();
  if(!Array.isArray(payload)) throw new Error("SDG_PRICE_CENSUS_SHAPE_CHANGED");
  return {products:payload as Product[],exceptions:[]};
}

function num(value:unknown){return typeof value==="number"&&Number.isFinite(value)?value:null;}
function str(value:unknown){return typeof value==="string"?value.trim():"";}

async function main(){
  const email=process.env.SDG_TRADE_EMAIL,password=process.env.SDG_TRADE_PASSWORD;
  if(!email||!password) throw new Error("SDG_PRICE_CENSUS_CREDENTIALS_REQUIRED");
  const manifest=await targets();
  if(manifest.length!==6700) throw new Error(`SDG_PRICE_CENSUS_TARGET_CHANGED_${manifest.length}`);
  const session=new SdgPortalSession({email,password}); await session.login();

  const products:Product[]=[]; const exceptions:{sku:string;reason:string}[]=[];
  for(let offset=0;offset<manifest.length;offset+=100){
    const result=await request(session,manifest.slice(offset,offset+100));
    products.push(...result.products); exceptions.push(...result.exceptions);
    console.log(JSON.stringify({event:"SDG_PRICE_CENSUS_PROGRESS",completed:Math.min(offset+100,manifest.length),total:manifest.length,returned:products.length,exceptions:exceptions.length}));
  }

  const expected=new Set(manifest.map(x=>x.supplier_sku));
  const bySku=new Map<string,Product[]>();
  const unrequested:string[]=[];
  for(const row of products){
    const sku=str(row.productCode);
    if(!expected.has(sku)){unrequested.push(sku);continue;}
    const list=bySku.get(sku)??[];list.push(row);bySku.set(sku,list);
  }

  const valid:{sku:string;price:number;status:string;statusCode:string;brandId:string}[]=[];
  const invalid:{sku:string;reason:string;detail?:unknown}[]=[...exceptions];
  const statusCounts=new Map<string,number>();
  for(const target of manifest){
    const list=bySku.get(target.supplier_sku)??[];
    if(list.length!==1){invalid.push({sku:target.supplier_sku,reason:list.length?"DUPLICATE":"MISSING"});continue;}
    const row=list[0]; const unit=num(row.unitPrice),line=num(row.linePrice);
    const unitName=str(row.productStockUnit),unitCode=str(row.productStockUnitCode);
    const status=str(row.productStatus),statusCode=str(row.productStatusCode);
    statusCounts.set(`${statusCode}|${status}`,(statusCounts.get(`${statusCode}|${status}`)??0)+1);
    if(unit===null||unit<=0){invalid.push({sku:target.supplier_sku,reason:"UNIT_PRICE_INVALID",detail:row.unitPrice});continue;}
    if(line===null||line<=0||Math.abs(line-unit)>0.0001){invalid.push({sku:target.supplier_sku,reason:"LINE_UNIT_PRICE_MISMATCH",detail:{unit,line}});continue;}
    if(unitCode.toUpperCase()!=="M" && unitName.toLowerCase()!=="metre"){invalid.push({sku:target.supplier_sku,reason:"NON_METRE_UNIT",detail:{unitCode,unitName}});continue;}
    valid.push({sku:target.supplier_sku,price:unit,status,statusCode,brandId:target.brand_id});
  }
  const controls=[...CONTROL].map(([sku,expectedPrice])=>{
    const actual=valid.find(x=>x.sku===sku)?.price??null;
    return {sku,expectedPrice,actual,match:actual!==null&&Math.abs(actual-expectedPrice)<0.0001};
  });
  const evidenceSet=valid.slice().sort((a,b)=>a.sku.localeCompare(b.sku)).map(x=>`${x.sku}:${x.price.toFixed(4)}`).join("|");
  console.log(JSON.stringify({
    event:"SDG_PRICE_CENSUS_RESULT",target:manifest.length,rawReturned:products.length,valid:valid.length,
    invalidCount:invalid.length,invalid:invalid.slice(0,100),unrequested:unrequested.slice(0,20),
    statusCounts:Object.fromEntries([...statusCounts].sort()),controls,
    allControlsMatch:controls.every(x=>x.match),
    priceSum:Number(valid.reduce((s,x)=>s+x.price,0).toFixed(2)),
    evidenceSetSha256:createHash("sha256").update(evidenceSet).digest("hex"),
    session:session.stats,
  }));
}
void main();
