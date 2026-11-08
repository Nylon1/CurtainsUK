import * as T from 'three';
import {createBayFurnishings} from './environment/bay-furnishings.mjs';

// Bay Window is an additive room presentation. The approved curtain meshes,
// fabric assignments and the four existing room packs are left intact.
const zone=(label,palette,initial)=>({label,palette,initial});
export const BAY_ROOM=Object.freeze({
  id:'bay',name:'Bay Window',style:'A quiet reading corner',
  description:'A furnished reading corner with an upholstered chair, warm oak, a window seat and four sill-length curtain panels.',
  camera:[0,220,660],target:[0,75,130],fov:38,
  zones:{
    CEILING_MATERIAL:zone('Ceiling','wall',0),WALL_MATERIAL:zone('Walls','wall',0),
    FLOOR_MATERIAL:zone('Floor','floor',1),CUSHION_UPHOLSTERY:zone('Window seat','cushion',0),
    ARMCHAIR_UPHOLSTERY:zone('Armchair','furniture',0),
  },
});

// Four 70 cm finished panels cover a 140 cm centre and two 70 cm returns.
// The side faces are angled, while the fabric is measured along the rail.
export const BAY_POINTS=Object.freeze([[-125,93.3],[-70,50],[0,50],[70,50],[125,93.3]]);
export const BAY_DROP_CM=120;
const SILL_Y=96;
const TOP_Y=SILL_Y+BAY_DROP_CM;

export function applyBayView(camera,view){
  const config=view==='curtain'
    ?{position:[-35,175,245],target:[-35,155,55],fov:37}
    :view==='full'
      ?{position:[0,167,365],target:[0,152,65],fov:42}
      :{position:BAY_ROOM.camera,target:BAY_ROOM.target,fov:BAY_ROOM.fov};
  camera.position.set(...config.position);camera.fov=config.fov;camera.aspect=1.6;
  camera.lookAt(...config.target);camera.updateProjectionMatrix();
}

function box(group,name,material,w,h,d,x,y,z){
  const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);
  mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=false;mesh.receiveShadow=true;
  group.add(mesh);return mesh;
}

