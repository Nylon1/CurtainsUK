// Presentation adapter only. Approved geometry, motion and calibration stay in ../.
import * as T from 'three';
import {SPEC,texturePlan} from '../core.mjs';
import {createTravelSolver} from './travel-poses.mjs';
import {FABRICS} from '../fabrics.mjs';
export async function createCurtain(renderer){
  const [metrics,binary,openBuffer]=await Promise.all([fetch(new URL('../metrics.json',import.meta.url)).then(r=>r.json()),fetch(new URL('../mesh.bin',import.meta.url)).then(r=>r.arrayBuffer()),fetch(new URL('../open.bin',import.meta.url)).then(r=>r.arrayBuffer())]);
  let offset=0;const arrays=metrics.byteLengths.map((bytes,i)=>{const a=i===3?new Uint32Array(binary,offset,bytes/4):new Float32Array(binary,offset,bytes/4);offset+=bytes;return a;});
  const [closed,flat,uv,index]=arrays,opened=new Float32Array(openBuffer),solve=createTravelSolver(closed,opened),target=new Float32Array(closed.length);
  const group=new T.Group();group.name='APPROVED_WAVE_CURTAIN';const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(closed.slice(),3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.setIndex(new T.BufferAttribute(index,1));geometry.computeVertexNormals();
  const material=new T.MeshPhysicalMaterial({color:'#ffffff',roughness:.98,metalness:0,sheen:.18,sheenRoughness:1,sheenColor:new T.Color('#ded8c8'),side:T.DoubleSide});
  const weaveData=new Uint8Array(4096);for(let y=0;y<64;y++)for(let x=0;x<64;x++)weaveData[y*64+x]=128+Math.round(25*Math.sin(x*Math.PI/2)*Math.cos(y*Math.PI/2));
  const weave=new T.DataTexture(weaveData,64,64,T.RedFormat);weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.needsUpdate=true;material.bumpMap=weave;material.bumpScale=.012;
  material.onBeforeCompile=shader=>{shader.vertexShader='varying vec2 clothCm;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nclothCm = uv;');shader.fragmentShader='varying vec2 clothCm;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float panelU=mod(clothCm.x,230.0);
    float sideHem=1.0-smoothstep(0.3,1.6,min(panelU,230.0-panelU));
    float bottomHem=smoothstep(242.8,243.2,clothCm.y);
    float tape=1.0-smoothstep(3.8,4.2,clothCm.y);
    diffuseColor.rgb*=1.0-0.16*sideHem-0.018*bottomHem-0.025*tape;
    float meetingEdge=1.0-smoothstep(0.05,0.35,abs(clothCm.x-230.0));
    diffuseColor.rgb*=1.0-0.35*meetingEdge;`);};
  const cloth=new T.Mesh(geometry,material);cloth.castShadow=cloth.receiveShadow=true;group.add(cloth);
  const trackMaterial=new T.MeshStandardMaterial({color:'#ffffff',roughness:.82,metalness:.05});const track=new T.Mesh(new T.BoxGeometry(234,1.2,2.2),trackMaterial);track.position.set(0,251.4,0);group.add(track);
  const samples=[];for(let p=0;p<2;p++)for(let i=1;i<=SPEC.columns;i++){const a=(p*(SPEC.rows+1)*(SPEC.columns+1)+i-1)*3,b=a+3;if(closed[a+2]*closed[b+2]<0)samples.push({a,b,t:-closed[a+2]/(closed[b+2]-closed[a+2])});}
  const carriers=new T.InstancedMesh(new T.CylinderGeometry(.065,.065,.8,6),trackMaterial,samples.length);group.add(carriers);
  const edges=new T.BufferGeometry(),edgeMaterial=new T.MeshStandardMaterial({color:'#d7d0bd',roughness:1,side:T.DoubleSide}),edgeMesh=new T.Mesh(edges,edgeMaterial);edgeMesh.castShadow=true;group.add(edgeMesh);
  const proof={metrics,geometryId:geometry.uuid,progress:0,fabric:null,plan:null,meshBuilds:1};let currentTexture=null,serial=0;
  const anchorIds=[48,112,176].flatMap(i=>[8,24,42].map(j=>j*(SPEC.columns+1)+i));
  const markers=new T.InstancedMesh(new T.SphereGeometry(.8,8,6),new T.MeshBasicMaterial({color:'#df8d23'}),anchorIds.length);markers.visible=false;group.add(markers);
  function setProgress(progress,fall={}){
    const positions=solve(progress,target,fall);geometry.attributes.position.array.set(positions);geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
    const ep=[],ei=[];function edge(a,b){const n=ep.length/3;for(const [v,dz] of [[a,0],[b,0],[a,-.08],[b,-.08]])ep.push(positions[v*3],positions[v*3+1],positions[v*3+2]+dz);ei.push(n,n+1,n+2,n+1,n+3,n+2);}
    for(let p=0;p<2;p++){const base=p*(SPEC.rows+1)*(SPEC.columns+1);for(let j=0;j<SPEC.rows;j++)for(const i of [0,SPEC.columns])edge(base+j*(SPEC.columns+1)+i,base+(j+1)*(SPEC.columns+1)+i);for(let i=0;i<SPEC.columns;i++)for(const j of [0,SPEC.rows])edge(base+j*(SPEC.columns+1)+i,base+j*(SPEC.columns+1)+i+1);}
    if(edges.attributes.position){edges.attributes.position.array.set(ep);edges.attributes.position.needsUpdate=true;}else{edges.setAttribute('position',new T.Float32BufferAttribute(ep,3));edges.setIndex(ei);}edges.computeVertexNormals();edges.computeBoundingSphere();
    samples.forEach(({a,b,t},i)=>carriers.setMatrixAt(i,new T.Matrix4().makeTranslation(positions[a]+t*(positions[b]-positions[a]),250.4,0)));carriers.instanceMatrix.needsUpdate=true;carriers.computeBoundingSphere();proof.progress=progress;
    proof.anchors=anchorIds.map((v,i)=>{const point=Array.from(positions.subarray(v*3,v*3+3));markers.setMatrixAt(i,new T.Matrix4().makeTranslation(point[0],point[1],point[2]+.4));return{vertex:v,materialCm:[uv[v*2],uv[v*2+1]],position:point};});markers.instanceMatrix.needsUpdate=true;markers.computeBoundingSphere();
  }
  async function setFabric(id){
    const request=++serial,f=FABRICS.find(f=>f.id===id);if(!f)throw Error('UNKNOWN_FABRIC');const plan=texturePlan(f);
    if(plan.state==='fallback')throw Error(`SCALE_UNAVAILABLE:${plan.reason}`);
    const texture=await new T.TextureLoader().loadAsync(f.image);
    if(request!==serial){texture.dispose();return;}
    texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;
    texture.wrapS=texture.wrapT=f.mode==='plain'?T.MirroredRepeatWrapping:T.ClampToEdgeWrapping;
    texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());texture.repeat.set(...plan.scale);
    const previous=currentTexture;currentTexture=texture;material.map=texture;material.needsUpdate=true;previous?.dispose();
    proof.fabric=id;proof.plan=plan;proof.texture=[texture.image.width,texture.image.height];proof.textureBytes=texture.image.width*texture.image.height*4*4/3;

  }
  async function hashes(){const digest=async a=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',a.buffer))].map(b=>b.toString(16).padStart(2,'0')).join('');return{position:await digest(geometry.attributes.position.array),uv:await digest(uv),indices:await digest(index),flat:await digest(flat)};}
  setProgress(0);
  return{group,proof,setProgress,setFabric,hashes,geometry,clearFabric(){serial++;material.map=null;currentTexture?.dispose();currentTexture=null;proof.textureBytes=0;},setMarkers(value){markers.visible=!!value;},dispose(){geometry.dispose();material.dispose();weave.dispose();edges.dispose();edgeMaterial.dispose();track.geometry.dispose();trackMaterial.dispose();carriers.geometry.dispose();markers.geometry.dispose();markers.material.dispose();currentTexture?.dispose();}};
}
