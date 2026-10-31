import * as T from 'three';
import {createFixed140Curtain} from './curtain.mjs';
import {applyFixed140View} from './views.mjs';

const stage=document.querySelector('#stage'),canvas=document.querySelector('#fixed140-canvas');
const status=document.querySelector('#status'),errorBox=document.querySelector('#error');
const start=performance.now();
try{
  const assignment=JSON.parse(document.querySelector('#fixed140-config').textContent);
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
  const scene=new T.Scene();scene.background=new T.Color('#e8e4dc');
  const camera=new T.PerspectiveCamera(38,1,1,1200);
  const mat=(colour,roughness=1)=>new T.MeshStandardMaterial({color:colour,roughness});
  function box(w,h,d,x,y,z,m){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);scene.add(o);return o;}
  const wall=mat('#e8e5df'),wood=mat('#a48864',.75),white=mat('#f7f7f2',.6),glass=mat('#b6c7c9',.35);
  box(420,240,5,0,95,-25,wall);
  box(155,125,1,0,60,-21,glass);
  for(const x of [-78,0,78])box(2.5,129,6,x,60,-17,white);
  for(const y of [-2,61,123])box(157,2.8,6,0,y,-17,white);
  box(460,4,280,0,-3,80,wood);box(430,7,4,0,3,-20,white);
  for(let i=-4;i<=4;i++)box(1,0.2,280,i*52,-.7,80,mat(i%2?'#8c714e':'#a38763'));
  box(156,3.6,8,0,125,-2,white);
  for(const x of [-77,77])box(4,5,9,x,125,-2,white);
  box(76,17,29,160,8,125,mat('#b5b1a4',.94));
  box(78,26,10,160,28,143,mat('#b5b1a4',.94));
  box(85,4,37,-150,15,145,mat('#775d46',.66));
  box(3,44,3,-166,23,120,mat('#51483d',.7));
  box(29,3,29,-166,46,120,mat('#f2e8d3',.85));
  scene.add(new T.HemisphereLight('#fffdfa','#9f9d92',1.75));
  const sun=new T.DirectionalLight('#fff8ed',2.2);sun.position.set(-115,215,150);scene.add(sun);
  const fill=new T.DirectionalLight('#dbe4ee',.7);fill.position.set(110,100,90);scene.add(fill);
  const curtain=await createFixed140Curtain(renderer,assignment);
  scene.add(curtain.curtain);
  let view='room',switches=0;
  function frame(){
    const width=stage.clientWidth,height=stage.clientHeight;
    renderer.setSize(width,height,false);
    applyFixed140View(camera,view,width/height);
    renderer.render(scene,camera);
    window.fixed140Proof={ready:true,profile:assignment.rendererProfile,view,fabricId:assignment.fabricId,
      geometryUuid:curtain.geometry.uuid,textureUuid:curtain.texture.uuid,
      positionArray:curtain.geometry.attributes.position.array,uvArray:curtain.geometry.attributes.uv.array,
      indexArray:curtain.geometry.index.array,metrics:curtain.metrics,source:curtain.plan,
      switches,firstRenderMs:performance.now()-start,contextLost:renderer.getContext().isContextLost()};
  }
  for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{
    view=button.dataset.view;switches++;
    for(const other of document.querySelectorAll('[data-view]'))other.setAttribute('aria-pressed',String(other===button));
    frame();
  });
  new ResizeObserver(frame).observe(stage);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();errorBox.textContent='Graphics could not continue. Reload the visualiser.';errorBox.hidden=false;});
  status.textContent=`${assignment.usableWidthCm} cm usable fabric width · ${curtain.metrics.fullness.toFixed(3)}× Wave fullness`;
  frame();
}catch(error){
  status.textContent='Room preview not available for this fabric yet.';
  errorBox.textContent='The fabric image could not be shown at a verified scale.';
  errorBox.hidden=false;
  window.fixed140Proof={ready:false,error:String(error)};
}
