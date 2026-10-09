import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {createAmbienceState,MODES,RADIATOR} from './ambience-before.mjs';
import {createFire} from './fire-before.mjs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export async function createLivingPrototype({T,scene,renderer,camera,lights,proof,requestRender}){
  const assetsStart=performance.now();
  const [chairAsset,...floorMaps]=await Promise.all([
    new GLTFLoader().loadAsync('/experiment/assets/armchair/model.gltf'),
    ...['tonal.webp','nor_gl.jpg','arm.jpg'].map(name=>new T.TextureLoader().loadAsync(`/experiment/assets/floor/${name}`)),
  ]);
  floorMaps.forEach((map,i)=>{map.wrapS=map.wrapT=T.RepeatWrapping;map.colorSpace=i===0?T.SRGBColorSpace:T.NoColorSpace;map.repeat.set(144/194,240/194);map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());});
  // Small filtered studio reflection field, generated once. The actual room lights
  // still supply direct illumination; this avoids black glass/metal reflections.
  const environment=new T.Scene();environment.background=new T.Color('#b8b5ad');
  for(const [w,h,x,y,z,power] of [[4,3,-4,2,0,3],[2,3,3,2,2,1.3],[4,4,0,4,0,.8]]){
    const card=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(power,power,power),side:T.DoubleSide}));card.position.set(x,y,z);card.lookAt(0,1,0);environment.add(card);
  }
  const pmrem=new T.PMREMGenerator(renderer),reflection=pmrem.fromScene(environment,.04,.1,30,{size:64});pmrem.dispose();environment.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});
  const originalEnvironment=scene.environment,originalEnvironmentIntensity=scene.environmentIntensity;
  const state=createAmbienceState(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let roomId=null,room=null,group=null,radiator=null,windowDetails=null,fire=null,lamps=[],shade=null,last=0,transitionUntil=0,raf=0;
  let materialMap=new Map();const sharedTextures=new Map(),started=performance.now();
  const baseline={hemi:lights.hemi.intensity,key:lights.key.intensity,broad:lights.broad.intensity,fill:lights.fill.intensity,exposure:renderer.toneMappingExposure};
  const colours={key:lights.key.color.clone(),broad:lights.broad.color.clone(),fill:lights.fill.color.clone(),hemi:lights.hemi.color.clone()};
  proof.prototype={version:'LIVING_2_POC_1',source:'Original project geometry + Poly Haven CC0 chair/floor',assetLoadMs:performance.now()-assetsStart,state:null,frames:0,ambienceFrames:[],radiator:RADIATOR};
  const ui=document.createElement('section');ui.className='ambience';ui.setAttribute('aria-label','Room ambience');
  ui.innerHTML='<h3>Room ambience</h3><div class="choices" role="group" aria-label="Lighting"><button data-ambience="daylight">Daylight</button><button data-ambience="evening">Evening</button><button data-ambience="inspection">Fabric inspection</button></div><div class="toggles"><button data-toggle="lamps">Lamps</button><button data-toggle="fire">Fireplace</button></div><p>Fabric inspection uses consistent neutral light. Fire and lamp settings are remembered when you return.</p>';
  ui.insertAdjacentHTML('beforeend','<p>Furniture/material assets: <a href="https://polyhaven.com" target="_blank" rel="noopener">Powered by Poly Haven</a> · CC0</p>');
  document.querySelector('#zones').before(ui);
  function syncUI(){const current=state.get('living');ui.hidden=roomId!=='living';for(const b of ui.querySelectorAll('[data-ambience]'))b.setAttribute('aria-pressed',String(current.mode===b.dataset.ambience));for(const b of ui.querySelectorAll('[data-toggle]'))b.setAttribute('aria-pressed',String(current[b.dataset.toggle]));proof.prototype.state=current;}
  function set(key,value){state.set('living',key,value);transitionUntil=performance.now()+(reduced.matches?0:700);syncUI();wake();requestRender();}
  for(const b of ui.querySelectorAll('[data-ambience]'))b.onclick=()=>set('mode',b.dataset.ambience);
  for(const b of ui.querySelectorAll('[data-toggle]'))b.onclick=()=>set(b.dataset.toggle,!state.get('living')[b.dataset.toggle]);
  window.roomAmbience={set,get:()=>state.get('living')};

  // Small original maps generated once; no network asset or dependency download.
  function texture(kind){if(sharedTextures.has(kind))return sharedTextures.get(kind);
    const size=kind==='wood'?512:256,c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),im=ctx.createImageData(size,size);let seed=93413;
    const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const i=(y*size+x)*4,n=rand();let value;
      if(kind==='wood'){
        const plank=Math.floor(x/(size/8)),u=(x%(size/8))/(size/8),v=(y+(plank%3)*size/3)%size;
        const grain=Math.sin(x*.6+Math.sin(y*.014+plank)*3+Math.sin(y*.038)*.7);
        const fine=Math.sin(x*3.4+Math.sin(y*.019)*2);
        value=225+grain*8+fine*3+n*5+Math.sin(plank*17)*8;
        if(u<.012||v<1.1)value-=28;
      }else if(kind==='textile'){value=180+Math.sin(x*Math.PI)*11+Math.sin(y*Math.PI)*11+(n-.5)*45;}
      else value=222+(n-.5)*18+Math.sin(x*.08+y*.13)*2;
      im.data[i]=im.data[i+1]=im.data[i+2]=value;im.data[i+3]=255;
    }ctx.putImageData(im,0,0);const map=new T.CanvasTexture(c);map.wrapS=map.wrapT=T.RepeatWrapping;map.colorSpace=kind==='wood'?T.SRGBColorSpace:T.NoColorSpace;map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());sharedTextures.set(kind,map);return map;
  }
  function rounded(w,h,d,r){
    const g=new T.BoxGeometry(w,h,d,8,6,8),p=g.attributes.position,inner=new T.Vector3(w/2-r,h/2-r,d/2-r),v=new T.Vector3(),q=new T.Vector3();
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);q.copy(v).clamp(inner.clone().negate(),inner);v.sub(q).normalize().multiplyScalar(r).add(q);p.setXYZ(i,v.x,v.y,v.z);}
    const result=mergeVertices(g,1e-4);g.dispose();result.computeVertexNormals();return result;
  }
  function upgradeMaterials(){room.traverse(mesh=>{if(!mesh.isMesh)return;const m=mesh.material;materialMap.set(m.name,m);
    if(m.name==='FLOOR_MATERIAL'){m.map=floorMaps[0];m.normalMap=floorMaps[1];m.roughnessMap=floorMaps[2];m.aoMap=floorMaps[2];m.bumpMap=null;m.normalScale=new T.Vector2(.6,.6);m.roughness=.9;}
    if(/UPHOLSTERY/.test(m.name)){m.sheen=.7;m.sheenRoughness=.9;m.bumpMap=texture('textile');m.bumpScale=.027;m.roughness=.93;}
    if(m.name==='WALL_MATERIAL'){m.bumpMap=texture('plaster');m.bumpScale=.035;m.roughness=.97;}
    if(m.name==='CEILING_MATERIAL'){m.emissiveIntensity=.28;}
    if(m.name==='RUG_FIXED'){m.roughness=1;m.bumpScale=.16;}
    if(/TIMBER/.test(m.name)){m.roughness=.46;m.bumpScale=.04;}
    if(m.name==='BRASS'){m.metalness=.8;m.roughness=.28;}
    m.needsUpdate=true;
  });shade=materialMap.get('SHADE');}
  function installChair(){
    const original=room.getObjectByName('ARMCHAIR_UPHOLSTERY');original.visible=false;
    const model=chairAsset.scene.clone(true),bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),centre=bounds.getCenter(new T.Vector3());
    const anchor=new T.Group();anchor.position.set(207,0,157);anchor.rotation.y=-.42;
    model.scale.setScalar(82/size.x);model.position.set(-centre.x*82/size.x,-bounds.min.y*82/size.x,-centre.z*82/size.x);
    model.traverse(m=>{if(!m.isMesh)return;m.geometry=m.geometry.clone();m.material=m.material.clone();
      if(/pillow/i.test(m.material.name)){
        const source=m.material,material=original.material.clone();material.normalMap=source.normalMap;material.normalScale=new T.Vector2(.65,.65);material.roughnessMap=source.roughnessMap;material.aoMap=source.aoMap;material.map=null;material.bumpMap=null;source.dispose();m.material=material;
      }m.castShadow=m.receiveShadow=true;
    });anchor.add(model);room.children[0].add(anchor);
    // Remove the old chair's legs only from the merged timber mesh.
    const timber=room.getObjectByName('DARK_TIMBER');if(timber){const old=timber.geometry,g=old.index?old.toNonIndexed():old.clone(),p=g.attributes.position,keep=[];
      for(let i=0;i<p.count;i+=3){const x=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,y=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3,z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;if(!(x>150&&x<260&&y<35&&z>98&&z<220))keep.push(i,i+1,i+2);}
      g.setIndex(keep);old.dispose();timber.geometry=g;
    }
  }
  function buildEnvironment(){
    group=new T.Group();group.name='Living Room 2 environment';scene.add(group);
    const buckets=new Map(),owned=new Set();
    const material=(name,options)=>{const m=new T.MeshStandardMaterial(options);m.name=name;owned.add(m);return m;};
    const stone=material('Limestone fireplace',{color:'#cbbfa9',roughness:.94,bumpMap:texture('plaster'),bumpScale:.025});
    const charcoal=material('Firebox interior',{color:'#171715',roughness:.89});
    const black=material('Patinated bronze',{color:'#3b342b',metalness:.65,roughness:.34});
    const white=material('Radiator enamel',{color:'#f0ece3',metalness:.1,roughness:.36});
    const logMat=material('Charred logs',{color:'#231a12',roughness:1,bumpMap:texture('wood'),bumpScale:.15});
    const add=(geometry,mat,p=[0,0,0],rotation=[0,0,0])=>{geometry.rotateX(rotation[0]);geometry.rotateY(rotation[1]);geometry.rotateZ(rotation[2]);geometry.translate(...p);const list=buckets.get(mat)||[];list.push(geometry);buckets.set(mat,list);};
    const box=(w,h,d,mat,p,r=.5)=>add(rounded(w,h,d,Math.min(r,w/3,h/3,d/3)),mat,p);
    // Recessed contemporary fireplace on the back wall; all dimensions are cm.
    const fx=-222;
    box(132,82,19,stone,[fx,41,-14],1.5);
    box(132,23,19,stone,[fx,158.5,-14],1.5);
    for(const sign of [-1,1])box(12,65,19,stone,[fx+sign*60,114.5,-14],1);
    box(109,63,1,charcoal,[fx,117,-23],.3);
    box(115,2.5,24,black,[fx,83,2]);
    box(141,5,31,stone,[fx,62,0],1.2);
    box(143,5,25,stone,[fx,172,-6],1.2);
    for(const side of [-1,1])box(2,63,5,black,[fx+side*55,116,-.8]);
    for(let i=0;i<5;i++)add(new T.CylinderGeometry(3,4,35,10),logMat,[fx-31+i*16,91,-8+(i%2)*4],[.22,0,Math.PI/2+.15*Math.sin(i)]);
    // Retain original window architecture; add profiled outer architrave shadow lines.
    const trim=materialMap.get('TRIM');
    for(const x of [-329,329])box(1.2,1.4,535,trim,[x,11,240]);
    for(const x of [-220,220])box(219,1.4,1.2,trim,[x,11,-22]);
    // Restrained marble tray and smoked glass vessel on the existing coffee table.
    const marble=material('Travertine tray',{color:'#d9cdb9',roughness:.48,bumpMap:texture('plaster'),bumpScale:.016});
    add(new T.CylinderGeometry(15,15,1.4,36),marble,[18,41,245]);
    const glass=material('Smoked glass',{color:'#68513d',metalness:.1,roughness:.16,transparent:true,opacity:.72});
    add(new T.CylinderGeometry(4.2,4.8,8,24,1,true),glass,[18,45.5,245]);
    // Original quiet landscape study on the existing framed-art position.
    if(!sharedTextures.has('art')){
      const c=document.createElement('canvas');c.width=512;c.height=384;const ctx=c.getContext('2d');ctx.fillStyle='#d9d2c2';ctx.fillRect(0,0,512,384);
      for(const [color,base,amplitude] of [['#afb29c',198,26],['#6b786b',255,23],['#b8a991',298,16]]){
        ctx.beginPath();ctx.moveTo(0,384);for(let x=0;x<=512;x+=4)ctx.lineTo(x,base+Math.sin(x*.013+base)*amplitude+Math.sin(x*.039)*4);ctx.lineTo(512,384);ctx.closePath();ctx.fillStyle=color;ctx.fill();
      }
      for(let i=0;i<5000;i++){const x=(i*137)%512,y=(i*71)%384;ctx.fillStyle=i%2?'rgba(255,255,255,.025)':'rgba(30,25,20,.025)';ctx.fillRect(x,y,4,1);}
      const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;sharedTextures.set('art',tex);
    }
    const painting=material('Original landscape study',{color:'#ffffff',map:sharedTextures.get('art'),roughness:1});
    add(new T.PlaneGeometry(84,66),painting,[-324.9,175,145],[0,Math.PI/2,0]);
    for(const [mat,parts] of buckets){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());const m=new T.Mesh(g,mat);m.castShadow=m.receiveShadow=true;group.add(m);}
    fire=createFire(T);fire.root.position.x=fx;group.add(fire.root);
    radiator=new T.Group();radiator.name='FIXED140 radiator only';
    const body=new T.Mesh(rounded(112,53,6,.8),white);body.position.set(0,51.5,-13);radiator.add(body);
    const fins=new T.InstancedMesh(rounded(2.7,49,2,.65),white,30),dummy=new T.Object3D();
    for(let i=0;i<30;i++){dummy.position.set(-52+i*104/29,51.5,-9);dummy.updateMatrix();fins.setMatrixAt(i,dummy.matrix);}radiator.add(fins);
    for(const sign of [-1,1]){const pipe=new T.Mesh(new T.CylinderGeometry(.8,.8,25,10),white);pipe.position.set(sign*57,12.5,-13);radiator.add(pipe);const valve=new T.Mesh(new T.CylinderGeometry(2.3,2.3,5,16),white);valve.position.set(sign*58,26,-12);valve.rotation.z=Math.PI/2;radiator.add(valve);}
    radiator.traverse(m=>{if(m.isMesh){m.castShadow=false;m.receiveShadow=true;}});group.add(radiator);
    windowDetails=new T.Group();windowDetails.name='FIXED140 reveal detailing';
    for(const [w,h,d,x,y,z] of [[3,115,3,-71,156,-23],[3,115,3,71,156,-23],[145,3,3,0,213,-23],[147,3,11,0,98,-19]]){
      const m=new T.Mesh(rounded(w,h,d,.6),white);m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=true;windowDetails.add(m);
    }group.add(windowDetails);
    for(const [x,y,z] of [[-281,100,63],[269,145,70]]){const l=new T.PointLight('#ffcf91',0,300,2);l.position.set(x,y,z);group.add(l);lamps.push(l);}
    group.userData.owned=owned;
  }
  function restoreLights(){for(const name of ['hemi','key','broad','fill']){lights[name].intensity=baseline[name];lights[name].color.copy(colours[name]);}renderer.toneMappingExposure=baseline.exposure;scene.environment=originalEnvironment;scene.environmentIntensity=originalEnvironmentIntensity;}
  function dispose(){if(!group)return;scene.remove(group);const geometries=new Set(),materials=new Set(group.userData.owned);fire?.root.traverse(m=>{if(m.isMesh)materials.add(m.material);});group.traverse(m=>{if(m.isMesh)geometries.add(m.geometry);});for(const g of geometries)g.dispose();for(const m of materials)m?.dispose();group=null;lamps=[];}
  function attach(next,id){dispose();restoreLights();room=next;roomId=id;materialMap=new Map();if(id==='living'){scene.environment=reflection.texture;scene.environmentIntensity=.25;upgradeMaterials();installChair();buildEnvironment();transitionUntil=performance.now()+700;}syncUI();wake();}
  function update(now,fixed140){
    if(roomId!=='living'||!group)return;
    radiator.visible=windowDetails.visible=fixed140;
    const s=state.get('living'),target=MODES[s.mode],dt=Math.min(.1,(now-last)/1000||.016);last=now;
    const alpha=reduced.matches?1:1-Math.exp(-dt*8);
    for(const key of ['hemi','key','broad','fill'])lights[key].intensity=T.MathUtils.lerp(lights[key].intensity,target[key],alpha);
    renderer.toneMappingExposure=T.MathUtils.lerp(renderer.toneMappingExposure,target.exposure,alpha);
    scene.environmentIntensity=T.MathUtils.lerp(scene.environmentIntensity,s.mode==='evening'?.055:.25,alpha);
    lights.broad.color.lerp(new T.Color(s.mode==='inspection'?'#ffffff':s.mode==='evening'?'#ffd5a0':'#fff8ed'),alpha);
    lights.fill.color.lerp(new T.Color(s.mode==='inspection'?'#ffffff':'#dce7fa'),alpha);
    const inspect=s.mode==='inspection',lampOn=s.lamps&&!inspect;
    for(const l of lamps)l.intensity=T.MathUtils.lerp(l.intensity,lampOn?24000:0,alpha);
    if(shade)shade.emissiveIntensity=T.MathUtils.lerp(shade.emissiveIntensity,lampOn?.8:.015,alpha);
    fire.update((now-started)/1000,s.fire&&!inspect,reduced.matches);
    proof.prototype.radiatorVisible=fixed140;proof.prototype.inspectionSuppressesWarmSources=inspect;proof.prototype.frames++;
  }
  function wake(){if(!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
  function tick(now){raf=0;if(document.hidden||roomId!=='living')return;const s=state.get('living');const active=(s.fire&&s.mode!=='inspection'&&!reduced.matches)||now<transitionUntil;
    if(active&&proof.ready&&!proof.motion?.running){const t=performance.now();requestRender();const list=proof.prototype.ambienceFrames;list.push(performance.now()-t);if(list.length>120)list.shift();}
    if(active)wake();
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else wake();});reduced.addEventListener('change',()=>{requestRender();wake();});
  return {attach,update};
}
