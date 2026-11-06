import 'server-only';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {catalogue, fabricDetail, price} from '@/experiments/roman-blind-preview/roman-api';

const previewRoot=path.join(process.cwd(),'experiments/roman-blind-preview');
const sharedRoot=path.join(process.cwd(),'lib/room-visualiser/runtime');
const files:Record<string,string>={
 'roman.html':'text/html; charset=utf-8','index.html':'text/html; charset=utf-8',
 'measure.html':'text/html; charset=utf-8','install.html':'text/html; charset=utf-8','shop.html':'text/html; charset=utf-8',
 'roman.css':'text/css; charset=utf-8','style.css':'text/css; charset=utf-8','measure.css':'text/css; charset=utf-8',
 'install.css':'text/css; charset=utf-8','shop.css':'text/css; charset=utf-8','journey.css':'text/css; charset=utf-8',
 'app.mjs':'text/javascript; charset=utf-8','geometry.mjs':'text/javascript; charset=utf-8','motion.mjs':'text/javascript; charset=utf-8',
 'lounge.mjs':'text/javascript; charset=utf-8','measure.mjs':'text/javascript; charset=utf-8','measure-plan.mjs':'text/javascript; charset=utf-8',
 'install.mjs':'text/javascript; charset=utf-8','journey.mjs':'text/javascript; charset=utf-8','shop.mjs':'text/javascript; charset=utf-8',
 'fabrics.json':'application/json',
};
const shared:Record<string,{file:string;type:string}>={
 'rooms-store.js':{file:path.join(process.cwd(),'shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-rooms-store.js'),type:'text/javascript; charset=utf-8'},
 'logo.png':{file:path.join(process.cwd(),'lib/hanging-guide/runtime/logo.png'),type:'image/png'},
 'vendor/three.module.js':{file:path.join(sharedRoot,'vendor/three.module.js'),type:'text/javascript; charset=utf-8'},
 'vendor/three.core.js':{file:path.join(sharedRoot,'vendor/three.core.js'),type:'text/javascript; charset=utf-8'},
 'garden.jpg':{file:path.join(sharedRoot,'rooms/environment/assets/window/lounge-garden.jpg'),type:'image/jpeg'},
 'oak.png':{file:path.join(sharedRoot,'rooms/packs/oak.png'),type:'image/png'},
 'weave.png':{file:path.join(sharedRoot,'rooms/packs/weave.png'),type:'image/png'},
};
const image=/^assets\/[a-z0-9-]+\.(?:jpg|webp|svg|png)$/;
export async function romanHostedRequest(request:Request,parts:string[]=[]):Promise<Response>{
 const name=parts.length?parts.join('/'):'roman.html';
 const url=new URL(request.url);
 if(name.startsWith('roman-api/')){
  const headers={'Cache-Control':'no-store'};
  try{
   if(request.method==='GET'&&name==='roman-api/catalog')return Response.json(await catalogue(url.searchParams),{headers});
   if(request.method==='GET'&&name==='roman-api/fabric')return Response.json(await fabricDetail(url.searchParams.get('id')||''),{headers});
   if(request.method==='POST'&&name==='roman-api/price'){
    if(!request.headers.get('content-type')?.startsWith('application/json'))return new Response('JSON required',{status:415,headers});
    const body=await request.text();
    if(body.length>4096)return new Response('Request too large',{status:413,headers});
    return Response.json(await price(JSON.parse(body)),{headers});
   }
  }catch{return Response.json({error:'This resource is unavailable. Please try again.'},{status:503,headers});}
  return new Response('Not found',{status:404,headers});
 }
 if(request.method!=='GET'||name.includes('..')||name.includes('\\'))return new Response('Not found',{status:404});
 const sharedFile=shared[name];
 const type=sharedFile?.type||files[name]||(image.test(name)?({jpg:'image/jpeg',webp:'image/webp',svg:'image/svg+xml',png:'image/png'}[name.split('.').pop()!]||''):undefined);
 if(!type)return new Response('Not found',{status:404});
 const file=sharedFile?.file||path.join(previewRoot,name);
 try{
  const body=await readFile(/*turbopackIgnore: true*/ file);
  return new Response(new Uint8Array(body),{headers:{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':type.startsWith('image/')?'public, max-age=3600':'no-store'}});
 }catch{return new Response('Not found',{status:404});}
}
