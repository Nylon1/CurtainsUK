/** Offline, checksum-verified CC0 acquisition. Never runs on a customer request. */
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('./assets/composition/',import.meta.url),headers={'User-Agent':'CurtainsUK-LocalPrototype/1.0'};
await mkdir(root,{recursive:true});
const records=[];
async function save(path,source){
 const url=new URL(path,root);await mkdir(new URL('.',url),{recursive:true});
 let bytes;try{bytes=await readFile(url);}catch{}
 if(!bytes||createHash('md5').update(bytes).digest('hex')!==source.md5){const r=await fetch(source.url,{headers});if(!r.ok)throw Error(r.status+' '+source.url);bytes=Buffer.from(await r.arrayBuffer());}
 if(bytes.length!==source.size||createHash('md5').update(bytes).digest('hex')!==source.md5)throw Error('SOURCE_CHECKSUM '+path);
 await writeFile(url,bytes);records.push({path,url:source.url,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),license:'CC0',publisher:'Poly Haven'});
}
for(const id of ['denmin_fabric_02','garden_nook','potted_plant_01']){
 const data=await(await fetch('https://api.polyhaven.com/files/'+id,{headers})).json();
 await writeFile(new URL(id+'-source.json',root),JSON.stringify(data,null,2));
 if(id==='denmin_fabric_02')for(const type of ['Diffuse','nor_gl','Rough'])await save('textile/'+type+'.jpg',data[type]['1k'].jpg);
 if(id==='garden_nook')await save('garden.hdr',data.hdri['1k'].hdr);
 if(id==='potted_plant_01'){const source=data.gltf['1k'].gltf;await save('plant/model.gltf',source);for(const [path,item]of Object.entries(source.include))await save('plant/'+path,item);}
}
await writeFile(new URL('sources.json',root),JSON.stringify(records,null,2));console.log(JSON.stringify({files:records.length,bytes:records.reduce((n,v)=>n+v.bytes,0)}));
