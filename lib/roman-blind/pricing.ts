import 'server-only';
import {createHash} from 'node:crypto';
import {fabricMasterRecordById,verifiedSupplierCostMinor} from '@/lib/fabric-master/repository';
import {fabricIsPriceEligible} from '@/lib/fabric-master/projection';
import {toDecisionEngineFabric} from '@/lib/fabric-master/decision-engine';
import {MTM_PRODUCTION_PRICING_RULE_SET} from '@/lib/decision-engine/seed/production-pricing-rules';
import {dailyStockProjection} from '@/lib/storefront/daily-stock-server';
import {allocateVatFromGross} from '@/lib/storefront/shopify-draft-order-core';
import {CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS} from '@/lib/storefront/checkout-gates';
import {romanEstimate} from '@/experiments/roman-blind-preview/roman-price-core.mjs';
import {parseRomanSpec,romanSpecDigest,type RomanSpec} from './domain';

export type RomanQuote={spec:RomanSpec;ready:boolean;issues:string[];unitMinor:number|null;goodsMinor:number|null;vatMinor:number|null;fabricMetres:number|null;fabricSupplierId:string|null;fabricSupplierSku:string|null;fabricName:string|null;fabricColour:string|null;fabricImage:string|null;quoteId:string;quotedAt:string};
export async function quoteRoman(value:unknown):Promise<RomanQuote>{
 const spec=parseRomanSpec(value),issues:string[]=[];
 let unitMinor:number|null=null,metres:number|null=null,supplierId:string|null=null,supplierSku:string|null=null,name:string|null=null,colour:string|null=null,image:string|null=null;
 const record=await fabricMasterRecordById(spec.fabricId);
 if(!record||!fabricIsPriceEligible(record))issues.push('This fabric is not currently available to order.');
 else{
  supplierId=record.supplier_id;supplierSku=record.supplier_sku;name=record.design_name;colour=record.colour_name;
  image=record.imagery?.[0]??null;
  try{
   const cost=await verifiedSupplierCostMinor(record.supplier_id,record.supplier_sku);
   const fabric=toDecisionEngineFabric(record,cost,record.source_effective_date??'');
   const estimate=romanEstimate(spec,fabric,MTM_PRODUCTION_PRICING_RULE_SET);
   if(estimate.status==='estimate'&&typeof estimate.totalMinor==='number'&&Number.isSafeInteger(estimate.totalMinor)&&estimate.totalMinor>0&&'_fabricMetres' in estimate){unitMinor=estimate.totalMinor;metres=estimate._fabricMetres*spec.quantity;}
   else issues.push(estimate.message||'This blind needs a workroom price check.');
  }catch{issues.push('A verified fabric price is unavailable.');}
  if(metres!==null){try{
   const stock=await dailyStockProjection({supplierId:record.supplier_id,supplierSku:record.supplier_sku,requirement:{quantity:metres,stock_unit:'METRE'}});
   if(stock.availability!=='FABRIC_AVAILABLE'||stock.stale)issues.push('Fabric availability needs confirmation for this quantity.');
  }catch{issues.push('Fabric availability could not be checked.');}}
  // The Evans kit is rated for 10 kg. A documented unusually heavy cloth is
  // held for a workroom check. Unknown supplier weights remain a staff review.
  if(typeof record.weight_gsm==='number'&&record.weight_gsm>0){
   const faceKg=(spec.width/100)*(spec.drop/100)*record.weight_gsm/1000;
   if(faceKg>=8)issues.push('This fabric needs a headrail weight check before ordering.');
  }
 }
 const goodsMinor=unitMinor===null?null:unitMinor*spec.quantity;
 const vatMinor=goodsMinor===null?null:allocateVatFromGross(goodsMinor,CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS);
 const quoteId=createHash('sha256').update(JSON.stringify({version:'roman-quote-v1',spec:romanSpecDigest(spec),unitMinor,metres,supplierId,supplierSku,issues})).digest('hex');
 return {spec,ready:issues.length===0,issues,unitMinor,goodsMinor,vatMinor,fabricMetres:metres,fabricSupplierId:supplierId,fabricSupplierSku:supplierSku,fabricName:name,fabricColour:colour,fabricImage:image,quoteId,quotedAt:new Date().toISOString()};
}
