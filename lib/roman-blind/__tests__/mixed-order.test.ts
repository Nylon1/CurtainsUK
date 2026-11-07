import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {parseRomanSpec} from '../domain';
import {createRomanSnapshot,romanLine} from '../commerce';
import {buildSmartTrackOrder} from '../../smart-track/commerce';
import {processSmartTrackPaidOrder,hasRomanPaidLines} from '../../smart-track/paid-order';

test('Roman-only My Home draft and paid receipt bind the immutable blind and exact total',async()=>{
 const spec=parseRomanSpec({version:1,productType:'ROMAN_BLIND',id:randomUUID(),fabricId:'fixture-plain',width:140,drop:160,lining:'STANDARD',fold:'stacked',chainSide:'LEFT',quantity:2,measurementsConfirmed:true});
 const quote={spec,ready:true,issues:[],unitMinor:20000,goodsMinor:40000,vatMinor:6667,fabricMetres:8,fabricSupplierId:'fixture',fabricSupplierSku:'sku',fabricName:'Plain',fabricColour:'Blue',fabricImage:null,quoteId:'a'.repeat(64),quotedAt:new Date().toISOString()};
 const snapshot=createRomanSnapshot(quote,randomUUID(),{version:'confirmed'}),line=romanLine(snapshot),reviewId='b'.repeat(64),key=randomUUID();
 assert.equal(line.customAttributes?.find(attribute=>attribute.key==='Operating chain')?.value,'Left side');
 const contract=buildSmartTrackOrder({snapshots:[],additionalLines:[line],additionalGoodsMinor:40000,additionalVatMinor:6667,additionalProductTypes:['ROMAN_BLIND'],key,reviewId,shipping:{grossMinor:1295,vatMinor:216,title:'Combined order delivery',postcode:'BB23FA'},production:true});
 assert.equal(contract.expected.orderGrossAmountMinor,41295);
 assert.equal(contract.expected.orderVatAmountMinor,6883);
 const group={reviewId,contract,snapshots:[],romans:[snapshot],cushions:[],packets:[{productType:'ROMAN_BLIND',snapshotId:snapshot.id}]};
 const payload={id:123,name:'#TEST',financial_status:'paid',currency:'GBP',taxes_included:true,processed_at:new Date().toISOString(),note_attributes:contract.input.customAttributes.map(a=>({name:a.key,value:a.value})),line_items:contract.input.lineItems.map((l,i)=>({id:i+1,quantity:l.quantity,price:l.originalUnitPriceWithCurrency.amount,total_discount:'0.00',properties:l.customAttributes.map(a=>({name:a.key,value:a.value}))})),total_price:'412.95',total_tax:'68.83',total_discounts:'0.00',total_shipping_price_set:{presentment_money:{amount:'12.95',currency_code:'GBP'}}};
 assert.equal(hasRomanPaidLines(payload),true);
 const secret='roman-mixed-order-test-secret-'.repeat(2),run=async(value:unknown)=>{const raw=Buffer.from(JSON.stringify(value));return processSmartTrackPaidOrder(raw,createHmac('sha256',secret).update(raw).digest('base64'),{secret,group:async()=>group,verifyDraft:async()=> 'gid://shopify/DraftOrder/1',record:async()=>({duplicate:false})});};
 const paid=await run(payload);assert.equal(paid.manifest.groups.romans.length,1);assert.equal(paid.manifest.groups.tracks.length,0);
 await assert.rejects(run({...payload,line_items:[{...payload.line_items[0],price:'1.00'}]}),/LINES/);
 await assert.rejects(run({...payload,total_price:'1.00'}),/FINANCIAL/);
});

test('Roman migration accepts a Roman-only group and records its paid fabric once',async()=>{
 const db=new PGlite();try{
  await db.exec('create schema curtainsuk_private; create role anon; create role authenticated; create role service_role; create table curtainsuk_private.staging_configuration_snapshots(snapshot_id uuid primary key); create table curtainsuk_private.fabric_colourways(fabric_id text primary key,supplier_id text,supplier_sku text);');
  for(const name of ['20261014163749_cushion_studio_distinct_persistence.sql','20261017162157_smart_track_distinct_checkout.sql','20261106183000_roman_mixed_checkout.sql'])await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
  const key=randomUUID(),snapshotId=randomUUID(),group={reviewId:'a'.repeat(64),snapshots:[],romans:[{version:1,productType:'ROMAN_BLIND',id:snapshotId,fabric:{supplierId:'fixture',supplierSku:'sku',metres:4.5}}],cushions:[],contract:{},packets:[{productType:'ROMAN_BLIND',snapshotId}]};
  await db.query('select curtainsuk_private.commit_smart_track_checkout($1,$2,$3)',['a'.repeat(64),key,JSON.stringify(group)]);
  const order='gid://shopify/Order/123',manifest={checkoutKey:key,packets:group.packets,groups:{tracks:[],romans:[{snapshotId,productType:'ROMAN_BLIND'}],cushions:[],curtains:[]}};
  await db.query('select curtainsuk_private.record_smart_track_paid_manifest($1,$2)',[order,JSON.stringify(manifest)]);
  const usage=await db.query<{v:string}>('select curtainsuk_private.roman_usage_since($1,$2,$3) v',['fixture','sku','2026-01-01T00:00:00Z']);
  assert.equal(Number(usage.rows[0].v),4.5);
  assert.equal((await db.query<{v:boolean}>("select has_table_privilege('anon','curtainsuk_private.roman_blind_order_snapshots','SELECT') v")).rows[0].v,false);
  await assert.rejects(db.exec('delete from curtainsuk_private.roman_blind_order_snapshots'),/IMMUTABLE/);
 }finally{await db.close();}
});
