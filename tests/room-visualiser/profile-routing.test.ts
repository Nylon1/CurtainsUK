import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import assets from '../../lib/room-visualiser/assets.json';
import build from '../../lib/room-visualiser/build.json';
import fixed140Build from '../../lib/room-visualiser/fixed140-build.json';
import registry from '../../lib/room-visualiser/fixed140-assignments.json';
import {resolveRendererProfile,validFixed140Assignment,v1AssignmentForId,type Fixed140Registry,type Fixed140Assignment} from '../../lib/room-visualiser/renderer-profile';
import {withRoomPreview,visualiserPage} from '../../lib/room-visualiser/server';

const empty=registry as Fixed140Registry;
const digest='a'.repeat(64);
const explicit:Fixed140Assignment={rendererProfile:'FIXED140_SINGLE_WIDTH_V1',fabricId:'test-v1-not-catalogue',usableWidthCm:135,sourceWidthPx:1350,sourceHeightPx:1600,sourceImage:`/room-visualiser/fixed140/${digest}.webp`,sha256:digest};
const assigned:Fixed140Registry={version:1,assignments:{[explicit.fabricId]:explicit}};

test('the published V1 registry is explicit and every approved STANDARD asset retains precedence',()=>{
  assert.equal(Object.keys(empty.assignments).length,1951);
  for(const asset of assets.fabrics){
    const record={id:asset.fabricId,horizontalRepeatMm:(asset.hRepeat??0)*10,verticalRepeatMm:(asset.vRepeat??0)*10};
    assert.equal(resolveRendererProfile(record,assets.fabrics,empty),'STANDARD',asset.fabricId);
    assert.equal(resolveRendererProfile(record,assets.fabrics,assigned),'STANDARD',asset.fabricId);
    assert.equal(v1AssignmentForId(asset.fabricId,assets.fabrics,assigned),null);
    assert.equal(withRoomPreview(record).roomPreview.available,true,asset.fabricId);
  }
});

test('V1 requires explicit, valid, hash-addressed source metadata',()=>{
  const record={id:explicit.fabricId};
  assert.equal(resolveRendererProfile(record,assets.fabrics,empty),'NOT_ELIGIBLE');
  assert.equal(resolveRendererProfile(record,assets.fabrics,assigned),'FIXED140_SINGLE_WIDTH_V1');
  assert.deepEqual(v1AssignmentForId(record.id,assets.fabrics,assigned),explicit);
  assert.equal(validFixed140Assignment(record.id,{...explicit,sourceHeightPx:1100}),false);
  assert.equal(validFixed140Assignment(record.id,{...explicit,sourceImage:'https://supplier.example/image.jpg'}),false);
  assert.equal(validFixed140Assignment(record.id,{...explicit,usableWidthCm:0}),false);
  assert.equal(resolveRendererProfile(record,assets.fabrics,{version:1,assignments:{[record.id]:{...explicit,sourceHeightPx:1100}}}),'NOT_ELIGIBLE');
});

test('STANDARD takes precedence, changed metadata fails closed, and normal preview eligibility is unchanged',()=>{
  const asset=assets.fabrics.find(item=>item.mode==='patterned')!;
  const record={id:asset.fabricId,horizontalRepeatMm:asset.hRepeat!*10,verticalRepeatMm:asset.vRepeat!*10};
  const conflict={...explicit,fabricId:asset.fabricId};
  const mixed:Fixed140Registry={version:1,assignments:{[asset.fabricId]:conflict}};
  assert.equal(resolveRendererProfile(record,assets.fabrics,mixed),'STANDARD');
  assert.equal(resolveRendererProfile({...record,horizontalRepeatMm:1},assets.fabrics,mixed),'NOT_ELIGIBLE');
  assert.equal(withRoomPreview(record).roomPreview.available,true);
  assert.equal(withRoomPreview({id:'test-v1-not-catalogue'}).roomPreview.available,false);
});

test('public page serves the existing room shell for an unsupported or STANDARD fabric',async()=>{
  const page=await visualiserPage(new Request('https://curtainsuk-production-api.vercel.app/apps/curtainsuk-decision/room-visualiser?fabric=test-v1-not-catalogue'));
  const html=await page.text();
  assert.match(html,/customer-entry\.mjs/);
  assert.match(html,/__FIXED140_ASSET_BASE__|fixed140ModuleBase/);
  const standard=await readFile(new URL('../../lib/room-visualiser/runtime/rooms/customer.html',import.meta.url),'utf8');
  assert.equal(html,standard.replace('__VISUALISER_ASSET_BASE__',`https://curtainsuk-production-api.vercel.app${build.assetBase}`).replace('__FIXED140_ASSET_BASE__',`https://curtainsuk-production-api.vercel.app${fixed140Build.assetBase}`));
});

test('an explicit V1 assignment selects the same room shell without a public override',async()=>{
  const page=await visualiserPage(new Request(`https://curtainsuk-production-api.vercel.app/apps/curtainsuk-decision/room-visualiser?fabric=${explicit.fabricId}`),assigned);
  const html=await page.text();
  assert.match(html,/customer-entry\.mjs/);
  assert.match(html,/Full curtain/);
  assert.match(html,/room-visualiser\/fixed140-v1\//);
  assert.doesNotMatch(html,/fixed140-config/);
  const override=await visualiserPage(new Request('https://curtainsuk-production-api.vercel.app/apps/curtainsuk-decision/room-visualiser?renderer=FIXED140_SINGLE_WIDTH_V1'),empty);
  assert.match(await override.text(),/customer-entry\.mjs/);
});
