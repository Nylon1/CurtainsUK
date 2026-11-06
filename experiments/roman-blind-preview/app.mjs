import * as T from '/vendor/three.module.js';
import {SIZE,FOLDS,foldPoint,visibleDrop,sourceUv,phaseForLift,coverage,foldPlan,clothRelief,gatheringProfile,gatheringDepth,layerShade,CHAIN,chainPoint} from './geometry.mjs';
import {makeMotion,motionPosition} from './motion.mjs';
import {createLounge} from './lounge.mjs';
const $=id=>document.getElementById(id);
const host=$('scene'), loading=$('loading');
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:false});}catch{loading.textContent='This preview needs a browser with WebGL enabled.';throw Error('WEBGL_UNAVAILABLE');}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;host.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#e5e1d6');
const camera=new T.PerspectiveCamera(36,1,.1,40);
const ambient=new T.HemisphereLight('#fff6e7','#7b8374',2);scene.add(ambient);
const sun=new T.DirectionalLight('#fff1d4',3.1);sun.position.set(-2.5,4.5,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.1,far:15});sun.shadow.bias=-.0003;sun.shadow.normalBias=.012;sun.shadow.radius=4;scene.add(sun);
const fill=new T.DirectionalLight('#dce8ef',.6);fill.position.set(3,2,2);scene.add(fill);
const reverseFill=new T.DirectionalLight('#fff6e9',2.3);reverseFill.position.set(-2,3,-4);reverseFill.visible=false;scene.add(reverseFill);
function box(w,h,d,x,y,z,color){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.85}));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;}
// Window opening is exactly 1.4 x 1.4 m. Surrounding room is illustrative.
const top=2.38,bottom=top-SIZE;
const windowWalls=[box(2.2,3.3,.18,-1.8,1.65,-.22,'#e6e0d2'),box(2.2,3.3,.18,1.8,1.65,-.22,'#e6e0d2'),
 box(1.4,.92,.18,0,2.84,-.22,'#e6e0d2'),box(1.4,.98,.18,0,.49,-.22,'#e6e0d2')];
