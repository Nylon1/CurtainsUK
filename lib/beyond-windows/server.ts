import {readFile} from 'node:fs/promises';
import path from 'node:path';
import build from '../room-visualiser/build.json';

const assets:Record<string,string>={'index.html':'text/html; charset=utf-8','style.css':'text/css; charset=utf-8','main.mjs':'text/javascript; charset=utf-8','model.mjs':'text/javascript; charset=utf-8','renderer.mjs':'text/javascript; charset=utf-8','furnishings.mjs':'text/javascript; charset=utf-8','screens.mjs':'text/javascript; charset=utf-8','airport-reference.jpeg':'image/jpeg','edge-ball-aluminium.png':'image/png'};
export function beyondPreviewAllowed(request:Request){
  return process.env.VERCEL_ENV==='preview'||(!process.env.VERCEL&&process.env.NODE_ENV!=='production'&&['127.0.0.1','localhost'].includes(new URL(request.url).hostname));
}
export async function beyondAsset(request:Request,name='',preview=false){
  name=name||'index.html';if(!Object.hasOwn(assets,name))return new Response('Not found',{status:404});
  const assetBase=preview?`${new URL(request.url).origin}/curtains-beyond-windows-preview/`:'https://www.curtainsuk.com/apps/curtainsuk-decision/beyond-windows/';
  const rendererBase=(preview?new URL(request.url).origin:'https://curtainsuk-production-api.vercel.app')+build.assetBase;
  const bytes=name==='airport-reference.jpeg'
    ?await readFile(path.join(process.cwd(),'public/images/commercial/airport-lounge-main.jpeg'))
    :await readFile(path.join(process.cwd(),'lib/beyond-windows/runtime',name));
  let body:Uint8Array<ArrayBuffer>|string=new Uint8Array(bytes);
  if(name==='index.html'){
    const existing=await readFile(path.join(process.cwd(),'lib/room-visualiser/runtime/rooms/customer.html'),'utf8');
    const dialog=existing.slice(existing.indexOf('<dialog'),existing.indexOf('</dialog>')+9).replace('Choose a fabric for this room','Choose your decorative fabric');
    body=new TextDecoder().decode(body).replace('__FABRIC_DIALOG__',dialog).replaceAll('__BEYOND_BASE__',assetBase).replaceAll('__RENDERER_BASE__',rendererBase).replace('__BEYOND_CONFIG__',JSON.stringify({assetBase,rendererBase,catalogueUrl:assetBase+'catalog',destination:assetBase,preview}).replaceAll('<','\\u003c'));
  }
  return new Response(body,{headers:{'Content-Type':assets[name],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'strict-origin-when-cross-origin'}});
}
/** Read only, bounded public Fabric Master projection. No admin credential, user
 * cookie, arbitrary upstream URL or purchase mutation is forwarded. */
export async function beyondCatalogue(request:Request){
  const input=new URL(request.url).searchParams,url=new URL('https://www.curtainsuk.com/apps/curtainsuk-decision/catalog');
  url.searchParams.set('view','retail');url.searchParams.set('visualiser','1');
  for(const key of['fabric','query','colour','pattern','cursor']){
    if(input.getAll(key).length>1)return Response.json({error:'Ambiguous catalogue request'},{status:400});
    const value=input.get(key);if(value&&value.length>200)return Response.json({error:'Catalogue request too long'},{status:400});
    if(value)url.searchParams.set(key,value);
  }
  try{const response=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{Accept:'application/json'},cache:'no-store'});
    if(!response.ok)return Response.json({error:'Fabric catalogue unavailable'},{status:response.status===404?404:503});
    return Response.json(await response.json(),{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'Fabric catalogue unavailable. Please retry.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
