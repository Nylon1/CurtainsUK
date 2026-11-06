import { fabricMasterRecordById, verifiedSupplierCostMinor } from '../../lib/fabric-master/repository';
import { toDecisionEngineFabric } from '../../lib/fabric-master/decision-engine';
import { MTM_PRODUCTION_PRICING_RULE_SET } from '../../lib/decision-engine/seed/production-pricing-rules';
import { fabricIsPriceEligible } from '../../lib/fabric-master/projection';
import { BROWSE_PRICE_BANDS } from '../../lib/fabric-master/browse-price-guide';
import { dailyStockProjection } from '../../lib/storefront/daily-stock-server';
import { romanEstimate } from './roman-price-core.mjs';
const upstream='https://www.curtainsuk.com/apps/curtainsuk-decision/catalog';
const cache=new Map<string,{until:number,value:unknown}>();
async function remote(query:URLSearchParams){
 const url=`${upstream}?${query}`;const previous=cache.get(url);if(previous&&previous.until>Date.now())return previous.value as any;
 const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Catalogue unavailable');
 const value=await response.json();if(cache.size>100)cache.clear();cache.set(url,{until:Date.now()+120000,value});return value;
}
function publicFabric(f:any){return {id:f.id,brand:f.brand,collection:f.collection,name:f.design,colour:f.colour,image:(f.images?.find((x:any)=>x.imageType==='MAIN')?.url||f.imageReferences?.[0]||''),fullWidthMm:f.fullWidthMm??null};}
export async function catalogue(params:URLSearchParams){
 const page=Math.max(1,Math.min(10000,Math.floor(Number(params.get('page'))||1))),pageSize=6;
 const query=new URLSearchParams({view:'retail',browseGuide:'1',browseCards:'1',page:String(Math.ceil(page/4))});
 for(const key of ['query','brand','colour','pattern'])if(params.get(key))query.set(key,params.get(key)!.slice(0,150));
 const price=params.get('guidePrice');if(price&&BROWSE_PRICE_BANDS.some(band=>band.value===price))query.set('guidePrice',price);
 const data=await remote(query);return {fabrics:data.fabrics.slice(((page-1)%4)*pageSize,((page-1)%4+1)*pageSize).map(publicFabric),total:data.total,pages:Math.ceil(data.total/pageSize),page,facets:{guidePrices:data.facets?.guidePrices??[],discovery:(data.facets?.discovery??[]).filter((facet:any)=>['colour','pattern'].includes(facet.key))}};
}
export async function fabricDetail(id:string){if(!/^[a-z0-9][a-z0-9-]{1,100}$/.test(id))throw new Error('Invalid fabric');const data=await remote(new URLSearchParams({view:'retail',fabric:id,visualiser:'1'}));const f=data.fabric??data.fabrics?.[0];if(!f)throw new Error('Fabric unavailable');return publicFabric(f);}
export async function price(input:any){
 if(!input||typeof input.fabricId!=='string'||!/^[a-z0-9][a-z0-9-]{1,100}$/.test(input.fabricId))return {status:'review',totalMinor:null,message:'Choose a fabric to see your estimate.'};
 try{
  const record=await fabricMasterRecordById(input.fabricId);
  if(!record||!fabricIsPriceEligible(record))return {status:'review',totalMinor:null,message:'This fabric is no longer available. Choose another fabric.',availability:'No longer available'};
  let result:any={status:'review',totalMinor:null,message:'This fabric needs a verified price or specification. You can still save your design.'};
  try{
   const cost=await verifiedSupplierCostMinor(record.supplier_id,record.supplier_sku);
   const fabric=toDecisionEngineFabric(record,cost,record.source_effective_date??'');
   result=romanEstimate(input,fabric,MTM_PRODUCTION_PRICING_RULE_SET);
  }catch{}
  const {_fabricMetres,...customerResult}=result;
  try{
   // Identical supplier freshness, usage-ledger and quantity sufficiency path to curtains.
   const stock=await dailyStockProjection({supplierId:record.supplier_id,supplierSku:record.supplier_sku,requirement:typeof _fabricMetres==='number'?{quantity:_fabricMetres,stock_unit:'METRE'}:null});
   const labels:Record<string,string>={FABRIC_AVAILABLE:'Fabric available',LIMITED_AVAILABILITY:'Limited availability',AVAILABLE_SOON:'Available soon',AVAILABILITY_TO_BE_CONFIRMED:'Check availability',TEMPORARILY_UNAVAILABLE:'Out of stock, awaiting supplier stock',NO_LONGER_AVAILABLE:'No longer available'};
   return {...customerResult,availability:labels[stock.availability]??'Check availability',availabilityCode:stock.availability,stockSnapshotStale:stock.stale,sampleStockAvailable:stock.sampleStockAvailable};
  }catch{return {...customerResult,availability:'Check availability',stockSnapshotStale:true};}
 }catch{return {status:'review',totalMinor:null,message:'A verified price is not available for this fabric at the moment. Save your design or try another fabric.'};}
}
