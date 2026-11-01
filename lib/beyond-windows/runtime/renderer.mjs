import * as T from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {motionPoseAt} from 'room-runtime/motion.mjs';
import {MODES} from 'room-runtime/rooms/environment/ambience.mjs';
import {SCENES,textureSpec} from './model.mjs';
import {furnish} from './furnishings.mjs';
import {createScreenSystem} from './screens.mjs';

export function createViewer(canvas,config,onState){
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.25:1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  const scene=new T.Scene();scene.background=new T.Color('#ece7dd');
  const camera=new T.PerspectiveCamera(40,1.6,2,3000);RectAreaLightUniformsLib.init();
  const hemi=new T.HemisphereLight('#fff9ed','#9d9c8f',1);scene.add(hemi);
  const key=new T.DirectionalLight('#ffefd9',2.1);key.position.set(-310,580,120);key.target.position.set(0,30,-120);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-500,right:500,top:500,bottom:-500,near:20,far:1400});key.shadow.normalBias=.7;scene.add(key,key.target);
  const broad=new T.RectAreaLight('#fff7e6',3.5,500,250);broad.position.set(0,290,350);broad.lookAt(0,100,-150);scene.add(broad);
  const fill=new T.RectAreaLight('#edf4ff',2,200,220);fill.position.set(-350,150,30);fill.lookAt(100,110,-100);scene.add(fill);
  const reflection=new T.Scene();reflection.background=new T.Color('#b3aea4');
  for(const [x,y,z,w,h,c]of [[0,100,300,300,200,'#fff8df'],[-300,90,0,220,220,'#eef3ff'],[180,120,-280,75,250,'#302e29']]){const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:c,side:T.DoubleSide}));p.position.set(x,y,z);p.lookAt(0,90,0);reflection.add(p);}
  const pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(reflection,.04);scene.environment=env.texture;pmrem.dispose();reflection.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  const face=new T.MeshPhysicalMaterial({color:'#d1c4ad',roughness:.93,sheen:.4,sheenRoughness:.8,side:T.FrontSide});
  const lining=new T.MeshPhysicalMaterial({color:'#dfd8c8',roughness:1,side:T.BackSide,sheen:.15});
  const voile=new T.MeshPhysicalMaterial({color:'#f5eee0',transparent:true,opacity:.29,roughness:.95,side:T.DoubleSide,depthWrite:false,sheen:.35});
  const metal=new T.MeshStandardMaterial({color:'#c2b899',metalness:.95,roughness:.24,envMapIntensity:1.5});
  const weave=new T.DataTexture(new Uint8Array(Array.from({length:64*64},(_,i)=>128+Math.round(24*Math.sin(i%64*Math.PI/2)*Math.cos(Math.floor(i/64)*Math.PI/2)))),64,64,T.RedFormat);weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(2,2);weave.needsUpdate=true;
  for(const m of[face,lining,voile]){m.bumpMap=weave;m.bumpScale=.07;}
  let state,room,screen,currentTexture=null,reverseTexture=null,textureSerial=0,frame=0,motionFrame=0,disposed=false,animation=null,pose=[1,1],lastRender=0;
  const samples=[];let renders=0;
  function render(){frame=0;if(disposed)return;const r=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const start=performance.now();renderer.render(scene,camera);samples.push(performance.now()-start);if(samples.length>120)samples.shift();renders++;lastRender=performance.now();onState?.({ready:true,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,renderCpuP95Ms:[...samples].sort((a,b)=>a-b)[Math.floor((samples.length-1)*.95)],renders,pose:[...pose],...screen?.metrics});}
  function requestRender(){if(!frame&&!disposed)frame=requestAnimationFrame(render);}
  const resize=new ResizeObserver(requestRender);resize.observe(canvas);
  function view(){const spec=SCENES[state.scene];let position=spec.camera,target=spec.target;
    if(state.view==='curtain'){position=[state.scene==='hide'?50:180,195,410];target=[-30,135,state.scene==='hide'?-105:0];}
    if(state.view==='reverse'){position=[-530,360,-730];target=[0,120,0];}
    camera.position.set(...position);camera.lookAt(...target);room.setReverse(state.view==='reverse');}
  function ambience(){const m=MODES[state.light];hemi.intensity=m.hemi*1.2;key.intensity=m.key*2.5;broad.intensity=m.broad;fill.intensity=m.fill*1.7;renderer.toneMappingExposure=m.exposure;key.color.set(state.light==='evening'?'#ffd599':'#fff8ed');room.shade.emissiveIntensity=state.light==='evening'?.8:.12;room.wall.color.set({chalk:'#e6dfd2',sage:'#bfc6b4',clay:'#c7a793'}[state.wall]);renderer.shadowMap.needsUpdate=true;}
  function updateReverse(){
    const doubleFaced=state?.construction==='double';
    lining.map=doubleFaced?reverseTexture:null;lining.color.set(doubleFaced?(reverseTexture?'#ffffff':'#d1c4ad'):'#dfd8c8');lining.needsUpdate=true;
  }
  function clearFabric(){textureSerial++;face.map=null;face.color.set('#d1c4ad');face.needsUpdate=true;currentTexture?.dispose();reverseTexture?.dispose();currentTexture=null;reverseTexture=null;updateReverse();requestRender();}
  function setState(next,{animate=true}={}){
    const previous=state,rebuild=!state||['scene','layout','draw','heading','material','density'].some(k=>state[k]!==next[k]);state={...next};
    if(!room||previous.scene!==state.scene){room?.dispose();room=furnish(state.scene,config.rendererBase,requestRender);scene.add(room.root);}
    if(rebuild){screen?.dispose();screen=createScreenSystem(state,{face,lining,voile,metal});scene.add(screen.root);pose=[state.open,state.layer];animation=null;}
    if(!rebuild&&(pose[0]!==state.open||pose[1]!==state.layer)){
      if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)animation={start:performance.now(),from:[...pose],to:[state.open,state.layer]};
      else{pose=[state.open,state.layer];animation=null;screen.update(...pose);}
    }
    updateReverse();view();ambience();requestRender();cancelAnimationFrame(motionFrame);if(animation)motionFrame=requestAnimationFrame(tick);
  }
  function tick(now){if(!animation||disposed)return;const a=animation;let done=true;
    pose=a.from.map((from,i)=>{if(from===a.to[i])return from;const m=motionPoseAt(Math.max(0,now-a.start),from,a.to[i]);done=done&&m.done;return m.progress;});
    screen.update(...pose);renderer.shadowMap.needsUpdate=true;requestRender();
    if(done){animation=null;motionFrame=0;}else motionFrame=requestAnimationFrame(tick);
  }
  async function setFabric(record){
    clearFabric();const serial=textureSerial,spec=textureSpec(record);
    if(!spec.url)throw Error('No usable fabric image is available. A neutral curtain is shown.');
    const url=new URL(spec.url,config.rendererBase);
    // Immutable media is already present on the preview deployment. Loading it
    // there avoids the production CDN's intentionally storefront-only CORS rule.
    if(config.preview&&url.origin==='https://curtainsuk-production-api.vercel.app'&&url.pathname.startsWith('/room-visualiser/'))url.host=new URL(config.rendererBase).host,url.protocol=new URL(config.rendererBase).protocol;
    if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)))throw Error('Fabric image address is unavailable.');
    const image=new Image();image.crossOrigin='anonymous';let timer;
    await new Promise((resolve,reject)=>{timer=setTimeout(()=>{image.src='';reject(Error('Fabric image timed out.'));},20000);image.onload=resolve;image.onerror=()=>reject(Error('Fabric image could not load.'));image.src=url.href;}).finally(()=>clearTimeout(timer));
    if(serial!==textureSerial||disposed)return null;
    const tile=document.createElement('canvas');
    const sx=0,sy=spec.top/spec.height*image.naturalHeight,sw=Math.min(image.naturalWidth,spec.tileWidth/spec.width*image.naturalWidth),sh=Math.min(image.naturalHeight-sy,spec.tileHeight/spec.height*image.naturalHeight);
    tile.width=Math.max(16,Math.min(1024,Math.round(sw)));tile.height=Math.max(16,Math.min(1024,Math.round(sh)));tile.getContext('2d').drawImage(image,sx,sy,sw,sh,0,0,tile.width,tile.height);
    const texture=new T.CanvasTexture(tile);texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(1/spec.tileWidth,1/spec.tileHeight);texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    currentTexture=texture;reverseTexture=texture.clone();reverseTexture.repeat.x*=-1;reverseTexture.needsUpdate=true;updateReverse();face.map=texture;face.color.set('#ffffff');face.needsUpdate=true;requestRender();return spec;
  }
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onState?.({ready:false,error:'Graphics paused. Retry to restore this configuration.'});});
  return{setState,setFabric,clearFabric,render:requestRender,get pose(){return [...pose];},dispose(){disposed=true;cancelAnimationFrame(frame);resize.disconnect();room?.dispose();screen?.dispose();currentTexture?.dispose();reverseTexture?.dispose();weave.dispose();env.dispose();[face,lining,voile,metal].forEach(m=>m.dispose());renderer.dispose();}};
}
