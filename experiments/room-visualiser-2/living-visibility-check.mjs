import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='C:/Users/hamza/curtainsuk-visualiser-2-living-inspiration-evidence-20261009',results=[];
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
try{for(const mobile of [false,true])for(const profile of ['STANDARD','FIXED140']){
const p=await b.newPage({viewport:{width:mobile?390:1440,height:mobile?844:1000},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
await p.goto('http://127.0.0.1:4382/?room=living&fabric='+(profile==='STANDARD'?'sdg-f1541-01':'pt-1204-212'));await p.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});
await p.evaluate(()=>{roomAmbience.set('mode','evening');roomAmbience.set('lamps',true);});
const physical=await p.evaluate(async()=>{const T=await import('three'),root=roomRefinement.scene.getObjectByName('Living — sculpted ivory'),envelope=new T.Box3(new T.Vector3(-115,0,-18),new T.Vector3(115,250,18)),triangle=new T.Triangle();root.updateWorldMatrix(true,true);let tested=0,intersections=0;
root.traverse(mesh=>{if(!mesh.isMesh)return;const g=mesh.geometry,pos=g.attributes.position,index=g.index,count=index?index.count:pos.count;for(let i=0;i<count;i+=3){for(const[vertex,n]of [[triangle.a,0],[triangle.b,1],[triangle.c,2]])vertex.fromBufferAttribute(pos,index?index.getX(i+n):i+n).applyMatrix4(mesh.matrixWorld);tested++;if(envelope.intersectsTriangle(triangle))intersections++;}});return{triangles:tested,curtainEnvelopeIntersections:intersections};});assert.equal(physical.curtainEnvelopeIntersections,0);
const checks=[];
for(const view of ['room','curtain',...(profile==='FIXED140'?['full']:[])]){
await p.locator('[data-view="'+view+'"]').click();
for(const progress of [0,.25,.5,.75,1]){
await p.evaluate(progress=>roomReview.setProgress(progress),progress);
const sample=await p.evaluate(async({view,progress})=>{const T=await import('three'),{camera,scene}=roomRefinement,root=scene.getObjectByName('Living — sculpted ivory'),curtains=scene.getObjectByName('APPROVED_WAVE_CURTAIN')||scene.getObjectByName('FIXED140_SINGLE_WIDTH_V1'),ray=new T.Raycaster(),point=new T.Vector3(),direction=new T.Vector3(),hits=[];let rays=0;root.updateWorldMatrix(true,true);curtains.updateWorldMatrix(true,true);
function check(target,kind){direction.copy(target).sub(camera.position);ray.set(camera.position,direction.clone().normalize());ray.far=direction.length()-.25;const hit=ray.intersectObjects(root.children,true).find(h=>h.object.visible&&!(h.object.material.transparent&&h.object.material.opacity===0));rays++;if(hit&&hits.length<10)hits.push({kind,target:target.toArray(),material:hit.object.material.name});}
// Test the whole central opening once per camera, independently of curtain pose.
if(progress===0)for(let x=-115;x<=115;x+=10)for(let y=0;y<=250;y+=10)check(new T.Vector3(x,y,18),'opening-envelope');
if(view==='room'&&progress===0)for(let x=-275;x<=-169;x+=5)for(let y=85;y<=147;y+=5)check(new T.Vector3(x,y,0),'firebox');
// Actual deformed cloth vertices cover both moving curtain panels at each pose.
curtains.traverse(mesh=>{if(!mesh.isMesh||mesh.geometry.attributes.position.count<1000)return;const pos=mesh.geometry.attributes.position,step=Math.max(1,Math.floor(pos.count/325));for(let i=0;i<pos.count;i+=step){point.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);check(point,'curtain');}});
return{view,progress,rays,hits};},{view,progress});assert.deepEqual(sample.hits,[],profile+' '+view+' pose '+progress);checks.push(sample);
}}
results.push({mobile,profile,physical,checks});await writeFile(out+'/visibility-verification.json',JSON.stringify(results,null,2));console.log(JSON.stringify({mobile,profile,rays:checks.reduce((sum,r)=>sum+r.rays,0),obstructions:0,physicalIntersections:0}));await p.close();
}}finally{await b.close();}
