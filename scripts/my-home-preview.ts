/** Unpublished offline rehearsal. Production UI and pricing engines, synthetic authorities. */
import {smartTrackAsset} from '../lib/smart-track/assets';
import {quoteSmartTrack} from '../lib/smart-track/pricing';
import {trackPackage} from '../lib/smart-track/package';
import {linkedCurtainEvidence} from '../lib/smart-track/linked';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import fixed140 from '../lib/room-visualiser/fixed140-assignments.json';
import {homeFixture,source,fabric} from './my-home-preview-fixtures';
import {reviewMyHome,checkoutMyHome} from '../lib/cushion-studio/my-home';
import {retainCurtain} from '../lib/storefront/rooms-core';
import {signReviewSubmissionWithSecret} from '../lib/storefront/review-token-core';
import {STOREFRONT_WINDOW_TYPES} from '../lib/storefront/window-catalog';
import {cushionPreviewAsset} from '../lib/cushion-studio/preview-assets';
import {parseCushionSpec,PREVIEW_PRICING_RULES} from '../lib/cushion-studio/domain';
import {quoteCushionSet} from '../lib/cushion-studio/pricing';
import {customerCushionQuote} from '../lib/cushion-studio/commerce';
async function main(){
if(process.env.VERCEL || process.env.NODE_ENV==='production')throw Error('LOCAL_ONLY');
const port=Number(process.env.LOCAL_PREVIEW_PORT||4375),root=path.join(process.cwd(),'shopify-theme/curtainsuk-dawn-16'), fixture=await homeFixture();
fixture.services.tracks={package:trackPackage,purchasesEnabled:false,existing:async()=>null,persist:async()=>{throw Error('LOCAL_ONLY');},execute:async()=>{throw Error('LOCAL_ONLY');}};
fixture.services.releases={curtains:false,cushions:false,mixed:false};
const originalRules=await fixture.services.mixed.cushion.rules();
fixture.services.mixed.cushion.rules=async()=>({
  ...originalRules,
  ...PREVIEW_PRICING_RULES,
  vatBasisPoints:2000,
});
fixture.services.mixed.cushion.facts=async id=>({...fabric,id,usableWidthMm:1400,minimumOrderMetres:1});
const originalFabric=fixture.services.mixed.house.fabric;
fixture.services.mixed.house.fabric=async id=>({...await originalFabric(id),imageUrl:id===source.id?'https://curtainsuk-production-api.vercel.app'+fixed140.assignments['pt-4269-147'].sourceImage:null});
const originalCalculate=fixture.services.mixed.house.calculate;
fixture.services.mixed.house.calculate=async c=>{const result=await originalCalculate(c);return {...result,reviewSubmissionToken:signReviewSubmissionWithSecret({configuration:c,configurationId:result.configurationId,outcome:result.outcome,totalAmountMinor:result.totalAmountMinor},fixture.services.mixed.house.secret)};};
const saved=new Map<string,any>();
const reviewFabric={...source,brand:'Synthetic review fabric',imageReferences:['https://curtainsuk-production-api.vercel.app'+fixed140.assignments['pt-4269-147'].sourceImage],images:[{url:'https://curtainsuk-production-api.vercel.app'+fixed140.assignments['pt-4269-147'].sourceImage,width:1400,height:1400,imageType:'FABRIC'}],browseReady:true,orderReady:true,sampleAvailable:false,metadata:{title:'Review fabric',h1:'Escher · Mocha',alt:'Escher Mocha fabric',metaDescription:'Local review fixture'}};

const header='<div style="background:#f2dfb9;padding:12px;text-align:center">UNPUBLISHED LOCAL REVIEW · Synthetic fabric, prices and stock · No Shopify writes or payment</div><nav style="padding:18px 5%;display:flex;justify-content:space-between"><a href="/pages/build-my-rooms">CurtainsUK</a><a href="/pages/build-my-rooms">My Home</a></nav>';
function html(body:string,scripts:string[]=[]){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>My Home local review</title><link rel="stylesheet" href="/assets/curtainsuk-rooms.css"><link rel="stylesheet" href="/assets/curtainsuk-my-home.css"><link rel="stylesheet" href="/assets/curtainsuk-storefront.css"><style>body{margin:0;background:#f8f5ef;color:#203a32;font-family:Arial,sans-serif}a{color:inherit}main[data-cuk-my-home]{padding:24px 5%;max-width:1440px;margin:auto}</style></head><body>${header}${body}<script src="/assets/curtainsuk-rooms-store.js"></script><script src="/assets/curtainsuk-rooms.js"></script>${scripts.map(s=>`<script src="/assets/${s}"></script>`).join('')}</body></html>`;}
const server=createServer(async(req,res)=>{try{
 if(![`localhost:${port}`,`127.0.0.1:${port}`].includes(req.headers.host||''))throw Error('HOST');
 const url=new URL(req.url||'/',`http://${req.headers.host}`);let body:any;
 if(req.method==='POST'){let bytes=0;const chunks=[];for await(const c of req){bytes+=c.length;if(bytes>131072)throw Error('BODY_TOO_LARGE');chunks.push(c);}body=JSON.parse(Buffer.concat(chunks).toString());}
 let response:Response;
 const json=(v:unknown)=>Response.json(v,{headers:{'Cache-Control':'no-store'}});
 if(url.pathname.startsWith('/smart-track-preview/api/')){
 const operation=url.pathname.split('/').pop();if(operation==='quote')response=json({quote:quoteSmartTrack(body.spec,{linked:body.spec.linkedCurtain?await linkedCurtainEvidence(body.spec.linkedCurtain.configurationId,body.curtains,fixture.services.mixed.house):undefined}),purchaseEnabled:false});
 else if(operation==='linked')response=json({link:await linkedCurtainEvidence(body.configurationId,body.curtains,fixture.services.mixed.house)});else response=json({ok:true});
 }
 else if(url.pathname==='/smart-track-embedded-preview'){
 const section=await readFile(path.join(root,'sections/curtainsuk-smart-track.liquid'),'utf8');
 const script=section.match(/{% javascript %}([\s\S]*?){% endjavascript %}/)?.[1]||'';
 response=new Response(html('<div class="section-cuk-header" style="position:sticky;top:0;z-index:20;background:#f5f2e9;padding:16px">CurtainsUK · embedded preview</div><iframe title="Smart Track Studio" data-cuk-track-frame data-source="/smart-track-preview/" style="display:block;width:100%;height:1600px;border:0"></iframe><script>'+script+'</script>'),{headers:{'Content-Type':'text/html'}});
 }
 else if(url.pathname.startsWith('/smart-track-preview/')||['/pages/smart-track-studio','/pages/smart-track-fitting-guide','/pages/smart-track-motors'].includes(url.pathname)){
 const asset=url.pathname==='/pages/smart-track-studio'?'index.html':url.pathname==='/pages/smart-track-fitting-guide'?'fitting.html':url.pathname==='/pages/smart-track-motors'?'motors.html':url.pathname.slice('/smart-track-preview/'.length);
 response=await smartTrackAsset(asset,'/smart-track-preview/');
 }
 else if(url.pathname.startsWith('/room-visualiser/')){if(!/^\/room-visualiser\/[A-Za-z0-9_./-]+$/.test(url.pathname)||url.pathname.includes('..'))throw Error('ASSET');response=new Response(await readFile(path.join(process.cwd(),'public',url.pathname)),{headers:{'Content-Type':url.pathname.endsWith('.mjs')||url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.webp')?'image/webp':'application/octet-stream'}});}
 else if(url.pathname.startsWith('/assets/')){const file=url.pathname.slice(8);if(!/^[\w.-]+$/.test(file))throw Error('ASSET');response=new Response(await readFile(path.join(root,'assets',file)),{headers:{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'image/png'}});}
 else if(url.pathname==='/api/my-home-review')response=json(await reviewMyHome(body,fixture.services));
 else if(url.pathname==='/api/my-home-checkout')response=json(await checkoutMyHome(body,fixture.services));
 else if(url.pathname==='/api/catalog' && url.searchParams.get('view')==='retail')response=json(url.searchParams.has('fabric')?{fabric:reviewFabric}:{fabrics:[reviewFabric],total:1,page:1,pages:1,facets:{brands:[],collections:[],colour:[],pattern:[],style:[],character:[]}});
 else if(url.pathname==='/api/catalog')response=json({windows:STOREFRONT_WINDOW_TYPES,fabrics:[{...source,brand:'Synthetic review fabric',configurable:true,selectableForReview:true}],requestedFabric:{id:source.id,status:'FOUND'}});
 else if(url.pathname==='/api/price')response=json(await fixture.services.mixed.house.calculate(body));
 else if(url.pathname==='/api/rooms' && body.action==='retain')response=json(await retainCurtain(body.payload,fixture.services.mixed.house));
 else if(url.pathname==='/api/cushion-studio/catalogue'){
 const item={id:source.id,brand:'Synthetic local review',design:'Plain weave',colour:'Sage',imageUrl:'/fixture-fabric.svg',fullWidthMm:1400,usableWidthMm:1400,calibration:{...fabric.calibration,imageUrl:'/fixture-fabric.svg'},previewReady:true,purchaseReady:false,sampleAvailable:false};response=json({items:[item],total:1,nextOffset:null,facets:{priceTiers:[],discovery:[]}});
 }
 else if(url.pathname==='/api/cushion-studio/quote'){const specs=body.specs.map(parseCushionSpec),rules=await fixture.services.mixed.cushion.rules();const inputs=await Promise.all(specs.map(async(spec:any)=>({spec,facts:await fixture.services.mixed.cushion.facts(spec.fabricId)})));response=json({quotes:inputs.map(i=>customerCushionQuote(quoteCushionSet([i],rules))),setQuote:customerCushionQuote(quoteCushionSet(inputs,rules)),purchaseEnabled:false,source:'server'});}
 else if(url.pathname==='/api/cushion-studio/designs'){if(req.method==='POST'){const prior=saved.get(body.design.id);if((prior?.revision||0)!==body.expectedRevision)throw Error('REVISION_CONFLICT');const entry={design:body.design,revision:(prior?.revision||0)+1,updatedAt:new Date().toISOString()};saved.set(body.design.id,entry);response=json({saved:entry,persistence:'local-preview-memory'});}else response=json(url.searchParams.has('id')?{saved:saved.get(url.searchParams.get('id')!)}:{designs:[...saved.values()]});}
 else if(url.pathname==='/fixture-fabric.svg')response=new Response('<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000"><defs><pattern id="p" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#8d9d83"/><path d="M0 0h6M0 0v6" stroke="#c1cbb8" stroke-width=".5"/></pattern></defs><rect width="1400" height="1000" fill="url(#p)"/></svg>',{headers:{'Content-Type':'image/svg+xml'}});
 else if(url.pathname.startsWith('/cushion-studio-preview/')||url.pathname==='/pages/cushion-studio'){response=await cushionPreviewAsset(url.pathname==='/pages/cushion-studio'?'index.html':url.pathname.slice('/cushion-studio-preview/'.length),{base:'/cushion-studio-preview/',apiBase:'/api/cushion-studio',ownerPreview:false});}
 else if(url.pathname==='/pages/fabric-library')response=new Response(html(`<main class="cuk-shell cuk-section" data-cuk-fabric-browser data-engine-base="/api"><div class="cuk-wrap"><h1>Browse Fabrics</h1><p>Local journey review with one fixture fabric. The published destination uses the shared active catalogue.</p><form data-cuk-fabric-filters role="search"><label>Search fabrics<input type="search" name="query"></label></form><p data-cuk-fabric-count></p><p data-cuk-browse-status role="status"></p><div data-cuk-error hidden><p data-cuk-error-message></p><button data-cuk-retry>Try again</button></div><div class="cuk-fabrics" data-cuk-fabric-grid></div><nav data-cuk-pagination><button data-cuk-previous>Previous</button><button data-cuk-next>Next</button></nav><div data-cuk-fabric-detail hidden></div></div></main>`,['curtainsuk-storefront.js']),{headers:{'Content-Type':'text/html'}});
 else if(url.pathname==='/pages/curtain-visualiser'){
 let section=await readFile(path.join(root,'sections/curtainsuk-configurator.liquid'),'utf8');section=section.slice(section.indexOf('<section class="cuk-shell'),section.lastIndexOf('</section>')+10);
 // Local wrapper only. Production form markup and scripts are used verbatim; Liquid chrome is replaced.
 section=section.replace(/\{% unless settings\.curtainsuk_purchase_controls_enabled %\}[\s\S]*?\{% endunless %\}/g,'').replace(/\{\{\s*section.id\s*\}\}/g,'local').replace(/\{\{[\s\S]*?\}\}/g,'').replace(/\{%[\s\S]*?%\}/g,'').replace('data-rooms-enabled=""','data-rooms-enabled="true"').replace('data-engine-base=""','data-engine-base="/api"').replace('data-purchase-controls-enabled=""','data-purchase-controls-enabled="true"').replace('data-production-checkout=""','data-production-checkout="false"');response=new Response(html(section,['curtainsuk-storefront.js']),{headers:{'Content-Type':'text/html'}});
 }
 else if(url.pathname==='/my-home-style-review')response=new Response(html(`<main style="max-width:1300px;margin:auto;padding:25px"><h1>My Home cushion style studies</h1><p>Neutral images only. The selected fabric stays in a separate card. Existing geometry and size specifications are unchanged.</p><div id="studies" style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px"></div><p id="study-status" role="status">Rendering five shapes</p></main><script type="module">import {createMyHomeStudies} from '/cushion-studio-preview/my-home-thumbnails.mjs';import {SHAPED_CONSTRUCTION_VERSION} from '/cushion-studio-preview/geometry.mjs';const renderer=createMyHomeStudies({threeUrl:'/cushion-studio-preview/three.module.js'});let count=0;for(const sizeId of ['square-50','rectangle-28-48','round-40','bed-square-65','bolster-19-44']){const spec={version:1,id:sizeId,sizeId,fabricId:'selected-fabric',filling:'cover',edge:'unpiped',placementMm:{x:100,y:100},quantity:1,...(!sizeId.startsWith('square')?{constructionProfile:SHAPED_CONSTRUCTION_VERSION}:{})};const before=JSON.stringify(spec),result=await renderer.render(spec);const figure=document.createElement('figure');figure.style.margin='0';const img=new Image();img.style.width='100%';img.alt=result.label;img.src=result.url||'';const caption=document.createElement('figcaption');caption.textContent=sizeId+' · '+(result.url&&before===JSON.stringify(spec)?'Rendered, specification unchanged':'FAILED');figure.append(img,caption);document.querySelector('#studies').append(figure);if(result.url&&before===JSON.stringify(spec))count++;}document.querySelector('#study-status').textContent=count+'/5 shapes rendered; original specifications unchanged';renderer.dispose();</script>`),{headers:{'Content-Type':'text/html'}});
 else if(url.pathname==='/'||url.pathname==='/pages/build-my-rooms')response=new Response(html('<main class="cukrooms" data-editorial-hero="/assets/cuk-rooms-editorial-hero-v1.png" data-room-bedroom="/assets/cuk-rooms-bedroom-v1.png" data-room-dining="/assets/cuk-rooms-dining-v1.png" data-room-kitchen="/assets/cuk-rooms-kitchen-v1.png" data-room-office="/assets/cuk-rooms-office-v1.png" data-room-child="/assets/cuk-rooms-child-v1.png" data-heading-wave="/assets/cuk-anatomy-wave.png" data-heading-double-pinch="/assets/cuk-anatomy-double-pinch.png" data-heading-pencil-pleat="/assets/cuk-anatomy-pencil-pleat.png" data-heading-eyelet="/assets/cuk-anatomy-eyelet.png" data-cuk-my-home data-smart-track-enabled="true" data-cushion-runtime="/cushion-studio-preview/" data-my-home-api="/api" data-cushion-url="/pages/cushion-studio"></main>',['curtainsuk-my-home.js']),{headers:{'Content-Type':'text/html'}});
 else response=new Response('Not found',{status:404});
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){res.writeHead(409,{'Content-Type':'application/json'});res.end(JSON.stringify({message:e instanceof Error?e.message:'PREVIEW_ERROR'}));}});
server.listen(port,'127.0.0.1',()=>console.log(`UNPUBLISHED MY HOME http://localhost:${port}/pages/build-my-rooms`));

}
main().catch(error=>{console.error(error);process.exitCode=1;});
