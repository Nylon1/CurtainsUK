/** Loopback review of the real runtime and live public catalogue. No writes. */
import {createBeyondCatalogue,FABRIC_SCOPE} from '../lib/beyond-windows/catalogue.mjs';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
const port=Number(process.env.BEYOND_PORT||4410),origin=`http://127.0.0.1:${port}`,root=process.cwd();
const build=JSON.parse(await readFile('lib/room-visualiser/build.json'));
const mime={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.html':'text/html','.jpeg':'image/jpeg','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.bin':'application/octet-stream','.glb':'model/gltf-binary'};
const allowed=new Set(['index.html','style.css','main.mjs','model.mjs','renderer.mjs','furnishings.mjs','screens.mjs','airport-reference.jpeg','edge-ball-aluminium.png']);
const {catalogue,qualify}=createBeyondCatalogue(JSON.parse(await readFile('lib/room-visualiser/assets.json')));
const faultCounts=new Map(); // Opt-in loopback QA only; never part of deployed routes.
createServer(async(req,res)=>{
  if(req.method!=='GET'||req.headers.host!==`127.0.0.1:${port}`){res.writeHead(403);return res.end();}
  try{
    const url=new URL(req.url,origin),base=origin+'/curtains-beyond-windows-preview/',rendererBase=origin+build.assetBase;
    if(url.pathname==='/favicon.ico'){res.writeHead(204);return res.end();}
    if(url.pathname.endsWith('/catalog')||url.pathname.startsWith('/room-visualiser/fixed140/')){
      const fault=url.searchParams.get('fabric');
      if(process.env.BEYOND_TEST_FAULTS==='1'&&['review-image-failure','review-catalog-failure'].includes(fault)){
        const count=(faultCounts.get(fault)||0)+1;faultCounts.set(fault,count);
        if(fault==='review-catalog-failure'&&count===1){res.writeHead(503,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Deliberate loopback QA failure'}));}
        const r=await fetch('https://www.curtainsuk.com/apps/curtainsuk-decision/catalog?view=retail&visualiser=1&fabric=sdg-f1541-01'),data=await r.json();data.fabric=qualify(data.fabric);data.fabric.id=fault;data.fabric.sampleAvailable=false;data.fabric.orderReady=false;delete data.fabric.fabricProfileUrl;
        if(fault==='review-image-failure'&&count===1)data.fabric.roomPreview.worktableImageUrl=origin+'/deliberately-missing-image.jpg';
        res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify(data));
      }
      if(url.pathname==='/curtains-beyond-windows-preview/catalog'){const r=await catalogue(new Request(url));res.writeHead(r.status,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(await r.text());}
      const upstream=url.pathname.endsWith('/catalog')?new URL('https://www.curtainsuk.com/apps/curtainsuk-decision/catalog'+url.search):new URL(url.pathname,'https://curtainsuk-production-api.vercel.app');
      const r=await fetch(upstream,{signal:AbortSignal.timeout(30000)});res.writeHead(r.status,{'Content-Type':r.headers.get('content-type')||'application/json','Cache-Control':'no-store'});return res.end(Buffer.from(await r.arrayBuffer()));
    }
    let file,body;
    if(url.pathname==='/'||url.pathname.startsWith('/curtains-beyond-windows-preview')){
      const name=url.pathname.replace(/^\/curtains-beyond-windows-preview\/?/,'')||'index.html';const chosen=name==='/'?'index.html':name;
      if(!allowed.has(chosen))throw Error('Not found');file=chosen==='airport-reference.jpeg'?'public/images/commercial/airport-lounge-main.jpeg':`lib/beyond-windows/runtime/${chosen}`;
      body=await readFile(file);
      if(chosen==='index.html'){const existing=await readFile('lib/room-visualiser/runtime/rooms/customer.html','utf8'),dialog=existing.slice(existing.indexOf('<dialog'),existing.indexOf('</dialog>')+9).replace('Choose a fabric for this room','Choose your decorative fabric').replace('Only fabrics with a room preview appear here. Browse the full fabric library for other fabrics.',FABRIC_SCOPE);
        body=body.toString().replace('__FABRIC_DIALOG__',dialog).replaceAll('__BEYOND_BASE__',base).replaceAll('__RENDERER_BASE__',rendererBase).replace('__BEYOND_CONFIG__',JSON.stringify({assetBase:base,rendererBase,catalogueUrl:base+'catalog',destination:base,preview:true}));}
    }else if(url.pathname==='/pages/room-visualiser'){
      file='customer.html';const fixed=JSON.parse(await readFile('lib/room-visualiser/fixed140-build.json'));
      body=(await readFile('lib/room-visualiser/runtime/rooms/customer.html','utf8')).replaceAll('__VISUALISER_ASSET_BASE__',rendererBase).replaceAll('__FIXED140_ASSET_BASE__',origin+fixed.assetBase).replace('<section id="visualiser"',`<p style="padding:16px"><a href="${base}">Explore Curtains Beyond Windows →</a></p><section id="visualiser"`);
    }else{
      file=resolve('public','.'+decodeURIComponent(url.pathname));if(!file.startsWith(resolve('public')+sep)||!url.pathname.startsWith('/room-visualiser/'))throw Error('Not found');body=await readFile(file);
    }
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  }catch(error){res.writeHead(404,{'Content-Type':'text/plain'});res.end(error.message);}
}).listen(port,'127.0.0.1',()=>console.log(origin+'/curtains-beyond-windows-preview/?debug=1'));