export async function createBayArchitecture(room){
  const root=room.children[0];if(!root)throw Error('BAY_ROOM_ROOT_MISSING');
  const wall=room.getObjectByName('WALL_MATERIAL')?.material?.clone();
  const trim=room.getObjectByName('TRIM')?.material?.clone();
  if(!wall||!trim)throw Error('BAY_ROOM_MATERIAL_MISSING');
  wall.name='WALL_MATERIAL';trim.name='TRIM';
  const cushion=new T.MeshPhysicalMaterial({name:'CUSHION_UPHOLSTERY',color:'#e5ddca',roughness:1,sheen:.25,side:T.DoubleSide});
  const pillowTone=new T.MeshPhysicalMaterial({name:'Bay accent cushions',color:'#b6bca9',roughness:1,sheen:.23});
  const ceramic=new T.MeshStandardMaterial({name:'Bay vase',color:'#d7c8b2',roughness:.83});
  const leaves=new T.MeshStandardMaterial({name:'Bay foliage',color:'#5d7555',roughness:1,side:T.DoubleSide});
  const glazing=new T.MeshBasicMaterial({name:'Bay glazing',color:'#f5f8f6',transparent:true,opacity:.1,depthWrite:false,side:T.DoubleSide});
  const frame=new T.MeshStandardMaterial({name:'Bay painted frame',color:'#e9e5dc',roughness:.77});
  const garden=await new T.TextureLoader().loadAsync(new URL('./environment/assets/window/user-garden.jpg',import.meta.url));
  garden.colorSpace=T.SRGBColorSpace;
  const landscape=new T.MeshBasicMaterial({name:'GLASS_VIEW',map:garden,side:T.DoubleSide});
  const group=new T.Group();group.name='BAY_WINDOW_ROOM';root.add(group);
  // A plaster face masks the original straight-window opening in the reused
  // structural pack. All new glazing sits in front of this face.
  box(group,'Bay back wall',wall,480,250,3,0,125,12);
  for(let face=0;face<3;face++){
    const start=BAY_POINTS[face===0?0:face===1?1:3];
    const end=BAY_POINTS[face===0?1:face===1?3:4];
    const dx=end[0]-start[0],dz=end[1]-start[1],width=Math.hypot(dx,dz);
    const pane=new T.Group();pane.name=`Bay ${['left','centre','right'][face]} window`;
    pane.position.set(start[0],0,start[1]);pane.rotation.y=-Math.atan2(dz,dx);group.add(pane);
    const photo=new T.Mesh(new T.PlaneGeometry(width-7,104),landscape);
    photo.position.set(width/2,156,-5);
    const uv=photo.geometry.attributes.uv,segments=[[0,.23],[.23,.77],[.77,1]][face];
    for(let i=0;i<uv.count;i++)uv.setX(i,segments[0]+uv.getX(i)*(segments[1]-segments[0]));
    pane.add(photo);
    const glass=new T.Mesh(new T.PlaneGeometry(width-8,102),glazing);
    glass.position.set(width/2,156,1);pane.add(glass);
    for(const x of [2,width-2])box(pane,'Bay vertical frame',frame,4,113,6,x,156,0);
    for(const y of [100,212])box(pane,'Bay horizontal frame',frame,width,4,6,width/2,y,0);
    box(pane,'Bay sash',frame,2.5,105,4,width/2,156,2);
    box(pane,'Bay transom',frame,width-5,2.5,4,width/2,148,2);
    box(pane,'Bay sill',trim,width+3,3,16,width/2,98,9);
  }
  // The seat projects into the room, as in the supplied reference photograph.
  const seatShape=new T.Shape();
  seatShape.moveTo(-125,94);seatShape.lineTo(-70,50);seatShape.lineTo(70,50);
  seatShape.lineTo(125,94);seatShape.lineTo(125,143);seatShape.lineTo(-125,143);seatShape.closePath();
  const seat=new T.Mesh(new T.ExtrudeGeometry(seatShape,{depth:52,bevelEnabled:false}),trim);
  seat.name='Bay window seat';seat.rotation.x=Math.PI/2;seat.position.y=52;seat.receiveShadow=true;group.add(seat);
  const pad=new T.Mesh(new T.ExtrudeGeometry(seatShape,{depth:5,bevelEnabled:false}),cushion);
  pad.name='Bay seat cushion';pad.rotation.x=Math.PI/2;pad.position.y=58;pad.castShadow=true;group.add(pad);
  for(const [x,z,angle] of [[-91,117,-.17],[91,117,.17]]){
    const geometry=new T.SphereGeometry(1,24,16),position=geometry.attributes.position;
    const round=value=>Math.sign(value)*Math.pow(Math.abs(value),.57);
    for(let i=0;i<position.count;i++){
      position.setXYZ(i,round(position.getX(i))*22,round(position.getY(i))*19,position.getZ(i)*6.5);
    }
    geometry.computeVertexNormals();
    const pillow=new T.Mesh(geometry,pillowTone);
    pillow.name='Bay accent cushion';pillow.position.set(x,80,z);
    pillow.rotation.z=angle;pillow.castShadow=true;group.add(pillow);
  }
  // Cabinet lines make the angled seat base read as built-in joinery.
  for(const x of [-75,0,75]){
    box(group,'Bay seat panel',frame,1.4,32,1,x,28,144);
  }
  for(const y of [10,46])box(group,'Bay seat rail',frame,244,1.4,1,0,y,144);
  const vase=new T.Mesh(new T.SphereGeometry(1,16,12),ceramic);
  vase.name='Bay vase';vase.scale.set(8,10,8);vase.position.set(0,70,114);group.add(vase);
  for(let i=0;i<7;i++){
    const x=(i-3)*2.1,stem=new T.Mesh(new T.CylinderGeometry(.18,.22,18+i%3*3,5),leaves);
    stem.position.set(x,88+i%3,114+(i%2)*2);stem.rotation.z=(i-3)*.12;group.add(stem);
    const leaf=new T.Mesh(new T.SphereGeometry(1,8,6),leaves);
    leaf.scale.set(2.1,4.2,.7);leaf.position.set(x*1.55,100+i%3*2,113+(i%2)*2);leaf.rotation.z=(i-3)*.23;group.add(leaf);
  }
  const furnishings=createBayFurnishings({T,room,parent:group,wall,trim});
  return{group,dispose(){furnishings.dispose();group.removeFromParent();group.traverse(object=>{if(object.isMesh)object.geometry.dispose();});
    for(const material of [wall,trim,cushion,pillowTone,ceramic,leaves,glazing,frame,landscape])material.dispose();garden.dispose();}};
}

