/** Package only V1 modules. Never regenerate or re-version the STANDARD pack. */
import {readFile,writeFile,readdir,mkdir,cp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
import {spawnSync} from 'node:child_process';

const regression=spawnSync(process.execPath,['--test','tests/room-visualiser/fixed140-v1.test.mjs'],{stdio:'inherit'});
if(regression.status!==0)throw Error('Frozen FIXED140_SINGLE_WIDTH_V1 regression failed; refusing to package');

const root=resolve('lib/room-visualiser/runtime/fixed140-v1');
async function files(dir){
  const result=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const path=resolve(dir,entry.name);
    if(entry.isDirectory())result.push(...await files(path));else result.push(path);
  }
  return result.sort();
}
const hash=createHash('sha256');let bytes=0;
for(const path of await files(root)){
  const data=await readFile(path);
  hash.update(relative(root,path).replaceAll('\\','/'));hash.update(data);
  if(path!==resolve(root,'customer.html'))bytes+=data.length;
}
const version=hash.digest('hex').slice(0,24);
const assetBase=`/room-visualiser/fixed140-v1/${version}/`;
const out=resolve(`public${assetBase}`);
await mkdir(out,{recursive:true});
await cp(root,out,{recursive:true,filter:path=>path!==resolve(root,'customer.html')});
await rm(resolve(out,'customer.html'),{force:true});
await writeFile('lib/room-visualiser/fixed140-build.json',JSON.stringify({version,assetBase,bytes},null,2)+'\n');
console.log(JSON.stringify({version,assetBase,bytes}));
