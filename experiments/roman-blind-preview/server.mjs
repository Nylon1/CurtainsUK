import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {catalogue,fabricDetail,price} from './roman-api.ts';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const fixed=new Map([
 ['/logo.png',path.join(root,'lib/hanging-guide/runtime/logo.png')],
 ['/vendor/three.module.js',path.join(root,'lib/room-visualiser/runtime/vendor/three.module.js')],
 ['/vendor/three.core.js',path.join(root,'lib/room-visualiser/runtime/vendor/three.core.js')],
 ['/garden.jpg',path.join(root,'lib/room-visualiser/runtime/rooms/environment/assets/window/lounge-garden.jpg')],
 ['/oak.png',path.join(root,'lib/room-visualiser/runtime/rooms/packs/oak.png')],
 ['/weave.png',path.join(root,'lib/room-visualiser/runtime/rooms/packs/weave.png')],
]);
const types={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{try{
 if(!['127.0.0.1:4318','localhost:4318'].includes(req.headers.host)){res.writeHead(403).end();return;}
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/roman-api/')){
  if(req.headers.origin&&!['http://127.0.0.1:4318','http://localhost:4318'].includes(req.headers.origin)){res.writeHead(403).end();return;}
  let result;
  if(req.method==='GET'&&url.pathname==='/roman-api/catalog')result=await catalogue(url.searchParams);
  else if(req.method==='GET'&&url.pathname==='/roman-api/fabric')result=await fabricDetail(url.searchParams.get('id')||'');
  else if(req.method==='POST'&&url.pathname==='/roman-api/price'){
   if(!req.headers['content-type']?.startsWith('application/json')){res.writeHead(415).end();return;}
   let body='';for await(const chunk of req){body+=chunk;if(body.length>4096){res.writeHead(413).end();return;}}
   result=await price(JSON.parse(body));
  }else{res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(result));return;
 }
 const relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
 const file=fixed.get(url.pathname)||path.resolve(here,relative);
 if(!fixed.has(url.pathname)&&(!file.startsWith(here+path.sep)||!['index.html','style.css','app.mjs','geometry.mjs','motion.mjs','lounge.mjs','fabrics.json','measure.html','measure.css','measure.mjs','measure-plan.mjs','install.html','install.css','install.mjs','roman.html','roman.css','journey.css','journey.mjs','shop.html','shop.css','shop.mjs'].includes(relative)&&!/^assets\/[a-z0-9-]+\.(jpg|webp|svg)$/.test(relative))){res.writeHead(404).end();return;}
 const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch{res.writeHead(req.url.startsWith('/roman-api/')?503:404,{'Content-Type':'application/json'}).end(JSON.stringify({error:'Unable to load this resource. Please try again.'}));}
}).listen(4318,'127.0.0.1',()=>console.log('Roman preview: http://127.0.0.1:4318'));
