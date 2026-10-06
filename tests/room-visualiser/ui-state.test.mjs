import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRoomPalettes} from '../../lib/room-visualiser/runtime/rooms/palette-state.mjs';
import {viewportLayout} from '../../lib/room-visualiser/runtime/rooms/sticky-viewport.mjs';
import {ROOMS,PALETTES} from '../../lib/room-visualiser/runtime/rooms/catalog.mjs';

test('every room retains its own complete palette across repeated switching',()=>{
  const store=createRoomPalettes(),expected={};
  for(const [i,room] of ROOMS.entries()){
    expected[room.id]={};
    for(const [zone,config] of Object.entries(room.zones)){
      const value=(i+config.initial+2)%PALETTES[config.palette].length;
      store.set(room.id,zone,value);expected[room.id][zone]=value;
    }
  }
  for(let visit=0;visit<5;visit++)for(const room of [...ROOMS].reverse())assert.deepEqual(store.get(room.id),expected[room.id]);
  assert.equal(store.get('office').CUSHION_UPHOLSTERY,undefined);
  assert.equal(store.get('bedroom').SOFA_UPHOLSTERY,undefined);
  assert.throws(()=>store.set('bedroom','SOFA_UPHOLSTERY',2));
  assert.throws(()=>store.set('living','WALL_MATERIAL',99));
});

test('current-room restore leaves other rooms intact; returned snapshots cannot corrupt stored palettes',()=>{
  const store=createRoomPalettes();store.set('living','WALL_MATERIAL',3);store.set('bedroom','BED_COVER',8);
  const snapshot=store.get('bedroom');snapshot.BED_COVER=0;
  assert.equal(store.get('bedroom').BED_COVER,8);
  for(const [zone,config] of Object.entries(ROOMS[0].zones))store.set('living',zone,config.initial);
  assert.equal(store.get('living').WALL_MATERIAL,0);assert.equal(store.get('bedroom').BED_COVER,8);
  assert.throws(()=>store.get('unknown'));
});

test('sticky offset tracks host header/scroll and limits canvas to leave controls available',()=>{
  assert.equal(viewportLayout({frameTop:400,top:92,height:844,mobile:true}).offset,0);
  const scrolled=viewportLayout({frameTop:-700,top:92,bottom:150,height:844,mobile:true});
  assert.equal(scrolled.offset,792);assert.equal(scrolled.available,602);
  assert.ok(scrolled.canvasHeight+54<scrolled.available*.55);
  const landscape=viewportLayout({frameTop:-400,top:80,height:320,mobile:true});
  assert.ok(landscape.canvasHeight+54<landscape.available*.65);
  assert.equal(viewportLayout({height:0,mobile:true}).canvasHeight,1);
});

test('one existing Open/Close action group stays inside the sticky viewport',()=>{
  const html=readFileSync('lib/room-visualiser/runtime/rooms/customer.html','utf8');
  const viewport=html.slice(html.indexOf('class="scene-viewport"'),html.indexOf('class="scene-meta"'));
  for(const pose of ['0','1']){
    assert.equal(html.split(`data-pose="${pose}"`).length-1,1);
    assert.ok(viewport.includes(`data-pose="${pose}"`));
  }
});
