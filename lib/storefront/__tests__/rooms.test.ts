import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { roomsCustomerError } from '../rooms-core';
import { retainCurtain, reviewHouse, unseal, ROOMS_RULESET, assertHouseCheckoutReleased, type RoomsServices, type HouseReviewRequest } from '../rooms-core';
import { calculateProductionMtmCustomerPrice } from '../production-pricing';
import { STOREFRONT_FABRICS } from '../fabrics';
import { signReviewSubmissionWithSecret, verifyReviewSubmissionWithSecret } from '../review-token-core';
import type { StagingPriceRequest } from '../staging-pricing';
import { prepareHouseCheckout, houseCheckoutCustomerResult, type HouseCheckoutServices } from '../rooms-checkout';
const require=createRequire(import.meta.url);
const Store=require('../../../shopify-theme/curtainsuk-new-design-live-base/assets/curtainsuk-rooms-store.js');
test('room-specific failures are useful without leaking internal exceptions',()=>{
  assert.match(roomsCustomerError(Error('ROOMS_PRICE_RECONFIRM_REQUIRED')),/price again/);
  assert.match(roomsCustomerError(Error('ROOMS_CURTAIN_REQUIRES_REVIEW')),/CurtainsUK check/);
  assert.doesNotMatch(roomsCustomerError(Error('SECRET upstream stack')),/SECRET|stack/);
});
test('theme integration stays gated and new rooms discard only transient evaluations',()=>{
  const js=readFileSync('shopify-theme/curtainsuk-new-design-live-base/assets/curtainsuk-storefront.js','utf8');
  assert.match(js,/const remembered = roomsFresh \? \{\} : readJson\(PROJECT_KEY/);
  assert.match(js,/if \(roomsFresh\) localStorage.removeItem\(EVALUATION_KEY\)/);
  const schema=JSON.parse(readFileSync('shopify-theme/curtainsuk-new-design-live-base/config/settings_schema.json','utf8'));
  assert.equal(schema.flatMap((group:any)=>group.settings||[]).find((s:any)=>s.id==='curtainsuk_rooms_enabled').default,false);
  const flow=readFileSync('shopify-theme/curtainsuk-new-design-live-base/assets/curtainsuk-rooms.js','utf8');
  assert.match(flow,/curtain-visualiser\?fabric=\$\{encodeURIComponent\(curtain.fabric_master_id\)\}&rooms_new=1/);
  assert.doesNotMatch(flow,/cart\/clear|checkoutUrl/);
});
const secret='local-tests-only-'.repeat(4);
const source=STOREFRONT_FABRICS[0];
const configuration:StagingPriceRequest={fabricId:source.id,windowSlug:'french-doors',hardware:'TRACK',measurementBasis:'TRACK_WIDTH',widthCm:201,dropCm:236,heading:'WAVE',lining:'BLACKOUT',construction:'PAIR',stackDirection:'SPLIT',desiredFinish:'FLOOR'};
function service(overrides:Partial<RoomsServices>={}):RoomsServices{return{
  secret,now:()=> '2026-09-21T21:00:00.000Z',
  async calculate(c){return {...calculateProductionMtmCustomerPrice(c,{...source,supplierCostPerMetre:{amountMinor:1000,currency:'GBP'},supplierCostEffectiveFrom:'2026-09-21'}),stockSnapshotStale:false,commercialState:'ORDER_READY'};},
  verifyPrice:(configuration,configurationId,price,token)=>verifyReviewSubmissionWithSecret({configuration,configurationId,outcome:price.outcome,totalAmountMinor:price.totalAmountMinor},token,secret),
  async fabric(id){return{id,design:source.design,colour:source.colour,supplier:source.supplier,brand:'Prestigious Textiles',imageUrl:source.imageReferences[0]};},
  async stock(){return true;},
  async delivery(){return{region:'UK_MAINLAND',parcelClass:'STANDARD',status:'READY',grossAmountMinor:1295,currency:'GBP',shownSeparately:true,countsTowardGoodsMinimum:false,message:'Delivery confirmed'};},...overrides
};}
async function retained(services=service(),c=configuration){const price=await services.calculate(c);const configurationId=randomUUID();const token=signReviewSubmissionWithSecret({configuration:c,configurationId,outcome:price.outcome,totalAmountMinor:price.totalAmountMinor},secret);return retainCurtain({configuration:c,configurationId,priceConfirmationToken:token},services);}
function request(curtains:Awaited<ReturnType<typeof retained>>[]):HouseReviewRequest{return{house_id:randomUUID(),revision:3,postcode:'BB2 3FA',rooms:[{room_id:randomUUID(),room_name:'Front Lounge',curtains:curtains.map(c=>({configuration_id:c.configuration_id,receipt:c.receipt,window_name:'French Doors'}))}]};}
function memory(){const data=new Map<string,string>();return{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};}
function checkoutService(overrides:Partial<RoomsServices>={}):HouseCheckoutServices{return{...service(overrides),async productionFabric(){return{supplierSku:source.supplierReference,identity:{supplier:source.supplier,brand:'Prestigious Textiles',design:source.design,colour:source.colour}};}};}
async function checkoutInput(count=2,s=checkoutService()) { const house=request(await Promise.all(Array.from({length:count},()=>retained()))); const review=await reviewHouse(house,s); return{house,reviewToken:review.reviewToken,measurementsConfirmed:true,acceptedPriceChanges:review.lines.filter(l=>l.status==='PRICE_CHANGED').map(l=>({configuration_id:l.configuration_id,currentPrice:l.currentPrice!}))}; }

for(const count of [1,2,10])test(`final ${count}-curtain bridge prepares private multi-line contract with stable retry identity and safe public result`,async()=>{
  const s=checkoutService(),input=await checkoutInput(count,s);const a=await prepareHouseCheckout(input,s),b=await prepareHouseCheckout(input,s);
  assert.equal(a.prepared,true);assert.equal(b.prepared,true);if(!a.prepared||!b.prepared)return;
  assert.deepEqual(a.contract,b.contract);assert.deepEqual(a.curtains,b.curtains);
  assert.equal(a.contract.input.lineItems.length,count);assert.equal(a.contract.expected.orderGrossAmountMinor,a.review.total);
  assert.ok(input.reviewToken.length<2000);assert.equal(a.contract.paymentEnabled,false);
  a.contract.input.lineItems.forEach((line,i)=>assert.equal(line.customAttributes.find(p=>p.key==='_curtainsuk_retained_configuration_id')?.value,input.house.rooms[0].curtains[i].configuration_id));
  const publicResult=houseCheckoutCustomerResult(a);assert.equal(publicResult.checkoutUrl,null);assert.equal(publicResult.paymentEnabled,false);
  assert.doesNotMatch(JSON.stringify(publicResult),/supplierSku|snapshotId|configuration_id|invoiceUrl|curtainsuk_/);
});
test('final handoff rejects stale review after membership, revision, postcode, room-name or receipt changes',async()=>{
  const original=await checkoutInput();
  for(const change of [(h:HouseReviewRequest)=>h.revision++,(h:HouseReviewRequest)=>h.rooms[0].curtains.pop(),(h:HouseReviewRequest)=>h.postcode='SW1A 1AA',(h:HouseReviewRequest)=>h.rooms[0].room_name='New room',(h:HouseReviewRequest)=>h.rooms[0].curtains[0].receipt+='bad']){
    const input=structuredClone(original);change(input.house);await assert.rejects(prepareHouseCheckout(input,checkoutService()),/REVIEW_CHANGED/);
  }
  await assert.rejects(prepareHouseCheckout(original,checkoutService({now:()=> '2026-09-21T21:06:00.000Z'})),/EXPIRED/);
  await assert.rejects(prepareHouseCheckout({...original,reviewToken:original.reviewToken+'bad'},checkoutService()),/INTEGRITY/);
  await assert.rejects(prepareHouseCheckout({...original,measurementsConfirmed:false},checkoutService()),/CONFIRMATION/);
});
test('price changes between review and Continue return fresh line review, then require exact per-line amount acceptance',async()=>{
  const input=await checkoutInput();const more=checkoutService({async calculate(c){return{...calculateProductionMtmCustomerPrice(c,{...source,supplierCostPerMetre:{amountMinor:1800,currency:'GBP'},supplierCostEffectiveFrom:'2026-09-21'}),stockSnapshotStale:false,commercialState:'ORDER_READY'};}});
  const changed=await prepareHouseCheckout(input,more);assert.equal(changed.prepared,false);assert.ok(changed.review.lines.every(l=>l.status==='PRICE_CHANGED'));
  const refreshed={...input,reviewToken:changed.review.reviewToken};await assert.rejects(prepareHouseCheckout(refreshed,more),/CONFIRMATION/);
  const accepted={...refreshed,acceptedPriceChanges:changed.review.lines.map(l=>({configuration_id:l.configuration_id,currentPrice:l.currentPrice!}))};
  const wrong=structuredClone(accepted);wrong.acceptedPriceChanges[0].currentPrice--;await assert.rejects(prepareHouseCheckout(wrong,more),/CONFIRMATION/);
  assert.equal((await prepareHouseCheckout(accepted,more)).prepared,true);
});
test('combined stock changing after review returns blocked lines and creates no prepared contract',async()=>{
  const input=await checkoutInput();const result=await prepareHouseCheckout(input,checkoutService({async stock(){return false;}}));
  assert.equal(result.prepared,false);assert.ok(result.review.lines.every(l=>l.status==='BLOCKED'));assert.equal('contract' in result,false);
});
test('real server binding defaults to no writes and rejects production transport before any network call',async()=>{
  const prepared=await prepareHouseCheckout(await checkoutInput(),checkoutService());
  const {serverScriptHooks:hooks}=await import('../../../scripts/curtainsuk-server-script-loader.mjs');
  const originalFetch=globalThis.fetch;let networkCalls=0;
  globalThis.fetch=async()=>{networkCalls++;throw Error('UNEXPECTED_NETWORK');};
  try{
    const {executePreparedHouseCheckout}=await import('../rooms-checkout-server');
    const result=await executePreparedHouseCheckout(prepared);assert.equal(result.prepared,true);assert.equal(result.paymentEnabled,false);assert.equal(result.checkoutUrl,null);assert.equal(result.shopifyWritePerformed,false);
    await assert.rejects(executePreparedHouseCheckout(prepared,{mode:'CREATE_PRODUCTION_DRAFT',deploymentStage:'PRODUCTION',shopDomain:'carpetup.myshopify.com',clientId:'unused',clientSecret:'unused',realPaymentsDisabledConfirmed:true,requestTimeoutMs:1000}),/PUBLIC_PAYMENT_DISABLED/);
    assert.equal(networkCalls,0);
  }finally{globalThis.fetch=originalFetch;hooks.deregister();}
});
test('House release requires both its own gate and the established production checkout approval',async()=>{
  const {houseCheckoutConfigFromEnvironment}=await import('../rooms-checkout-server');
  const root:NodeJS.ProcessEnv={NODE_ENV:'test',CURTAINSUK_ROOMS_CHECKOUT_RELEASED:'true',CURTAINSUK_DEPLOYMENT_STAGE:'PRODUCTION',CURTAINSUK_SHOPIFY_CHECKOUT_STORE:'carpetup.myshopify.com',CURTAINSUK_SHOPIFY_CLIENT_ID:'production-test-client',CURTAINSUK_SHOPIFY_APP_SECRET:'production-test-secret-not-real',CURTAINSUK_SHOPIFY_DRAFT_ORDER_MODE:'CREATE_PRODUCTION_DRAFT',CURTAINSUK_PRODUCTION_PURCHASES_APPROVED:'true'};
  assert.equal(houseCheckoutConfigFromEnvironment(root).mode,'CREATE_PRODUCTION_DRAFT');
  assert.throws(()=>houseCheckoutConfigFromEnvironment({...root,CURTAINSUK_ROOMS_CHECKOUT_RELEASED:'false'}),/MULTI_SNAPSHOT/);
  assert.throws(()=>houseCheckoutConfigFromEnvironment({...root,CURTAINSUK_PRODUCTION_PURCHASES_APPROVED:'false'}),/STORE_DENIED/);
});
test('new accepted membership, destination or price has distinct execution identity while retained identity stays stable',async()=>{
  const input=await checkoutInput(),s=checkoutService();const before=await prepareHouseCheckout(input,s);assert.equal(before.prepared,true);if(!before.prepared)return;
  for(const kind of ['membership','destination','price']){
    const next=structuredClone(input);if(kind==='membership'){next.house.rooms[0].curtains.pop();next.house.revision++;}if(kind==='destination')next.house.postcode='SW1A 1AA';
    const changedService=kind==='price'?checkoutService({async calculate(c){return{...calculateProductionMtmCustomerPrice(c,{...source,supplierCostPerMetre:{amountMinor:1800,currency:'GBP'},supplierCostEffectiveFrom:'2026-09-21'}),stockSnapshotStale:false,commercialState:'ORDER_READY'};}}):s;
    const review=await reviewHouse(next.house,changedService);next.reviewToken=review.reviewToken;next.acceptedPriceChanges=review.lines.filter(l=>l.status==='PRICE_CHANGED').map(l=>({configuration_id:l.configuration_id,currentPrice:l.currentPrice!}));
    const prepared=await prepareHouseCheckout(next,changedService);assert.equal(prepared.prepared,true);if(!prepared.prepared)return;
    assert.notEqual(prepared.contract.fingerprint,before.contract.fingerprint);assert.notEqual(prepared.curtains[0].handoff.snapshot.configurationId,before.curtains[0].handoff.snapshot.configurationId);
    assert.equal(prepared.curtains[0].retainedConfigurationId,before.curtains[0].retainedConfigurationId);
  }
});

test('retaining independently uses the production engine and exact fabric, without a fixed retail fixture',async()=>{const line=await retained();assert.equal(line.pricing_version,ROOMS_RULESET);assert.equal(line.fabric_master_id,source.id);assert.deepEqual(line.configuration,configuration);assert.equal(line.last_validated_price,(await service().calculate(configuration)).totalAmountMinor);assert.equal(unseal<any>('retained',line.receipt,secret).configuration_id,line.configuration_id);});
test('old price token and tampered measurements cannot enter a saved room',async()=>{const price=await service().calculate(configuration);const configurationId=randomUUID();const token=signReviewSubmissionWithSecret({configuration,configurationId,outcome:price.outcome,totalAmountMinor:price.totalAmountMinor},secret,1);await assert.rejects(retainCurtain({configuration,configurationId,priceConfirmationToken:token},service()),/RECONFIRM/);const fresh=signReviewSubmissionWithSecret({configuration,configurationId,outcome:price.outcome,totalAmountMinor:price.totalAmountMinor},secret);await assert.rejects(retainCurtain({configuration:{...configuration,widthCm:202},configurationId,priceConfirmationToken:fresh},service()),/RECONFIRM/);});
test('saved receipt survives the original two-hour token but always recalculates price',async()=>{const saved=await retained();let calls=0;const baseline=service();const result=await reviewHouse(request([saved]),service({now:()=> '2026-10-21T21:00:00.000Z',calculate:async c=>{calls++;return baseline.calculate(c);}}));assert.equal(calls,1);assert.equal(result.ready,true);assert.equal(result.lines[0].status,'READY');assert.equal(result.checkoutEnabled,false);});
test('changes are identified per room and window, with explicit acknowledgement required',async()=>{const saved=await retained();const result=await reviewHouse(request([saved]),service({async calculate(c){const p=await service().calculate(c);return{...p,totalAmountMinor:p.totalAmountMinor!+1200,netAmountMinor:p.netAmountMinor!+1000,vatAmountMinor:p.vatAmountMinor!+200};}}));assert.equal(result.lines[0].status,'PRICE_CHANGED');assert.equal(result.lines[0].room_name,'Front Lounge');assert.equal(result.lines[0].currentPrice,saved.last_validated_price+1200);assert.equal(result.requiresPriceAcknowledgement,true);assert.equal(saved.last_validated_price,(await service().calculate(configuration)).totalAmountMinor);});
test('tampered durable receipt blocks only that curtain and never substitutes fabric',async()=>{const a=await retained(),b=await retained();const req=request([a,b]);req.rooms[0].curtains[0].receipt+='bad';const result=await reviewHouse(req,service());assert.equal(result.ready,false);assert.equal(result.lines[0].status,'BLOCKED');assert.equal(result.lines[1].status,'READY');assert.equal(result.goods,null);});
test('cumulative stock checks total cloth needed by every window sharing a fabric',async()=>{const a=await retained(),b=await retained();let required=0;const one=(await service().calculate(configuration)).fabricMetres!;const result=await reviewHouse(request([a,b]),service({async stock(id,metres){assert.equal(id,source.id);required=metres;return metres<=one;}}));assert.equal(required,2*one);assert.equal(result.ready,false);assert.ok(result.lines.every(l=>l.status==='BLOCKED'));});
for(const cause of ['deleted','non-commercial','stale-stock','draft-rules','incompatible'] as const)test(`${cause} blocks review and preserves saved raw dimensions`,async()=>{const saved=await retained();const baseline=JSON.stringify(saved);const services=service({async calculate(c){if(cause==='deleted'||cause==='incompatible')throw Error('UNAVAILABLE');const price=await service().calculate(c);return{...price,...(cause==='non-commercial'?{commercialState:'PRICE_READY' as const}:cause==='stale-stock'?{stockSnapshotStale:true}:{calculationVersion:'2.3.0-draft.1'})};}});const result=await reviewHouse(request([saved]),services);assert.equal(result.ready,false);assert.equal(JSON.stringify(saved),baseline);});
test('duplicate curtain identities and missing delivery fail closed',async()=>{const line=await retained();await assert.rejects(reviewHouse(request([line,line]),service()),/DUPLICATE/);const result=await reviewHouse(request([line]),service({async delivery(){throw Error('BAD_POSTCODE');}}));assert.equal(result.ready,false);assert.equal(result.total,null);});
test('ten windows use exactly one delivery quote and summed authoritative goods/VAT',async()=>{const lines=await Promise.all(Array.from({length:10},()=>retained()));let calls=0;const s=service();const result=await reviewHouse(request(lines),service({async delivery(p,postcode,configurations){calls++;assert.equal(configurations.length,10);assert.equal(configurations[0].dropCm,236);return s.delivery(p,postcode,configurations);}}));assert.equal(calls,1);assert.equal(result.goods,lines.reduce((n,l)=>n+l.last_validated_price,0));assert.equal(result.total,result.goods!+1295);assert.equal(result.delivery,1295);assert.equal(result.ready,true);});
test('the preview cannot execute even a single Shopify payment handoff',()=>{assert.throws(()=>assertHouseCheckoutReleased(),/MULTI_SNAPSHOT/);});
for(const count of [1,3,10])test(`${count} immutable curtains survive a reconstructed storage client`,async()=>{const storage=memory();let roomId:string|undefined;for(let i=0;i<count;i++){const saved=await Store.addCurtain(await retained(),roomId?{roomId}:{roomName:'Living Room'},storage);roomId=saved.room.room_id;}const reloaded=Store.read(storage);assert.equal(Store.totals(reloaded).curtains,count);assert.equal(reloaded.rooms.length,1);assert.ok(reloaded.rooms[0].curtains.every((c:any)=>c.configuration.widthCm===201));});
test('room rename and removing a middle curtain preserve every other configuration byte-for-byte',async()=>{const storage=memory();const a=await Store.addCurtain(await retained(),{roomName:'Living Room'},storage);const b=await Store.addCurtain(await retained(),{roomId:a.room.room_id},storage);const c=await Store.addCurtain(await retained(),{roomName:'Main Bedroom'},storage);const before=Store.read(storage);const middle=b.room.curtains[1].configuration_id;const result=await Store.change(before.revision,(next:any)=>{next.rooms[0].room_name='Front Lounge';next.rooms[0].curtains=next.rooms[0].curtains.filter((l:any)=>l.configuration_id!==middle);},storage);assert.equal(result.rooms[0].room_name,'Front Lounge');assert.deepEqual(result.rooms[0].curtains[0],before.rooms[0].curtains[0]);assert.deepEqual(result.rooms[1],c.house.rooms[1]);assert.equal(Store.totals(result).curtains,2);});
test('cross-tab revision conflicts cannot overwrite a newer house',async()=>{const storage=memory();const original=Store.ensure(storage);await Store.change(original.revision,(next:any)=>Store.addRoom(next,'Office'),storage);await assert.rejects(Store.change(original.revision,(next:any)=>{next.rooms=[];},storage),/another tab/);assert.equal(Store.read(storage).rooms[0].room_name,'Office');});
test('quota and corrupt storage errors never report Saved or silently discard a house',async()=>{const storage=memory();const before=Store.ensure(storage);const limited={getItem:storage.getItem,setItem:()=>{throw Error('QuotaExceeded');}};await assert.rejects(Store.change(before.revision,(next:any)=>Store.addRoom(next,'Office'),limited),/could not be saved/);assert.deepEqual(Store.read(storage),before);storage.setItem(Store.KEY,'{broken');assert.throws(()=>Store.ensure(storage),/No saved data/);assert.equal(storage.getItem(Store.KEY),'{broken');});
test('duplicate add is idempotent and never doubles a retained curtain',async()=>{const storage=memory(),line=await retained();await Store.addCurtain(line,{roomName:'Lounge'},storage);const second=await Store.addCurtain(line,{roomName:'Lounge'},storage);assert.equal(second.reused,true);assert.equal(Store.totals(second.house).curtains,1);});
