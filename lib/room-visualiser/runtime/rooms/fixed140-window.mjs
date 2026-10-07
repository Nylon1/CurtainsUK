import * as T from 'three';
import {FIXED140_WINDOWS} from './fixed140-window-spec.mjs';

// A profile-specific window in each unchanged room pack. The smaller opening
// is actual centimetre-scale architecture, never a scale transform on cloth.

function rectangle(group,material,left,right,bottom,top,depth,z){
  const mesh=new T.Mesh(new T.BoxGeometry(right-left,top-bottom,depth),material);
  mesh.position.set((left+right)/2,(bottom+top)/2,z);
  mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);
}

export function addFixed140Window(room,roomId){
  const spec=FIXED140_WINDOWS[roomId];if(!spec)throw Error('UNKNOWN_FIXED140_ROOM');
  const root=room.children[0];if(!root)throw Error('FIXED140_ROOM_ROOT_MISSING');
  const wall=room.getObjectByName('WALL_MATERIAL')?.material?.clone();
  const glass=room.getObjectByName('GLASS_VIEW')?.material?.clone();
  const trim=room.getObjectByName('TRIM')?.material?.clone();
  if(!wall||!glass||!trim)throw Error('FIXED140_WINDOW_MATERIAL_MISSING');
  wall.name='WALL_MATERIAL';glass.name='GLASS_VIEW';trim.name='TRIM';
  const group=new T.Group();group.name='FIXED140_WINDOW';
  const L=-spec.widthCm/2,R=spec.widthCm/2,B=spec.bottomCm,H=spec.topCm;
  // Cover the original large glazed opening and its frame in front of its
  // nearest trim surface. Leave only the new, 136 × 108 cm aperture exposed.
  rectangle(group,wall,-115,L,10,245,.8,-20.1);
  rectangle(group,wall,R,115,10,245,.8,-20.1);
  rectangle(group,wall,L,R,10,B,.8,-20.1);
  rectangle(group,wall,L,R,H,245,.8,-20.1);
  rectangle(group,glass,L,R,B,H,.4,-20.7);
  for(const x of [L,R])rectangle(group,trim,x-2,x+2,B-3,H+3,3,-16.5);
  for(const y of [B,H])rectangle(group,trim,L-3,R+3,y-2,y+2,3,-16.5);
  rectangle(group,trim,-1.3,1.3,B,H,2.4,-16.3);
  rectangle(group,trim,L,R,(B+H)/2-1.3,(B+H)/2+1.3,2.4,-16.3);
  rectangle(group,trim,L-5,R+5,B-4,B-2,8,-15.5);
  root.add(group);
  return group;
}

export function removeFixed140Window(group){
  if(!group)return;
  group.removeFromParent();const materials=new Set();
  group.traverse(object=>{if(object.isMesh){object.geometry.dispose();materials.add(object.material);}});
  for(const material of materials)material.dispose();
}
