import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base=new URL('./assets/',import.meta.url),hash=(bytes,kind='sha256')=>createHash(kind).update(bytes).digest('hex');
const chair=JSON.parse(await readFile(new URL('armchair/source.json',base),'utf8'));
const floor=JSON.parse(await readFile(new URL('floor/source.json',base),'utf8'));
const expected=[['armchair/model.gltf',chair],...Object.entries(chair.include).map(([path,source])=>['armchair/'+path,source]),...['Diffuse','nor_gl','arm'].map(name=>['floor/'+name+'.jpg',floor[name]['1k'].jpg])];
for(const [path,source] of expected){const bytes=await readFile(new URL(path,base));assert.equal(bytes.length,source.size,path);assert.equal(hash(bytes,'md5'),source.md5,path);}
const files=[];async function walk(url,prefix=''){for(const entry of await readdir(url,{withFileTypes:true})){const relative=prefix+entry.name;if(entry.isDirectory())await walk(new URL(entry.name+'/',url),relative+'/');else{const bytes=await readFile(new URL(entry.name,url));files.push({path:relative,bytes:bytes.length,sha256:hash(bytes)});}}}
await walk(base);const model=JSON.parse(await readFile(new URL('armchair/model.gltf',base),'utf8'));
console.log(JSON.stringify({sourceChecksumChecks:expected.length,files,totalBytes:files.reduce((sum,f)=>sum+f.bytes,0),chair:{triangles:model.meshes.flatMap(m=>m.primitives).reduce((sum,p)=>sum+model.accessors[p.indices].count/3,0),vertices:model.meshes.flatMap(m=>m.primitives).reduce((sum,p)=>sum+model.accessors[p.attributes.POSITION].count,0)}},null,2));
