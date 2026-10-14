// Offline release guard. Immutable assets must survive every unrelated deployment.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';

export async function verifyReleasedVisualiserAssets(root=process.cwd()) {
  const json=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
  const manifest=await json('lib/room-visualiser/released-assets.json');
  const builds=await Promise.all(['build.json','fixed140-build.json'].map(p=>json('lib/room-visualiser/'+p)));
  const fabrics=await json('lib/room-visualiser/assets.json');
  const expected=new Map();
  for(const pack of manifest.packs) {
    if(!pack.files.length)throw Error('EMPTY_RELEASED_VISUALISER_PACK');
    for(const file of pack.files)expected.set(pack.assetBase+file.path,file.sha256);
  }
  for(const build of builds) {
    if(!manifest.packs.some(p=>p.assetBase===build.assetBase))throw Error('UNRECORDED_VISUALISER_PACK: '+build.assetBase);
  }
  for(const fabric of fabrics.fabrics) {
    const previous=expected.get(fabric.image);
    if(previous&&previous!==fabric.sha256)throw Error('CONFLICTING_VISUALISER_HASH: '+fabric.image);
    expected.set(fabric.image,fabric.sha256);
  }
  const publicRoot=resolve(root,'public');let bytes=0;
  for(const [url,hash] of expected) {
    const path=resolve(publicRoot,'.'+url);
    if(!url.startsWith('/room-visualiser/')||!path.startsWith(publicRoot+sep)||!/^[a-f0-9]{64}$/.test(hash))throw Error('INVALID_VISUALISER_ASSET: '+url);
    let data;
    try {data=await readFile(path);}catch {throw Error('MISSING_RELEASED_VISUALISER_ASSET: '+url+'. Package the complete protected source; see docs/room-visualiser-packaging.md.');}
    if(createHash('sha256').update(data).digest('hex')!==hash)throw Error('ALTERED_RELEASED_VISUALISER_ASSET: '+url+'. Preserve original Git bytes; never regenerate an existing immutable URL.');
    bytes+=data.length;
  }
  return {packs:manifest.packs.length,files:expected.size,bytes};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await verifyReleasedVisualiserAssets()));
}