export function createBayCurtains(curtain){
  const source=curtain.geometry,sourcePositions=source.attributes.position.array;
  const profile=curtain.profile??'STANDARD';
  const flatScale=profile==='STANDARD'?140/230:1;
  const horizontalScale=profile==='STANDARD'?70/115:1;
  const verticalScale=profile==='STANDARD'?BAY_DROP_CM/250:1;
  const renderedDrop=profile==='FIXED140_SINGLE_WIDTH_100CM_V1'?100:BAY_DROP_CM;
  const positions=new Float32Array(sourcePositions.length),normals=new Float32Array(sourcePositions.length);
  const sourceUV=source.attributes.uv.array,uv=new Float32Array(sourceUV.length);
  for(let i=0;i<uv.length;i+=2){uv[i]=sourceUV[i]*flatScale;uv[i+1]=sourceUV[i+1]*verticalScale;}
  const shared=new T.BufferGeometry();
  shared.setAttribute('position',new T.BufferAttribute(positions,3));
  shared.setAttribute('normal',new T.BufferAttribute(normals,3));
  shared.setAttribute('uv',new T.BufferAttribute(uv,2));
  shared.setIndex(source.index);
  const group=new T.Group();group.name='BAY_FOUR_SINGLE_WIDTH_PANELS';
  const tiebacks=[];
  const tiebackMaterial=new T.MeshStandardMaterial({name:'Bay brass tieback',color:'#ac894b',roughness:.35,metalness:.65});
  const sourceMesh=curtain.group.getObjectByProperty('geometry',source);
  if(!sourceMesh)throw Error('BAY_CURTAIN_MATERIAL_MISSING');
  const half=source.index.count/2;
  for(let segment=0;segment<4;segment++){
    const a=BAY_POINTS[segment],b=BAY_POINTS[segment+1];
    const dx=b[0]-a[0],dz=b[1]-a[1],part=segment<2?0:1;
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',shared.attributes.position);
    geometry.setAttribute('normal',shared.attributes.normal);
    geometry.setAttribute('uv',shared.attributes.uv);
    geometry.setIndex(source.index);geometry.setDrawRange(part*half,half);
    const pivot=new T.Group();pivot.name=`Bay curtain panel ${segment+1}`;
    pivot.position.set(a[0],TOP_Y-renderedDrop,a[1]+2);pivot.rotation.y=-Math.atan2(dz,dx);
    const cloth=new T.Mesh(geometry,sourceMesh.material);cloth.position.x=part===0?70:0;
    cloth.castShadow=cloth.receiveShadow=true;cloth.frustumCulled=false;pivot.add(cloth);group.add(pivot);
    const rail=new T.Mesh(new T.CylinderGeometry(.75,.75,Math.hypot(dx,dz),8),
      new T.MeshStandardMaterial({color:'#e9e5dc',roughness:.5,metalness:.1}));
    rail.rotation.z=Math.PI/2;rail.position.set(Math.hypot(dx,dz)/2,renderedDrop+2,0);
    pivot.add(rail);
    if(segment===0||segment===3){
      const x=segment===0?14:56;
      const cord=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([
        new T.Vector3(x-13,64,5),new T.Vector3(x,59,11),new T.Vector3(x+13,64,5),
      ]),12,.65,6,false),tiebackMaterial);
      cord.name='Bay curtain tieback';pivot.add(cord);tiebacks.push(cord);
    }
  }
  function sync(){
    const current=source.attributes.position.array,currentNormals=source.attributes.normal.array;
    for(let i=0;i<current.length;i+=3){
      positions[i]=current[i]*horizontalScale;positions[i+1]=current[i+1]*verticalScale;positions[i+2]=current[i+2]*horizontalScale;
      const x=currentNormals[i]/horizontalScale,y=currentNormals[i+1]/verticalScale,z=currentNormals[i+2]/horizontalScale;
      const length=Math.hypot(x,y,z)||1;normals[i]=x/length;normals[i+1]=y/length;normals[i+2]=z/length;
    }
    shared.attributes.position.needsUpdate=true;shared.attributes.normal.needsUpdate=true;
    for(const tieback of tiebacks)tieback.visible=(curtain.proof.progress??0)>.68;
  }
  sync();
  return{group,renderedDrop,sync,dispose(){group.removeFromParent();for(const pivot of group.children)for(const mesh of pivot.children){mesh.geometry.dispose();if(mesh.geometry.type==='CylinderGeometry')mesh.material.dispose();}tiebackMaterial.dispose();shared.dispose();}};
}
