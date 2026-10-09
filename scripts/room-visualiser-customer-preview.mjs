/** Read-only loopback preview of the actual immutable customer pack. No code injection. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
const port=Number(process.env.ROOM_CUSTOMER_PORT||4383),origin=`http://127.0.0.1:${port}`,root=resolve('public');
const build=JSON.parse(await readFile('lib/room-visualiser/build.json'));
const fixed=JSON.parse(await readFile('lib/room-visualiser/fixed140-build.json'));
const mime={'.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.bin':'application/octet-stream'};
createServer(async(req,res)=>{
  if(req.method!=='GET'||req.headers.host!==`127.0.0.1:${port}`){res.writeHead(403);res.end();return;}
  try{
    const url=new URL(req.url,origin);
    if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
    if(url.pathname==='/'||url.pathname==='/pages/room-visualiser'){
      const html=(await readFile('lib/room-visualiser/runtime/rooms/customer.html','utf8')).replace('__VISUALISER_ASSET_BASE__',origin+build.assetBase).replace('__FIXED140_ASSET_BASE__',origin+fixed.assetBase);
      res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(html);return;
    }
    if(url.pathname==='/apps/curtainsuk-decision/catalog'||url.pathname.startsWith('/room-visualiser/fixed140/')){
      const base=url.pathname.startsWith('/apps/')?'https://www.curtainsuk.com':'https://curtainsuk-production-api.vercel.app';
      const upstream=await fetch(new URL(url.pathname+url.search,base),{signal:AbortSignal.timeout(45000)});
      res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'application/octet-stream','Cache-Control':'no-store'});res.end(Buffer.from(await upstream.arrayBuffer()));return;
    }
    const file=resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+sep)||!url.pathname.startsWith('/room-visualiser/'))throw Error('INVALID_PATH');
    const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  }catch(error){res.writeHead(500,{'Content-Type':'text/plain'});res.end(error.message);}
}).listen(port,'127.0.0.1',()=>console.log(origin));
