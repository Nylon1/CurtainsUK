import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {verifyReleasedVisualiserAssets} from './verify-released-visualiser-assets.mjs';

async function fixture(t) {
 const root=await mkdtemp(join(tmpdir(),'visualiser-package-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const put=async(p,value)=>{await mkdir(join(root,p,'..'),{recursive:true});await writeFile(join(root,p),value);};
 const hash=value=>createHash('sha256').update(value).digest('hex');
 const packs=[{assetBase:'/room-visualiser/released/',files:[{path:'rooms/customer-entry.mjs',sha256:hash('entry')},{path:'rooms/packs/bedroom.glb',sha256:hash('room')}]},{assetBase:'/room-visualiser/fixed140-v1/released/',files:[{path:'curtain.mjs',sha256:hash('fixed')}]}];
 await put('lib/room-visualiser/released-assets.json',JSON.stringify({version:1,packs}));
 for(const [i,name] of ['build.json','fixed140-build.json'].entries())await put('lib/room-visualiser/'+name,JSON.stringify({assetBase:packs[i].assetBase}));
 await put('lib/room-visualiser/assets.json',JSON.stringify({fabrics:[{image:'/room-visualiser/textures/fabric.webp',sha256:hash('fabric')}]}));
 await put('public/room-visualiser/released/rooms/customer-entry.mjs','entry');
 await put('public/room-visualiser/released/rooms/packs/bedroom.glb','room');
 await put('public/room-visualiser/fixed140-v1/released/curtain.mjs','fixed');
 await put('public/room-visualiser/textures/fabric.webp','fabric');
 return {root,put};
}
test('complete immutable package passes',async t=>{const {root}=await fixture(t);assert.deepEqual(await verifyReleasedVisualiserAssets(root),{packs:2,files:4,bytes:20});});
for(const missing of ['released/rooms/customer-entry.mjs','released/rooms/packs/bedroom.glb','fixed140-v1/released/curtain.mjs','textures/fabric.webp'])test('rejects missing '+missing,async t=>{const {root}=await fixture(t);await rm(join(root,'public/room-visualiser',missing));await assert.rejects(verifyReleasedVisualiserAssets(root),/MISSING_RELEASED_VISUALISER_ASSET/);});
test('rejects changed bytes at an immutable URL',async t=>{const {root,put}=await fixture(t);await put('public/room-visualiser/released/rooms/customer-entry.mjs','different');await assert.rejects(verifyReleasedVisualiserAssets(root),/ALTERED_RELEASED_VISUALISER_ASSET/);});
test('rejects a new build pointer without its recorded pack',async t=>{const {root,put}=await fixture(t);await put('lib/room-visualiser/build.json',JSON.stringify({assetBase:'/room-visualiser/missing/'}));await assert.rejects(verifyReleasedVisualiserAssets(root),/UNRECORDED_VISUALISER_PACK/);});
test('normal prebuild invokes the guard before bundling',async()=>{const source=await readFile(new URL('./build-premium-proxy.mjs',import.meta.url),'utf8');assert.ok(source.indexOf('await verifyReleasedVisualiserAssets()')<source.indexOf('await build('));});
