import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const OFFICE_PRESET=Object.freeze({CEILING_MATERIAL:0,WALL_MATERIAL:0,FLOOR_MATERIAL:1,DESK_SURFACE:3,OFFICE_CHAIR_UPHOLSTERY:1});
export const OFFICE_STYLE='Walnut executive';
export const OFFICE_DESCRIPTION='Walnut joinery, warm shelves and an ivory lounge chair frame a clear curtain view.';

/** Original room-only furniture, in centimetres. The curtain scene is untouched. */
export function createInspiredOffice({T,room,materials,textileNormal}){
  const root=new T.Group();root.name='Office — walnut executive';room.children[0].add(root);
  const replaced=new Set(['DESK_SURFACE','BRASS','DARK_METAL','SCREEN','CERAMIC','SHADE','PAPER','LINEN_FIXED','DARK_TIMBER','OFFICE_CHAIR_UPHOLSTERY','TIMBER','FOLIAGE','RUG_FIXED']);
  room.traverse(o=>{if(o.isMesh&&replaced.has(o.material?.name))o.visible=false;});
  const textures=[],buckets=new Map(),roundedCache=new Map();
  const material=(name,options)=>new T.MeshStandardMaterial({name,...options});
  function canvasMap(size,draw){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;textures.push(t);return t;}
  const grain=canvasMap(512,(ctx,size)=>{const data=ctx.createImageData(size,size);let seed=4317;for(let y=0;y<size;y++)for(let x=0;x<size;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const i=(y*size+x)*4,v=226+4*Math.sin(x*.18+Math.sin(y*.015)*2.8)+6*Math.sin(x*.77+Math.sin(y*.009)*5)+4*Math.sin(x*2.3+y*.003)+(seed/4294967296-.5)*8;data.data[i]=v;data.data[i+1]=v;data.data[i+2]=v;data.data[i+3]=255;}ctx.putImageData(data,0,0);});
  const walnut=material('Office walnut joinery',{color:'#806a54',map:grain,roughness:.56});
  const recess=material('Office recessed walnut',{color:'#443325',map:grain,roughness:.7});
  const desk=materials.get('DESK_SURFACE');desk.map=grain;desk.roughness=.47;
  const chair=materials.get('OFFICE_CHAIR_UPHOLSTERY');chair.roughness=.84;
  const metal=material('Office dark bronze',{color:'#302a23',metalness:.6,roughness:.4});
  const leather=material('Office desk leather',{color:'#4d463c',roughness:.93,normalMap:textileNormal,normalScale:new T.Vector2(.07,.07)});
  const paper=material('Office warm paper',{color:'#e4decf',roughness:.95});
  const bookCover=material('Office cloth book covers',{color:'#82786a',roughness:.96,normalMap:textileNormal,normalScale:new T.Vector2(.15,.15)});
  const ceramic=material('Office stoneware',{color:'#b4a28a',roughness:.86});
  const lightStrip=material('Office shelf diffuser',{color:'#eee0c3',roughness:.8,emissive:'#ffcf87',emissiveIntensity:0});
  const ceiling=materials.get('CEILING_MATERIAL');
  const ivory=material('Office ivory lounge upholstery',{color:'#ded4c2',roughness:.93,normalMap:textileNormal,normalScale:new T.Vector2(.22,.22)});
  function add(g,m,p=[0,0,0],r=[0,0,0]){g.rotateX(r[0]);g.rotateY(r[1]);g.rotateZ(r[2]);g.translate(...p);const parts=buckets.get(m)||[];parts.push(g);buckets.set(m,parts);}
  function rounded(w,h,d,r){const key=[w,h,d,r].join(':');if(roundedCache.has(key))return roundedCache.get(key).clone();const segments=5,g=new T.BoxGeometry(2,2,2,segments,segments,segments),p=g.attributes.position,n=g.attributes.normal,v=new T.Vector3(),q=new T.Vector3(),inner=new T.Vector3(w/2-r,h/2-r,d/2-r);for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);q.set(v.x-Math.sign(v.x)/segments,v.y-Math.sign(v.y)/segments,v.z-Math.sign(v.z)/segments).normalize();n.setXYZ(i,q.x,q.y,q.z);p.setXYZ(i,Math.sign(v.x)*inner.x+q.x*r,Math.sign(v.y)*inner.y+q.y*r,Math.sign(v.z)*inner.z+q.z*r);}roundedCache.set(key,g);return g.clone();}
  const box=(w,h,d,m,p,r=.5,rotation=[0,0,0])=>add(rounded(w,h,d,Math.min(r,w/3,h/3,d/3)),m,p,rotation);
  const bar=(w,h,d,m,p,r=[0,0,0])=>add(new T.BoxGeometry(w,h,d),m,p,r);
  function tube(points,r,m){add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,r,6,false),m);}
  const niches=[];
  // Two built-ins flank the opening. Their nearest front edges are 25+ cm
  // outside the full curtain envelope; neither occupies its camera sight lines.
  for(const [cx,width]of [[-231,178],[239,174]]){
    const left=cx-width/2,right=cx+width/2,openWidth=49,openX=cx+7;
    bar(width,285,2,recess,[cx,149,-22]);
    bar(width-5,8,36,recess,[cx,4,0]);
    for(const x of [left+1.3,right-1.3,openX-openWidth/2-1.1,openX+openWidth/2+1.1])box(2.6,284,39,walnut,[x,150,-2],.3);
    for(const y of [9.5,291])box(width,3,40,walnut,[cx,y,-2],.4);
    bar(width,7,40,walnut,[cx,296,-2]);
    // Closed flush walnut door fronts, with fine horizontal panel reveals.
    for(const [x,w]of [[(left+openX-openWidth/2)/2,openX-openWidth/2-left-3.6],[(right+openX+openWidth/2)/2,right-openX-openWidth/2-3.6]]){
      for(const [y,h]of [[49,75],[154,132],[256,68]])box(w,h,2.5,walnut,[x,y,17.9],.4);
      bar(.55,89,.6,metal,[x+w/2-4,125,19.5]);
    }
    for(const y of [10,65,121,177,233,290]){
      box(openWidth,2.4,36,walnut,[openX,y,-2],.25);
      if(y>10){bar(openWidth-4,.5,1.3,lightStrip,[openX,y-1.6,10]);niches.push({x:openX,top:y-1.7,bottom:y-54,width:openWidth-2});}
    }
    // A few quiet books and vessels establish shelf depth, without clutter.
    for(const [level,count,start]of [[0,5,-13],[2,4,-9]])for(let i=0;i<count;i++){
      const h=19+(i*7%11),x=openX+start+i*5.1,y=12+level*56+h/2;
      box(3.8,h,15,paper,[x,y,-2],.15);box(.55,h+.9,16,bookCover,[x-2,y,-2],.1);
    }
    add(new T.LatheGeometry([[0,0],[6,0],[7,3],[8,8],[6,12],[3,15],[3,18],[2,18]].map(p=>new T.Vector2(...p)),20),ceramic,[openX+7,66.3,-3]);
    box(21,2.6,15,bookCover,[openX-2,180,0],.25);box(23,2.5,16,paper,[openX-1,182.5,0],.2);
  }
  // Desk and tall chair stay on the left: the window remains the focal point.
  const dx=-161,dz=210;
  box(201,3.8,84,desk,[dx,76.1,dz],.8);
  box(197,1.3,80,metal,[dx,73.8,dz],.3);
  box(116,40,3,desk,[dx-12,50,dz-11],.4);
  // Slim angled trestle and integrated right-hand drawer pedestal.
  box(4,73,67,metal,[dx-88,37,dz],.6,[0,0,-.085]);
  box(48,66,73,desk,[dx+73,36,dz-1],.8);
  bar(44,5,68,metal,[dx+73,3,dz-1]);
  for(const [y,h]of [[23,31],[55,29]]){box(45,h,2,desk,[dx+73,y,dz+36.8],.3);bar(19,.65,1.5,metal,[dx+73,y+h/2-4,dz+38.4]);}
  box(92,.35,40,leather,[dx-17,78.3,dz+3],.1);
  // Closed notebook and pen, kept below the sill and curtain view.
  box(22,1.3,29,bookCover,[dx+61,78.8,dz+5],.2,[0,-.12,0]);
  add(new T.CylinderGeometry(.23,.23,14,8),metal,[dx+18,78.8,dz-4],[Math.PI/2,0,.12]);
  const cx=-168,cz=121;
  add(new T.CylinderGeometry(2.4,3.4,33,16),metal,[cx,22,cz]);
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const g=new T.BoxGeometry(3,2.3,29);g.translate(0,0,14);add(g,metal,[cx,5,cz],[0,a,0]);add(new T.SphereGeometry(2.8,10,6),metal,[cx+Math.sin(a)*28,3,cz+Math.cos(a)*28]);}
  box(57,13,57,chair,[cx,43,cz+3],5);
  box(59,79,14,chair,[cx,84,cz-21],5,[-.08,0,0]);
  box(46,31,8,chair,[cx,101,cz-11.7],4,[-.08,0,0]);
  box(44,33,8,chair,[cx,67,cz-9.8],4,[-.08,0,0]);
  for(const side of [-1,1]){tube([[cx+side*23,42,cz-14],[cx+side*31,59,cz-12],[cx+side*31,61,cz+20]],1.1,metal);box(7,5,40,chair,[cx+side*31,63,cz+3],2);}
  // A low guest bench echoes the reference, remaining left of all curtain rays.
  box(77,4,42,desk,[-165,42,326],.8);
  for(const x of [-191,-139])box(3.5,39,33,desk,[x,20.5,326],.45,[0,0,x<-165?-.08:.08]);
  // A sculpted lounge armchair on the right, turned towards the desk. Its
  // forward edge stays outside the window's sight line throughout curtain travel.
  const ax=244,az=237,angle=-.28;
  const armchairAdd=(g,m,p=[0,0,0],r=[0,0,0])=>{g.rotateX(r[0]);g.rotateY(r[1]);g.rotateZ(r[2]);g.translate(...p);add(g,m,[ax,0,az],[0,angle,0]);};
  const armchairBox=(w,h,d,m,p,r=4,rotation=[0,0,0])=>armchairAdd(rounded(w,h,d,Math.min(r,w/3,h/3,d/3)),m,p,rotation);
  armchairBox(77,7,75,walnut,[0,4.5,0],2);
  armchairBox(92,25,89,ivory,[0,21,0],8);
  armchairBox(72,18,71,ivory,[0,40,7],7);
  armchairBox(91,60,18,ivory,[0,52,-34],6,[-.1,0,0]);
  for(const side of [-1,1])armchairBox(19,44,89,ivory,[side*42,40,1],6,[0,0,side*-.035]);
  // A pinched, softly bulging back cushion avoids a rigid box silhouette.
  const back=new T.BoxGeometry(67,46,14,18,16,2),bp=back.attributes.position;
  for(let i=0;i<bp.count;i++){const x=bp.getX(i)/33.5,y=bp.getY(i)/23,z=bp.getZ(i)/7,bulge=Math.pow(Math.max(0,(1-x*x)*(1-y*y)),.52);bp.setXYZ(i,x*33.5*(1-.025*Math.pow(Math.abs(y),8)),y*23,z*(1.2+5.8*bulge));}back.computeVertexNormals();armchairAdd(back,ivory,[0,61,-20],[-.13,0,0]);
  const piping=[];for(let i=0;i<=64;i++){const t=i/64*Math.PI*2,cos=Math.cos(t),sin=Math.sin(t);piping.push(new T.Vector3(Math.sign(cos)*Math.pow(Math.abs(cos),.28)*34.5,45.5,7+Math.sign(sin)*Math.pow(Math.abs(sin),.28)*34));}
  armchairAdd(new T.TubeGeometry(new T.CatmullRomCurve3(piping,true),72,.22,5,true),ivory);
  const rugMap=canvasMap(256,(ctx,size)=>{const data=ctx.createImageData(size,size);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,v=228+7*Math.sin(x*Math.PI/2)+6*Math.sin(y*Math.PI/2)+3*Math.sin(x*127.1+y*311.7);data.data[i]=data.data[i+1]=data.data[i+2]=v;data.data[i+3]=255;}ctx.putImageData(data,0,0);});rugMap.repeat.set(16,20);
  const rug=material('Office woven rug',{color:'#b7b1a3',map:rugMap,normalMap:textileNormal,normalScale:new T.Vector2(.12,.12),roughness:1});
  box(279,.65,294,rug,[-154,.25,225],.2);
  // Cove trim and original gradient plates approximate a restrained local wash.
  bar(660,4,6,ceiling,[0,286,-21]);for(const x of [-326.5,326.5])bar(6,4,535,ceiling,[x,286,242]);
  for(const[m,parts]of buckets){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());const mesh=new T.Mesh(g,m);mesh.castShadow=m!==ceiling&&m!==lightStrip;mesh.receiveShadow=m!==ceiling;root.add(mesh);}
  for(const g of roundedCache.values())g.dispose();
  const glow=canvasMap(128,(ctx,size)=>{const g=ctx.createLinearGradient(0,0,0,size);g.addColorStop(0,'rgba(255,239,206,.68)');g.addColorStop(.35,'rgba(255,229,184,.23)');g.addColorStop(1,'rgba(255,225,177,0)');ctx.fillStyle=g;ctx.fillRect(0,0,size,size);});
  const coveWash=new T.MeshBasicMaterial({name:'Office cove wall wash',map:glow,transparent:true,depthWrite:false,color:'#ffe4b6',opacity:0});
  const shelfWash=new T.MeshBasicMaterial({name:'Office shelf wall wash',map:glow,transparent:true,depthWrite:false,color:'#ffc978',opacity:0});
  function plate(w,h,m,p,r=[0,0,0]){const mesh=new T.Mesh(new T.PlaneGeometry(w,h),m);mesh.position.fromArray(p);mesh.rotation.set(...r);root.add(mesh);}
  for(const[w,p,r]of [[660,[0,276,-24.4],[0,0,0]],[535,[-328.9,276,242],[0,Math.PI/2,0]],[535,[328.9,276,242],[0,-Math.PI/2,0]]])plate(w,28,coveWash,p,r);
  for(const n of niches)plate(n.width,n.top-n.bottom,shelfWash,[n.x,(n.top+n.bottom)/2,-20.8]);
  return{root,lampPositions:[[-224,181,34],[246,181,34]],lampPower:7200,cove:{position:[-150,276,210],power:14500},update(mode,lamps){const on=lamps&&mode!=='inspection';lightStrip.emissiveIntensity=on?.7:0;coveWash.opacity=on?(mode==='daylight'?.08:.55):0;shelfWash.opacity=on?(mode==='daylight'?.25:.72):0;},dispose(){textures.forEach(t=>t.dispose());}};
}

export function adaptOfficeContacts(contacts){
  if(contacts.children.length===3){const mesh=contacts.children[0].clone();mesh.geometry=mesh.geometry.clone();mesh.material=mesh.material.clone();contacts.add(mesh);}
  for(const[i,[x,z,w,d]]of [[-161,210,201,84],[-168,121,70,69],[-165,326,78,44],[244,237,110,108]].entries()){const mesh=contacts.children[i];if(!mesh)continue;mesh.position.set(x,1.08,z);mesh.scale.set(w*1.2/mesh.geometry.parameters.width,d*1.3/mesh.geometry.parameters.height,1);}
}
