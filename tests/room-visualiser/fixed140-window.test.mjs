import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FIXED140_WINDOWS} from '../../lib/room-visualiser/runtime/rooms/fixed140-window-spec.mjs';

test('each unchanged room receives a fitted V1-only aperture',()=>{
  assert.deepEqual(Object.keys(FIXED140_WINDOWS),['living','bedroom','lounge','office']);
  for(const [id,spec] of Object.entries(FIXED140_WINDOWS)){
    assert.equal(spec.widthCm,136,id);assert.equal(spec.heightCm,108,id);
    assert.equal(spec.topCm-spec.bottomCm,108,id);
    assert.equal(spec.mountY+120,216,id);
    assert.equal((140-spec.widthCm)/2,2,id);
    assert.equal(spec.mountY-spec.bottomCm,-6,id);
    assert.equal(spec.mountY+120-spec.topCm,6,id);
  }
});

test('V1-only overlay covers the old opening, keeps editable wall material and is removed on profile switch',async()=>{
  const root=new URL('../../lib/room-visualiser/runtime/rooms/',import.meta.url);
  const [windowSource,viewer]=await Promise.all(['fixed140-window.mjs','viewer.mjs'].map(file=>readFile(new URL(file,root),'utf8')));
  assert.match(windowSource,/rectangle\(group,wall,-115,L,10,245/);
  assert.match(windowSource,/rectangle\(group,glass,L,R,B,H/);
  assert.match(windowSource,/wall.name='WALL_MATERIAL'/);
  assert.match(viewer,/removeFixed140Window\(activeWindow\)/);
  assert.match(viewer,/if\(isFixed140\(\)\)activeWindow=addFixed140Window\(activeRoom,id\)/);
});
