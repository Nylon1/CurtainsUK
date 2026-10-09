import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const LIVING_PRESET=Object.freeze({CEILING_MATERIAL:0,WALL_MATERIAL:0,FLOOR_MATERIAL:4,SOFA_UPHOLSTERY:0,ARMCHAIR_UPHOLSTERY:0,CUSHION_UPHOLSTERY:0});
export const LIVING_STYLE='Sculpted ivory & brass';
export const LIVING_DESCRIPTION='An ivory corner sofa, marble tables and warm brass around the original fireplace.';

/** Original centimetre-scale furniture. Fireplace and curtain scenes stay separate. */
export function createInspiredLiving({T,room,materials,textileNormal}){
  const root=new T.Group();root.name='Living — sculpted ivory';room.children[0].add(root);
  const replaced=new Set(['RUG_FIXED','DARK_TIMBER','SOFA_UPHOLSTERY','CUSHION_UPHOLSTERY','ARMCHAIR_UPHOLSTERY','TIMBER','PAPER','LINEN_FIXED','CERAMIC','BRASS','SHADE','FOLIAGE']);
  room.traverse(o=>{if(o.isMesh&&replaced.has(o.material?.name))o.visible=false;});
  const textures=[],buckets=new Map(),cache=new Map();
  const sofa=materials.get('SOFA_UPHOLSTERY'),chair=materials.get('ARMCHAIR_UPHOLSTERY'),cushion=materials.get('CUSHION_UPHOLSTERY'),wall=materials.get('WALL_MATERIAL'),ceiling=materials.get('CEILING_MATERIAL');
  for(const m of [sofa,chair,cushion]){m.normalMap=textileNormal;m.normalScale.set(.24,.24);m.roughness=.94;}
  const mat=(name,options)=>new T.MeshStandardMaterial({name,...options});
  const brass=mat('Living satin BRASS',{color:'#c7b17a',roughness:.37,metalness:.42});
  const dark=mat('Living dark bronze',{color:'#443a2b',roughness:.45,metalness:.4});
  const paper=mat('Living warm paper',{color:'#e4ddd0',roughness:.95});
  const bulb=mat('Living chandelier diffuser',{color:'#efe6d0',roughness:.56,emissive:'#ffe0a0',emissiveIntensity:0});
  const relief=mat('Living champagne relief',{color:'#bcb6a4',roughness:.48});
  const stoneBack=mat('Living limestone feet',{color:'#dcd6c9',roughness:.72});
  function add(g,m,p=[0,0,0],r=[0,0,0]){if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));g.rotateX(r[0]);g.rotateY(r[1]);g.rotateZ(r[2]);g.translate(...p);const list=buckets.get(m)||[];list.push(g);buckets.set(m,list);}
  function rounded(w,h,d,r){const key=[w,h,d,r].join(':');if(cache.has(key))return cache.get(key).clone();const seg=5,g=new T.BoxGeometry(2,2,2,seg,seg,seg),p=g.attributes.position,n=g.attributes.normal,v=new T.Vector3(),q=new T.Vector3(),inner=new T.Vector3(w/2-r,h/2-r,d/2-r);for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);q.set(v.x-Math.sign(v.x)/seg,v.y-Math.sign(v.y)/seg,v.z-Math.sign(v.z)/seg).normalize();p.setXYZ(i,Math.sign(v.x)*inner.x+q.x*r,Math.sign(v.y)*inner.y+q.y*r,Math.sign(v.z)*inner.z+q.z*r);n.setXYZ(i,q.x,q.y,q.z);}cache.set(key,g);return g.clone();}
  const box=(w,h,d,m,p,r=1,rotation=[0,0,0])=>add(rounded(w,h,d,Math.min(r,w/3,h/3,d/3)),m,p,rotation);
  const bar=(w,h,d,m,p,r=[0,0,0])=>add(new T.BoxGeometry(w,h,d),m,p,r);
  function cylinderBetween(a,b,r,m,sides=10){const start=new T.Vector3(...a),end=new T.Vector3(...b),direction=end.clone().sub(start),g=new T.CylinderGeometry(r,r,direction.length(),sides);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize()));add(g,m,start.add(end).multiplyScalar(.5).toArray());}
  function pillow(w,h,d){const g=new T.BoxGeometry(w,h,d,20,18,2),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i)/(w/2),y=p.getY(i)/(h/2),z=p.getZ(i)/(d/2),bulge=Math.pow(Math.max(0,(1-x*x)*(1-y*y)),.53);p.setXYZ(i,x*w/2*(1-.03*Math.pow(Math.abs(y),8)),y*h/2*(1-.025*Math.pow(Math.abs(x),8)),z*(1+(d/2-1)*bulge)+.24*Math.sin(x*21+y*6)*Math.pow(Math.abs(x*y),3));}g.computeVertexNormals();return g;}
  function upholsteredShell(points,steps){
    const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),sides=18,positions=[],uvs=[],indices=[];
    for(let i=0;i<=steps;i++){const t=i/steps,p=path.getPoint(t),tan=path.getTangent(t),ny=44+10*Math.pow(Math.sin(Math.PI*t),.65),ry=27+4*Math.sin(Math.PI*t);for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,nx=tan.z,nz=-tan.x;positions.push(p.x+Math.cos(a)*14*nx,ny+Math.sin(a)*ry,p.z+Math.cos(a)*14*nz);uvs.push(t*3,j/sides);if(i<steps&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}}}
    for(const end of [0,steps]){const p=path.getPoint(end/steps),centre=positions.length/3;positions.push(p.x,44,p.z);uvs.push(.5,.5);for(let j=0;j<sides;j++){const k=end*(sides+1)+j;if(end===0)indices.push(centre,k+1,k);else indices.push(centre,k,k+1);}}
    const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(positions,3));shell.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));shell.setIndex(indices);shell.computeVertexNormals();return shell;
  }
  function seating(w,x,z,angle,m,isSofa){
    const part=(g,material,p=[0,0,0],r=[0,0,0])=>{g.rotateX(r[0]);g.rotateY(r[1]);g.rotateZ(r[2]);g.translate(...p);add(g,material,[x,0,z],[0,angle,0]);};
    part(rounded(w-19,7,72,2),dark,[0,4.5,0]);
    part(rounded(w-8,24,85,9),m,[0,19,1]);
    // A continuous swept oval forms the rounded back and both generous arms.
    part(upholsteredShell([[-w/2+15,0,31],[-w/2+12,0,1],[-w/2+21,0,-30],[0,0,-41],[w/2-21,0,-30],[w/2-12,0,1],[w/2-15,0,31]],isSofa?88:64),m);
    const count=isSofa?3:1,seatW=(w-56)/count;
    for(let i=0;i<count;i++){const sx=(i-(count-1)/2)*(seatW+1);part(rounded(seatW,15,62,6),m,[sx,38,9]);part(pillow(seatW-1,43,16),m,[sx,63,-15],[-.18,0,(i-(count-1)/2)*.025]);}
    if(isSofa)for(const side of [-1,1])part(pillow(36,37,13),cushion,[side*(w/2-45),58,5],[-.16,side*.13,side*.12]);
    else part(pillow(40,35,13),cushion,[3,61,-3],[-.17,.06,-.04]);
    for(const side of [-1,1]){
      // Fine welted oval and small original brass loop, not a copied ornament.
      const pts=[];for(let i=0;i<49;i++){const a=i/48*Math.PI*2;pts.push(new T.Vector3(side*(w/2-15)+Math.cos(a)*12.7,44+Math.sin(a)*25.5,32));}
      part(new T.TubeGeometry(new T.CatmullRomCurve3(pts,true),48,.24,5,true),m);
      part(new T.TorusGeometry(2.1,.58,7,20),brass,[side*(w/2-15),58,33.1]);
      const drop=new T.SphereGeometry(1,10,7);drop.scale(1.05,3.2,.7);part(drop,brass,[side*(w/2-15),53.5,33.3]);
    }
  }
  // One connected L-shaped sectional replaces the separate left-hand seating.
  // The return follows the left wall, leaving both window and firebox rays clear.
  const sectionalStart=new Map([...buckets].map(([m,parts])=>[m,parts.length]));
  const sectionalOutline=new T.Shape();sectionalOutline.moveTo(-300,-112);sectionalOutline.lineTo(-101,-112);sectionalOutline.quadraticCurveTo(-91,-112,-91,-122);sectionalOutline.lineTo(-91,-184);sectionalOutline.quadraticCurveTo(-91,-195,-102,-195);sectionalOutline.lineTo(-205,-195);sectionalOutline.quadraticCurveTo(-214,-195,-214,-204);sectionalOutline.lineTo(-214,-319);sectionalOutline.quadraticCurveTo(-214,-330,-225,-330);sectionalOutline.lineTo(-300,-330);sectionalOutline.quadraticCurveTo(-310,-330,-310,-320);sectionalOutline.lineTo(-310,-123);sectionalOutline.quadraticCurveTo(-310,-112,-300,-112);
  const sectionalBase=new T.ExtrudeGeometry(sectionalOutline,{depth:10,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:5,bevelThickness:6,curveSegments:8});sectionalBase.rotateX(-Math.PI/2);add(sectionalBase,sofa,[0,15,0]);
  box(205,7,70,dark,[-199,4.5,156],2);box(78,7,127,dark,[-263,4.5,258],2);
  add(upholsteredShell([[-227,0,325],[-266,0,328],[-297,0,309],[-299,0,178],[-293,0,125],[-267,0,114],[-159,0,114],[-114,0,126],[-101,0,156],[-101,0,185]],112),sofa);
  for(const x of [-254,-198,-142]){box(55,15,64,sofa,[x,37,158],6);add(pillow(54,43,16),sofa,[x,63,132],[-.18,0,0]);}
  for(const z of [221,287]){box(66,15,64,sofa,[-252,37,z],6);add(pillow(60,43,16),sofa,[-279,63,z],[-.18,Math.PI/2,0]);}
  add(pillow(36,37,13),cushion,[-252,58,159],[-.15,.38,-.12]);add(pillow(36,37,13),cushion,[-131,58,156],[-.16,-.13,.12]);add(pillow(36,37,13),cushion,[-255,58,276],[-.12,Math.PI/2,.1]);
  for(const [x,z,angle]of [[-101,186,0],[-225.8,325,Math.PI/2]]){const pts=[];for(let i=0;i<49;i++){const a=i/48*Math.PI*2;pts.push(new T.Vector3(Math.cos(a)*12.7,Math.sin(a)*25.5,0));}add(new T.TubeGeometry(new T.CatmullRomCurve3(pts,true),48,.24,5,true),sofa,[x,44,z],[0,angle,0]);add(new T.TorusGeometry(2.1,.58,7,20),brass,[x,58,z+.6],[0,angle,0]);}
  for(const[m,parts]of buckets)for(const g of parts.slice(sectionalStart.get(m)||0))g.translate(18,0,-4);

  seating(105,246,230,-.5,chair,false);
  // Original restrained marble veining, shared by the two table tops and relief.
  const mc=document.createElement('canvas');mc.width=mc.height=512;const ctx=mc.getContext('2d'),im=ctx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){const i=(y*512+x)*4,v=242+2*Math.sin(x*.016+Math.sin(y*.022))+Math.sin(x*1.7+y*1.3);im.data[i]=v;im.data[i+1]=v-1;im.data[i+2]=v-3;im.data[i+3]=255;}ctx.putImageData(im,0,0);
  for(let i=0;i<7;i++){const x=(i*137+43)%512;for(const [width,alpha]of [[7,.028],[2.4,.11],[.65,.15]]){ctx.beginPath();ctx.moveTo(x-80,-15);ctx.bezierCurveTo(x+104,135,x-113,311,x+113,528);ctx.lineWidth=width;ctx.strokeStyle=`rgba(101,97,88,${alpha})`;ctx.stroke();}ctx.beginPath();ctx.moveTo(x+2,245);ctx.bezierCurveTo(x-36,284,x+72,370,x+161,403);ctx.lineWidth=.65;ctx.strokeStyle='rgba(112,106,91,.12)';ctx.stroke();}
  const marbleMap=new T.CanvasTexture(mc);marbleMap.colorSpace=T.SRGBColorSpace;textures.push(marbleMap);
  const marble=mat('Living veined marble',{color:'#ffffff',map:marbleMap,roughness:.4});
  function table(radius,height,x,z){
    for(const a of [0,Math.PI*2/3,Math.PI*4/3])add(new T.CylinderGeometry(radius*.2,radius*.21,height-10,24),stoneBack,[x+Math.sin(a)*radius*.59,(height-10)/2,z+Math.cos(a)*radius*.59]);
    const rim=new T.CylinderGeometry(radius,radius,8,128,1,false),rp=rim.attributes.position;for(let i=0;i<rp.count;i++){const a=Math.atan2(rp.getX(i),rp.getZ(i)),factor=1+.009*Math.cos(a*64);rp.setX(i,rp.getX(i)*factor);rp.setZ(i,rp.getZ(i)*factor);}rim.computeVertexNormals();add(rim,brass,[x,height-5,z]);
    add(new T.CylinderGeometry(radius-.8,radius-.8,2.3,64),marble,[x,height-.9,z]);
  }
  table(56,39,29,283);table(34,47,-63,258);
  box(28,2.2,21,dark,[39,40.6,277],.25,[0,-.12,0]);box(25,.5,19,paper,[39,41.9,277],.1,[0,-.12,0]);
  // Broad warm abstract rug with an irregular bound edge, drawn from new shapes.
  const rc=document.createElement('canvas');rc.width=rc.height=512;const rctx=rc.getContext('2d'),ri=rctx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){const i=(y*512+x)*4,field=Math.sin(x*.019+2*Math.sin(y*.009))+Math.sin(y*.026+Math.sin(x*.013))+.5*Math.sin(x*.046+y*.019),mix=Math.max(0,Math.min(.8,(field-.3)*.32)),grain=2*Math.sin(x*1.8+y*2.3);ri.data[i]=234-mix*56+grain;ri.data[i+1]=229-mix*65+grain;ri.data[i+2]=215-mix*89+grain;ri.data[i+3]=255;}rctx.putImageData(ri,0,0);
  const rugMap=new T.CanvasTexture(rc);rugMap.colorSpace=T.SRGBColorSpace;textures.push(rugMap);
  const rugMat=mat('Living cream gold wool rug',{color:'#ffffff',map:rugMap,roughness:1,normalMap:textileNormal,normalScale:new T.Vector2(.18,.18)});
  const outline=new T.Shape();outline.moveTo(-283,-151);outline.bezierCurveTo(-201,-161,-146,-166,-94,-162);outline.bezierCurveTo(8,-171,49,-161,99,-162);outline.bezierCurveTo(167,-170,217,-149,285,-155);outline.bezierCurveTo(302,-88,284,-12,299,52);outline.bezierCurveTo(281,112,300,159,279,167);outline.bezierCurveTo(190,181,146,168,93,177);outline.bezierCurveTo(10,164,-45,187,-116,173);outline.bezierCurveTo(-183,180,-224,165,-284,169);outline.bezierCurveTo(-300,89,-284,36,-299,-20);outline.bezierCurveTo(-287,-78,-305,-124,-283,-151);
  const rugGeo=new T.ShapeGeometry(outline,8),rugPos=rugGeo.attributes.position,rugUv=rugGeo.attributes.uv;for(let i=0;i<rugPos.count;i++)rugUv.setXY(i,(rugPos.getX(i)+310)/620,(rugPos.getY(i)+190)/380);rugGeo.scale(1,.76,1);add(rugGeo,rugMat,[-6,.65,230],[-Math.PI/2,0,0]);
  // Panel frames leave both the unchanged fireplace and the curtains clear.
  function frame(w,h,p,r=[0,0,0]){for(const[bw,bh,x,y]of [[w,2.1,0,h/2],[w,2.1,0,-h/2],[2.1,h,-w/2,0],[2.1,h,w/2,0]]){const g=new T.BoxGeometry(bw,bh,1.6);g.translate(x,y,0);add(g,wall,p,r);}}
  for(const x of [-222,230]){frame(166,248,[x,144,-23]);frame(159,241,[x,144,-22.7]);}
  for(const x of [-328,328])for(const z of [133,344])frame(174,237,[x,147,z],[0,x<0?Math.PI/2:-Math.PI/2,0]);
  for(const[y,h,d]of [[276,2,2],[282,3,4],[289,6,8]]){bar(660,h,d,ceiling,[0,y,-25+d/2]);for(const side of [-1,1])bar(d,h,535,ceiling,[side*(330-d/2),y,242]);}
  for(let x=-320;x<=320;x+=13)bar(4,3,2.5,ceiling,[x,272.5,-22.5]);
  // Three overlapping circular reliefs suggest the reference's wall composition.
  for(const[r,x,y,z,m]of [[38,206,206,-21.3,relief],[31,263,202,-19.1,relief],[27,231,167,-16.8,marble]]){
    add(new T.CylinderGeometry(r,r,1,64),m,[x,y,z],[Math.PI/2,0,0]);add(new T.TorusGeometry(r,.65,8,64),brass,[x,y,z+.7]);
  }
  // Compact sculptural starburst: opaque surfaces avoid transmission buffers.
  const centre=new T.Vector3(-38,267,286);add(new T.CylinderGeometry(6,6,2,20),brass,[-38,298,286]);cylinderBetween([-38,298,286],centre.toArray(),.55,brass);
  const hub=new T.SphereGeometry(1,16,10);hub.scale(8,7,8);add(hub,brass,centre.toArray());
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2,direction=new T.Vector3(Math.cos(a),Math.sin(a)*.38,Math.sin(a)*.63).normalize(),length=39+(i%3)*7,end=centre.clone().addScaledVector(direction,length),inner=centre.clone().addScaledVector(direction,9);
    cylinderBetween(inner.toArray(),end.toArray(),.55,brass);const tip=end.clone().addScaledVector(direction,13);cylinderBetween(end.toArray(),tip.toArray(),.85,bulb,8);
    const leaf=new T.SphereGeometry(1,5,3);leaf.scale(4.5,8,1.5);leaf.rotateZ(a-.5);add(leaf,brass,centre.clone().addScaledVector(direction,23).toArray(),[.2,a,.3]);
  }
  const gc=document.createElement('canvas');gc.width=4;gc.height=128;const gctx=gc.getContext('2d'),gradient=gctx.createLinearGradient(0,0,0,128);gradient.addColorStop(0,'rgba(255,242,217,.65)');gradient.addColorStop(.35,'rgba(255,237,205,.2)');gradient.addColorStop(1,'rgba(255,235,200,0)');gctx.fillStyle=gradient;gctx.fillRect(0,0,4,128);const glowMap=new T.CanvasTexture(gc);glowMap.colorSpace=T.SRGBColorSpace;textures.push(glowMap);
  const glow=new T.MeshBasicMaterial({name:'Living cove wall wash',map:glowMap,transparent:true,depthWrite:false,color:'#ffe6bb',opacity:0});
  for(const[w,p,r]of [[660,[0,265,-24.4],[0,0,0]],[535,[-328.9,265,242],[0,Math.PI/2,0]],[535,[328.9,265,242],[0,-Math.PI/2,0]]])add(new T.PlaneGeometry(w,17),glow,p,r);
  for(const[m,parts]of buckets){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());const mesh=new T.Mesh(g,m);mesh.castShadow=!m.isMeshBasicMaterial&&m!==ceiling&&m!==wall&&m!==bulb;mesh.receiveShadow=!m.isMeshBasicMaterial&&m!==ceiling;root.add(mesh);}
  for(const g of cache.values())g.dispose();
  return{root,lampPositions:[[-38,249,286],[180,274,58]],lampPowers:[23000,7000],update(mode,lamps){const on=lamps&&mode!=='inspection';bulb.emissiveIntensity=on?1.05:0;glow.opacity=on?(mode==='daylight'?.08:.48):0;},dispose(){textures.forEach(t=>t.dispose());}};
}

export function adaptLivingContacts(contacts){
  if(contacts.children.length===3){const mesh=contacts.children[0].clone();mesh.geometry=mesh.geometry.clone();mesh.material=mesh.material.clone();contacts.add(mesh);}
  for(const[i,[x,z,w,d]]of [[-181,151,226,91],[-245,254,104,152],[246,230,125,125],[7,279,176,120]].entries()){const mesh=contacts.children[i];mesh.position.set(x,1.08,z);mesh.scale.set(w*1.2/mesh.geometry.parameters.width,d*1.3/mesh.geometry.parameters.height,1);}
}
