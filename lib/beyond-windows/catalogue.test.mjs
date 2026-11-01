import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createBeyondCatalogue} from './catalogue.mjs';
const manifest=JSON.parse(await readFile(new URL('../room-visualiser/assets.json',import.meta.url)));
const {catalogue,qualify}=createBeyondCatalogue(manifest);
function record(asset){return {id:asset.fabricId,horizontalRepeatMm:(asset.hRepeat||0)*10,verticalRepeatMm:(asset.vRepeat||0)*10,roomPreview:{available:true,rendererProfile:'STANDARD',worktableImageUrl:'https://curtainsuk-production-api.vercel.app'+asset.image,worktableSource:{imageWidthCm:asset.physicalClothCm?.[0]||137,imageHeightCm:asset.physicalClothCm?.[1]||120,imageTopCm:0,scaleKind:asset.mode==='patterned'?'calibrated':'colour-only'}}};}
const patterned=manifest.fabrics.filter(a=>a.mode==='patterned'),plains=manifest.fabrics.filter(a=>a.mode==='plain');
test('approval boundary contains 85 complete repeats and approved colour-led plains',()=>{
  assert.equal(patterned.length,85);assert.equal(plains.length,3153);
  for(const a of manifest.fabrics)assert.ok(qualify(record(a)),a.fabricId);
  const r=record(patterned[0]);
  for(const change of[{id:'pt-1204-212'},{patternMatchType:'HALF_DROP'},{verticalRepeatMm:1},{roomPreview:{...r.roomPreview,available:false}},{roomPreview:{...r.roomPreview,rendererProfile:'FIXED140_SINGLE_WIDTH_V1'}},{roomPreview:{...r.roomPreview,worktableImageUrl:'https://evil.test'+patterned[0].image}}])assert.equal(qualify({...r,...change}),null);
  assert.equal(qualify({...r,roomPreview:{...r.roomPreview,worktableSource:{...r.roomPreview.worktableSource,imageWidthCm:140}}}),null);
});
test('unsupported direct links fail closed before fetching or returning buying actions',async()=>{
  const original=global.fetch;global.fetch=()=>{throw Error('Must not fetch');};
  try{const r=await catalogue(new Request('http://localhost/catalog?fabric=pt-1204-212'));assert.equal(r.status,422);assert.deepEqual(Object.keys(await r.json()).sort(),['code','error']);}finally{global.fetch=original;}
});
test('filtering scans excluded pages, preserves filters, and resumes mid-page without losing fabrics',async()=>{
  const original=global.fetch,good=plains.slice(0,35).map(record),seen=[];
  const pages={0:{fabrics:[{id:'excluded'}],nextCursor:24},24:{fabrics:good.slice(0,12),nextCursor:48},48:{fabrics:good.slice(12),nextCursor:null}};
  global.fetch=async u=>{const url=new URL(u);assert.equal(url.searchParams.get('query'),'Amalfi');assert.equal(url.searchParams.get('colour'),'GREEN');const cursor=url.searchParams.get('cursor');seen.push(cursor);return Response.json(pages[cursor]);};
  try{
    const one=await(await catalogue(new Request('http://localhost/catalog?query=Amalfi&colour=GREEN'))).json();
    assert.equal(one.fabrics.length,24);assert.equal(one.nextCursor,'48:12');
    const two=await(await catalogue(new Request('http://localhost/catalog?query=Amalfi&colour=GREEN&cursor='+one.nextCursor))).json();
    assert.equal(two.nextCursor,null);assert.deepEqual([...one.fabrics,...two.fabrics].map(f=>f.id),good.map(f=>f.id));assert.deepEqual(seen,['0','24','48','48']);
  }finally{global.fetch=original;}
});
test('bounded empty scans retain continuation instead of falsely ending the library',async()=>{
  const original=global.fetch;let calls=0;global.fetch=async u=>{calls++;return Response.json({fabrics:[{id:'excluded'}],nextCursor:Number(new URL(u).searchParams.get('cursor'))+24});};
  try{const data=await(await catalogue(new Request('http://localhost/catalog'))).json();assert.equal(calls,8);assert.equal(data.nextCursor,'192');assert.equal(data.refineSearch,true);}finally{global.fetch=original;}
});
test('live approval drift blocks old links, and malformed cursors never reach upstream',async()=>{
  const original=global.fetch;global.fetch=async()=>Response.json({fabric:{...record(patterned[0]),horizontalRepeatMm:999}});
  try{assert.equal((await catalogue(new Request('http://localhost/catalog?fabric='+patterned[0].fabricId))).status,422);
    for(const cursor of['-1','0:99','evil','240001'])assert.equal((await catalogue(new Request('http://localhost/catalog?cursor='+cursor))).status,400);
  }finally{global.fetch=original;}
});
