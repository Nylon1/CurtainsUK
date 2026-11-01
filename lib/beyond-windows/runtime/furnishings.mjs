import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Original reusable furniture in centimetres; static geometry is material-batched. */
export function furnish(sceneId,rendererBase,onTextureReady=()=>{}){
  const root=new T.Group(),shell=new T.Group();root.add(shell);
  const buckets=new Map(),shellBuckets=new Map(),owned=new Set(),textures=[];let architectural=false;
  const mat=(name,color,roughness=.8,metalness=0)=>{const m=new T.MeshStandardMaterial({name,color,roughness,metalness});owned.add(m);return m;};
  const wall=mat('Walls','#e6dfd2'),wood=mat('Warm oak','#92714d',.7),darkWood=mat('Walnut','#624c37'),white=mat('Warm joinery','#d5d0c3'),sage=mat('Upholstery','#979c81'),cream=mat('Linen','#ded4bc'),navy=mat('Midnight upholstery','#364450'),brass=mat('Brushed brass','#b9a272',.3,.75),black=mat('Hardware','#2a3030'),green=mat('Leaves','#44664b'),paper=mat('Book paper','#eee5d3'),clay=mat('Terracotta','#b88165');
  const shade=mat('Lamp shades','#e9ddbe');shade.emissive.set('#ffda8c');shade.emissiveIntensity=.18;
  function add(g,m,x,y,z,rx=0,ry=0,rz=0){g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);const target=architectural?shellBuckets:buckets,b=target.get(m)||[];b.push(g);target.set(m,b);}
  function rounded(w,h,d,r=3){const seg=5,g=new T.BoxGeometry(2,2,2,seg,seg,seg),p=g.attributes.position,n=g.attributes.normal,q=new T.Vector3();for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);q.set(x-Math.sign(x)/seg,y-Math.sign(y)/seg,z-Math.sign(z)/seg).normalize();p.setXYZ(i,Math.sign(x)*(w/2-r)+q.x*r,Math.sign(y)*(h/2-r)+q.y*r,Math.sign(z)*(d/2-r)+q.z*r);n.setXYZ(i,q.x,q.y,q.z);}return g;}
  const box=(w,h,d,m,x,y,z,r=0,ry=0)=>add(r?rounded(w,h,d,Math.min(r,w/4,h/4,d/4)):new T.BoxGeometry(w,h,d),m,x,y,z,0,ry);
  const cyl=(r1,r2,h,m,x,y,z)=>add(new T.CylinderGeometry(r1,r2,h,24),m,x,y,z);
  const sphere=(x,y,z,sx,sy,sz,m)=>{const g=new T.SphereGeometry(1,14,10);g.scale(sx,sy,sz);add(g,m,x,y,z);};
  function plant(x,z,size=1){cyl(15*size,12*size,28*size,clay,x,14*size,z);for(let i=0;i<10;i++){const a=i*2.4,h=(45+i%4*12)*size;const leaf=new T.SphereGeometry(1,8,6);leaf.scale(9*size,19*size,2*size);add(leaf,green,x+Math.cos(a)*19*size,h,z+Math.sin(a)*19*size,.3*Math.cos(a),a,.65*Math.sin(a));}}
  function chair(x,z,m=sage,angle=0){const group=new T.Group();const local=(w,h,d,ma,px,py,pz,r=3)=>{const g=rounded(w,h,d,r);g.translate(px,py,pz);g.rotateY(angle);add(g,ma,x,0,z);};local(65,14,68,m,0,43,0);local(65,57,14,m,0,76,-27);local(13,40,63,m,-35,57,0);local(13,40,63,m,35,57,0);for(const [dx,dz]of[[-25,-25],[25,-25],[-25,25],[25,25]])local(4,34,4,wood,dx,20,dz,1);return group;}
  function table(x,z,r=42){cyl(r,r,4,paper,x,69,z);cyl(4,4,64,brass,x,35,z);cyl(r*.52,r*.52,3,black,x,3,z);cyl(4,3.5,7,cream,x-14,75,z+7);box(18,2,12,navy,x+6,73,z-3);}
  function books(x,y,z,n=7){for(let i=0;i<n;i++){const h=22+(i%3)*4;box(5,h,17,[sage,navy,clay,white][i%4],x+i*6,y+h/2,z);box(3,h-3,.6,paper,x+i*6,y+h/2,z+8.8);}}
  function shelf(x,z,w=92){box(w,220,25,wood,x,110,z);box(w-6,212,3,darkWood,x,111,z+13);for(let i=0;i<5;i++){box(w,3,30,wood,x,12+i*45,z+10);if(i%2===0)books(x-w/2+12,14+i*45,z+15,8);else{box(30,24,25,white,x-20,28+i*45,z+10,2);cyl(9,6,22,clay,x+20,28+i*45,z+10);}}}
  function desk(x,z){box(150,5,65,wood,x,75,z);for(const dx of[-64,64])box(6,74,58,darkWood,x+dx,37,z);box(56,36,3,black,x,106,z-17,1);box(50,29,1,navy,x,106,z-14.8);box(5,12,5,black,x,83,z-17);box(28,2,13,black,x,79,z-17);box(42,2,14,white,x,79,z+16,1);cyl(5,4,10,clay,x+52,83,z+10);chair(x,z+67,cream,Math.PI);}
  function frame(x,y,z){box(78,94,4,wood,x,y,z);box(70,86,1,paper,x,y,z+2.5);for(let i=0;i<5;i++)sphere(x+(i-2)*7,y+(i%2)*12-4,z+4,6,22,1,sage);}
  const floor=mat('Natural oak floor','#bc9b71',.8);
  const ft=new T.TextureLoader().load(rendererBase+'rooms/environment/assets/floor/tonal.webp',onTextureReady);ft.colorSpace=T.SRGBColorSpace;ft.wrapS=ft.wrapT=T.RepeatWrapping;ft.repeat.set(3.5,3);floor.map=ft;textures.push(ft);
  box(1250,6,1300,floor,0,-3,250);architectural=true;box(760,12,4,white,0,6,-327);
  const wallMesh=new T.Mesh(new T.BoxGeometry(760,290,8),wall);wallMesh.position.set(0,145,-331);wallMesh.receiveShadow=true;shell.add(wallMesh);
  const ceiling=new T.Mesh(new T.PlaneGeometry(760,1100),white);ceiling.rotation.x=Math.PI/2;ceiling.position.set(0,294,210);ceiling.receiveShadow=true;shell.add(ceiling);
  for(const[w,h,d,x,y,z]of[[8,290,180,-379,145,-240],[8,290,240,-379,145,210],[8,48,240,-379,24,-30],[8,28,240,-379,276,-30],[8,290,145,379,145,-260]]){const m=new T.Mesh(new T.BoxGeometry(w,h,d),wall);m.position.set(x,y,z);m.receiveShadow=true;shell.add(m);}
  box(760,6,12,white,0,280,-322);box(760,8,14,white,0,266,-324);
  // Side glazing leaves sightlines into the furnished room and makes shadows legible.
  const landscape=new T.TextureLoader().load(rendererBase+'rooms/environment/assets/window/office-garden.jpg',onTextureReady);landscape.colorSpace=T.SRGBColorSpace;textures.push(landscape);
  const outside=new T.MeshBasicMaterial({map:landscape});owned.add(outside);
  const window=new T.Mesh(new T.PlaneGeometry(240,210),outside);window.position.set(-376,155,-30);window.rotation.y=Math.PI/2;shell.add(window);
  for(const z of[-150,-30,90])box(6,220,5,white,-372,155,z);
  for(const y of[48,155,262])box(7,5,250,white,-371,y,-30);
  architectural=false;
  // Separate stable room furnishings from the configurable screen system.
  if(sceneId==='hide'){
    box(500,245,5,white,-35,123,-266);desk(-95,-205);shelf(-236,-237,74);shelf(130,-237,98);
    box(110,64,50,white,130,33,-210,2);frame(-70,199,-258);
    chair(235,160,sage,-.65);table(120,155,34);plant(285,-185,1.15);
    const rug=mat('Woven rug','#d1bea1');cyl(100,100,1,rug,100,.7,160);
  }else if(sceneId==='divide'){
    desk(-95,-230);shelf(-285,-295,75);architectural=true;frame(175,185,-323);architectural=false;
    chair(-225,-45,sage,.4);table(-130,-20,33);plant(310,-210,1.3);
    box(175,16,72,cream,-125,44,230,5);box(175,52,16,cream,-125,76,265,5);
    for(const dx of[-85,85])box(14,38,72,cream,-125+dx,58,230,5);
    table(185,165,60);chair(185,265,navy,Math.PI);chair(285,165,navy,Math.PI/2);chair(105,165,navy,-Math.PI/2);
    const rug=mat('Living area rug','#b8aa8e');box(220,.7,130,rug,-125,.5,208,1);
  }else{
    // Curved fabric, timber detailing and booth seating come from the supplied airport photographs.
    box(640,104,18,darkWood,0,52,-308);for(let x=-315;x<320;x+=10)box(3,98,2,wood,x,52,-297);
    box(405,17,72,sage,-90,43,-234,5);box(405,72,17,sage,-90,84,-268,5);
    for(let x=-280;x<120;x+=24)box(1,65,1,darkWood,x,84,-258);
    for(const x of[-200,-40,120])table(x,-135,43);
    chair(-150,155,cream,.1);chair(145,155,navy,-.5);table(0,165,40);plant(305,-240,1.5);plant(-300,120,1);
    const rug=mat('Lounge carpet','#99978a');box(620,.6,300,rug,0,.4,140,1);
    for(const x of[-195,95]){cyl(1,1,42,brass,x,264,-150);cyl(32,38,28,shade,x,230,-150);}
    architectural=true;frame(10,206,-324);architectural=false;
  }
  for(const [target,collection]of [[root,buckets],[shell,shellBuckets]])for(const [m,gs]of collection){const g=mergeGeometries(gs,false);gs.forEach(g=>g.dispose());const mesh=new T.Mesh(g,m);mesh.castShadow=true;mesh.receiveShadow=true;target.add(mesh);}
  return {root,wall,shade,setReverse(reverse){shell.visible=!reverse;},dispose(){root.removeFromParent();root.traverse(o=>o.geometry?.dispose());owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
