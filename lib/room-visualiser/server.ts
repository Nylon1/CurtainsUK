import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import build from './build.json';
import fixed140Build from './fixed140-build.json';
import assets from './assets.json';
import fixed140 from './fixed140-assignments.json';
import fixed100 from './fixed100-assignments.json';
import {resolveRendererProfile,v1AssignmentForId,fixed100AssignmentForId,type Fixed140Registry,type Fixed100Registry} from './renderer-profile';

// This deployment's static content is durable, versioned and CDN cached. A
// customer request can only read an already-approved derivative, never build it.
export async function visualiserPage(request:Request,registry:Fixed140Registry=fixed140 as Fixed140Registry) {
  const url=new URL(request.url);
  const origin=['localhost','127.0.0.1'].includes(url.hostname)?url.origin:'https://curtainsuk-production-api.vercel.app';
  const profilePreview=url.searchParams.get('embed')==='fabric-profile';
  const html=await readFile(join(process.cwd(),profilePreview
    ? 'lib/room-visualiser/profile-curtain.html' : 'lib/room-visualiser/runtime/rooms/customer.html'),'utf8');
  const beyondHref='https://www.curtainsuk.com/apps/curtainsuk-decision/beyond-windows/';
  const linkedHtml=profilePreview?html:html.replace('<section id="visualiser"',`<p style="padding:0 0 24px;font-size:14px"><a href="${beyondHref}" target="_top">More ways to use curtains: explore Curtains Beyond Windows →</a></p><section id="visualiser"`);
  return new Response(linkedHtml.replaceAll('__VISUALISER_ASSET_BASE__',`${origin}${build.assetBase}`).replaceAll('__FIXED140_ASSET_BASE__',`${origin}${fixed140Build.assetBase}`),{
    headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'},
  });
}

type Fabric = {id:string;fullWidthMm?:number|null;usableWidthMm?:number|null;horizontalRepeatMm?:number|null;verticalRepeatMm?:number|null;patternMatchType?:string|null};
export function withRoomPreview<T extends Fabric>(fabric:T) {
  const profile=resolveRendererProfile(fabric,assets.fabrics,fixed140 as Fixed140Registry,fixed100 as Fixed100Registry);
  const available=profile!=='NOT_ELIGIBLE';
  const standardAsset=profile==='STANDARD'?assets.fabrics.find(asset=>asset.fabricId===fabric.id):null;
  const assignment=profile==='FIXED140_SINGLE_WIDTH_V1'
    ?v1AssignmentForId(fabric.id,assets.fabrics,fixed140 as Fixed140Registry)
    :profile==='FIXED140_SINGLE_WIDTH_100CM_V1'
      ?fixed100AssignmentForId(fabric.id,assets.fabrics,fixed140 as Fixed140Registry,fixed100 as Fixed100Registry)
      :null;
  // The making demonstration may display only the same approved cloth source
  // already used by the visualiser. This is presentation media, not a cutting plan.
  const source=standardAsset?.image ?? assignment?.sourceImage ?? null;
  const worktableImageUrl=source && (/^\/room-visualiser\/(?:textures|fixed140)\/[a-f0-9]{64}\.(?:jpe?g|webp)$/.test(source)
    ?`https://curtainsuk-production-api.vercel.app${source}`
    :/^https:\/\/cdn\.shopify\.com\/s\/files\/1\/0256\/4551\/4861\/files\/cuk-fabric-[a-f0-9]{64}\.jpg$/.test(source)?source:null);
  const knownWidth=(fabric.usableWidthMm??fabric.fullWidthMm??0)/10;
  const physical=standardAsset && 'physicalClothCm' in standardAsset ? standardAsset.physicalClothCm : null;
  const worktableSource=assignment ? {
    fabricWidthCm:assignment.usableWidthCm,
    imageWidthCm:assignment.usableWidthCm,
    imageHeightCm:assignment.sourceHeightPx*assignment.usableWidthCm/assignment.sourceWidthPx,
    imageTopCm:'sourceTopPx' in assignment?assignment.sourceTopPx*assignment.usableWidthCm/assignment.sourceWidthPx:0,
    exampleCutCm:profile==='FIXED140_SINGLE_WIDTH_100CM_V1'?100:120,
    scaleKind:'calibrated',
  } : standardAsset && knownWidth>0 && (standardAsset.mode==='plain'||(physical&&physical.length===2&&physical.every(value=>Number.isFinite(value)&&value>0))) ? {
    fabricWidthCm:knownWidth,
    imageWidthCm:physical?.[0]??knownWidth,
    imageHeightCm:physical?.[1]??120,
    imageTopCm:0,
    exampleCutCm:120,
    scaleKind:standardAsset.mode==='plain'?'colour-only':'calibrated',
  } : null;
  return {...fabric,roomPreview:{available,url:available?`/pages/room-visualiser?fabric=${encodeURIComponent(fabric.id)}`:null,message:available?null:'Room preview not available for this fabric yet.',rendererProfile:profile,worktableImageUrl,worktableSource,...(assignment?{assignment}:{})}};
}
