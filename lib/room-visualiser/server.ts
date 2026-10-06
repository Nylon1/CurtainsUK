import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import build from './build.json';
import assets from './assets.json';

// This deployment's static content is durable, versioned and CDN cached. A
// customer request can only read an already-approved derivative, never build it.
export async function visualiserPage(request:Request) {
  const url=new URL(request.url);
  const origin=['localhost','127.0.0.1'].includes(url.hostname)?url.origin:'https://curtainsuk-production-api.vercel.app';
  const html=await readFile(join(process.cwd(),'lib/room-visualiser/runtime/rooms/customer.html'),'utf8');
  return new Response(html.replace('__VISUALISER_ASSET_BASE__',`${origin}${build.assetBase}`),{
    headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'},
  });
}

type Fabric = {id:string;horizontalRepeatMm?:number|null;verticalRepeatMm?:number|null;patternMatchType?:string|null};
export function withRoomPreview<T extends Fabric>(fabric:T) {
  const asset=assets.fabrics.find(item=>item.fabricId===fabric.id);
  const available=!!asset && !/HALF|OFFSET|STAGGER|BRICK/i.test(fabric.patternMatchType??'') &&
    (asset.mode==='plain'||(fabric.horizontalRepeatMm===asset.hRepeat!*10&&fabric.verticalRepeatMm===asset.vRepeat!*10));
  return {...fabric,roomPreview:{available,url:available?`/pages/room-visualiser?fabric=${encodeURIComponent(fabric.id)}`:null,message:available?null:'Room preview not available for this fabric yet.'}};
}
