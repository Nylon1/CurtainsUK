// One-time, hash-preserving move to shared immutable asset URLs. The existing
// deployed version packs remain untouched for rollback and cache continuity.
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const root=resolve('lib/room-visualiser'),manifestPath=join(root,'assets.json');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const source=join(root,'runtime/textures'),destination=resolve('public/room-visualiser/textures');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const moves=[];
for(const entry of manifest.fabrics){
  if(entry.image.startsWith('/room-visualiser/textures/'))continue;
  if(!/^textures\/[a-f0-9]{64}\.webp$/.test(entry.image))throw Error(`Unexpected asset path ${entry.fabricId}`);
  const bytes=await readFile(join(source,entry.sha256+'.webp'));
  if(hash(bytes)!==entry.sha256||bytes.length!==entry.encodedBytes)throw Error(`Hash or byte mismatch ${entry.fabricId}`);
  moves.push({entry,from:join(source,entry.sha256+'.webp'),to:join(destination,entry.sha256+'.webp')});
}
await mkdir(destination,{recursive:true});
for(const item of moves){
  await rename(item.from,item.to);
  item.entry.image=`/room-visualiser/textures/${item.entry.sha256}.webp`;
}
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
await writeFile(join(root,'runtime/fabrics.mjs'),`export const FABRICS = ${JSON.stringify(manifest.fabrics)};\nfor(const fabric of FABRICS){fabric.image=new URL(fabric.image,import.meta.url).href;fabric.name=fabric.id;}\n`);
console.log(JSON.stringify({moved:moves.length,total:manifest.fabrics.length,destination}));
