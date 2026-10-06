// Verify the publication manifest and all local runtime assets before release.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,stat,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import sharp from 'sharp';
import {RUNTIME_SIZE,WIDTH_CM,DROP_CM} from './core.mjs';

const root=resolve('lib/room-visualiser');
const manifest=JSON.parse(await readFile(join(root,'assets.json'),'utf8'));
const build=JSON.parse(await readFile(join(root,'build.json'),'utf8'));
const metrics=JSON.parse(await readFile(join(root,'runtime/metrics.json'),'utf8'));
const ids=new Set(),paths=new Set();
let bytes=0,patterned=0,plain=0;
for(const entry of manifest.fabrics){
  assert.ok(entry.fabricId&&!ids.has(entry.fabricId),`Duplicate fabric ${entry.fabricId}`);
  ids.add(entry.fabricId);
  assert.deepEqual(entry.pixelSize,RUNTIME_SIZE,`Wrong dimensions ${entry.fabricId}`);
  assert.match(entry.sha256,/^[a-f0-9]{64}$/);
  const relative=entry.image.startsWith('/room-visualiser/textures/')
    ?entry.image.slice(1):`${build.assetBase.slice(1)}${entry.image}`;
  assert.match(relative,/^room-visualiser\/(?:textures|[a-f0-9]{24}\/textures)\/[a-f0-9]{64}\.webp$/);
  assert.ok(relative.endsWith(`${entry.sha256}.webp`),`URL/hash mismatch ${entry.fabricId}`);
  paths.add(relative);
  const asset=await readFile(resolve('public',relative));
  assert.equal(createHash('sha256').update(asset).digest('hex'),entry.sha256,`Hash mismatch ${entry.fabricId}`);
  assert.equal(asset.length,entry.encodedBytes,`Byte mismatch ${entry.fabricId}`);
  const image=await sharp(asset).metadata();
  assert.equal(image.format,'webp');
  assert.equal(image.width,RUNTIME_SIZE[0]);assert.equal(image.height,RUNTIME_SIZE[1]);
  if(entry.mode==='patterned'){
    patterned++;
    assert.ok(entry.hRepeat>0&&entry.vRepeat>0);
    assert.deepEqual(entry.physicalClothCm,[WIDTH_CM,DROP_CM]);
    assert.ok(Math.abs(entry.calibration.repeatsH-WIDTH_CM/entry.hRepeat)<1e-8);
    assert.ok(Math.abs(entry.calibration.repeatsV-DROP_CM/entry.vRepeat)<1e-8);
  }else{
    plain++;assert.equal(entry.mode,'plain');
    assert.equal(entry.hRepeat,undefined);assert.equal(entry.vRepeat,undefined);
    if(entry.publication?.method==='plain-colour-v1'){
      assert.equal(entry.colourMaster?.algorithm,'plain-colour-v1');
      assert.match(entry.colourMaster.representativeColour,/^#[a-f0-9]{6}$/i);
      assert.ok(entry.colourMaster.tonalStrength>=0&&entry.colourMaster.tonalStrength<=.6);
      assert.match(entry.sourceSha256,/^[a-f0-9]{64}$/);
    }
  }
  bytes+=asset.length;
}
assert.equal(metrics.vertices,22050);assert.equal(metrics.triangles,43008);
assert.equal(metrics.spec.finishedWidth,230);
assert.equal(metrics.spec.drop,250);
assert.equal(metrics.spec.flatWidth,460);
const packedTextures=await stat(resolve('public',build.assetBase.slice(1),'textures')).then(()=>true,error=>{
  if(error.code==='ENOENT')return false;throw error;
});
assert.equal(packedTextures,false,'Room pack unexpectedly duplicates the texture catalogue');
const shared=await readdir('public/room-visualiser/textures');
console.log(JSON.stringify({fabrics:ids.size,patterned,plain,uniqueTextureUrls:paths.size,
  encodedBytes:bytes,sharedFiles:shared.length,packBytes:build.bytes,
  vertices:metrics.vertices,triangles:metrics.triangles},null,2));
