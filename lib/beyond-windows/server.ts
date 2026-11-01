import {readFile} from 'node:fs/promises';
import path from 'node:path';
import build from '../room-visualiser/build.json';
import manifest from '../room-visualiser/assets.json';
import {createBeyondCatalogue,FABRIC_SCOPE} from './catalogue.mjs';

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
    const dialog=existing.slice(existing.indexOf('<dialog'),existing.indexOf('</dialog>')+9).replace('Choose a fabric for this room','Choose your decorative fabric').replace('Only fabrics with a room preview appear here. Browse the full fabric library for other fabrics.',FABRIC_SCOPE);
    body=new TextDecoder().decode(body).replace('__FABRIC_DIALOG__',dialog).replaceAll('__BEYOND_BASE__',assetBase).replaceAll('__RENDERER_BASE__',rendererBase).replace('__BEYOND_CONFIG__',JSON.stringify({assetBase,rendererBase,catalogueUrl:assetBase+'catalog',destination:assetBase,preview}).replaceAll('<','\\u003c'));
  }
  return new Response(body,{headers:{'Content-Type':assets[name],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'strict-origin-when-cross-origin'}});
}
/** Read only, bounded public Fabric Master projection. No admin credential, user
 * cookie, arbitrary upstream URL or purchase mutation is forwarded. */
export const beyondCatalogue=createBeyondCatalogue(manifest).catalogue;
