import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='C:/Users/hamza/curtainsuk-visualiser-2-room-views-evidence-20261009',onlyProfile=process.argv[2];
if(onlyProfile&&!['STANDARD','FIXED140'].includes(onlyProfile))throw Error('Invalid requested profile');
const results=onlyProfile?JSON.parse(await readFile(out+'/verification.json','utf8')).results.filter(r=>r.profile!==onlyProfile):[];
const prior=JSON.parse(await readFile('C:/Users/hamza/curtainsuk-visualiser-2-four-rooms-evidence-20261009/verification.json','utf8'));
const source=await readFile('C:/Users/hamza/.codex/codex-remote-attachments/01a11d91-67d0-7e91-a74b-5e3e5eef9e4f/740D972E-7A75-4F02-BD33-ED15C0B8D08D/1-Photo-1.jpg'),asset=await readFile('experiments/room-visualiser-2/assets/window/user-garden.jpg');
assert.ok(source.equals(asset),'Garden photograph bytes changed');
const sourceProof={bytes:asset.length,sha256:createHash('sha256').update(asset).digest('hex'),userPhotoUnchanged:true};
const exact=p=>p.evaluate(async()=>{const group=roomRefinement.scene.getObjectByName('APPROVED_WAVE_CURTAIN')||roomRefinement.scene.getObjectByName('FIXED140_SINGLE_WIDTH_V1'),mesh=group.children.find(o=>o.isMesh&&o.geometry.attributes.position.count>1000),g=mesh.geometry;
 const hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength)))).map(v=>v.toString(16).padStart(2,'0')).join('');
 return{position:await hash(g.attributes.position.array),uv:await hash(g.attributes.uv.array),index:await hash(g.index.array),camera:{position:roomRefinement.camera.position.toArray(),quaternion:roomRefinement.camera.quaternion.toArray(),fov:roomRefinement.camera.fov,aspect:roomRefinement.camera.aspect},transform:{position:group.position.toArray(),scale:group.scale.toArray()},selected:roomProof.selectedFabric};
});
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
try{for(const mobile of [false,true])for(const profile of onlyProfile?[onlyProfile]:['STANDARD','FIXED140']){
 const p=await b.newPage({viewport:{width:mobile?390:1440,height:mobile?844:1000},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'}),errors=[],httpErrors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)httpErrors.push({status:r.status(),url:r.url()});});
 await p.goto('http://127.0.0.1:4382/?room=living&fabric='+(profile==='STANDARD'?'sdg-f1541-01':'pt-1204-212')+(mobile?'&compareDpr=1.25':''));await p.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});
 const retained={};
 for(const room of ['living','bedroom','lounge','office']){
  if(room!=='living')await p.evaluate(room=>roomReview.setRoom(room),room);
  const expectedPhoto={living:'user-garden.jpg',office:'office-garden.jpg',bedroom:'bedroom-view.jpg',lounge:'lounge-garden.jpg'}[room];
  assert.ok(await p.evaluate(expectedPhoto=>roomRefinement.scene.getObjectByName('PVC window and garden').children.find(o=>o.visible).children.find(o=>o.material?.name==='User garden photograph').material.map.image.src.endsWith(expectedPhoto),expectedPhoto),'Wrong room photograph');
  const expected=prior.find(v=>v.mode==='baseline'&&v.mobile===mobile&&v.profile===profile&&v.room===room),prefix=out+'/'+room+'-'+(mobile?'mobile':'desktop')+'-'+profile+'-';
  await p.evaluate(()=>{roomReview.setProgress(0);roomAmbience.set('mode','daylight');roomAmbience.set('lamps',false);if(roomProof.room==='living')roomAmbience.set('fire',false);});
  const closed=await exact(p);assert.deepEqual(closed,expected.closed);await p.locator('#room-canvas').screenshot({path:prefix+'daylight-closed.png'});
  await p.evaluate(()=>roomReview.startMotion(1));await p.waitForFunction(()=>roomProof.motion.done);const open=await exact(p);assert.deepEqual(open,expected.open);
  for(const mode of ['daylight','evening','inspection',...(room==='living'?['fireplace']:[])]){
   await p.evaluate(mode=>{roomAmbience.set('mode',mode==='fireplace'?'evening':mode);roomAmbience.set('lamps',mode!=='daylight');if(roomProof.room==='living')roomAmbience.set('fire',mode==='fireplace');},mode);
   await p.locator('#room-canvas').screenshot({path:prefix+mode+'.png'});
   if(mode==='inspection'){const values=await p.evaluate(()=>{const points=[];roomRefinement.scene.traverse(o=>{if(o.isPointLight||o.isLightProbe)points.push(o.intensity);});return points;});assert.ok(values.every(v=>v===0));assert.equal(await p.locator('[data-toggle="lamps"]').isDisabled(),true);}
  }
  const geometry=await p.evaluate(async()=>{
   const T=await import('three'),root=roomRefinement.scene.getObjectByName('PVC window and garden'),envelope=new T.Box3(new T.Vector3(-115,0,-18),new T.Vector3(115,250,18)),triangle=new T.Triangle(),bounds=new T.Box3().setFromObject(root);root.updateWorldMatrix(true,true);let triangles=0,intersections=0;
   root.traverse(o=>{if(!o.isMesh)return;const pos=o.geometry.attributes.position,index=o.geometry.index;for(let i=0;i<(index?index.count:pos.count);i+=3){for(const [v,n]of [[triangle.a,0],[triangle.b,1],[triangle.c,2]])v.fromBufferAttribute(pos,index?index.getX(i+n):i+n).applyMatrix4(o.matrixWorld);triangles++;if(envelope.intersectsTriangle(triangle))intersections++;}});
   const visible=root.children.filter(o=>o.visible),photo=visible[0].children.find(o=>o.material?.name==='User garden photograph'),photoBounds=photo.geometry.boundingBox|| (photo.geometry.computeBoundingBox(),photo.geometry.boundingBox);
   const radiator=roomRefinement.scene.getObjectByName('FIXED140 radiator only');
   return{triangles,intersections,maxZ:bounds.max.z,visibleProfiles:visible.map(o=>o.name),angle:visible[0].userData.outwardOpeningDegrees,photoAspect:photoBounds.max.x===photoBounds.min.x?null:(photoBounds.max.x-photoBounds.min.x)/(photoBounds.max.y-photoBounds.min.y),imageAspect:photo.material.map.image.width/photo.material.map.image.height,radiatorVisible:radiator.visible,radiatorClearanceCm:96-78};
  });
  assert.equal(geometry.intersections,0);assert.ok(geometry.maxZ<-19.9);assert.deepEqual(geometry.visibleProfiles,[profile+' detailed window']);assert.equal(geometry.angle,38);assert.ok(Math.abs(geometry.photoAspect-geometry.imageAspect)<1e-5);assert.equal(geometry.radiatorVisible,profile==='FIXED140');
  const sightlines=[];
  for(const view of ['room','curtain',...(profile==='FIXED140'?['full']:[])]){
   await p.locator('[data-view="'+view+'"]').click();
   for(const progress of [0,.25,.5,.75,1]){
    await p.evaluate(progress=>roomReview.setProgress(progress),progress);
    const check=await p.evaluate(async({room,view})=>{const T=await import('three'),{scene,camera}=roomRefinement,root=scene.getObjectByName('PVC window and garden'),curtains=scene.getObjectByName('APPROVED_WAVE_CURTAIN')||scene.getObjectByName('FIXED140_SINGLE_WIDTH_V1'),ray=new T.Raycaster(),v=new T.Vector3(),dir=new T.Vector3();let rays=0,hits=0;
     function test(target){dir.copy(target).sub(camera.position);ray.set(camera.position,dir.clone().normalize());ray.far=dir.length()-.25;if(ray.intersectObject(root,true).some(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;}))hits++;rays++;}
     curtains.updateWorldMatrix(true,true);curtains.traverse(o=>{if(!o.isMesh||o.geometry.attributes.position.count<1000)return;const pos=o.geometry.attributes.position,step=Math.max(1,Math.floor(pos.count/200));for(let i=0;i<pos.count;i+=step){v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);test(v);}});
     if(room==='living'&&view==='room')for(let x=-270;x<=-170;x+=10)for(let y=90;y<=140;y+=10)test(new T.Vector3(x,y,0));
     return{rays,hits};
    },{room,view});assert.equal(check.hits,0);sightlines.push({view,progress,...check});
   }
  }
  await p.locator('[data-view="room"]').click();await p.evaluate(()=>roomReview.setProgress(0));assert.deepEqual(await exact(p),closed);
  const colours=await p.evaluate(()=>roomProof.colours);for(const [zone,index]of Object.entries(colours)){await p.locator('[data-zone="'+zone+'"][data-colour="3"]').click();assert.equal(await p.evaluate(zone=>roomProof.colours[zone],zone),3);await p.locator('[data-zone="'+zone+'"][data-colour="'+index+'"]').click();}
  retained[room]=await p.evaluate(()=>roomAmbience.get());assert.equal(await p.locator('[data-toggle="fire"]').isVisible(),room==='living');
  const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false);assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
  results.push({mobile,profile,room,curtainAndCameraUnchanged:true,neutralInspection:true,palettes:true,overflow,geometry,sightlines,errors:[...errors],httpErrors:[...httpErrors]});await writeFile(out+'/verification.json',JSON.stringify({sourceProof,results},null,2));console.log(JSON.stringify({mobile,profile,room,passed:true,rays:sightlines.reduce((n,v)=>n+v.rays,0)}));
 }
 for(const room of ['living','bedroom','lounge','office']){await p.evaluate(room=>roomReview.setRoom(room),room);assert.deepEqual(await p.evaluate(()=>roomAmbience.get()),retained[room]);}
 for(const fabric of ['pt-1204-212','sdg-f1541-01']){await p.evaluate(async fabric=>{const {resolveFabric}=await import('/runtime/rooms/catalogue-client.mjs');await visualiserCustomer.selectRecord(await resolveFabric(fabric));},fabric);assert.equal(await p.evaluate(()=>roomRefinement.scene.getObjectByName('PVC window and garden').children.find(o=>o.visible).name),fabric.startsWith('pt-')?'FIXED140 detailed window':'STANDARD detailed window');}
 await p.locator('#change-fabric').click();await p.waitForFunction(()=>document.querySelector('#fabric-dialog').open);await p.keyboard.press('Escape');assert.equal(await p.locator('#fabric-dialog').isVisible(),false);
 if(!mobile){await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>roomReview.startMotion(1));await p.waitForFunction(()=>roomProof.motion.done);assert.ok(await p.evaluate(()=>roomProof.motionRuns.at(-1).frames>3));}
 await p.evaluate(async()=>{const a=roomReview.setRoom('bedroom');await new Promise(r=>setTimeout(r,10));const b=roomReview.setRoom('lounge');await new Promise(r=>setTimeout(r,10));const c=roomReview.setRoom('living');await Promise.all([a,b,c]);});assert.equal(await p.evaluate(()=>roomProof.room),'living');assert.equal(await p.evaluate(()=>roomRefinement.scene.getObjectByName('PVC window and garden').children.filter(o=>o.visible).length),1);
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);await writeFile(out+'/ui-'+(mobile?'mobile':'desktop')+'-'+profile+'.json',JSON.stringify({retained,routing:true,dialog:true,animatedMotion:!mobile,staggeredRoomSwitch:true,errors,httpErrors},null,2));await p.close();
}}finally{await b.close();}
