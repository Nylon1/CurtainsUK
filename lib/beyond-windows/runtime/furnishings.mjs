import * as T from 'three';
import {INSTALLATION,ROOM} from './model.mjs';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Original reusable furniture in centimetres; static geometry is material-batched. */
export function furnish(sceneId,rendererBase,onTextureReady=()=>{}){
  const root=new T.Group(),shell=new T.Group();root.add(shell);
  const buckets=new Map(),shellBuckets=new Map(),owned=new Set(),textures=[];let architectural=false;
  const mat=(name,color,roughness=.8,metalness=0)=>{const m=new T.MeshStandardMaterial({name,color,roughness,metalness,envMapIntensity:.28});owned.add(m);return m;};
  const wall=mat('Walls','#e6dfd2'),wood=mat('Warm oak','#92714d',.7),darkWood=mat('Walnut','#624c37'),white=mat('Warm joinery','#d5d0c3'),sage=mat('Upholstery','#979c81'),cream=mat('Linen','#ded4bc'),navy=mat('Midnight upholstery','#364450'),brass=mat('Brushed brass','#b9a272',.3,.75),black=mat('Hardware','#2a3030'),green=mat('Leaves','#44664b'),paper=mat('Book paper','#eee5d3'),clay=mat('Terracotta','#b88165');
  const shade=mat('Lamp shades','#e9ddbe');shade.emissive.set('#ffda8c');shade.emissiveIntensity=.18;
  function add(g,m,x,y,z,rx=0,ry=0,rz=0){g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);const target=architectural?shellBuckets:buckets,b=target.get(m)||[];b.push(g);target.set(m,b);}
  function rounded(w,h,d,r=3){
    const g=new T.BoxGeometry(w,h,d,8,8,8),p=g.attributes.position,n=g.attributes.normal,q=new T.Vector3();
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),cx=T.MathUtils.clamp(x,-w/2+r,w/2-r),cy=T.MathUtils.clamp(y,-h/2+r,h/2-r),cz=T.MathUtils.clamp(z,-d/2+r,d/2-r);
      q.set(x-cx,y-cy,z-cz).normalize();p.setXYZ(i,cx+q.x*r,cy+q.y*r,cz+q.z*r);n.setXYZ(i,q.x,q.y,q.z);
    }return g;
  }
  const box=(w,h,d,m,x,y,z,r=0,ry=0)=>add(r?rounded(w,h,d,Math.min(r,w/4,h/4,d/4)):new T.BoxGeometry(w,h,d),m,x,y,z,0,ry);
  const cyl=(r1,r2,h,m,x,y,z)=>add(new T.CylinderGeometry(r1,r2,h,24),m,x,y,z);
  const sphere=(x,y,z,sx,sy,sz,m)=>{const g=new T.SphereGeometry(1,14,10);g.scale(sx,sy,sz);add(g,m,x,y,z);};
  function rod(a,b,r,m){const v=new T.Vector3(...b).sub(new T.Vector3(...a)),g=new T.CylinderGeometry(r,r,v.length(),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize()));add(g,m,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);}
  function plant(x,z,size=1){
    cyl(17*size,12*size,30*size,white,x,15*size,z);cyl(15*size,15*size,1,darkWood,x,30*size,z);
    for(let i=0;i<26;i++){const a=i*2.4,h=(45+i%7*9)*size,spread=(15+i%4*5)*size,px=x+Math.cos(a)*spread,pz=z+Math.sin(a)*spread;
      rod([x,28*size,z],[px,h,pz],.35*size,green);const leaf=new T.SphereGeometry(1,10,8);leaf.scale(7*size,14*size,.6*size);add(leaf,green,px,h+8*size,pz,.4*Math.cos(a),a,.6*Math.sin(a));}
  }
  function chair(x,z,m=sage,angle=0){const group=new T.Group();const local=(w,h,d,ma,px,py,pz,r=3)=>{const g=rounded(w,h,d,r);g.translate(px,py,pz);g.rotateY(angle);add(g,ma,x,0,z);};local(68,18,70,m,0,43,0,7);local(68,55,19,m,0,72,-28,8);local(17,38,68,m,-36,57,0,7);local(17,38,68,m,36,57,0,7);for(const [dx,dz]of[[-25,-25],[25,-25],[-25,25],[25,25]])local(4,38,4,wood,dx,19,dz,1);return group;}
  function table(x,z,r=42){cyl(r,r,4,paper,x,69,z);cyl(4,4,64,brass,x,35,z);cyl(r*.52,r*.52,3,black,x,1.5,z);cyl(4,3.5,7,cream,x-14,75,z+7);box(18,2,12,navy,x+6,73,z-3);}
  function books(x,y,z,n=7){for(let i=0;i<n;i++){const h=22+(i%3)*4;box(5,h,17,[sage,navy,clay,white][i%4],x+i*6,y+h/2,z);box(3,h-3,.6,paper,x+i*6,y+h/2,z+8.8);}}
  function shelf(x,z,w=92){box(4,220,30,wood,x-w/2+2,110,z);box(4,220,30,wood,x+w/2-2,110,z);box(w-8,220,3,darkWood,x,110,z-14);for(let i=0;i<5;i++){box(w,3,30,wood,x,12+i*45,z+10);if(i%2===0)books(x-w/2+12,14+i*45,z+15,8);else{box(30,24,25,white,x-20,28+i*45,z+10,2);cyl(9,6,22,clay,x+20,28+i*45,z+10);}}}
  function desk(x,z){box(150,5,65,wood,x,75,z);for(const dx of[-64,64])box(6,74,58,darkWood,x+dx,37,z);box(56,36,3,black,x,106,z-17,1);box(50,29,1,navy,x,106,z-14.8);box(5,12,5,black,x,83,z-17);box(28,2,13,black,x,79,z-17);box(42,2,14,white,x,79,z+16,1);cyl(5,4,10,clay,x+52,83,z+10);chair(x,z+67,cream,Math.PI);}
  function frame(x,y,z,face=1){box(78,94,4,wood,x,y,z);box(70,86,1,paper,x,y,z+2.5*face);for(let i=0;i<5;i++)sphere(x+(i-2)*7,y+(i%2)*12-4,z+4*face,6,22,1,sage);}
  function sofa(x,z,angle=0){
    const part=(w,h,d,m,px,py,pz,r=6)=>{const g=rounded(w,h,d,r);g.translate(px,py,pz);g.rotateY(angle);add(g,m,x,0,z);};
    part(200,23,82,cream,0,29,0,8);part(200,62,24,cream,0,66,-33,10);
    for(const dx of[-94,94])part(20,43,82,cream,dx,49,0,8);
    for(const dx of[-44,44]){part(83,19,65,cream,dx,47,7,8);part(78,41,18,cream,dx,76,-19,8);}
    for(const dx of[-75,75])for(const dz of[-27,27])part(5,18,5,wood,dx,9,dz,1);
    for(const [dx,m]of[[-62,sage],[58,navy]]){const g=rounded(37,37,14,6);g.rotateZ(dx<0?.14:-.15);g.rotateX(-.16);g.translate(dx,69,4);g.rotateY(angle);add(g,m,x,0,z);}
  }
  const loader=new T.TextureLoader();
  function texture(file,repeat=1,color=false){const t=loader.load(rendererBase+'rooms/packs/'+file,onTextureReady);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);if(color)t.colorSpace=T.SRGBColorSpace;textures.push(t);return t;}
  const timber=texture('oak.png',1,true),textile=texture('weave.png',8),plaster=texture('plaster.png',5);
  for(const m of[wood,darkWood])m.map=timber;
  for(const m of[sage,cream,navy]){m.bumpMap=textile;m.bumpScale=.14;m.roughness=.94;}
  wall.bumpMap=plaster;wall.bumpScale=.06;
  const contact=texture('contact.png'),contactMat=new T.MeshBasicMaterial({map:contact,transparent:true,opacity:.28,depthWrite:false});owned.add(contactMat);
  function ground(x,z,w,d){const shadow=new T.Mesh(new T.PlaneGeometry(w,d),contactMat);shadow.rotation.x=-Math.PI/2;shadow.position.set(x,1.3,z);root.add(shadow);}
  function rug(x,z,w,d){const m=mat('Woven rug','#b8ad98');m.map=texture('rug.png',3,true);m.bumpMap=textile;m.bumpScale=.12;box(w,1.1,d,m,x,.6,z,1);}
  const floor=mat('Natural oak floor','#bc9b71',.8);
  const ft=new T.TextureLoader().load(rendererBase+'rooms/environment/assets/floor/tonal.webp',onTextureReady);ft.colorSpace=T.SRGBColorSpace;ft.wrapS=ft.wrapT=T.RepeatWrapping;ft.repeat.set(3.5,3);floor.map=ft;textures.push(ft);
  const width=ROOM.right-ROOM.left,depth=ROOM.front-ROOM.back,midZ=(ROOM.front+ROOM.back)/2,height=INSTALLATION.ceiling;
  box(width,6,depth,floor,0,-3,midZ);architectural=true;
  // Continuous perimeter with one framed opening in the left wall. Cameras are
  // inside this volume in every view, so walls never disappear or end mid-room.
  for(const[w,h,d,x,y,z]of[
    [width+16,height,8,0,height/2,ROOM.back-4],
    [width+16,height,8,0,height/2,ROOM.front+4],
    [8,height,depth,ROOM.right+4,height/2,midZ],
    [8,height,180,ROOM.left-4,height/2,-240],
    [8,height,560,ROOM.left-4,height/2,370],
    [8,48,240,ROOM.left-4,24,-30],
    [8,height-262,240,ROOM.left-4,(height+262)/2,-30]
  ])box(w,h,d,wall,x,y,z);
  const ceiling=new T.Mesh(new T.PlaneGeometry(width,depth),white);ceiling.rotation.x=Math.PI/2;ceiling.position.set(0,height,midZ);ceiling.receiveShadow=true;root.add(ceiling);
  // Skirting and cornice turn every corner and close the wall/ceiling junction.
  for(const [y,h,t]of[[6,12,3],[height-5,10,8]]){
    box(width,h,t,white,0,y,ROOM.back+t/2);box(width,h,t,white,0,y,ROOM.front-t/2);
    box(t,h,depth,white,ROOM.left+t/2,y,midZ);box(t,h,depth,white,ROOM.right-t/2,y,midZ);
  }
  // An entrance and wall art make the opposite view a finished room too.
  box(98,216,4,white,245,108,ROOM.front-3);box(86,207,3,wood,245,103.5,ROOM.front-6);
  box(12,2,3,brass,274,103,ROOM.front-9);frame(-100,170,ROOM.front-5,-1);
  for(const x of[-175,175])for(const z of[-180,250]){cyl(7,7,1,white,x,height-.5,z);cyl(4.5,4.5,1.2,shade,x,height-.9,z);}
  // Side glazing leaves sightlines into the furnished room and makes shadows legible.
  const landscape=new T.TextureLoader().load(rendererBase+'rooms/environment/assets/window/office-garden.jpg',onTextureReady);landscape.colorSpace=T.SRGBColorSpace;textures.push(landscape);
  const outside=new T.MeshBasicMaterial({map:landscape});owned.add(outside);
  const window=new T.Mesh(new T.PlaneGeometry(240,210),outside);window.position.set(-376,155,-30);window.rotation.y=Math.PI/2;shell.add(window);
  for(const z of[-150,-30,90])box(6,220,5,white,-372,155,z);
  for(const y of[48,155,262])box(7,5,250,white,-371,y,-30);
  architectural=false;
  // Separate stable room furnishings from the configurable screen system.
  if(sceneId==='hide'){
    desk(-95,-205);shelf(-236,-237,74);shelf(130,-237,98);
    box(110,64,50,white,130,33,-210,2);frame(-70,199,-323);
    sofa(-235,170,Math.PI/2);chair(220,175,sage,-.65);plant(290,-220,1.15);rug(-10,160,420,280);
    cyl(65,65,5,wood,15,42,150);for(const [dx,dz]of[[-36,-28],[36,-28],[0,36]])rod([15+dx,1,150+dz],[15+dx*.8,40,150+dz*.8],3,wood);books(-10,45,146,4);cyl(7,5,14,white,40,52,160);
    cyl(25,25,3,brass,-285,1.5,10);cyl(2,2,145,brass,-285,74,10);cyl(22,27,35,shade,-285,151,10);
    ground(-235,170,115,230);ground(220,175,105,105);ground(-95,-205,180,95);
  }else if(sceneId==='divide'){
    desk(-95,-230);shelf(-285,-295,75);architectural=true;frame(175,185,-323);architectural=false;
    chair(-225,-45,sage,.4);table(-130,-20,33);plant(310,-210,1.3);
    sofa(-125,230,Math.PI);
    table(185,165,60);chair(185,265,navy,Math.PI);chair(285,165,navy,-Math.PI/2);chair(105,165,navy,Math.PI/2);
    rug(-125,208,240,160);ground(-125,230,210,100);ground(185,165,150,150);
  }else{
    // Curved fabric, timber detailing and booth seating come from the supplied airport photographs.
    box(640,104,18,darkWood,0,52,-308);for(let x=-315;x<320;x+=10)box(3,98,2,wood,x,52,-297);
    box(405,35,65,darkWood,-90,17.5,-234);box(405,17,72,sage,-90,43,-234,5);box(405,72,17,sage,-90,84,-268,5);
    for(let x=-280;x<120;x+=24)box(1,65,1,darkWood,x,84,-258);
    for(const x of[-200,-40,120])table(x,-135,43);
    chair(-150,155,cream,.1);chair(145,155,navy,-.5);table(0,165,40);plant(305,-240,1.5);plant(-300,120,1);
    rug(0,140,620,300);ground(-150,155,110,110);ground(145,155,110,110);
    for(const x of[-195,95]){cyl(1,1,50,brass,x,269,-150);cyl(32,38,28,shade,x,230,-150);}
    architectural=true;frame(10,206,-324);architectural=false;
  }
  for(const [target,collection]of [[root,buckets],[shell,shellBuckets]])for(const [m,gs]of collection){const g=mergeGeometries(gs,false);gs.forEach(g=>g.dispose());const mesh=new T.Mesh(g,m);mesh.castShadow=true;mesh.receiveShadow=true;target.add(mesh);}
  return {root,wall,shade,dispose(){root.removeFromParent();root.traverse(o=>o.geometry?.dispose());owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
