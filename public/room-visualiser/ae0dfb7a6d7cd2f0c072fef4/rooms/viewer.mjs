import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {ROOMS,PALETTES,colourFor} from './catalog.mjs';
import {FABRICS} from '../fabrics.mjs';
import {createCurtain} from './curtain-component.mjs';
import {createTravelController} from './travel-controller.mjs';
import {createLightingPipeline} from './lighting.mjs';
import {applyFixedView} from './views.mjs';
import {createLoadingPhases,createResourceCache,createIdlePreloader,mayPreload,resourceBytes} from './loading.mjs';
import {catalogueMaterial} from './catalogue-material.mjs';
import {previewPlan} from './catalogue-contract.mjs';
const started=performance.now(),canvas=document.querySelector('canvas'),loading=document.querySelector('#loading');
const proof=window.roomProof={ready:false,errors:[],room:null,view:'room',viewSwitches:[],switches:[],renders:[],colours:{},selection:null};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let lazyPreload=null,lastActivity=performance.now(),activeLoading;
proof.loading={state:null,initial:null,lazy:{results:[],errors:[],decodedBodyBytes:0},cache:null};
const loadPhases=createLoadingPhases({onChange:state=>{proof.loading.state=state;loading.hidden=state.status==='ready';loading.dataset.state=state.status;loading.dataset.stage=String(state.stage);for(const step of document.querySelectorAll('[data-loading-stage]')){if(Number(step.dataset.loadingStage)===state.stage)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');}loading.dataset.reducedMotion=String(reduced.matches);const label=document.querySelector('#loading-status');if(label)label.textContent=state.label;else loading.textContent=state.label;const retry=document.querySelector('#loading-retry');if(retry)retry.hidden=state.status!=='error';document.querySelector('#visualiser')?.setAttribute('aria-busy',String(state.status==='loading'));}});
proof.loading.phases=loadPhases.history;
function beginLoading(stage,retry){proof.errors=[];document.querySelector('#error').hidden=true;activeLoading=loadPhases.begin({stage,retry});return activeLoading;}
function noteActivity(){lastActivity=performance.now();}
for(const name of ['pointerdown','keydown','wheel','touchstart'])document.addEventListener(name,noteActivity,{passive:true,capture:true});
document.querySelector('#loading-retry')?.addEventListener('click',()=>loadPhases.retry());
const initialOperation=beginLoading(0,()=>location.reload());
const debug=new URLSearchParams(location.search).get('debug')==='1'&&['127.0.0.1','localhost'].includes(location.hostname);
document.querySelector('#developer-tools').hidden=!debug;
function writeProof(){if(debug&&document.querySelector('#developer-tools').open)document.querySelector('#proof').textContent=JSON.stringify(proof,null,2);}
document.querySelector('#developer-tools').addEventListener('toggle',writeProof);
let guide=null;const guideFabrics=[...FABRICS];proof.guideReady=false;
function updateGuide(){const fabricId=proof.selectedFabric||proof.curtain?.fabric;if(guide&&proof.room&&fabricId)guide.updatePalette({roomId:proof.room,fabricId,colours:proof.colours});}
function fail(e){proof.errors.push(String(e));const el=document.querySelector('#error');el.textContent='The visualiser could not load. Please try again.';el.hidden=false;activeLoading?.fail(e);}
try{
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=T.PCFShadowMap;
  RectAreaLightUniformsLib.init();const scene=new T.Scene();scene.background=new T.Color('#e9e6dd');const camera=new T.PerspectiveCamera(43,1.6,1,2400);
  const hemi=new T.HemisphereLight('#fffaf5','#b2ac9a',1.05);scene.add(hemi);
  const key=new T.DirectionalLight('#fffaf5',.55);key.position.set(-95,285,5);key.target.position.set(60,0,240);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-470,right:470,top:400,bottom:-400,near:20,far:1200});key.shadow.bias=-.00008;key.shadow.normalBias=.15;key.shadow.radius=4;scene.add(key,key.target);
  // Keep both finite emitters inside the shell: crossing a wall or ceiling
  // produces a hard analytical light boundary that resembles a false shadow.
  const broad=new T.RectAreaLight('#fff8ed',5,200,160);broad.position.set(-160,205,390);broad.lookAt(0,105,55);scene.add(broad);
  const fill=new T.RectAreaLight('#f0f3ff',1.2,130,160);fill.position.set(210,190,300);fill.lookAt(0,100,40);scene.add(fill);
  const pipeline=createLightingPipeline(renderer,scene,camera);proof.ambientOcclusion=pipeline.enabled;renderer.info.autoReset=false;
  // ImageLoader and the unchanged curtain TextureLoader share the decoded image,
  // so warming a fabric never creates a second curtain or an extra GPU texture.
  T.Cache.enabled=false;
  const baseTextures=new Map(),variants=new Map();const loader=new GLTFLoader();let activeRoom=null,roomGeneration=0,fabricGeneration=0,contacts=null;
  const roomBytes=createResourceCache({load:async id=>{const response=await fetch(new URL(`./packs/${id}.glb`,import.meta.url));if(!response.ok)throw Error('ROOM_LOAD_FAILED');return response.arrayBuffer();},maxEntries:4,maxBytes:4*1024*1024});
  const initialSelection=Promise.resolve(window.visualiserInitial??{roomId:'living',fabricId:'bergamot'}).then(selection=>{if(!ROOMS.some(r=>r.id===selection?.roomId))throw Error('UNKNOWN_INITIAL_ROOM');if(selection.fabricId!==null&&!FABRICS.some(f=>f.id===selection?.fabricId))throw Error('UNKNOWN_INITIAL_FABRIC');return selection;});
  const manifestPromise=fetch(new URL('./packs/manifest.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('ROOM_MANIFEST_UNAVAILABLE');return r.json();});
  const curtainPromise=createCurtain(renderer);
  const mapPromise=manifestPromise.then(m=>Promise.all(m.textures.map(async info=>{const tex=await new T.TextureLoader().loadAsync(new URL(`./packs/${info.file}`,import.meta.url).href);tex.colorSpace=info.name.endsWith('roughness')?T.NoColorSpace:T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());baseTextures.set(info.name,tex);})));
  // The room is known before its fabric record arrives. Overlap only that one
  // room download with the catalogue read; texture selection still waits for
  // canonical metadata and approved calibration.
  const initialRoomId=window.visualiserInitialRoom??initialSelection.then(selection=>selection.roomId);
  const initialRoomPromise=Promise.resolve(initialRoomId).then(async id=>{if(!ROOMS.some(r=>r.id===id))throw Error('UNKNOWN_INITIAL_ROOM');const bytes=await roomBytes.get(id),begin=performance.now(),gltf=await loader.parseAsync(bytes,new URL('./packs/',import.meta.url).href);return{id,gltf,parseMs:performance.now()-begin};});
  const initialWork=Promise.all([manifestPromise,curtainPromise,mapPromise,initialRoomPromise]);initialWork.catch(()=>{});
  const initial=await initialSelection;initialOperation.advance(1);
  const curtain=await curtainPromise;scene.add(curtain.group);proof.curtain=curtain.proof;const catalogue= catalogueMaterial(curtain);if(initial.fabricId!==null)await curtain.setFabric(initial.fabricId);initialOperation.advance(2);
  const [manifest,,,preparedRoom]=await initialWork;proof.manifest=manifest;
  const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');proof.gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  const travel=createTravelController();let raf=0,frameTimes=[],frameWork=[],lastFrame=0,motionStart=0;proof.motionRuns=[];
  function texture(name,x=1,y=x){const id=`${name}:${x}:${y}`;if(!variants.has(id)){const t=baseTextures.get(name).clone();t.repeat.set(x,y);t.needsUpdate=true;variants.set(id,t);}return variants.get(id);}
  function dress(room){room.traverse(m=>{if(!m.isMesh)return;m.castShadow=m.receiveShadow=true;let mat=m.material;const name=mat.name;
    if(['WALL_MATERIAL','CEILING_MATERIAL','TRIM'].includes(name))m.castShadow=false;
    if(name==='CEILING_MATERIAL'){const old=mat;m.material=new T.MeshLambertMaterial({name,color:old.color,emissive:old.color,emissiveIntensity:.4,map:texture('plaster')});old.dispose();m.receiveShadow=false;return;}
    if(name==='GLASS_VIEW'){mat.emissive.set('#bdcbd0');mat.emissiveIntensity=.35;m.castShadow=false;}
    else if(name==='FLOOR_MATERIAL'){mat.map=texture('oak');mat.bumpMap=mat.map;mat.bumpScale=.06;mat.roughness=.74;}
    else if(['TIMBER','DARK_TIMBER','DESK_SURFACE'].includes(name)){mat.map=texture('grain');mat.bumpMap=mat.map;mat.bumpScale=.025;mat.roughness=.63;}
    else if(['WALL_MATERIAL','CEILING_MATERIAL'].includes(name)){mat.map=texture('plaster');mat.bumpMap=mat.map;mat.bumpScale=.025;mat.roughness=1;if(name==='CEILING_MATERIAL'){m.receiveShadow=false;}}
    else if(name==='RUG_FIXED'){mat.map=texture('rug');mat.bumpMap=mat.map;mat.bumpScale=.08;}
    else if(/UPHOLSTERY|HEADBOARD|BED_COVER|LINEN_FIXED|SHADE/.test(name)){const old=mat;mat=new T.MeshPhysicalMaterial({name,color:old.color,roughness:1,sheen:.32,sheenRoughness:.85,sheenColor:new T.Color('#bfb8a9'),side:T.DoubleSide});m.material=mat;old.dispose();mat.map=texture('weave');mat.roughnessMap=texture('weave-roughness');mat.bumpMap=mat.map;mat.bumpScale=.016;if(name==='SHADE'){mat.emissive.set('#e8c995');mat.emissiveIntensity=.06;}}
    mat.needsUpdate=true;
  });}
  function contactShadows(id){const g=new T.Group();const data=id==='bedroom'?[[-168,210,190,215],[-282,99,50,48],[-50,99,50,48],[-168,360,145,40]]:id==='office'?[[-188,127,165,82],[-187,233,70,70],[229,15,100,50]]:id==='lounge'?[[201,148,192,95],[-205,170,100,95],[12,247,115,83]]:[[-205,148,220,95],[205,157,100,95],[0,230,125,83]];
    for(const [x,z,w,d] of data){const mat=new T.MeshBasicMaterial({map:baseTextures.get('contact'),transparent:true,depthWrite:false,opacity:.48,toneMapped:false});const mesh=new T.Mesh(new T.PlaneGeometry(w*1.2,d*1.3),mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,1.08,z);g.add(mesh);}return g;}
  function disposeRoom(room){if(!room)return;scene.remove(room);room.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});}
  function render(fast=false){const t=performance.now(),w=canvas.clientWidth;renderer.info.reset();renderer.shadowMap.needsUpdate=true;pipeline.render(w,w/1.6);if(!fast)gl.finish();proof.renders.push(performance.now()-t);if(proof.renders.length>80)proof.renders.shift();proof.draw={...renderer.info.render};proof.gpuObjects={...renderer.info.memory};proof.postprocessEstimatedBytes=pipeline.estimateBytes();if(fast)return;proof.camera={position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov,aspect:camera.aspect};proof.curtainTransform={position:curtain.group.position.toArray(),scale:curtain.group.scale.toArray(),rotation:curtain.group.rotation.toArray().slice(0,3)};proof.buffers={vertices:curtain.geometry.attributes.position.count,indices:curtain.geometry.index.count,uvVersion:curtain.geometry.attributes.uv.version,indexVersion:curtain.geometry.index.version};proof.visibleScene={vertices:0,triangles:0};scene.traverseVisible(m=>{if(m.isMesh){const n=m.isInstancedMesh?m.count:1;proof.visibleScene.vertices+=m.geometry.attributes.position.count*n;proof.visibleScene.triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)*n/3;}});proof.roomMaterials={};proof.roomMaterialProperties={};proof.roomGeometryIds=[];activeRoom?.traverse(m=>{if(m.isMesh){proof.roomMaterials[m.material.name]=m.material.color.getHexString();proof.roomMaterialProperties[m.material.name]={type:m.material.type,map:m.material.map?.uuid,roughnessMap:m.material.roughnessMap?.uuid,roughness:m.material.roughness,sheen:m.material.sheen,bumpScale:m.material.bumpScale};proof.roomGeometryIds.push(m.geometry.uuid);}});writeProof();}
  function zonesUI(){const config=ROOMS.find(r=>r.id===proof.room),focused=document.activeElement?.closest('button[data-colour]'),focus=focused?{zone:focused.dataset.zone,colour:focused.dataset.colour}:null;
    const entries=Object.entries(config.zones).filter(([key])=>key!=='CEILING_MATERIAL');if(config.zones.CEILING_MATERIAL)entries.push(['CEILING_MATERIAL',config.zones.CEILING_MATERIAL]);
    document.querySelector('#zones').innerHTML=entries.map(([key,z])=>{const label=key==='FLOOR_MATERIAL'?'Flooring':z.label;return `<div class="zone" data-zone="${key}"><label>${label}<span>${PALETTES[z.palette][proof.colours[key]][0]}</span></label><div class="swatches" role="group" aria-label="${label}">${PALETTES[z.palette].map(([name,hex],i)=>`<button class="swatch" data-zone="${key}" data-colour="${i}" aria-label="${label}: ${name}" title="${name}" aria-pressed="${proof.colours[key]===i}" style="background:${hex}"></button>`).join('')}</div></div>`;}).join('');
    for(const b of document.querySelectorAll('[data-colour]'))b.onclick=()=>setColour(b.dataset.zone,Number(b.dataset.colour));if(focus)document.querySelector(`button[data-zone="${focus.zone}"][data-colour="${focus.colour}"]`)?.focus({preventScroll:true});updateGuide();}
  function setColour(zone,index){noteActivity();const t=performance.now(),hex=colourFor(proof.room,zone,index);activeRoom.traverse(m=>{if(m.isMesh&&m.material.name===zone){m.material.color.set(hex);if(zone==='CEILING_MATERIAL')m.material.emissive.copy(m.material.color);}});proof.colours[zone]=index;zonesUI();render();proof.lastColourMs=performance.now()-t;}
  // Only the existing camera changes. The scene, cloth buffers and travel clock stay live.
  function setView(view){noteActivity();const t=performance.now();applyFixedView(camera,proof.room,view);proof.view=view;for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===view));document.querySelector('#view-label').textContent=view==='curtain'?'Curtain view':'Room view';render();proof.viewSwitches.push({view,ms:performance.now()-t});}
  async function setRoom(id,prepared=null){noteActivity();pauseMotion();const config=ROOMS.find(r=>r.id===id);if(!config)throw Error('UNKNOWN_ROOM');const serial=++roomGeneration,t=performance.now(),operation=prepared?initialOperation:beginLoading(2,()=>setRoom(id));proof.ready=false;
    const warm=!prepared&&roomBytes.has(id);let gltf,parseMs;
    try{if(prepared?.id===id){gltf=prepared.gltf;parseMs=prepared.parseMs;}else{const bytes=await roomBytes.get(id),parseStart=performance.now();gltf=await loader.parseAsync(bytes,new URL('./packs/',import.meta.url).href);parseMs=performance.now()-parseStart;}}catch(error){if(serial!==roomGeneration)return;operation.fail(error);throw error;}if(serial!==roomGeneration){disposeRoom(gltf.scene);return;}
    disposeRoom(activeRoom);disposeRoom(contacts);activeRoom=gltf.scene;activeRoom.scale.setScalar(100);dress(activeRoom);scene.add(activeRoom);contacts=contactShadows(id);scene.add(contacts);applyFixedView(camera,id,proof.view);
    proof.room=id;proof.colours=Object.fromEntries(Object.entries(config.zones).map(([k,z])=>[k,z.initial]));proof.selection=null;proof.pack=manifest.rooms.find(r=>r.id===id);zonesUI();
    for(const b of document.querySelectorAll('[data-room]'))b.setAttribute('aria-pressed',String(b.dataset.room===id));document.querySelector('#room-name').textContent=config.name;document.querySelector('#room-style').textContent=config.style;document.querySelector('#room-description').textContent=config.description;render();await new Promise(requestAnimationFrame);render();if(!prepared){operation.complete();if(operation.current)proof.ready=true;}proof.switches.push({room:id,warm,loadParseRenderMs:performance.now()-t,parseMs});proof.firstRenderMs??=performance.now()-started;cacheProof();writeProof();
  }
  async function setFabric(id){noteActivity();pauseMotion();const request=++fabricGeneration,t=performance.now(),operation=beginLoading(0,()=>setFabric(id));proof.ready=false;
    try{if(request!==fabricGeneration)return;operation.advance(1);await curtain.setFabric(id);if(request!==fabricGeneration)return;operation.advance(2);render();operation.complete();if(operation.current)proof.ready=true;updateGuide();cacheProof();proof.lastFabricMs=performance.now()-t;}catch(error){if(request!==fabricGeneration)return;operation.fail(error);throw error;}}
  async function setCatalogueFabric(record){noteActivity();pauseMotion();const request=++fabricGeneration,t=performance.now(),plan=previewPlan(record,FABRICS),initialising=proof.loading.initial===null,operation=initialising?initialOperation:beginLoading(0,()=>setCatalogueFabric(record));proof.ready=false;
    try{if(request!==fabricGeneration)return{applied:false};if(!initialising)operation.advance(1);const result=await catalogue.select(record);if(request!==fabricGeneration||!result.applied)return{applied:false};
      proof.selectedFabric=record.id;proof.previewState=result;const item={id:record.id,name:`${record.design} — ${record.colour}`,image:record.imageReferences?.[0]||record.images?.[0]?.url};const existing=guideFabrics.findIndex(f=>f.id===record.id);if(existing<0)guideFabrics.push(item);else guideFabrics[existing]=item;
      if(!initialising)operation.advance(2);render();if(!initialising){operation.complete();if(operation.current)proof.ready=true;}updateGuide();cacheProof();proof.lastFabricMs=performance.now()-t;return result;
    }catch(error){if(request!==fabricGeneration)return{applied:false};operation.fail(error);throw error;}}
  document.querySelector('#rooms').innerHTML=ROOMS.map(r=>`<button data-room="${r.id}" aria-pressed="false">${r.name}</button>`).join('');for(const b of document.querySelectorAll('[data-room]'))b.onclick=()=>setRoom(b.dataset.room).catch(fail);
  const fabrics=document.querySelector('#fabric');fabrics.innerHTML=FABRICS.map(f=>`<option value="${f.id}">${f.name}</option>`).join('');fabrics.onchange=()=>setFabric(fabrics.value).catch(fail);
  function showMotion(pose){proof.motion=pose;const percent=Math.round(pose.progress*100)+'% open';document.querySelector('#position').value=String(pose.progress*100);document.querySelector('#position').setAttribute('aria-valuetext',percent);document.querySelector('#position-value').textContent=percent;document.querySelector('#pause').textContent=pose.paused&&!pose.done?'Resume':'Pause';document.querySelector('#pause').hidden=!(pose.running||(pose.paused&&!pose.done));document.querySelector('#state-label').textContent=pose.done?(pose.progress===1?'Curtains open':pose.progress===0?'Curtains closed':'Partly open'):pose.paused?'Paused':pose.target===1?'Opening curtains':'Closing curtains';for(const b of document.querySelectorAll('[data-pose]'))b.setAttribute('aria-pressed',String(Number(b.dataset.pose)===pose.target));}
  function tick(now){raf=0;const begin=performance.now(),pose=travel.sample(now);curtain.setProgress(pose.progress,pose);showMotion(pose);render(true);if(lastFrame)frameTimes.push(now-lastFrame);lastFrame=now;frameWork.push(performance.now()-begin);
    if(pose.running)raf=requestAnimationFrame(tick);else{proof.motionRuns.push({fabric:curtain.proof.fabric,room:proof.room,target:pose.target,elapsedMs:now-motionStart,scheduledMs:pose.durationMs,frames:frameTimes.length,meanFps:frameTimes.length?1000/(frameTimes.reduce((a,b)=>a+b,0)/frameTimes.length):null,p95FrameMs:[...frameTimes].sort((a,b)=>a-b)[Math.floor(frameTimes.length*.95)],meanCpuSubmitMs:frameWork.reduce((a,b)=>a+b,0)/frameWork.length});render();}}
  function startMotion(target){noteActivity();cancelAnimationFrame(raf);const now=performance.now(),pose=travel.target(target,now,reduced.matches);showMotion(pose);motionStart=now;lastFrame=0;frameTimes=[];frameWork=[];if(pose.running)raf=requestAnimationFrame(tick);else{curtain.setProgress(pose.progress,pose);render();}}
  function pauseMotion(){cancelAnimationFrame(raf);raf=0;const pose=travel.pause(performance.now());if(proof.ready){curtain.setProgress(pose.progress,pose);showMotion(pose);render();}return pose;}
  function setProgress(p){noteActivity();cancelAnimationFrame(raf);raf=0;const pose=travel.scrub(p,performance.now());curtain.setProgress(p);showMotion(pose);render();}
  for(const b of document.querySelectorAll('[data-pose]'))b.onclick=()=>startMotion(Number(b.dataset.pose));
  document.querySelector('#pause').onclick=()=>{const pose=travel.sample(performance.now());if(pose.paused&&!pose.done){travel.resume(performance.now());motionStart=performance.now();lastFrame=0;frameTimes=[];frameWork=[];raf=requestAnimationFrame(tick);}else pauseMotion();};
  document.querySelector('#position').oninput=e=>setProgress(Number(e.target.value)/100);
  for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>setView(b.dataset.view);
  document.querySelector('#anchors').onchange=e=>{curtain.setMarkers(e.target.checked);render();};
  reduced.addEventListener('change',()=>{loading.dataset.reducedMotion=String(reduced.matches);const pose=travel.sample(performance.now());if(reduced.matches&&pose.running)setProgress(pose.target);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseMotion();else lazyPreload?.wake();});
  document.querySelector('#reset').onclick=()=>{for(const [key,z] of Object.entries(ROOMS.find(r=>r.id===proof.room).zones))setColour(key,z.initial);};
  const raycaster=new T.Raycaster();canvas.onclick=e=>{if(!activeRoom)return;const rect=canvas.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const first=raycaster.intersectObjects([activeRoom,curtain.group],true)[0];const zone=first?.object.material?.name;if(!ROOMS.find(r=>r.id===proof.room).zones[zone])return;proof.selection=zone;for(const el of document.querySelectorAll('.zone'))el.classList.toggle('active',el.dataset.zone===zone);document.querySelector(`.zone[data-zone="${zone}"] button`)?.focus({preventScroll:true});};
  window.roomReview={hashes:()=>curtain.hashes(),setColour,setRoom,setFabric,setCatalogueFabric,setProgress,setView,startMotion,pauseMotion,setMarkers(v){curtain.setMarkers(v);render();},render};
  new ResizeObserver(()=>{if(proof.ready)render();}).observe(canvas.parentElement);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail(Error('Graphics context lost. Reload the visualiser.'));});
  fabrics.value=initial.fabricId;await setRoom(initial.roomId,preparedRoom);
  await window.visualiserCustomer?.onReady(window.roomReview,proof);
  initialOperation.complete();proof.ready=true;
  const initialReadyAt=performance.now();lastActivity=initialReadyAt;proof.navigationToReadyMs=initialReadyAt;proof.loading.initial={readyAt:initialReadyAt,navigationToReadyMs:initialReadyAt,viewerToReadyMs:proof.firstRenderMs,...resourceBytes([...performance.getEntriesByType('navigation'),...performance.getEntriesByType('resource')].filter(r=>r.responseEnd<=initialReadyAt))};
  function cacheProof(){proof.loading.cache={roomEntries:roomBytes.size,roomBytes:roomBytes.bytes,curtainTextureBytes:curtain.proof.textureBytes??0,maximumRoomBytes:4*1024*1024};}
  cacheProof();const connection=navigator.connection;proof.loading.lazy.allowed=mayPreload(connection);
  const tasks=ROOMS.filter(r=>r.id!==initial.roomId).map(r=>({kind:'room',url:new URL(`./packs/${r.id}.glb`,import.meta.url).href,run:async()=>{const cached=roomBytes.has(r.id),bytes=await roomBytes.get(r.id);return{cached,bytes:cached?0:bytes.byteLength};}}));
  lazyPreload=createIdlePreloader({tasks,isAllowed:()=>mayPreload(connection),isBusy:()=>document.hidden||!proof.ready||proof.motion?.running||performance.now()-lastActivity<1200,onResult:(task,result)=>{proof.loading.lazy.results.push({kind:task.kind,url:task.url,...result,at:performance.now()});proof.loading.lazy.decodedBodyBytes+=result.bytes;cacheProof();},onError:(task,error)=>{proof.loading.lazy.errors.push({kind:task.kind,url:task.url,error:String(error)});cacheProof();}});
  connection?.addEventListener?.('change',()=>{proof.loading.lazy.allowed=mayPreload(connection);lazyPreload.wake();});lazyPreload.start();window.addEventListener('pagehide',()=>lazyPreload.stop(),{once:true});
  // Educational UI loads after the first scene render and never participates in the travel/render loop.
  import('./colour-guide.mjs').then(({mountColourGuide})=>{guide=mountColourGuide(document.querySelector('#colour-guide'),{rooms:ROOMS,palettes:PALETTES,fabrics:guideFabrics});updateGuide();proof.guideReady=true;}).catch(e=>{proof.guideError=String(e);document.querySelector('#colour-guide').textContent='The colour guide could not load. You can still explore the room above.';});
}catch(e){fail(e);}
