import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const fixed=new Map([
 ['/vendor/three.module.js',path.join(root,'lib/room-visualiser/runtime/vendor/three.module.js')],
 ['/vendor/three.core.js',path.join(root,'lib/room-visualiser/runtime/vendor/three.core.js')],
 ['/garden.jpg',path.join(root,'lib/room-visualiser/runtime/rooms/environment/assets/window/lounge-garden.jpg')],
 ['/oak.png',path.join(root,'lib/room-visualiser/runtime/rooms/packs/oak.png')],
 ['/weave.png',path.join(root,'lib/room-visualiser/runtime/rooms/packs/weave.png')],
]);
const types={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png'};
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 const relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
 const file=fixed.get(url.pathname)||path.resolve(here,relative);
 if(!fixed.has(url.pathname)&&(!file.startsWith(here+path.sep)||!['index.html','style.css','app.mjs','geometry.mjs','motion.mjs','lounge.mjs','fabrics.json','measure.html','measure.css','measure.mjs','measure-plan.mjs'].includes(relative)&&!/^assets\/[a-z0-9-]+\.(jpg|webp)$/.test(relative))){res.writeHead(404).end();return;}
 const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch{res.writeHead(404).end('Not found');}
}).listen(4318,'127.0.0.1',()=>console.log('Roman preview: http://127.0.0.1:4318'));
