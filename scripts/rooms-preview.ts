/** Loopback-only fixture review. Never uses production credentials or Shopify writes. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { retainCurtain, reviewHouse, type RoomsServices, type HouseReviewRequest } from '../lib/storefront/rooms-core';
import { calculateProductionMtmCustomerPrice } from '../lib/storefront/production-pricing';
import { PRESTIGIOUS_PILOT_FABRICS } from '../lib/prestigious/pilot-fabrics';
import { signReviewSubmissionWithSecret, verifyReviewSubmissionWithSecret } from '../lib/storefront/review-token-core';
import { quoteOwnerApprovedCurtainShipping, STAGING_SHIPPING_OWNER_INPUTS } from '../lib/storefront/shipping-owner-inputs';
import type { StagingPriceRequest } from '../lib/storefront/staging-pricing';
// The optional local media report is intentionally ignored by Git and absent
// from Vercel builds. This loopback-only preview still works without it.
const mediaEvidence: { mappings: Array<{ fabricId: string; mappingState: string; rightsState: string; shopifyCdnUrl?: string | null }> } = { mappings: [] };

const secret=randomBytes(32).toString('hex');
const assetRoot=path.resolve('shopify-theme/curtainsuk-new-design-live-base/assets');
const sources=PRESTIGIOUS_PILOT_FABRICS.filter(f=>['pt-4269-147','pt-4270-147','pt-4271-147'].includes(f.id));
let scenario='normal';
const services:RoomsServices={
  secret,now:()=>new Date().toISOString(),
  async calculate(configuration){
    if(scenario==='unavailable')throw Error('NOT_FOUND');
    const source=sources.find(f=>f.id===configuration.fabricId);if(!source)throw Error('NOT_FOUND');
    const result=calculateProductionMtmCustomerPrice(configuration,{...source,supplierCostPerMetre:{amountMinor:scenario==='price-change'?1300:1000,currency:'GBP'},supplierCostEffectiveFrom:'2026-09-21'});
    return {...result,stockSnapshotStale:false,commercialState:scenario==='non-commercial'?'PRICE_READY':'ORDER_READY',reviewSubmissionToken:signReviewSubmissionWithSecret({configuration,configurationId:result.configurationId,outcome:result.outcome,totalAmountMinor:result.totalAmountMinor},secret)};
  },
  verifyPrice:(configuration,configurationId,price,token)=>verifyReviewSubmissionWithSecret({configuration,configurationId,outcome:price.outcome,totalAmountMinor:price.totalAmountMinor},token,secret),
  async fabric(id){const f=sources.find(f=>f.id===id);if(!f)throw Error('NOT_FOUND');const media=mediaEvidence.mappings.find(m=>m.fabricId===id&&m.mappingState==='VERIFIED'&&m.rightsState==='APPROVED');return{id,design:f.design,colour:f.colour,supplier:f.supplier,brand:'Prestigious Textiles',imageUrl:media?.shopifyCdnUrl||null};},
  async stock(){return scenario!=='out-of-stock';},
  async delivery(prices,postcode){return quoteOwnerApprovedCurtainShipping({selectedRegion:'UK_MAINLAND',postcode,fabricMetres:prices.reduce((n,p)=>n+p.fabricMetres!,0),maximumDropCm:240,rules:STAGING_SHIPPING_OWNER_INPUTS.rates.map(r=>({...r,enabled:true,currency:'GBP',status:'VALIDATED'})) as Parameters<typeof quoteOwnerApprovedCurtainShipping>[0]['rules']});}
};
function html(body:string){return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Build My Rooms — CurtainsUK local review</title><link rel="stylesheet" href="/assets/curtainsuk-rooms.css"><style>body{margin:0;background:#f6f3eb;font-family:Arial,sans-serif}nav.preview-nav{padding:24px 5vw;display:flex;justify-content:space-between;align-items:center;color:#173d35;border-bottom:1px solid #d7dbcd}nav a{color:inherit;text-decoration:none}.brand{font-size:25px;letter-spacing:-1px}.preview-tools{padding:12px 5vw;background:#e4e9db;display:flex;gap:12px;flex-wrap:wrap}.preview-tools button,.preview-tools select{padding:10px;background:#fffcf6;color:#173d35;border:1px solid #a0ad96}</style><div class="cukrooms__preview">Unpublished local review · Fixture fabrics, stock and costs · No Shopify writes or payment</div><nav class="preview-nav"><a class="brand" href="/">CurtainsUK</a><a href="/pages/build-my-rooms">My rooms ↗</a></nav>${body}<script src="/assets/curtainsuk-rooms-store.js"></script><script src="/assets/curtainsuk-rooms.js"></script></html>`;}
const rooms=`<div class="preview-tools"><button data-fixture-add>Add example curtain</button><button data-fixture-ten>Add 10-curtain house</button><label>Review scenario <select data-scenario><option value="normal">Unchanged</option><option value="price-change">Changed price</option><option value="out-of-stock">Out of stock</option><option value="non-commercial">Not commercially eligible</option><option value="unavailable">Fabric unavailable</option></select></label></div><main class="cukrooms" data-cuk-rooms data-engine-base="/preview-api" data-heading-wave="/assets/cuk-anatomy-wave.png" data-heading-double-pinch="/assets/cuk-anatomy-double-pinch.png" data-heading-pencil-pleat="/assets/cuk-anatomy-pencil-pleat.png" data-heading-eyelet="/assets/cuk-anatomy-eyelet.png"></main><script>window.addEventListener('load',()=>{const add=async(count)=>{const r=await fetch('/fixtures?count='+count);const items=await r.json();for(let i=0;i<items.length;i++){const h=CurtainsUKRooms.ensure();const roomName=['Living Room','Main Bedroom','Home Office'][i%3];const room=h.rooms.find(r=>r.room_name===roomName);await CurtainsUKRooms.addCurtain(items[i],room?{roomId:room.room_id}:{roomName});}location.href='/pages/build-my-rooms';};document.querySelector('[data-fixture-add]').onclick=()=>add(1);document.querySelector('[data-fixture-ten]').onclick=()=>add(10);document.querySelector('[data-scenario]').onchange=e=>fetch('/scenario?value='+encodeURIComponent(e.target.value));});</script>`;
const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url||'/', 'http://127.0.0.1:4348');
  if(req.headers.host!=='127.0.0.1:4348'&&req.headers.host!=='localhost:4348'){res.writeHead(403);return res.end();}
  res.setHeader('Cache-Control','no-store');
  if(url.pathname.startsWith('/assets/')){const name=url.pathname.slice(8);if(!/^[\w.-]+$/.test(name))throw Error('INVALID_ASSET');const bytes=await readFile(path.join(assetRoot,name));res.setHeader('Content-Type',name.endsWith('.css')?'text/css':name.endsWith('.js')?'application/javascript':'image/png');return res.end(bytes);}
  if(url.pathname==='/scenario'){scenario=url.searchParams.get('value')||'normal';return res.end('{}');}
  if(url.pathname==='/fixtures'){
    scenario='normal';const count=Math.min(10,Number(url.searchParams.get('count')||1));const items=[];
    for(let i=0;i<count;i++){const configuration:StagingPriceRequest={fabricId:sources[i%sources.length].id,windowSlug:i%2?'french-doors':'standard-window',hardware:'TRACK',measurementBasis:'TRACK_WIDTH',heading:i%3===0?'WAVE':i%3===1?'DOUBLE_PINCH':'PENCIL_PLEAT',widthCm:180+i*2,dropCm:220,lining:'BLACKOUT',construction:'PAIR',stackDirection:'SPLIT',desiredFinish:'FLOOR'};const price=await services.calculate(configuration);items.push(await retainCurtain({configuration,configurationId:price.configurationId,priceConfirmationToken:price.reviewSubmissionToken!},services));}res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(items));
  }
  if(url.pathname==='/preview-api/rooms'&&req.method==='POST'){
    const buffers:Buffer[]=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>524288)throw Error('BODY_TOO_LARGE');buffers.push(chunk);}const input=JSON.parse(Buffer.concat(buffers).toString());if(input.action!=='review')throw Error('PREVIEW_ACTION_DENIED');res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(await reviewHouse(input.payload as HouseReviewRequest,services)));
  }
  res.setHeader('Content-Type','text/html; charset=utf-8');
  if(url.pathname==='/'||url.pathname==='/pages/build-my-rooms')return res.end(html(rooms));
  res.end(html(`<main class="cukrooms"><p class="cukrooms__eyebrow">Local navigation test</p><h1>${url.pathname.includes('consultation')?'Fabric Intelligence':url.pathname.includes('visualiser')?'Make Curtains':'Browse Fabrics'}</h1><p>This local placeholder verifies that your saved rooms survive navigation. It does not simulate a live fabric consultation or configuration.</p><p><a href="/pages/build-my-rooms">Return to Build My Rooms</a></p></main>`));
}catch(error){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error instanceof Error?error.message:'Preview error'}));}});
server.listen(4348,'127.0.0.1',()=>console.log('UNPUBLISHED ROOMS PREVIEW http://127.0.0.1:4348'));
