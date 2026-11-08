import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Experiment-only architecture. All dimensions are centimetres in room space.
// The original curtain, opening aperture and FIXED140 radiator remain untouched.
export function createGardenWindow({T,room,materials,gardenMap,eveningBrightness=.085,viewKey='shared'}){
 const root=new T.Group();root.name='PVC window and garden';
 const owned=[],textures=[],profiles=new Map();let lastFixedWindow=null;
 const standard=(name,options)=>{const m=new T.MeshStandardMaterial({name,...options});owned.push(m);return m;};
 const pvc=standard('Anthracite PVC frame',{color:'#414846',roughness:.36});
 const edge=standard('PVC profile highlight',{color:'#59615e',roughness:.31});
 const seal=standard('Window EPDM seals',{color:'#141b19',roughness:.91});
 const sill=standard('Warm white window sill',{color:'#e1dfd5',roughness:.48});
 const hardware=standard('Window satin hardware',{color:'#6c7470',roughness:.3});
 const wall=materials.get('WALL_MATERIAL');
 const garden=new T.MeshBasicMaterial({name:'User garden photograph',map:gardenMap,color:'#ffffff'});owned.push(garden);
 // Soft interior highlights and angle-dependent opacity suggest glazing without
 // refraction targets or an expensive live reflection camera.
 const c=document.createElement('canvas');c.width=32;c.height=128;const ctx=c.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,128);
 gradient.addColorStop(0,'#fbf5e8');gradient.addColorStop(.26,'#b5c3c1');gradient.addColorStop(.65,'#6b7773');gradient.addColorStop(1,'#b9b3a3');ctx.fillStyle=gradient;ctx.fillRect(0,0,32,128);ctx.fillStyle='rgba(250,247,234,.07)';ctx.fillRect(5,0,3,112);ctx.fillStyle='rgba(250,247,234,.035)';ctx.fillRect(23,0,7,92);
 const reflection=new T.CanvasTexture(c);reflection.colorSpace=T.SRGBColorSpace;textures.push(reflection);
 const glass=new T.MeshBasicMaterial({name:'Window subtle glass reflection',map:reflection,color:'#e9f0ef',transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide});owned.push(glass);
 glass.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vGlassNormal; varying vec3 vGlassView;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGlassNormal=normalize(normalMatrix*normal);vGlassView=-(modelViewMatrix*vec4(position,1.)).xyz;');
  shader.fragmentShader='varying vec3 vGlassNormal; varying vec3 vGlassView;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=.65+1.8*pow(1.-abs(dot(normalize(vGlassNormal),normalize(vGlassView))),3.);');
 };glass.customProgramCacheKey=()=> 'garden-window-glass-1';

 // Remove only the old window bars from the merged TRIM mesh. Cornices,
 // skirting outside this opening and the furniture materials are retained.
 const oldFrame=room.getObjectByName('TRIM');
 if(oldFrame){const original=oldFrame.geometry,g=original.clone(),p=g.attributes.position,index=g.index,keep=[];
  for(let i=0;i<(index?index.count:p.count);i+=3){const ids=[0,1,2].map(n=>index?index.getX(i+n):i+n);let x=0,y=0,z=0;for(const id of ids){x+=p.getX(id)/3;y+=p.getY(id)/3;z+=p.getZ(id)/3;}if(!(Math.abs(x)<117&&y<248&&z<-10))keep.push(...ids);}
  g.setIndex(keep);oldFrame.geometry=g;original.dispose();
 }
 room.traverse(o=>{if(o.isMesh&&o.material?.name==='GLASS_VIEW')o.visible=false;});

 for(const [id,L,R,B,H]of [['STANDARD',-106,106,10,238],['FIXED140',-68,68,102,210]]){
  const group=new T.Group();group.name=id+' detailed window';profiles.set(id,group);root.add(group);
  const buckets=new Map();
  const add=(g,m,p=[0,0,0],r=[0,0,0])=>{g.rotateX(r[0]);g.rotateY(r[1]);g.rotateZ(r[2]);g.translate(...p);const list=buckets.get(m)||[];list.push(g);buckets.set(m,list);};
  const box=(w,h,d,m,p)=>add(new T.BoxGeometry(w,h,d),m,p);
  // Recess begins at the existing plaster face and returns 25 cm outdoors.
  for(const x of [L-1.5,R+1.5])box(3,H-B+3,26,wall,[x,(B+H)/2,-36.5]);
  box(R-L+6,3,26,wall,[0,H+1.5,-36.5]);
  // Rounded leading sill edge, wholly behind the protected cloth envelope.
  box(R-L+12,3.2,34,sill,[0,B-2,-37]);
  const lip=new T.CylinderGeometry(.75,.75,R-L+12,8);add(lip,sill,[0,B-1.1,-20.75],[0,0,Math.PI/2]);
  box(R-L+5,.6,2,seal,[0,B-3.9,-23]);
  const z=-49,frameW=5.5;
  function rectangle(l,r,b,t,width,depth,material,zPos,transform){
   for(const[w,h,x,y]of [[width,t-b,l+width/2,(b+t)/2],[width,t-b,r-width/2,(b+t)/2],[r-l-2*width,width,(l+r)/2,b+width/2],[r-l-2*width,width,(l+r)/2,t-width/2]]){
    const g=new T.BoxGeometry(w,h,depth);g.translate(x,y,zPos);if(transform)g.applyMatrix4(transform);add(g,material);
   }
  }
  rectangle(L,R,B,H,frameW,7,pvc,z);
  rectangle(L+.7,R-.7,B+.7,H-.7,.8,.8,edge,z+3.7);
  rectangle(L+frameW,R-frameW,B+frameW,H-frameW,.75,1,seal,z+2.6);
  box(5,H-B-2*frameW,7,pvc,[0,(B+H)/2,z]);box(.7,H-B-2*frameW,.8,edge,[1.4,(B+H)/2,z+3.7]);
  const low=B+frameW+1,high=H-frameW-1;
  const angle=38*Math.PI/180,hinge=L+frameW+1;
  const swing=new T.Matrix4().makeTranslation(hinge,0,z+1).multiply(new T.Matrix4().makeRotationY(angle)).multiply(new T.Matrix4().makeTranslation(-hinge,0,-z-1));
  for(const [left,right,open]of [[hinge,-3.5,true],[3.5,R-frameW-1,false]]){
   const transform=open?swing:null,width=4;
   rectangle(left,right,low,high,width,5.3,pvc,z+1,transform);
   rectangle(left+.8,right-.8,low+.8,high-.8,.7,.7,edge,z+3.9,transform);
   rectangle(left+width,right-width,low+width,high-width,.7,.8,seal,z+3.6,transform);
   const plane=new T.PlaneGeometry(right-left-2*width-.7,high-low-2*width-.7);plane.translate((left+right)/2,(low+high)/2,z+1.8);if(transform)plane.applyMatrix4(transform);add(plane,glass);
   const handleX=open?right-2:left+2,handleY=(low+high)/2;
   for(const[w,h,d,x,y,zPos]of [[1.8,6,1.1,handleX,handleY,z+4.8],[1.1,1.1,3,handleX,handleY+1,z+6],[1.15,8,1.2,handleX,handleY-2,z+7.1]]){
    const g=new T.BoxGeometry(w,h,d);g.translate(x,y,zPos);if(transform)g.applyMatrix4(transform);add(g,hardware);
   }
   for(const y of [low+18,high-18]){const g=new T.CylinderGeometry(.8,.8,5,10);g.translate(open?left+.8:right-.8,y,z+3.8);if(transform)g.applyMatrix4(transform);add(g,hardware);}
  }
  // Two drainage slots and a neat outer drip edge make the profile legible.
  for(const x of [L+24,R-24])box(4,.65,.35,seal,[x,B+2.5,z+3.6]);
  box(R-L+4,1.4,11,pvc,[0,B-1.3,z-3]);
  const photoSize=id==='STANDARD'?340:260,photoX=id==='STANDARD'?-35:0,photoY=id==='STANDARD'?125:140;
  const aspect=gardenMap.image.width/gardenMap.image.height;
  // Portrait photos retain their aspect and cover the entire opening,
  // including the close curtain camera. Favour its garden over the foreground.
  const photoWidth=photoSize*Math.max(1,aspect),photoHeight=photoWidth/aspect;
  const centreX=viewKey==='bedroom'?0:photoX;
  const centreY=viewKey==='bedroom'?(id==='STANDARD'?32:52):viewKey==='lounge'?(id==='STANDARD'?92:98):photoY-(photoHeight-photoSize)*.4;
  add(new T.PlaneGeometry(photoWidth,photoHeight),garden,[centreX,centreY,-180]);
  for(const[m,parts]of buckets){const g=mergeGeometries(parts);parts.forEach(part=>part.dispose());const mesh=new T.Mesh(g,m);mesh.castShadow=false;mesh.receiveShadow=m.isMeshStandardMaterial;group.add(mesh);}
  group.userData={opening:{left:L,right:R,bottom:B,top:H},outwardOpeningDegrees:38,photographAspect:aspect};
 }
 return{root,update(fixed140,mode){
  profiles.get('STANDARD').visible=!fixed140;profiles.get('FIXED140').visible=fixed140;
  const fixed=room.getObjectByName('FIXED140_WINDOW');
  if(fixed&&fixed!==lastFixedWindow){for(const child of fixed.children)if(child.material?.name!=='WALL_MATERIAL')child.visible=false;lastFixedWindow=fixed;}
  garden.color.setScalar(mode==='evening'?eveningBrightness:.9);if(mode==='evening')garden.color.multiply(new T.Color('#bbd0ee'));
  glass.opacity=mode==='evening'?.16:.1;
 },dispose(){owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
