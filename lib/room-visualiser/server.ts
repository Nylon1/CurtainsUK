import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import build from './build.json';
import fixed140Build from './fixed140-build.json';
import assets from './assets.json';
import fixed140 from './fixed140-assignments.json';
import {resolveRendererProfile,v1AssignmentForId,type Fixed140Registry} from './renderer-profile';

// This deployment's static content is durable, versioned and CDN cached. A
// customer request can only read an already-approved derivative, never build it.
export async function visualiserPage(request:Request,registry:Fixed140Registry=fixed140 as Fixed140Registry) {
  const url=new URL(request.url);
  const origin=['localhost','127.0.0.1'].includes(url.hostname)?url.origin:'https://curtainsuk-production-api.vercel.app';
  const html=await readFile(join(process.cwd(),'lib/room-visualiser/runtime/rooms/customer.html'),'utf8');
  return new Response(html.replace('__VISUALISER_ASSET_BASE__',`${origin}${build.assetBase}`).replace('__FIXED140_ASSET_BASE__',`${origin}${fixed140Build.assetBase}`),{
    headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'},
  });
}

type Fabric = {id:string;horizontalRepeatMm?:number|null;verticalRepeatMm?:number|null;patternMatchType?:string|null};
export function withRoomPreview<T extends Fabric>(fabric:T) {
  const profile=resolveRendererProfile(fabric,assets.fabrics,fixed140 as Fixed140Registry);
  const available=profile!=='NOT_ELIGIBLE';
  const assignment=profile==='FIXED140_SINGLE_WIDTH_V1'?v1AssignmentForId(fabric.id,assets.fabrics,fixed140 as Fixed140Registry):null;
  return {...fabric,roomPreview:{available,url:available?`/pages/room-visualiser?fabric=${encodeURIComponent(fabric.id)}`:null,message:available?null:'Room preview not available for this fabric yet.',rendererProfile:profile,...(assignment?{assignment}:{})}};
}
