import {randomUUID} from 'node:crypto';
import type {ShopifyDraftOrderInput} from '@/lib/storefront/shopify-draft-order-core';
import {romanSpecDigest,type RomanSpec} from './domain';
import type {RomanQuote} from './pricing';

export type RomanSnapshot={version:1;productType:'ROMAN_BLIND';id:string;designId:string;spec:RomanSpec;specSha256:string;quoteId:string;price:{currency:'GBP';goodsGrossMinor:number;goodsVatMinor:number};fabric:{supplierId:string;supplierSku:string;metres:number;name:string;colour:string};kit:'Evans Evaglide BSXL 1:4';dispatchCommitment:unknown;customerApproved:true;revalidatedAt:string};
export function createRomanSnapshot(quote:RomanQuote,designId:string,dispatchCommitment:unknown):Readonly<RomanSnapshot>{
 if(!quote.ready||quote.goodsMinor===null||quote.vatMinor===null||quote.fabricMetres===null||!quote.fabricSupplierId||!quote.fabricSupplierSku||!quote.fabricName||!quote.fabricColour||!dispatchCommitment)throw Error('ROMAN_SNAPSHOT_NOT_READY');
 const snapshot:RomanSnapshot={version:1,productType:'ROMAN_BLIND',id:randomUUID(),designId,spec:structuredClone(quote.spec),specSha256:romanSpecDigest(quote.spec),quoteId:quote.quoteId,
  price:{currency:'GBP',goodsGrossMinor:quote.goodsMinor,goodsVatMinor:quote.vatMinor},fabric:{supplierId:quote.fabricSupplierId,supplierSku:quote.fabricSupplierSku,metres:quote.fabricMetres,name:quote.fabricName,colour:quote.fabricColour},
  kit:'Evans Evaglide BSXL 1:4',dispatchCommitment,customerApproved:true,revalidatedAt:quote.quotedAt};
 return Object.freeze(snapshot);
}
export function romanLine(snapshot:Readonly<RomanSnapshot>,now=new Date()):ShopifyDraftOrderInput['lineItems'][number]{
 if(snapshot.productType!=='ROMAN_BLIND'||snapshot.version!==1||snapshot.specSha256!==romanSpecDigest(snapshot.spec)||!snapshot.customerApproved||
 !Number.isFinite(Date.parse(snapshot.revalidatedAt))||Date.parse(snapshot.revalidatedAt)>now.getTime()||now.getTime()-Date.parse(snapshot.revalidatedAt)>300000)throw Error('ROMAN_SNAPSHOT_INVALID');
 const s=snapshot.spec;
 return {title:`Made-to-measure Roman blind, ${snapshot.fabric.name} ${snapshot.fabric.colour}, ${s.width} × ${s.drop} cm (${s.quantity})`,quantity:1,
  originalUnitPriceWithCurrency:{amount:(snapshot.price.goodsGrossMinor/100).toFixed(2),currencyCode:'GBP'},requiresShipping:true,taxable:true,sku:`CUK-ROMAN-${snapshot.id}`,
  customAttributes:[{key:'Product type',value:'Roman blind'},{key:'Finished width',value:`${s.width} cm`},{key:'Finished drop',value:`${s.drop} cm`},{key:'Fabric',value:`${snapshot.fabric.name} · ${snapshot.fabric.colour}`},
   {key:'Lining',value:s.lining==='BLACKOUT'?'Blackout':'Standard ivory'},{key:'Folds',value:s.fold==='cascade'?'Cascade':'Stacked'},{key:'Operating chain',value:s.chainSide==='LEFT'?'Left side':'Right side'},{key:'Blind quantity',value:String(s.quantity)},
   {key:'Included',value:'Evans Evaglide full headrail kit, fabric, lining and making'},
   {key:'_curtainsuk_product_type',value:'ROMAN_BLIND'},{key:'_curtainsuk_roman_snapshot_id',value:snapshot.id},{key:'_curtainsuk_roman_spec_sha256',value:snapshot.specSha256},{key:'_curtainsuk_mtm_locked',value:'true'}]};
}
