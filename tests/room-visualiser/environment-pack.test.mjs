import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createAmbienceState,MODES,RADIATOR} from '../../lib/room-visualiser/runtime/rooms/environment/ambience.mjs';
const root=new URL('../../',import.meta.url);
const read=path=>readFile(new URL(path,root));
async function files(path){const entries=await readdir(new URL(path,root),{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?files(path+e.name+'/'):[path+e.name]))).flat();}

test('customer environment is self-contained and ships the approved assets exactly',async()=>{
  const build=JSON.parse(await read('lib/room-visualiser/build.json'));
  const prefix='lib/room-visualiser/runtime/rooms/environment/';
  const all=await files(prefix),assetNames=[];
  for(const file of all){
    const relative=file.slice(prefix.length),source=await read(file);
    assert.deepEqual(await read('public'+build.assetBase+'rooms/environment/'+relative),source,relative);
    if(relative.startsWith('assets/')){
      assetNames.push(relative.slice(7));
      assert.deepEqual(source,await read('experiments/room-visualiser-2/'+relative),relative);
    }else if(relative.endsWith('.mjs')){
      assert.doesNotMatch(source.toString(),/\/experiment\/|URLSearchParams|living-before|loadChair|instrumentViewer/);
      for(const [,dependency]of source.toString().matchAll(/(?:from\s*|import\()'([^']+)'/g)){
        if(dependency.startsWith('.'))assert.ok((await readFile(new URL(dependency,new URL(file,root)))).length>0);
      }
    }
  }
  assert.deepEqual(assetNames.sort(),['composition/textile/nor_gl.jpg','floor/arm.jpg','floor/nor_gl.jpg','floor/tonal.webp','prefiltered/garden-cubeuv.json','window/bedroom-view.jpg','window/lounge-garden.jpg','window/office-garden.jpg','window/user-garden.jpg'].sort());
  for(const file of ['viewer.mjs','customer.html'])assert.deepEqual(await read('lib/room-visualiser/runtime/rooms/'+file),await read('public'+build.assetBase+'rooms/'+file));
});

test('customer ambience retains independent settings and neutral inspection without moving the radiator',()=>{
  const state=createAmbienceState();
  for(const room of ['living','bedroom','lounge','office'])state.set(room,'mode','evening');
  state.set('living','fire',true);state.set('office','mode','inspection');
  assert.deepEqual(state.get('office'),{mode:'inspection',lamps:false,fire:false});
  assert.equal(state.get('living').fire,true);assert.equal(state.get('bedroom').mode,'evening');
  assert.equal(MODES.inspection.warmth,0);assert.equal(RADIATOR.curtainHem-RADIATOR.top,18);
  assert.throws(()=>state.set('bedroom','fire',true));assert.throws(()=>state.set('office','mode','invalid'));
});
