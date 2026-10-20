// Record a newly built immutable room pack without changing earlier releases.
import {createHash} from 'node:crypto';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';

const root=resolve('public');
const build=JSON.parse(await readFile('lib/room-visualiser/build.json','utf8'));
if(!/^\/room-visualiser\/[a-f0-9]{24}\/$/.test(build.assetBase))throw Error('INVALID_ROOM_PACK_PATH');
const base=resolve(root,'.'+build.assetBase);
const files=[];
async function visit(directory,prefix=''){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    if(entry.isSymbolicLink()||(!entry.isDirectory()&&!entry.isFile()))throw Error('UNSUPPORTED_ROOM_PACK_ENTRY');
    const relative=prefix?`${prefix}/${entry.name}`:entry.name;
    if(entry.isDirectory())await visit(join(directory,entry.name),relative);
    else files.push({path:relative,sha256:createHash('sha256').update(await readFile(join(directory,entry.name))).digest('hex')});
  }
}
await visit(base);
files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
if(!files.length)throw Error('EMPTY_ROOM_PACK');
const path='lib/room-visualiser/released-assets.json';
const manifest=JSON.parse(await readFile(path,'utf8'));
if(manifest.version!==1||!Array.isArray(manifest.packs))throw Error('INVALID_ROOM_RELEASE_MANIFEST');
const existing=manifest.packs.find(pack=>pack.assetBase===build.assetBase);
if(existing){
  if(JSON.stringify(existing.files)!==JSON.stringify(files))throw Error('ALTERED_IMMUTABLE_ROOM_PACK');
}else{
  manifest.packs.push({assetBase:build.assetBase,files});
  await writeFile(path,JSON.stringify(manifest,null,2)+'\n');
}
console.log(JSON.stringify({assetBase:build.assetBase,files:files.length,recorded:!existing}));
