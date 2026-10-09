/** Loopback-only experiment. No Next route, build inclusion or production mutation. */
import {createServer} from 'node:http';
import {Buffer} from 'node:buffer';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
import {instrumentViewer} from './viewer-bridge.mjs';
import {instrumentFabricLighting} from './fabric-lighting-bridge.mjs';
const directory=resolve(fileURLToPath(new URL('.',import.meta.url)));
const runtime=resolve(directory,'../../lib/room-visualiser/runtime');
const port=Number(globalThis.process?.env?.ROOM_V2_PORT||4382),origin=`http://127.0.0.1:${port}`;
const mime={'.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.bin':'application/octet-stream'};
createServer(async(req,res)=>{
  if(req.method!=='GET'||req.headers.host!==`127.0.0.1:${port}`){res.writeHead(403);res.end();return;}
  try{
    const url=new URL(req.url,origin);
    if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
    const roomsReviewRoot=resolve(directory,'../../../curtainsuk-visualiser-2-four-rooms-evidence-20261009');
    if(url.pathname==='/rooms-review'){
      const html=(await readFile(resolve(roomsReviewRoot,'review.html'),'utf8')).replace('</head>','<base href="/rooms-review-assets/"></head>');
      res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(html);return;
    }
    if(/^\/rooms-review-assets\/[a-zA-Z0-9_-]+\.(png|jpg|json)$/.test(url.pathname)){
      const name=url.pathname.slice('/rooms-review-assets/'.length),body=await readFile(resolve(roomsReviewRoot,name));
      res.writeHead(200,{'Content-Type':mime[extname(name)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);return;
    }
    if(url.pathname==='/'||url.pathname==='/pages/room-visualiser'){
      const html=(await readFile(resolve(runtime,'rooms/customer.html'),'utf8'))
        .replace('__VISUALISER_ASSET_BASE__',`${origin}/runtime/`)
        .replace('__FIXED140_ASSET_BASE__',`${origin}/runtime/fixed140-v1/`)
        .replace('</head>','<link rel="stylesheet" href="/experiment/prototype.css"></head>')
        .replace('<body class="customer-visualiser">','<body class="customer-visualiser"><div class="experiment-banner">LOCAL EXPERIMENT · Room Visualiser 2.0 · <a href="/rooms-review">Review all four rooms</a> · <a href="?mode=baseline">Original</a> / <a href="?mode=prototype">Prototype</a></div>');
      res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(html);return;
    }
    // Private review evidence, restricted to this loopback experiment.
    const reviewRoot=resolve(directory,'../../../curtainsuk-visualiser-2-refinement-evidence-20261008');
    if(url.pathname==='/review'){
      const html=(await readFile(resolve(reviewRoot,'review.html'),'utf8')).replace('</head>','<base href="/review-assets/"></head>');
      res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(html);return;
    }
    if(/^\/review-assets\/[a-zA-Z0-9_-]+\.(png|jpg|json)$/.test(url.pathname)){
      const name=url.pathname.slice('/review-assets/'.length),body=await readFile(resolve(reviewRoot,name));
      res.writeHead(200,{'Content-Type':mime[extname(name)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);return;
    }
    // Only public, read-only catalogue and immutable asset requests. No credentials.
    if(url.pathname==='/apps/curtainsuk-decision/catalog'||/^\/room-visualiser\/[a-zA-Z0-9/_\-.]+$/.test(url.pathname)){
      const base=url.pathname.startsWith('/apps/')?'https://www.curtainsuk.com':'https://curtainsuk-production-api.vercel.app';
      const upstream=await fetch(new URL(url.pathname+url.search,base),{signal:AbortSignal.timeout(45000)});
      res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'application/octet-stream','Cache-Control':upstream.headers.get('cache-control')||'no-store'});
      res.end(Buffer.from(await upstream.arrayBuffer()));return;
    }
    const experimental=url.pathname.startsWith('/experiment/'),prefix=experimental?'/experiment/':'/runtime/';
    if(!url.pathname.startsWith(prefix))throw Error('UNKNOWN_PATH');
    const root=experimental?directory:runtime,file=resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)));
    if(!file.startsWith(root+sep))throw Error('INVALID_PATH');
    let body=await readFile(file);
    if(file===resolve(runtime,'rooms/viewer.mjs'))body=instrumentViewer(body.toString());
    if(file===resolve(runtime,'rooms/lighting.mjs'))body=instrumentFabricLighting(body.toString());
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  }catch(error){res.writeHead(500);res.end(String(error.message));}
}).listen(port,'127.0.0.1',()=>console.log(`${origin}/?fabric=sdg-f1541-01`));
