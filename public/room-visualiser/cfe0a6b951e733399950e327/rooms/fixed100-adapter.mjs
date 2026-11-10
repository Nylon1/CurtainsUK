import * as T from 'three';
import {applyFixedView} from './views.mjs';
import {createFixed140Curtain} from './fixed100-curtain.mjs';
import {cameraForFixed140View} from './fixed100-views.mjs';
import {buildFixed140OpenPosition,createFixed140TravelSolver} from './fixed100-motion.mjs';

const MOUNT_Y=96; // The 100 cm curtain overlaps its 88 cm aperture by 6 cm.

export async function createFixed100Adapter(renderer,assignment){
  const built=await createFixed140Curtain(renderer,assignment);
  const closed=built.geometry.attributes.position.array.slice();
  const open=buildFixed140OpenPosition(closed,built.metrics.flatPanelWidthCm);
  const solve=createFixed140TravelSolver(closed,open,built.metrics.flatPanelWidthCm);
  const target=new Float32Array(closed.length);
  const group=new T.Group();group.name='FIXED140_SINGLE_WIDTH_100CM_V1';group.position.y=MOUNT_Y;
  group.add(built.curtain);
  const track=new T.Mesh(new T.BoxGeometry(144,1.2,2.2),new T.MeshStandardMaterial({color:'#ffffff',roughness:.82,metalness:.05}));
  track.position.set(0,101.4,0);group.add(track);
  const proof={profile:'FIXED140_SINGLE_WIDTH_100CM_V1',fabric:assignment.fabricId,plan:built.plan,metrics:built.metrics,
    geometryId:built.geometry.uuid,textureBytes:assignment.sourceWidthPx*assignment.sourceHeightPx*4*4/3,
    textureUuid:built.texture.uuid,progress:0,meshBuilds:1};
  return{
    profile:'FIXED140_SINGLE_WIDTH_100CM_V1',assignment,group,geometry:built.geometry,proof,
    setProgress(progress,fall={}){
      solve(progress,target,fall);
      built.geometry.attributes.position.array.set(target);
      built.geometry.attributes.position.needsUpdate=true;
      built.geometry.computeVertexNormals();built.geometry.computeBoundingSphere();
      proof.progress=progress;
    },setMarkers(){},
    applyView(camera,room,view){
      if(view==='room'){applyFixedView(camera,room,view);return;}
      const config=cameraForFixed140View(view,1.6);
      camera.position.set(config.position[0],config.position[1]+MOUNT_Y,config.position[2]);
      camera.fov=config.fov;camera.aspect=1.6;
      camera.lookAt(config.target[0],config.target[1]+MOUNT_Y,config.target[2]);camera.updateProjectionMatrix();
    },
    async hashes(){
      async function digest(array){const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);return[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
      return{position:await digest(built.geometry.attributes.position.array),uv:await digest(built.geometry.attributes.uv.array),indices:await digest(built.geometry.index.array)};
    },
    dispose(){group.remove(built.curtain);built.dispose();track.geometry.dispose();track.material.dispose();},
  };
}
