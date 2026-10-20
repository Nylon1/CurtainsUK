import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const BEDROOM_PRESET=Object.freeze({CEILING_MATERIAL:0,WALL_MATERIAL:0,FLOOR_MATERIAL:0,HEADBOARD:0,BED_COVER:0,CUSHION_UPHOLSTERY:1});
export const BEDROOM_STYLE='Ivory & brass';
export const BEDROOM_DESCRIPTION='Channelled upholstery, fitted ivory wardrobes and warm brass details.';

/** Original centimetre-scale room furniture. Curtain geometry is never traversed. */
export function createInspiredBedroom({T,room,materials,textileNormal}){
  const root=new T.Group();root.name='Bedroom — ivory and brass';room.children[0].add(root);
  const foliage=room.getObjectByName('FOLIAGE');
  const replaced=new Set(['HEADBOARD','BED_COVER','CUSHION_UPHOLSTERY','LINEN_FIXED','DARK_TIMBER','TIMBER','RUG_FIXED','BRASS','SHADE','CERAMIC','FOLIAGE']);
  room.traverse(o=>{if(o.isMesh&&replaced.has(o.material?.name))o.visible=false;});
  const textures=[],buckets=new Map(),roundedCache=new Map();
  const material=(name,options)=>{const m=new T.MeshStandardMaterial(options);m.name=name;return m;};
  const upholstery=materials.get('HEADBOARD'),cover=materials.get('BED_COVER'),cushion=materials.get('CUSHION_UPHOLSTERY');
  const linen=materials.get('LINEN_FIXED'),wall=materials.get('WALL_MATERIAL'),ceiling=materials.get('CEILING_MATERIAL');
  const brass=material('Bedroom BRASS',{color:'#b29457',metalness:.72,roughness:.31});
  const plinth=material('Bedroom dark plinth',{color:'#4d4236',roughness:.7});
  const cabinet=material('Bedroom ivory cabinetry',{color:'#dfd7c6',roughness:.55});
  const wardrobe=material('Bedroom fitted wardrobe',{color:'#dfd8c8',roughness:.59});
  const stone=material('Bedroom pale limestone',{color:'#d2c7b2',roughness:.86});
  const throwMat=material('Bedroom cashmere throw',{color:'#b7a58a',roughness:.98,normalMap:textileNormal,normalScale:new T.Vector2(.23,.23),side:T.DoubleSide});
  const shade=material('Bedroom lamp linen',{color:'#ece3cf',roughness:.88,normalMap:textileNormal,normalScale:new T.Vector2(.1,.1),emissive:'#ffe0a7',emissiveIntensity:0,side:T.DoubleSide});
  const crystal=material('Bedroom faceted crystal',{color:'#ebe5d8',roughness:.2,emissive:'#ffe8bd',emissiveIntensity:0});
  function add(g,m,p=[0,0,0],r=[0,0,0]){g.rotateX(r[0]);g.rotateY(r[1]);g.rotateZ(r[2]);g.translate(...p);const parts=buckets.get(m)||[];parts.push(g);buckets.set(m,parts);}
  function rounded(w,h,d,r=2){const key=[w,h,d,r].join(':');if(roundedCache.has(key))return roundedCache.get(key).clone();
    const segments=7,g=new T.BoxGeometry(2,2,2,segments,segments,segments),p=g.attributes.position,n=g.attributes.normal,v=new T.Vector3(),q=new T.Vector3(),inner=new T.Vector3(w/2-r,h/2-r,d/2-r);
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);q.set(v.x-Math.sign(v.x)/segments,v.y-Math.sign(v.y)/segments,v.z-Math.sign(v.z)/segments).normalize();n.setXYZ(i,q.x,q.y,q.z);p.setXYZ(i,Math.sign(v.x)*inner.x+q.x*r,Math.sign(v.y)*inner.y+q.y*r,Math.sign(v.z)*inner.z+q.z*r);}roundedCache.set(key,g);return g.clone();
  }
  const box=(w,h,d,m,p,r=2,rotation=[0,0,0])=>add(rounded(w,h,d,Math.min(r,w/3,h/3,d/3)),m,p,rotation);
  const bar=(w,h,d,m,p,r=[0,0,0])=>add(new T.BoxGeometry(w,h,d),m,p,r);
  function pipe(points,r,m,closed=false){add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed),Math.max(24,points.length*4),r,6,closed),m);}
  function frame(w,h,m,p,r=[0,0,0],thickness=1){for(const [bw,bh,x,y]of [[w,thickness,0,h/2],[w,thickness,0,-h/2],[thickness,h,-w/2,0],[thickness,h,w/2,0]]){const geometry=new T.BoxGeometry(bw,bh,.9);geometry.translate(x,y,0);add(geometry,m,p,r);}}
  function pillow(w,h,d,m,p,r){const g=new T.BoxGeometry(w,h,d,22,20,2),a=g.attributes.position;
    for(let i=0;i<a.count;i++){const x=a.getX(i)/(w/2),y=a.getY(i)/(h/2),z=a.getZ(i)/(d/2),bulge=Math.pow(Math.max(0,(1-x*x)*(1-y*y)),.55);a.setXYZ(i,x*w/2*(1-.045*Math.pow(Math.abs(y),8)),y*h/2*(1-.035*Math.pow(Math.abs(x),8)),z*(1.1+(d/2-1.1)*bulge)+.35*Math.sin(x*18+y*5)*Math.pow(Math.abs(x*y),3));}g.computeVertexNormals();add(g,m,p,r);
  }
  // The reference's bed is on the right; preserve the original window and cameras.
  const bx=184,bz=204;
  box(180,7,211,plinth,[bx,3.5,bz],1);
  box(194,29,226,upholstery,[bx,21.5,bz],7);
  box(198,126,14,upholstery,[bx,70,82],5);
  for(let i=-5;i<=5;i++)box(17.5,119,10,upholstery,[bx+i*18,73,90],5);
  // Full upholstered foot and side rails with the same controlled palette.
  for(let i=-5;i<=5;i++)box(17.5,30,12,upholstery,[bx+i*17.6,22,317],5);
  for(const side of [-1,1])for(let i=0;i<12;i++)box(12,30,17.6,upholstery,[bx+side*94,22,108+i*18],4.5);
  box(179,22,211,linen,[bx,48,204],7);
  box(183,3.5,215,linen,[bx,58,204],1);
  // Closed, softly draped duvet: layered volume, quiet irregular folds, no solver.
  const nx=42,nz=48,positions=[],uvs=[],indices=[],smooth=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);};
  function duvetHeight(x,z){const side=smooth((Math.abs(x)-85)/17),foot=smooth((z-301)/22);return 70.5-19*side-20*foot+(.9*Math.sin(x*.071+z*.026)+.45*Math.sin(x*.18-z*.13))*(.35+.65*side)+1.2*Math.sin(z*.047)*Math.exp(-Math.pow((x+63)/29,2));}
  for(let layer=0;layer<2;layer++)for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){const x=(ix/nx-.5)*204,z=105+iz/nz*218;positions.push(bx+x,duvetHeight(x,z)-layer*2.8,z);uvs.push(ix/nx,iz/nz);}
  const stride=nx+1,count=stride*(nz+1);
  for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const a=iz*stride+ix,b=a+1,c=a+stride,d=c+1;indices.push(a,c,b,b,c,d,a+count,b+count,c+count,b+count,d+count,c+count);}
  const edge=[];for(let ix=0;ix<=nx;ix++)edge.push(ix);for(let iz=1;iz<=nz;iz++)edge.push(iz*stride+nx);for(let ix=nx-1;ix>=0;ix--)edge.push(nz*stride+ix);for(let iz=nz-1;iz>0;iz--)edge.push(iz*stride);
  for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,b,a+count,b,b+count,a+count);}
  const duvet=new T.BufferGeometry();duvet.setAttribute('position',new T.Float32BufferAttribute(positions,3));duvet.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));duvet.setIndex(indices);duvet.computeVertexNormals();add(duvet,cover);
  box(182,3.2,33,linen,[bx,73,146],1.3);
  pillow(76,48,19,linen,[bx-43,89,116],[-.22,0,-.015]);pillow(76,48,19,linen,[bx+43,89,116],[-.22,0,.015]);
  pillow(44,44,18,cushion,[bx-44,92,145],[-.16,.06,-.07]);pillow(44,44,18,cushion,[bx+45,92,145],[-.16,-.06,.06]);
  pillow(45,45,19,linen,[bx,94,150],[-.19,0,.035]);
  const knot=new T.TorusKnotGeometry(6.2,2.7,72,8,2,3);knot.scale(1.12,1.12,.75);add(knot,linen,[bx,81,174],[.12,.25,.08]);
  // A folded cashmere throw falls over the near side without obscuring the bed.
  const throwGeo=new T.PlaneGeometry(1,1,60,20),tp=throwGeo.attributes.position,tu=throwGeo.attributes.uv;
  for(let i=0;i<tp.count;i++){const u=tu.getX(i),v=tu.getY(i),x=-90+u*201,z=249+v*58+.018*x,drop=smooth((x-83)/26);tp.setXYZ(i,bx+x,duvetHeight(Math.min(x,86),z)+2.5-49*drop+(.8*Math.sin(u*24+v*1.1)+.38*Math.sin(v*16))*Math.sin(Math.PI*v),z);}throwGeo.computeVertexNormals();add(throwGeo,throwMat);
  // Two restrained bedside cabinets with brass hardware and actual lamp sources.
  const lampPositions=[[60,100,93],[308,100,93]];
  for(const [x,,z]of lampPositions){
    box(40,45,43,cabinet,[x,29.5,z],1);box(43,2.3,46,stone,[x,53.3,z],.6);
    for(const y of [19,40]){box(37.5,19,1.7,cabinet,[x,y,z+22.3],.45);bar(12,.7,1.3,brass,[x,y+1,z+23.7]);}
    for(const sx of [-15,15])for(const sz of [-16,16])add(new T.CylinderGeometry(1.5,1,7,10),brass,[x+sx,3.5,z+sz]);
    add(new T.CylinderGeometry(10,10.4,2,32),brass,[x,55.5,z]);add(new T.CylinderGeometry(4.7,5.2,25,24),brass,[x,69,z]);
    add(new T.CylinderGeometry(1,1,10,12),brass,[x,85,z]);add(new T.CylinderGeometry(12.5,17,23,40,1,true),shade,[x,101,z]);
    add(new T.CylinderGeometry(12.4,12.4,.45,32),shade,[x,112.4,z]);
  }
  // Architectural moulding and restrained brass inset; room palette stays active.
  frame(185,242,wall,[224,145,-23.4],[0,0,0],1.6);
  frame(178,235,brass,[224,145,-22.85],[0,0,0],.65);
  for(const x of [-328.4,328.4])for(const z of [87,269,451])frame(144,242,wall,[x,145,z],[0,x<0?Math.PI/2:-Math.PI/2,0],1.6);
  // An original atmospheric abstract, painted procedurally rather than photo-derived.
  const art=document.createElement('canvas');art.width=512;art.height=320;const ac=art.getContext('2d'),im=ac.createImageData(512,320);
  const hash=(x,y)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);};
  const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy);return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),u),T.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v);};
  for(let y=0;y<320;y++)for(let x=0;x<512;x++){const n=.58*noise(x*.015,y*.025)+.27*noise(x*.054,y*.071)+.15*noise(x*.18,y*.21),band=Math.exp(-Math.pow((y-182-(n-.5)*142)/41,2)),strength=band*(.3+.6*n),i=(y*512+x)*4;for(let c=0;c<3;c++)im.data[i+c]=T.MathUtils.lerp([235,228,210][c],[104,94,71][c],strength)+(hash(x,y)-.5)*5;im.data[i+3]=255;}ac.putImageData(im,0,0);ac.beginPath();for(let x=0;x<=512;x+=3){const y=184+Math.sin(x*.018)*3+Math.sin(x*.064)*1.2;if(!x)ac.moveTo(x,y);else ac.lineTo(x,y);}ac.strokeStyle='#b89b5c';ac.lineWidth=1.3;ac.stroke();
  const artMap=new T.CanvasTexture(art);artMap.colorSpace=T.SRGBColorSpace;textures.push(artMap);const artMat=material('Bedroom original abstract',{color:'#ffffff',map:artMap,roughness:1});
  box(173,108,2.5,brass,[222,209,-23],.4);add(new T.PlaneGeometry(169,104),linen,[222,209,-21.6]);add(new T.PlaneGeometry(154,88),artMat,[222,209,-21.4]);
  // One finely leaved tree replaces the former small plant. Reuse its material;
  // smaller original leaves read more naturally than scaling the old broad leaves.
  if(foliage){const leafMaterial=foliage.material;leafMaterial.side=T.DoubleSide;
    pipe([[-264,29,55],[-261,82,56],[-267,134,52],[-264,183,56]],.8,plinth);
    for(let i=0;i<16;i++){const angle=i*2.39996,level=43+i*7.7,spread=25+12*Math.sin(i/16*Math.PI),start=new T.Vector3(-264,level,55),tip=new T.Vector3(-264+Math.cos(angle)*spread,level+24,55+Math.sin(angle)*spread);
      pipe([start.toArray(),start.clone().lerp(tip,.45).add(new T.Vector3(0,3,0)).toArray(),tip.toArray()],.23,plinth);
      for(let j=1;j<=7;j++)for(const side of [-1,1]){const t=j/8,q=start.clone().lerp(tip,t),a=angle+side*.8,len=6.5+hash(i,j)*2.2,leaf=new T.PlaneGeometry(len,2,4,2),lp=leaf.attributes.position,lu=leaf.attributes.uv;
        for(let k=0;k<lp.count;k++){const u=lu.getX(k);lp.setY(k,lp.getY(k)*Math.pow(Math.sin(Math.PI*u),.8));lp.setZ(k,.28*Math.sin(Math.PI*u));}leaf.computeVertexNormals();q.x+=Math.cos(a)*len*.45;q.z+=Math.sin(a)*len*.45;q.y+=t*6;add(leaf,leafMaterial,q.toArray(),[-.35+hash(j,i)*.7,a,.12*side]);}
    }
  }
  add(new T.LatheGeometry([[0,0],[18,0],[19,2],[22,29],[22.5,32],[20.5,32],[20,28]].map(p=>new T.Vector2(...p)),32),stone,[-264,0,55]);
  // Full-height built-in on the empty left wall: 60 cm deep, six panelled doors.
  // Its front stays over 60 cm behind the reading chair's nearest point.
  box(60,287,284,wardrobe,[-299.5,148.5,278],1);
  bar(57,9,282,wardrobe,[-301,4.5,278]);
  box(63.5,6,287,wardrobe,[-297.75,294.5,278],.7);
  for(let i=0;i<6;i++){const z=160.5+i*47;
    box(2.2,269,46.2,wardrobe,[-268.4,147.5,z],.6);
    frame(37,238,wardrobe,[-266.5,147.5,z],[0,Math.PI/2,0],1.2);
    const hz=z+(i%2===0?17:-17);add(new T.CylinderGeometry(.48,.48,18,10),brass,[-263.1,137,hz]);
    for(const y of [130,144])add(new T.CylinderGeometry(.38,.38,3,8),brass,[-264.4,y,hz],[0,0,Math.PI/2]);
  }
  // Bring the reading chair forward, outside the wardrobe door/access zone.
  const cx=-155,cz=316;add(new T.CylinderGeometry(34,35,4,40),brass,[cx,2,cz]);box(76,27,66,linen,[cx,17.5,cz+5],8);box(77,18,72,linen,[cx,35,cz+5],8);
  add(new T.LatheGeometry([[31,4],[38,7],[44,48],[44,66],[40,77],[34,75],[32,61],[29,24],[31,4]].map(p=>new T.Vector2(...p)),48,Math.PI/2,Math.PI),linen,[cx,0,cz]);
  // Bound neutral rug under the bed, with a small original irregular weave.
  const weave=document.createElement('canvas');weave.width=weave.height=256;const wc=weave.getContext('2d'),wi=wc.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4,v=222+8*Math.sin(x*Math.PI/2)+6*Math.sin(y*Math.PI/2)+(hash(x,y)-.5)*11;wi.data[i]=wi.data[i+1]=wi.data[i+2]=v;wi.data[i+3]=255;}wc.putImageData(wi,0,0);const rugMap=new T.CanvasTexture(weave);rugMap.colorSpace=T.SRGBColorSpace;rugMap.wrapS=rugMap.wrapT=T.RepeatWrapping;rugMap.repeat.set(17,21);textures.push(rugMap);
  const rug=material('Bedroom wool rug',{color:'#cfc4ae',map:rugMap,normalMap:textileNormal,normalScale:new T.Vector2(.15,.15),roughness:1});box(283,.9,348,rug,[176,.35,236],.2);
  // A compact tiered chandelier, using one merged mesh per material. Opaque
  // facets avoid transmission buffers and keep the existing shader family.
  const chandelier={position:[100,239,180],power:14000};
  add(new T.CylinderGeometry(8,8,2,24),brass,[100,298,180]);add(new T.CylinderGeometry(.7,.7,24,12),brass,[100,285,180]);
  for(const [radius,y]of [[42,272],[34,258],[23,244]]){add(new T.CylinderGeometry(radius,radius,3.2,64,1,true),brass,[100,y,180]);}
  for(const[radius,count,top,length]of [[41,40,270,25],[33,32,256,25],[22,22,242,20]])for(let i=0;i<count;i++){const angle=i/count*Math.PI*2,x=100+Math.sin(angle)*radius,z=180+Math.cos(angle)*radius;add(new T.CylinderGeometry(.22,.22,4,6),brass,[x,top-2,z]);const drop=new T.SphereGeometry(1,6,4).toNonIndexed();drop.scale(2.1,length/2,2.1);drop.computeVertexNormals();add(drop,crystal,[x,top-length/2,z],[0,angle,0]);}
  add(new T.CylinderGeometry(21,21,.6,40),shade,[100,241,180]);
  bar(660,4,6,ceiling,[0,286,-21]);for(const x of [-326.5,326.5])bar(6,4,535,ceiling,[x,286,242]);
  for(const[m,parts]of buckets){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());const mesh=new T.Mesh(g,m);mesh.castShadow=m!==wall&&m!==ceiling;mesh.receiveShadow=m!==ceiling;root.add(mesh);}
  for(const g of roundedCache.values())g.dispose();
  const glow=document.createElement('canvas');glow.width=4;glow.height=128;const gc=glow.getContext('2d'),gradient=gc.createLinearGradient(0,0,0,128);gradient.addColorStop(0,'rgba(255,244,220,.68)');gradient.addColorStop(.35,'rgba(255,242,214,.2)');gradient.addColorStop(1,'rgba(255,242,214,0)');gc.fillStyle=gradient;gc.fillRect(0,0,4,128);
  const glowMap=new T.CanvasTexture(glow);glowMap.colorSpace=T.SRGBColorSpace;textures.push(glowMap);const glowMat=new T.MeshBasicMaterial({name:'Bedroom cove wall wash',map:glowMap,transparent:true,depthWrite:false,color:'#ffe6be',opacity:0});
  for(const[w,p,r]of [[660,[0,276,-24.4],[0,0,0]],[535,[-328.9,276,242],[0,Math.PI/2,0]],[535,[328.9,276,242],[0,-Math.PI/2,0]]]){const mesh=new T.Mesh(new T.PlaneGeometry(w,28),glowMat);mesh.position.fromArray(p);mesh.rotation.set(...r);root.add(mesh);}
  return{root,lampPositions,chandelier,update(mode,lamps){const on=lamps&&mode!=='inspection';shade.emissiveIntensity=on?.45:0;crystal.emissiveIntensity=on?.12:0;glowMat.opacity=on?(mode==='daylight'?.1:.6):0;},dispose(){textures.forEach(t=>t.dispose());}};
}

export function adaptBedroomContacts(contacts){
  for(const[i,[x,z,w,d]]of [[184,204,196,236],[60,93,43,46],[308,93,43,46],[-155,316,88,86]].entries()){const mesh=contacts.children[i];if(!mesh)continue;mesh.position.set(x,1.08,z);mesh.scale.set(w*1.2/mesh.geometry.parameters.width,d*1.3/mesh.geometry.parameters.height,1);}
}
