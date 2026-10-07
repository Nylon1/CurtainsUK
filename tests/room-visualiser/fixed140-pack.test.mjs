import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('V1 CDN version and bytes are stable across checkout line endings',async()=>{
  const build=JSON.parse(await readFile(new URL('../../lib/room-visualiser/fixed140-build.json',import.meta.url)));
  const root=new URL('../../lib/room-visualiser/runtime/fixed140-v1/',import.meta.url);
  const hash=createHash('sha256');let bytes=0;
  for(const file of (await readdir(root)).sort()){
    const source=Buffer.from((await readFile(new URL(file,root),'utf8')).replace(/\r\n/g,'\n'),'utf8');
    hash.update(file);hash.update(source);
    if(file==='customer.html')continue;
    const deployed=await readFile(new URL(`../../public${build.assetBase}${file}`,import.meta.url));
    assert.deepEqual(deployed,source,file);
    bytes+=deployed.length;
  }
  assert.equal(hash.digest('hex').slice(0,24),build.version);
  assert.equal(bytes,build.bytes);
  assert.equal(build.assetBase,`/room-visualiser/fixed140-v1/${build.version}/`);
});
