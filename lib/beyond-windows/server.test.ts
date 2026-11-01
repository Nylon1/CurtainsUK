import test from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../room-visualiser/assets.json';
const asset=manifest.fabrics.find(a=>a.fabricId==='sdg-f1541-01')!;
const fabric={id:asset.fabricId,horizontalRepeatMm:450,verticalRepeatMm:465,roomPreview:{available:true,rendererProfile:'STANDARD',worktableImageUrl:'https://curtainsuk-production-api.vercel.app'+asset.image,worktableSource:{imageWidthCm:460,imageHeightCm:250,scaleKind:'calibrated'}}};
import {beyondAsset,beyondCatalogue,beyondPreviewAllowed} from './server';
test('preview is local/deployment-preview only and runtime asset paths are allowlisted',async()=>{
  assert.equal(beyondPreviewAllowed(new Request('https://curtainsuk-production-api.vercel.app/curtains-beyond-windows-preview')),false);
  assert.equal((await beyondAsset(new Request('http://localhost/x'),'../../.env',true)).status,404);
  const page=await beyondAsset(new Request('http://localhost/x'),'',true),html=await page.text();
  assert.match(html,/Curtains beyond/);assert.match(html,/5ee06952561616a69bb63ecd/);assert.match(html,/data-cuk-fabric-browser/);assert.doesNotMatch(html,/__(?:BEYOND|FABRIC_DIALOG|RENDERER)/);
  assert.equal(page.headers.get('cache-control'),'no-store');
});
test('catalogue relay forwards only public filters, never cookies, signatures or supplied hosts',async()=>{
  const original=global.fetch;let called='';
  global.fetch=async(input,init)=>{called=String(input);assert.deepEqual(init?.headers,{Accept:'application/json'});return Response.json({fabric});};
  try{const response=await beyondCatalogue(new Request('http://localhost/catalog?fabric=sdg-f1541-01&host=evil.test&signature=private&logged_in_customer_id=77',{headers:{Cookie:'session=private'}}));assert.equal(response.status,200);const u=new URL(called);assert.equal(u.origin,'https://www.curtainsuk.com');assert.equal(u.searchParams.get('visualiser'),'1');assert.equal(u.searchParams.get('fabric'),'sdg-f1541-01');assert.equal(u.searchParams.has('signature'),false);assert.equal(u.searchParams.has('host'),false);assert.equal(u.searchParams.has('logged_in_customer_id'),false);}finally{global.fetch=original;}
  assert.equal((await beyondCatalogue(new Request('http://localhost/catalog?fabric=a&fabric=b'))).status,400);
});
test('catalogue failure is recoverable and does not return upstream error bodies',async()=>{
  const original=global.fetch;global.fetch=async()=>{throw Error('private upstream details');};
  try{const r=await beyondCatalogue(new Request('http://localhost/catalog?fabric=sdg-f1541-01'));assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/private upstream/);}finally{global.fetch=original;}
});
