import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

export const LOUNGE_PRESET=Object.freeze({WALL_MATERIAL:0,FLOOR_MATERIAL:0,SEATING_UPHOLSTERY:0,CUSHION_UPHOLSTERY:1});
export const LOUNGE_STYLE='Warm minimal';
export const LOUNGE_DESCRIPTION='Tailored ivory seating, pale oak, a wall-mounted TV and a softly lit ceiling cove.';

/** Original room-only geometry inspired by the supplied photograph. Centimetres.
 * All selectable upholstery keeps the existing palette material names. */
export function createInspiredLounge({T,room,materials,textileNormal,woodMap}){
  const root=new T.Group();root.name='Lounge — ivory and oak';room.children[0].add(root);
  const replaced=new Set(['SEATING_UPHOLSTERY','CUSHION_UPHOLSTERY','DARK_TIMBER','TIMBER','RUG_FIXED','PAPER','LINEN_FIXED','CERAMIC','BRASS','SHADE','FOLIAGE']);
  room.traverse(o=>{if(o.isMesh&&replaced.has(o.material?.name))o.visible=false;});
  // Remove applied wall panels only. Retain the window, skirting and cornice.
  const trim=room.getObjectByName('TRIM');if(trim){const old=trim.geometry,g=old.index?old.toNonIndexed():old.clone(),p=g.attributes.position,keep=[];
    for(let i=0;i<p.count;i+=3){const x=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,y=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3,z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;
      const panel=y>18&&y<137&&(Math.abs(x)>315||(z<0&&Math.abs(x)>122));
      const backRail=z<0&&Math.min(p.getY(i),p.getY(i+1),p.getY(i+2))>=97&&Math.max(p.getY(i),p.getY(i+1),p.getY(i+2))<=101;
      if(!panel&&!backRail)keep.push(i,i+1,i+2);
    }g.setIndex(keep);old.dispose();trim.geometry=g;
  }
  const buckets=new Map(),textures=[];
  function mat(name,options){const m=new T.MeshStandardMaterial(options);m.name=name;return m;}
  const upholstery=materials.get('SEATING_UPHOLSTERY'),cushion=materials.get('CUSHION_UPHOLSTERY');
  const oak=mat('Lounge pale oak',{color:'#cdb991',map:woodMap,roughness:.63});
  const metal=mat('Lounge dark bronze',{color:'#4b473d',metalness:.55,roughness:.5});
  const ceramic=mat('Lounge chalk ceramic',{color:'#e1dacb',roughness:.91});
  const paper=mat('Lounge book pages',{color:'#e4dfd1',roughness:.95});
  const throwMat=mat('Lounge woven throw',{color:'#625d50',roughness:.98,normalMap:textileNormal,normalScale:new T.Vector2(.32,.32),side:T.DoubleSide});
  function add(g,m,p=[0,0,0],r=[0,0,0]){g.rotateX(r[0]);g.rotateY(r[1]);g.rotateZ(r[2]);g.translate(...p);const list=buckets.get(m)||[];list.push(g);buckets.set(m,list);}
  function rounded(w,h,d,r=2){const segments=7,g=new T.BoxGeometry(2,2,2,segments,segments,segments),p=g.attributes.position,n=g.attributes.normal,inner=new T.Vector3(w/2-r,h/2-r,d/2-r),v=new T.Vector3(),q=new T.Vector3();
    // Concentrate the segments at the bevel; a flat centre stays flat. Analytic
    // normals keep the rounded edges continuous across the six UV islands.
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);q.set(v.x-Math.sign(v.x)/segments,v.y-Math.sign(v.y)/segments,v.z-Math.sign(v.z)/segments).normalize();n.setXYZ(i,q.x,q.y,q.z);p.setXYZ(i,Math.sign(v.x)*inner.x+q.x*r,Math.sign(v.y)*inner.y+q.y*r,Math.sign(v.z)*inner.z+q.z*r);}const smooth=mergeVertices(g,1e-4);g.dispose();return smooth;
  }
  const box=(w,h,d,m,p,r=2,rotation=[0,0,0])=>add(rounded(w,h,d,Math.min(r,w/3,h/3,d/3)),m,p,rotation);
  function pipe(points,r,m,closed=false){add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed),Math.max(12,points.length*3),r,5,closed),m);}
  function seam(w,h,z,centre,m){const pts=[],r=3;for(const[cx,cy,start]of [[w/2-r,h/2-r,0],[-w/2+r,h/2-r,90],[-w/2+r,-h/2+r,180],[w/2-r,-h/2+r,270]])for(let i=0;i<=5;i++){const a=(start+i*18)*Math.PI/180;pts.push([centre[0]+cx+Math.cos(a)*r,centre[1]+cy+Math.sin(a)*r,centre[2]+z]);}pipe(pts,.15,m,true);}
  // Low tailored three-seat sofa: narrow arms, separate seats, seams and oak feet.
  const sx=-196,sz=128;
  box(229,10,91,upholstery,[sx,25,sz],2.7);
  box(216,56,14,upholstery,[sx,54,sz-40],3.4);
  for(const sign of [-1,1])box(14,43,92,upholstery,[sx+sign*111,45,sz],3.2);
  box(224,3,86,oak,[sx,18.2,sz],.65);
  for(const x of [-104,104])for(const z of [-36,36])add(new T.CylinderGeometry(2.4,1.8,17,10),oak,[sx+x,8.5,sz+z],[0,0,x>0?-.07:.07]);
  for(let i=-1;i<=1;i++){
    box(69.5,15.5,67,upholstery,[sx+i*71,39,sz+9],4.4);
    seam(65,10,34,[sx+i*71,39,sz+9],upholstery);
    const g=rounded(70,44,18,5),p=g.attributes.position;
    for(let v=0;v<p.count;v++){const x=p.getX(v)/35,y=p.getY(v)/22;p.setY(v,p.getY(v)-.7*(1-x*x)*(1+y)*.5);p.setZ(v,p.getZ(v)+.55*Math.sin(x*3.1)*(1-y*y));}g.computeVertexNormals();add(g,upholstery,[sx+i*71,65,sz-24],[-.1,0,(i===0?0:i*.012)]);
  }
  for(const[x,z,roll]of [[sx-73,sz+1,-.1],[sx+70,sz+5,.12]])box(40,40,13,cushion,[x,66,z],6,[-.17,.08,roll]);
  // A soft rounded ottoman replaces the second large chair.
  const pouf=new T.SphereGeometry(1,40,24),pp=pouf.attributes.position;
  for(let i=0;i<pp.count;i++){const x=pp.getX(i),y=pp.getY(i),z=pp.getZ(i);pp.setXYZ(i,Math.sign(x)*Math.pow(Math.abs(x),.7)*46,Math.sign(y)*Math.pow(Math.abs(y),.5)*23,Math.sign(z)*Math.pow(Math.abs(z),.7)*43);}pouf.computeVertexNormals();add(pouf,upholstery,[172,24,257]);
  // Slender open-frame oak table, with the same restrained book/vase arrangement.
  const tx=-101,tz=243;
  box(143,3.5,65,oak,[tx,37,tz],.6);
  for(const x of [-67,67])for(const z of [-28,28])box(3.5,35,3.5,oak,[tx+x,17.5,tz+z],.3);
  for(const z of [-28,28])box(137,4,2.6,oak,[tx,33.5,tz+z],.4);
  box(30,2.8,20,paper,[tx+27,40,tz-4],.3,[0,-.07,0]);box(28,2.5,18,paper,[tx+29,42.7,tz-3],.3,[0,.07,0]);
  add(new T.LatheGeometry([[5,0],[7,1],[9,7],[9.3,11],[7.3,16],[5.5,19],[5.1,24],[4.1,24],[4.1,22]].map(p=>new T.Vector2(...p)),28),ceramic,[tx-22,38.8,tz-4]);
  add(new T.CylinderGeometry(8,7,1.3,28),ceramic,[tx-5,39.5,tz+19]);
  // Original static drape; no dependency on the protected curtain solver.
  const throwGeo=new T.PlaneGeometry(54,1,22,40),tp=throwGeo.attributes.position,uv=throwGeo.attributes.uv;
  const profile=new T.CatmullRomCurve3([[0,76,103],[0,51,121],[0,47.3,154],[0,42,177],[0,10,189]].map(p=>new T.Vector3(...p)));
  for(let i=0;i<tp.count;i++){const u=uv.getX(i),v=uv.getY(i),q=profile.getPoint(v);tp.setXYZ(i,sx+70+(u-.5)*54+.7*Math.sin(v*9),q.y+(1.1*Math.sin(u*13*Math.PI+v*.8)+.45*Math.sin(u*29))*Math.sin(Math.PI*u),q.z+.3*Math.sin(u*17));}throwGeo.computeVertexNormals();add(throwGeo,throwMat);
  // Fine woven rug with a restrained dark binding.
  const weave=document.createElement('canvas');weave.width=weave.height=256;const wc=weave.getContext('2d'),wi=wc.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4,n=(Math.sin(x*127.1+y*311.7)*43758.5)%1,v=234+6*Math.sin(x*Math.PI/2)+5*Math.sin(y*Math.PI/2)+n*3;wi.data[i]=wi.data[i+1]=wi.data[i+2]=v;wi.data[i+3]=255;}wc.putImageData(wi,0,0);
  const rugMap=new T.CanvasTexture(weave);rugMap.colorSpace=T.SRGBColorSpace;rugMap.wrapS=rugMap.wrapT=T.RepeatWrapping;rugMap.repeat.set(22,15);textures.push(rugMap);
  const binding=mat('Lounge rug binding',{color:'#79776d',roughness:1}),rug=mat('Lounge natural woven rug',{color:'#e4dfd0',map:rugMap,normalMap:textileNormal,normalScale:new T.Vector2(.16,.16),roughness:.98});
  box(509,.65,277,binding,[-45,.05,233],.2);box(505,.6,273,rug,[-45,.5,233],.18);
  // One slim floor lamp. Its point source reuses the existing stable light slot.
  add(new T.CylinderGeometry(8.5,9,1.7,30),metal,[-320,.85,137]);pipe([[-320,1.7,137],[-320,151,137],[-316,158,137],[-290,158,137],[-285,153,137]],.65,metal);
  add(new T.ConeGeometry(10.5,6.2,32,1,true),metal,[-285,147,137]);
  const diffuser=mat('Lounge lamp diffuser',{color:'#eee3cc',roughness:.86,emissive:'#ffe0a5',emissiveIntensity:0});add(new T.CylinderGeometry(9.5,9.5,.35,30),diffuser,[-285,144,137]);
  // Original abstract study: broad cream fields with charcoal and ochre marks.
  const art=document.createElement('canvas');art.width=512;art.height=448;const ctx=art.getContext('2d');ctx.fillStyle='#e8e2d6';ctx.fillRect(0,0,512,448);
  for(const [c,x,y,w,h]of [['#d7cbb8',32,62,209,260],['#eee9df',168,16,187,398],['#c7bba6',365,234,125,108],['#635e50',67,247,283,10],['#323e38',136,232,161,12],['#b69561',318,94,10,147],['#d4bca2',303,208,166,9]]){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
  for(let i=0;i<2400;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.03)':'rgba(45,40,30,.02)';ctx.fillRect((i*127)%512,(i*71)%448,7,2);}
  const artMap=new T.CanvasTexture(art);artMap.colorSpace=T.SRGBColorSpace;textures.push(artMap);const artMat=mat('Lounge original abstract',{color:'#ffffff',map:artMap,roughness:1});
  box(155,126,2.5,oak,[-227,184,-24],.5);add(new T.PlaneGeometry(151,122),artMat,[-227,184,-22.6]);
  // 55-inch TV on the clear wall right of the window. The unlit screen uses the
  // existing environment, with no video, reflection target or additional light.
  {
    const screen=mat('Lounge TV screen',{color:'#101718',metalness:.28,roughness:.19});
    box(124,71,3.2,metal,[238,145,-17.8],.75);
    box(121.8,68.5,.35,screen,[238,145,-16.05],.45);
    // Floating oak cabinet conceals the wiring; fine inset drawer reveals.
    box(148,30,40,oak,[238,51.5,-2],.7);
    box(146.8,29,.4,metal,[238,51.5,18.1],.12);
    for(const x of [201.4,274.6])box(72.6,28.3,1.2,oak,[x,51.5,18.8],.25);
    root.userData.television={diagonalInches:55,centre:[238,145,-17.8],screenUnlit:true};
  }
  // Physical cove ledge plus a cheap wall-wash plate; no extra light/shadow pass.
  const coveTrim=mat('Lounge cove plaster',{color:'#eee8dc',roughness:.95});
  box(660,4,5,coveTrim,[0,287,-21.5],.5);for(const x of [-327,327])box(5,4,535,coveTrim,[x,287,242],.5);
  for(const[m,parts]of buckets){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());const mesh=new T.Mesh(g,m);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}
  const glow=document.createElement('canvas');glow.width=4;glow.height=128;const gc=glow.getContext('2d'),gradient=gc.createLinearGradient(0,0,0,128);gradient.addColorStop(0,'rgba(255,247,226,.6)');gradient.addColorStop(.3,'rgba(255,244,217,.24)');gradient.addColorStop(1,'rgba(255,244,217,0)');gc.fillStyle=gradient;gc.fillRect(0,0,4,128);
  const glowMap=new T.CanvasTexture(glow);glowMap.colorSpace=T.SRGBColorSpace;textures.push(glowMap);const glowMat=new T.MeshBasicMaterial({name:'Lounge cove wall wash',map:glowMap,transparent:true,depthWrite:false,color:'#ffe6be',opacity:0});
  for(const[w,p,r]of [[660,[0,277,-24.6],[0,0,0]],[535,[-328.9,277,242],[0,Math.PI/2,0]],[535,[328.9,277,242],[0,-Math.PI/2,0]]]){const mesh=new T.Mesh(new T.PlaneGeometry(w,28),glowMat);mesh.position.fromArray(p);mesh.rotation.set(...r);root.add(mesh);}
  return{root,textures,update(mode,lamps){const inspection=mode==='inspection';diffuser.emissiveIntensity=lamps&&!inspection?.85:0;glowMat.opacity=lamps&&!inspection?(mode==='daylight'?.12:.75):0;},dispose(){textures.forEach(t=>t.dispose());}};
}

export function adaptLoungeContacts(contacts){
  for(const [i,[x,z,w,d]]of [[-196,128,236,96],[172,257,96,90],[-101,243,143,65]].entries()){const mesh=contacts.children[i];if(!mesh)continue;mesh.position.set(x,1.08,z);mesh.scale.set(w*1.2/mesh.geometry.parameters.width,d*1.3/mesh.geometry.parameters.height,1);}
}
