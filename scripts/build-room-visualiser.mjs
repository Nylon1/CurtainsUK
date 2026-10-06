// Offline packaging only. No catalogue access, calibration, jigsaw generation or credentials.
import {readFile,writeFile,mkdir,cp,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
import {buildWaveMesh,SPEC} from '../lib/room-visualiser/runtime/core.mjs';
import {buildOpenMesh} from '../lib/room-visualiser/runtime/open.mjs';
const root=resolve('lib/room-visualiser/runtime');
const closed=buildWaveMesh(),open=buildOpenMesh(closed);
const chunks=['position','flatPosition','uv','indices'].map(k=>Buffer.from(closed[k].buffer));
await writeFile(resolve(root,'mesh.bin'),Buffer.concat(chunks));
await writeFile(resolve(root,'open.bin'),Buffer.from(open.position.buffer));
await writeFile(resolve(root,'metrics.json'),JSON.stringify({spec:SPEC,byteLengths:chunks.map(b=>b.length),sha256:createHash('sha256').update(Buffer.concat(chunks)).digest('hex'),vertices:closed.position.length/3,triangles:closed.indices.length/3}));
await mkdir(resolve(root,'rooms/shared'),{recursive:true});
await cp('shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-storefront.js',resolve(root,'rooms/shared/curtainsuk-storefront.js'));
async function files(dir){const result=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())result.push(...await files(p));else result.push(p);}return result.sort();}
const hash=createHash('sha256');let bytes=0;
for(const p of await files(root)){const data=await readFile(p);hash.update(relative(root,p).replaceAll('\\','/'));hash.update(data);bytes+=data.length;}
const version=hash.digest('hex').slice(0,24),out=resolve('public/room-visualiser',version);
await mkdir(out,{recursive:true});await cp(root,out,{recursive:true});
await writeFile('lib/room-visualiser/build.json',JSON.stringify({version,assetBase:`/room-visualiser/${version}/`,bytes},null,2)+'\n');
console.log(JSON.stringify({version,bytes,vertices:closed.position.length/3,triangles:closed.indices.length/3}));
