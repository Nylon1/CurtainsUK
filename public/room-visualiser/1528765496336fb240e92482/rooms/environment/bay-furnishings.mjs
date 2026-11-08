import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Original centimetre-scale furnishings, kept clear of the four bay panels. */
export function createBayFurnishings({T,room,parent,wall,trim}){
  const root=new T.Group();root.name='Bay reading room';parent.add(root);
  const buckets=new Map(),owned=new Set(),textures=[];
  const material=(name,options)=>{const m=new T.MeshStandardMaterial({name,...options});owned.add(m);return m;};
  const source=room.getObjectByName('ARMCHAIR_UPHOLSTERY')?.material;
  const chair=source.clone();chair.name='ARMCHAIR_UPHOLSTERY';chair.roughness=.94;owned.add(chair);
  const textile=source.normalMap;
  const sage=material('Bay sage linen',{color:'#9da78c',roughness:1,normalMap:textile,normalScale:new T.Vector2(.3,.3),side:T.DoubleSide});
  const linen=material('Bay natural weave',{color:'#c4b49a',roughness:1,normalMap:textile,normalScale:new T.Vector2(.4,.4)});
  const wood=room.getObjectByName('TIMBER').material.clone();wood.color.set('#ab8359');wood.roughness=.6;owned.add(wood);
  const brass=material('Bay brushed brass',{color:'#b5a16d',metalness:.7,roughness:.36});
  const pot=material('Bay warm ceramics',{color:'#d4c5ab',roughness:.92});
  const green=material('Bay plant leaves',{color:'#466143',roughness:.93,side:T.DoubleSide});
  const paper=material('Bay book pages',{color:'#e5dfd1',roughness:1});
  const book=material('Bay book covers',{color:'#7e8970',roughness:.98});
  const shade=room.getObjectByName('SHADE').material;
  const ceiling=room.getObjectByName('CEILING_MATERIAL').material;
  function add(g,m,p=[0,0,0],r=[0,0,0]){
    if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));
    g.rotateX(r[0]);g.rotateY(r[1]);g.rotateZ(r[2]);g.translate(...p);
    const list=buckets.get(m)||[];list.push(g);buckets.set(m,list);
  }
  function rounded(w,h,d,r){
    const seg=5,g=new T.BoxGeometry(2,2,2,seg,seg,seg),p=g.attributes.position,n=g.attributes.normal,q=new T.Vector3();
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      q.set(x-Math.sign(x)/seg,y-Math.sign(y)/seg,z-Math.sign(z)/seg).normalize();
      p.setXYZ(i,Math.sign(x)*(w/2-r)+q.x*r,Math.sign(y)*(h/2-r)+q.y*r,Math.sign(z)*(d/2-r)+q.z*r);
      n.setXYZ(i,q.x,q.y,q.z);
    }return g;
  }
  const box=(w,h,d,m,p,r=1,rotation=[0,0,0])=>add(rounded(w,h,d,Math.min(r,w/3,h/3,d/3)),m,p,rotation);
  const bar=(w,h,d,m,p)=>add(new T.BoxGeometry(w,h,d),m,p);
  function rod(a,b,r,m){
    const start=new T.Vector3(...a),end=new T.Vector3(...b),direction=end.clone().sub(start);
    const g=new T.CylinderGeometry(r,r,direction.length(),8);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize()));
    add(g,m,start.add(end).multiplyScalar(.5).toArray());
  }
  function pillow(w,h,d){
    const g=new T.BoxGeometry(w,h,d,16,16,2),p=g.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i)/(w/2),y=p.getY(i)/(h/2),z=p.getZ(i)/(d/2);
      p.setZ(i,z*(1+(d/2-1)*Math.pow(Math.max(0,(1-x*x)*(1-y*y)),.55)));
    }g.computeVertexNormals();return g;
  }
  // A shallow room surround gives the wider camera proper wall and ceiling edges.
  for(const side of [-1,1]){
    bar(6,250,380,wall,[side*238,125,202]);
    bar(3,13,380,trim,[side*233.5,6.5,202]);
    for(const [y,h,w]of [[243,2,3],[247,3,5],[251,5,9]])bar(w,h,380,ceiling,[side*(235-w/2),y,202]);
  }
  bar(476,4,380,ceiling,[0,254,202]);
  for(const [y,h,d]of [[243,2,3],[247,3,5],[251,5,9]])bar(472,h,d,ceiling,[0,y,15+d/2]);
  for(const x of [-181,181])bar(110,13,3,trim,[x,6.5,16]);
  // A low chair sits beside the bay so its back cannot cover the curtain hems.
  const chairX=-132,chairZ=218,angle=.22;
  const chairPart=(g,m,p=[0,0,0],r=[0,0,0])=>{
    g.rotateX(r[0]);g.rotateY(r[1]);g.rotateZ(r[2]);g.translate(...p);
    add(g,m,[chairX,0,chairZ],[0,angle,0]);
  };
  for(const x of [-32,32])for(const z of [-28,29])chairPart(new T.CylinderGeometry(2,2.8,18,10),wood,[x,9,z]);
  chairPart(rounded(87,22,79,8),chair,[0,29,0]);
  chairPart(rounded(72,58,18,7),chair,[0,62,-30],[-.13,0,0]);
  for(const x of [-38,38])chairPart(rounded(18,33,77,8),chair,[x,46,2]);
  chairPart(rounded(60,15,61,6),chair,[0,44,7]);
  chairPart(pillow(39,37,13),sage,[7,66,-12],[-.18,-.08,-.12]);
  const throwGeo=new T.PlaneGeometry(38,116,24,42),tp=throwGeo.attributes.position;
  for(let i=0;i<tp.count;i++){
    const u=tp.getX(i),v=(tp.getY(i)+58)/116;
    const z=v<.55?-25+v/.55*69:44+(v-.55)/.45*2,y=v<.55?64.5:64.5-(v-.55)/.45*57.5;
    tp.setXYZ(i,-35+u*.68,y+Math.sin(u*.65+v*2)*.65,z);
  }throwGeo.computeVertexNormals();chairPart(throwGeo,sage);
  // Oak side table and a small reading still life.
  const tx=-16,tz=222;
  add(new T.CylinderGeometry(27,27,3,64),wood,[tx,48,tz]);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod([tx+Math.sin(a)*16,46,tz+Math.cos(a)*16],[tx+Math.sin(a)*21,2,tz+Math.cos(a)*21],2.2,wood);}
  box(25,2.4,18,book,[tx+4,51,tz+2],.3,[0,-.12,0]);
  box(23,.9,16,paper,[tx+4,52.5,tz+2],.2,[0,-.12,0]);
  add(new T.CylinderGeometry(4.3,3.3,7,20),pot,[tx-12,53,tz+5]);
  add(new T.TorusGeometry(2.1,.7,6,16),pot,[tx-16.1,53,tz+5]);
  // Original radial weave, generated once at room creation.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const dx=x-256,dy=y-256,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx),i=(y*512+x)*4;
    const weave=8*Math.sin(r*2.1)+4*Math.sin(a*170+Math.sin(r*.6))+2*Math.sin(x*1.9+y*2.4);
    pixels.data[i]=200+weave;pixels.data[i+1]=181+weave;pixels.data[i+2]=151+weave;pixels.data[i+3]=255;
  }ctx.putImageData(pixels,0,0);
  const rugMap=new T.CanvasTexture(canvas);rugMap.colorSpace=T.SRGBColorSpace;textures.push(rugMap);
  const rug=material('Bay woven round rug',{color:'#ffffff',map:rugMap,roughness:1});
  add(new T.CircleGeometry(116,96),rug,[-12,1.2,215],[-Math.PI/2,0,0]);
  for(const r of [111,114])add(new T.TorusGeometry(r,.55,5,100),linen,[-12,1.6,215],[-Math.PI/2,0,0]);
  const pouf=new T.SphereGeometry(1,64,28),pp=pouf.attributes.position;
  for(let i=0;i<pp.count;i++){
    const x=pp.getX(i),y=pp.getY(i),z=pp.getZ(i),a=Math.atan2(z,x),flute=1+.025*Math.cos(a*28);
    pp.setXYZ(i,x*33*flute,Math.sign(y)*Math.pow(Math.abs(y),.68)*19,z*33*flute);
  }pouf.computeVertexNormals();add(pouf,linen,[49,20,287]);
  box(24,1.4,18,paper,[50,40,285],.35,[0,-.18,0]);
  // Lamp shade shares the existing Lamps control's material and light sources.
  add(new T.CylinderGeometry(12,13,2.5,40),brass,[-191,1.8,192]);
  const arc=new T.CatmullRomCurve3([new T.Vector3(-191,3,192),new T.Vector3(-191,116,192),new T.Vector3(-181,154,192),new T.Vector3(-155,155,192)]);
  add(new T.TubeGeometry(arc,32,.9,8,false),brass);
  add(new T.CylinderGeometry(7,16,17,40,1,true),brass,[-155,146,192],[0,0,-.16]);
  add(new T.CircleGeometry(14.8,32),shade,[-153.8,138.2,192],[Math.PI/2,0,-.16]);
  for(const x of [147,225])bar(4,214,29,trim,[x,107,44]);
  for(const y of [3,48,91,134,177,216])bar(82,4,29,trim,[186,y,44]);
  bar(78,210,2,wall,[186,108,30]);
  for(let shelf=0;shelf<4;shelf++)for(let i=0;i<5;i++){
    const h=19+(i*7+shelf*11)%14,x=158+i*7;
    box(5,h,16,i%2?book:paper,[x,[48,91,134,177][shelf]+2+h/2,46],.25,[0,0,i===4?-.08:0]);
  }
  function plant(x,y,z,size){
    add(new T.CylinderGeometry(size*.27,size*.21,size*.46,24),pot,[x,y+size*.23,z]);
    for(let i=0;i<9;i++){
      const a=i*2.4,height=size*(.65+(i%3)*.19),end=[x+Math.sin(a)*size*.35,y+height,z+Math.cos(a)*size*.25];
      rod([x,y+size*.36,z],end,.3,green);
      const leaf=new T.SphereGeometry(1,10,7);leaf.scale(size*.09,size*.23,size*.018);
      add(leaf,green,end,[.2,0,-Math.sin(a)*.8]);
    }
  }
  plant(191,0,163,58);plant(210,94,44,25);
  add(new T.CylinderGeometry(6,5,15,24),pot,[207,186.5,46]);
  box(54,70,2.5,wood,[-183,165,17],.6);
  box(48,64,1,paper,[-183,165,18.5],.3);
  rod([-184,143,19.2],[-181,186,19.2],.35,green);
  for(let i=0;i<7;i++){
    const leaf=new T.SphereGeometry(1,10,6);leaf.scale(3,8,.2);
    add(leaf,green,[-183+(i%2?5:-5),149+i*5,19.5],[0,0,i%2?-.7:.7]);
  }
  for(const [m,parts]of buckets){
    const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());
    const mesh=new T.Mesh(g,m);mesh.name=m.name;mesh.castShadow=!['WALL_MATERIAL','CEILING_MATERIAL','TRIM'].includes(m.name);mesh.receiveShadow=true;root.add(mesh);
  }
  return{dispose(){root.removeFromParent();root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});for(const m of owned)m.dispose();for(const t of textures)t.dispose();}};
}