box(8,.06,8,0,-.03,1.8,'#bbb09a');
box(5.8,.14,.07,0,.07,-.075,'#f3eee3');
// Recess, casement frame and projecting sill.
for(const x of [-.735,.735]){box(.07,1.55,.18,x,1.68,-.08,'#f9f4e8');box(.025,1.38,.06,x<0?-.68:.68,1.68,-.19,'#ece8dd');}
box(1.54,.07,.18,0,2.415,-.08,'#f9f4e8');box(1.64,.065,.33,0,.94,.015,'#f8f2e5');box(1.53,.06,.13,0,.89,-.02,'#e1d7c4');
const gardenTexture=await new T.TextureLoader().loadAsync('/garden.jpg');gardenTexture.colorSpace=T.SRGBColorSpace;
gardenTexture.repeat.set(1,.55);gardenTexture.offset.set(0,.45);
const garden=new T.Mesh(new T.PlaneGeometry(1.5,1.5),new T.MeshBasicMaterial({map:gardenTexture,color:'#d0d6ba'}));garden.position.set(0,1.68,-.34);scene.add(garden);
const lounge=await createLounge();lounge.root.visible=false;scene.add(lounge.root);
box(.032,1.4,.045,0,1.68,-.22,'#f3f0e7');box(1.4,.032,.045,0,1.55,-.22,'#f3f0e7');
box(1.42,.045,.06,0,top+.012,.06,'#ded6c5');
// Right-side operating chain, with a fixed pulley and lower tensioner.
const chainX=.795,chainTop=top-.035,chainZ=.15;
box(.052,.054,.04,chainX,chainTop+.008,.115,'#b8b2a3');
box(.028,.04,.025,chainX,chainTop-CHAIN.straight-CHAIN.radius,.125,'#c2bcad');
class ChainLoop extends T.Curve{getPoint(t,target=new T.Vector3()){const p=chainPoint(t*CHAIN.length);return target.set(chainX+p.x,chainTop+p.y,chainZ);}}
const chainCord=new T.Mesh(new T.TubeGeometry(new ChainLoop(),180,.0011,5,true),new T.MeshStandardMaterial({color:'#827a6d',roughness:.55}));scene.add(chainCord);
const beadCount=Math.ceil(CHAIN.length/.012),chainBeads=new T.InstancedMesh(new T.SphereGeometry(.0035,8,6),new T.MeshStandardMaterial({color:'#c3b9a5',metalness:.5,roughness:.35}),beadCount);
chainBeads.instanceMatrix.setUsage(T.DynamicDrawUsage);chainBeads.castShadow=true;chainBeads.frustumCulled=false;scene.add(chainBeads);
const beadMatrix=new T.Matrix4();let lastChainLift=-1;
function updateChain(lift){
 if(lift===lastChainLift)return;lastChainLift=lift;
 // The right strand travels down when raising; lowering reverses both strands.
 for(let i=0;i<beadCount;i++){
  const p=chainPoint(i*CHAIN.length/beadCount+lift*1.5);
  beadMatrix.makeTranslation(chainX+p.x,chainTop+p.y,chainZ);chainBeads.setMatrixAt(i,beadMatrix);
 }
 chainBeads.instanceMatrix.needsUpdate=true;
 host.dataset.chainTravel=(lift*1.5).toFixed(4);
}
// Quiet interior details give scale without adding room controls to this study.
box(.82,.045,.42,-1.35,.65,.25,'#b39c7b');for(const x of [-1.69,-1.01])for(const z of [.11,.4])box(.035,.64,.035,x,.32,z,'#b8a283');
const pot=new T.Mesh(new T.CylinderGeometry(.1,.075,.24,40),new T.MeshStandardMaterial({color:'#cbbda3',roughness:1}));pot.position.set(-1.34,.79,.2);pot.castShadow=true;scene.add(pot);
for(let i=0;i<12;i++){const stem=new T.Mesh(new T.CylinderGeometry(.002,.003,.35+(i%3)*.08,5),new T.MeshStandardMaterial({color:'#747956'}));stem.position.set(-1.34+Math.sin(i*2)*.05,1.02,.2+Math.cos(i*2)*.04);stem.rotation.z=Math.sin(i)*.45;scene.add(stem);const leaf=new T.Mesh(new T.SphereGeometry(.055,10,6),new T.MeshStandardMaterial({color:i%2?'#788368':'#8c9574',roughness:1}));leaf.scale.set(.45,1,.2);leaf.position.copy(stem.position);leaf.position.y+=.15;leaf.rotation.z=Math.sin(i)*.8;scene.add(leaf);}
// Dense cloth mesh retains a fixed material coordinate as the folds move.
const columns=64,rows=700,positions=new Float32Array((columns+1)*(rows+1)*3),uvs=new Float32Array((columns+1)*(rows+1)*2),colours=new Float32Array((columns+1)*(rows+1)*3),indices=[];
for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){const a=r*(columns+1)+c,b=a+1,d=a+columns+1;indices.push(a,d,b,b,d,d+1);}
const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('uv',new T.BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.setAttribute('color',new T.BufferAttribute(colours,3));
const material=new T.MeshStandardMaterial({color:'#ffffff',roughness:1,side:T.FrontSide,shadowSide:T.DoubleSide,vertexColors:true});
const blind=new T.Mesh(geometry,material);blind.castShadow=true;blind.receiveShadow=true;scene.add(blind);
// Both faces share the same moving surface. Back-face culling reveals cream
// lining only on the reverse, without printing the supplier pattern through it.
const liningMaterial=new T.MeshStandardMaterial({color:'#eee3cb',roughness:1,side:T.BackSide,vertexColors:true});
const lining=new T.Mesh(geometry,liningMaterial);lining.receiveShadow=true;scene.add(lining);
let motion=null,style='stacked',raised=0,target=0,currentWidth=1.42,view='front',selected=-1,request=0,currentTexture=null;
function updateCloth(){const phase=phaseForLift(raised,style);for(let r=0;r<=rows;r++){const s=r/rows*SIZE,p=foldPoint(s,raised,phase,style),relief=clothRelief(s,style),gather=gatheringProfile(s,phase,style),shade=relief.shade*layerShade(p,phase,style);for(let c=0;c<=columns;c++){const x=c/columns*SIZE,i=r*(columns+1)+c;positions[i*3]=x-SIZE/2;positions[i*3+1]=top-p.down;positions[i*3+2]=.09+p.depth+relief.depth*(.85+.15*Math.sin(c/columns*Math.PI))+gatheringDepth(c/columns,gather)+.00035*Math.sin(c/columns*Math.PI*4)*Math.sin(r/rows*Math.PI);colours[i*3]=colours[i*3+1]=colours[i*3+2]=shade;const uv=sourceUv(x,s,currentWidth);uvs[i*2]=uv[0];uvs[i*2+1]=uv[1];}}geometry.attributes.position.needsUpdate=true;geometry.attributes.uv.needsUpdate=true;geometry.attributes.color.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();}
const fabrics=await fetch('fabrics.json').then(r=>r.json());
async function selectFabric(index){const token=++request;loading.hidden=false;loading.textContent='Loading fabric…';try{const f=fabrics[index],texture=await new T.TextureLoader().loadAsync(f.image);if(token!==request){texture.dispose();return;}texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());material.map=texture;material.needsUpdate=true;currentTexture?.dispose();currentTexture=texture;currentWidth=f.width;selected=index;updateCloth();$('fabric-name').textContent=f.name;$('fabric-meta').textContent=f.colour;$('fabric-number').textContent=`${index+1} of ${fabrics.length}`;document.querySelectorAll('#swatches [data-fabric]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));loading.hidden=true;host.dataset.fabric=f.id;host.dataset.sourceWidth=String(f.width*100);}catch{loading.textContent='Fabric could not load. Choose a fabric to try again.';}}
fabrics.forEach((f,i)=>{const button=document.createElement('button');button.dataset.fabric=f.id;button.setAttribute('aria-label',`${f.name}, ${f.colour}`);button.setAttribute('aria-pressed','false');const img=document.createElement('img');img.src=f.image;img.alt='';button.append(img);button.addEventListener('click',()=>selectFabric(i));$('swatches').append(button);});
function syncPosition(){
 const percent=Math.round(raised*100),moving=motion!==null;
 const label=moving?(target>raised?'Raising':'Lowering')+' · '+percent+'%':percent===0?'Fully lowered':percent===100?'Fully raised':percent+'% raised';
 if($('position').textContent!==label)$('position').textContent=label;
 $('lift').setAttribute('aria-valuetext',moving?'Target '+Math.round(target*100)+'%; '+label:label);
 host.dataset.renderedRaised=raised.toFixed(4);host.dataset.motion=moving?'moving':'still';
 const current=coverage(raised,style),text='At this position: '+current.coveredCm.toFixed(1)+' cm covered · '+current.clearCm.toFixed(1)+' cm clear';
 if($('current-coverage').textContent!==text)$('current-coverage').textContent=text;
}
function setLift(value,direct=false){
 target=Math.max(0,Math.min(1,value));
 if(direct||matchMedia('(prefers-reduced-motion: reduce)').matches){motion=null;raised=target;updateCloth();}
 else motion=Math.abs(target-raised)>.000001?makeMotion(raised,target,performance.now()):null;
 $('lift').value=String(Math.round(target*100));
 document.querySelectorAll('[data-lift]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.lift)===Math.round(target*100))));
 host.dataset.raised=String(Math.round(target*100));updateCoverage();syncPosition();
}
function updateCoverage(){const plan=foldPlan(style);$('rod-plan').textContent='Rod pockets from the top: '+plan.rodPositions.map(p=>(p*100).toFixed(1)).join(', ')+' cm.';$('fold-spec').textContent='7 cm headrail · '+plan.rodCount+' rods · '+(plan.depth*100).toFixed(1)+(style==='cascade'?' cm top fold · 2 cm cascade step':' cm fold depth');host.setAttribute('aria-label','140 by 140 centimetre window with a '+style+' Roman blind');const full=coverage(1,style),current=coverage(raised,style);$('covered').innerHTML=full.coveredCm.toFixed(1)+' <small>cm</small>';$('clear').innerHTML=full.clearCm.toFixed(1)+' <small>cm</small>';$('coverage-label').textContent=Math.round(full.percent)+'% of the window height covered';$('cover-bar').style.width=full.percent+'%';$('current-coverage').textContent='At this position: '+current.coveredCm.toFixed(1)+' cm covered · '+current.clearCm.toFixed(1)+' cm clear';}
document.querySelectorAll('button[data-style]').forEach(b=>b.addEventListener('click',()=>{style=b.dataset.style;document.querySelectorAll('button[data-style]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('style-caption').textContent=(style==='stacked'?'Stacked':'Cascade')+' Roman';host.dataset.style=style;updateCloth();updateCoverage();}));
$('lift').addEventListener('input',e=>setLift(Number(e.target.value)/100));document.querySelectorAll('[data-lift]').forEach(b=>b.addEventListener('click',()=>setLift(Number(b.dataset.lift)/100)));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));resize();}));
let dragging=null;
$('drag').addEventListener('pointerdown',e=>{setLift(raised,true);const rect=host.getBoundingClientRect();const a=new T.Vector3(0,top-visibleDrop(0,style),.09).project(camera),b=new T.Vector3(0,top-visibleDrop(1,style),.09).project(camera);dragging={startY:e.clientY,start:raised,range:Math.max(60,Math.abs(a.y-b.y)*rect.height/2)};$('drag').setPointerCapture(e.pointerId);e.preventDefault();});
$('drag').addEventListener('pointermove',e=>{if(dragging)setLift(dragging.start+(dragging.startY-e.clientY)/dragging.range,true);});
function endDrag(){dragging=null;}$('drag').addEventListener('pointerup',endDrag);$('drag').addEventListener('pointercancel',endDrag);$('drag').addEventListener('lostpointercapture',endDrag);
$('drag').addEventListener('keydown',e=>{const moves={ArrowUp:.05,ArrowDown:-.05,PageUp:.1,PageDown:-.1};if(e.key in moves){e.preventDefault();setLift(target+moves[e.key]);}if(e.key==='Home'){e.preventDefault();setLift(0);}if(e.key==='End'){e.preventDefault();setLift(1);}});
function resize(){host.parentElement.dataset.view=view;reverseFill.visible=view==='reverse';lounge.root.visible=view==='reverse'||view==='room';garden.visible=view!=='reverse';windowWalls.forEach(w=>w.material.color.set(view==='reverse'?'#97958c':'#e6e0d2'));scene.background.set(view==='reverse'?'#a19e95':'#e5e1d6');const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;const narrow=width<550;camera.fov=view==='room'?(narrow?72:60):36;if(view==='front'){camera.position.set(0,1.77,narrow?4.1:4.65);camera.lookAt(0,narrow?1.8:1.61,0);}else if(view==='reverse'){camera.position.set(0,1.77,narrow?-4.1:-3.1);camera.lookAt(0,1.73,.09);}else if(view==='room'){camera.position.set(0,1.65,4.9);camera.lookAt(0,.95,1.4);}else{camera.position.set(narrow?1.5:1.2,1.55,narrow?3.8:2.8);camera.lookAt(0,1.73,.04);}camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(host);resize();updateCloth();setLift(0);await selectFabric(0);
function render(now){
 if(motion){raised=motionPosition(motion,now);if(now>=motion.started+motion.duration){raised=motion.to;motion=null;}updateCloth();syncPosition();}
 updateChain(raised);
 const point=new T.Vector3(0,top-visibleDrop(raised,style),.11).project(camera);const rect=host.getBoundingClientRect();
 $('drag').style.left=((point.x+1)*rect.width/2)+'px';$('drag').style.top=((1-point.y)*rect.height/2+10)+'px';
 renderer.render(scene,camera);requestAnimationFrame(render);
}requestAnimationFrame(render);
