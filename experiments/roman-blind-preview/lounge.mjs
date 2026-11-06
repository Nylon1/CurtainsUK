import * as T from '/vendor/three.module.js';

// Metres. The room is illustrative; the adjoining window remains 1.4 x 1.4 m.
export const ROOM=Object.freeze({width:4.8,depth:5.2,height:2.8});
export async function createLounge(){
 const root=new T.Group();root.name='Illustrative lounge, 4.8 x 5.2 x 2.8 m';
 const load=new T.TextureLoader();
 const [oakMap,weaveMap]=await Promise.all([load.loadAsync('/oak.png'),load.loadAsync('/weave.png')]);
 for(const map of [oakMap,weaveMap]){map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;}
 oakMap.repeat.set(2,2);weaveMap.repeat.set(5,5);
 const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.9,...extra});
 const wall=mat('#8d978f'),trim=mat('#e4e0d5'),ceilingMaterial=mat('#e4e0d5'),oak=mat('#bda47c',{map:oakMap,roughness:.67});
 const seat=mat('#b9b5aa',{map:weaveMap}),sage=mat('#596c5b',{map:weaveMap}),ochre=mat('#b49b70',{map:weaveMap}),chairFabric=mat('#596c5b',{map:weaveMap});
 const metal=mat('#443e35',{metalness:.55,roughness:.42}),paper=mat('#e8e0d0'),ceramic=mat('#c7bba7');
 const fitting=mat('#a48b62',{metalness:.65,roughness:.34});
 function add(geometry,material,position,rotation=[0,0,0],parent=root){const m=new T.Mesh(geometry,material);m.position.set(...position);m.rotation.set(...rotation);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function rounded(w,h,d,r){
  r=Math.min(r,w/3,h/3,d/3);const segments=7,g=new T.BoxGeometry(2,2,2,segments,segments,segments),p=g.attributes.position,n=g.attributes.normal;
  const inner=new T.Vector3(w/2-r,h/2-r,d/2-r),v=new T.Vector3(),q=new T.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);q.set(v.x-Math.sign(v.x)/segments,v.y-Math.sign(v.y)/segments,v.z-Math.sign(v.z)/segments).normalize();n.setXYZ(i,q.x,q.y,q.z);p.setXYZ(i,Math.sign(v.x)*inner.x+q.x*r,Math.sign(v.y)*inner.y+q.y*r,Math.sign(v.z)*inner.z+q.z*r);}
  return g;
 }
 const box=(w,h,d,m,p,r=.006,rotation=[0,0,0],parent=root)=>add(rounded(w,h,d,r),m,p,rotation,parent);
 // Architectural shell is built around the existing window wall, never scaled.
 box(.12,ROOM.height,ROOM.depth,wall,[-2.46,1.4,2.6]);box(.12,ROOM.height,ROOM.depth,wall,[2.46,1.4,2.6]);
 box(4.8,ROOM.height,.12,wall,[0,1.4,5.26]);
 const ceiling=box(4.8,.10,5.2,ceilingMaterial,[0,2.85,2.6]);ceiling.castShadow=false;
 box(4.8,.025,5.2,oak,[0,-.012,2.6]);
 for(const x of [-2.39,2.39]){box(.025,.13,5.2,trim,[x,.065,2.6]);box(.045,.055,5.2,trim,[x,2.75,2.6]);}
 box(4.8,.13,.025,trim,[0,.065,5.19]);box(4.8,.055,.045,trim,[0,2.75,5.19]);
 // Fine board joints reinforce the physical scale of the oak floor.
 const joint=mat('#887353');for(let x=-2.25;x<2.4;x+=.18)box(.001,.001,5.18,joint,[x,.002,2.6],.0002);
 const binding=mat('#76786c'),rug=mat('#d2cbb7',{map:weaveMap});
 box(2.65,.012,2.5,binding,[-.1,.008,2.85]);box(2.60,.012,2.45,rug,[-.1,.015,2.85]);
 // Tailored sofa: 2.2 m wide, 0.9 m deep, 0.84 m high. It faces into the room.
 const sofa=new T.Group();sofa.position.set(1.68,0,3.05);sofa.rotation.y=-Math.PI/2;root.add(sofa);
 box(2.20,.16,.88,seat,[0,.28,0],.035,[0,0,0],sofa);
 box(2.18,.52,.16,seat,[0,.58,-.35],.045,[0,0,0],sofa);
 for(const x of [-1.04,1.04])box(.14,.42,.90,seat,[x,.46,0],.045,[0,0,0],sofa);
 for(const x of [-.51,.51]){
  box(.96,.16,.65,seat,[x,.43,.075],.055,[0,0,0],sofa);
  box(.96,.45,.18,seat,[x,.66,-.22],.055,[-.10,0,0],sofa);
 }
 for(const x of [-.93,.93])for(const z of [-.31,.31])box(.045,.20,.045,oak,[x,.1,z],.005,[0,0,0],sofa);
 box(.40,.40,.13,sage,[-.65,.66,.01],.065,[-.22,.08,-.13],sofa);
 box(.38,.38,.13,ochre,[.65,.65,.02],.065,[-.22,-.08,.13],sofa);
 // Low coffee table, books and a ceramic bowl, all in the same metre units.
 box(1.12,.045,.66,oak,[-.05,.40,2.78],.018);
 for(const x of [-.51,.41])for(const z of [2.51,3.05])box(.035,.38,.035,metal,[x,.19,z]);
 box(.28,.035,.20,paper,[.19,.442,2.75],.003,[0,.12,0]);
 box(.25,.025,.18,mat('#718477'),[.17,.47,2.74],.003,[0,-.04,0]);
 add(new T.LatheGeometry([[.01,0],[.07,.005],[.11,.035],[.12,.055],[.11,.06],[.09,.025],[.01,.016]].map(p=>new T.Vector2(...p)),32),ceramic,[-.30,.425,2.83]);
 // A low upholstered armchair opposite the sofa.
 const chair=new T.Group();chair.position.set(-1.35,0,3.50);chair.rotation.y=.30;root.add(chair);
 box(.82,.18,.80,chairFabric,[0,.32,0],.06,[0,0,0],chair);box(.82,.58,.16,chairFabric,[0,.65,.31],.06,[.1,0,0],chair);
 for(const x of [-.35,.35])box(.13,.35,.8,chairFabric,[x,.5,0],.045,[0,0,0],chair);
 box(.58,.14,.58,chairFabric,[0,.47,-.04],.05,[0,0,0],chair);
 for(const x of [-.29,.29])for(const z of [-.28,.28])box(.04,.25,.04,oak,[x,.125,z],.004,[0,0,0],chair);
 // Slim lamp gives the reverse view a readable pool of warm interior light.
 add(new T.CylinderGeometry(.16,.17,.025,32),fitting,[-1.65,.025,4.35]);
 add(new T.CylinderGeometry(.012,.012,1.50,12),fitting,[-1.65,.77,4.35]);
 const shade=mat('#dfd2b6',{side:T.DoubleSide,emissive:'#e9c68c',emissiveIntensity:.12});
 add(new T.CylinderGeometry(.18,.26,.32,48,1,true),shade,[-1.65,1.58,4.35]);
 const lamp=new T.PointLight('#ffdfac',6,3,2);lamp.position.set(-1.65,1.47,4.35);root.add(lamp);
 // Recessed ceiling spots and two wall sconces are actual room assets.
 const diffuser=mat('#fff2cf',{emissive:'#ffdfac',emissiveIntensity:1});
 const ceilingLights=[];
 for(const x of [-1.15,1.15])for(const z of [1.3,3.5]){
  add(new T.CylinderGeometry(.065,.065,.012,32),fitting,[x,2.79,z]);
  add(new T.CircleGeometry(.048,32),diffuser,[x,2.782,z],[Math.PI/2,0,0]);
  const light=new T.SpotLight('#ffdfac',14,6,.72,.65,2);light.position.set(x,2.76,z);light.target.position.set(x*.65,.05,z);root.add(light,light.target);ceilingLights.push(light);
 }
 const accentLights=[];
 for(const x of [-1.18,1.18]){
  box(.09,.27,.035,fitting,[x,1.88,-.095]);
  add(new T.CylinderGeometry(.045,.045,.19,24),fitting,[x,1.89,.005]);
  add(new T.CylinderGeometry(.039,.039,.006,24),diffuser,[x,1.79,.005]);
  add(new T.CylinderGeometry(.039,.039,.006,24),diffuser,[x,1.99,.005]);
  const bulb=new T.PointLight('#ffdfac',1.5,1.5,2);bulb.position.set(x,1.89,.10);root.add(bulb);accentLights.push(bulb);
 }
 // Restrained original geometric art, assembled from physical painted panels.
 for(const [x,accent] of [[-.54,'#737f70'],[.54,'#b39c7b']]){
  box(.82,1.02,.035,oak,[x,1.75,5.16]);box(.77,.97,.008,paper,[x,1.75,5.137]);
  box(.38,.64,.003,mat(accent),[x-.08,1.79,5.131]);box(.28,.37,.003,mat('#d1c5af'),[x+.16,1.54,5.127]);
 }
 // A pair of framed botanical studies on the side wall above the sofa.
 for(const [z,colour]of [[.80,'#657761'],[1.80,'#b39b78']]){
  const picture=new T.Group();picture.position.set(2.365,1.82,z);picture.rotation.y=-Math.PI/2;root.add(picture);
  box(.70,.91,.035,oak,[0,0,0],.004,[0,0,0],picture);
  box(.65,.86,.008,paper,[0,0,.023],.002,[0,0,0],picture);
  const ink=mat(colour);
  add(new T.CylinderGeometry(.003,.003,.58,8),ink,[0,-.02,.030],[0,0,-.13],picture);
  for(let i=0;i<6;i++){
   const leaf=add(new T.SphereGeometry(1,18,10),ink,[(i%2?1:-1)*.08,-.23+i*.085,.032],[0,0,i%2?-.65:.65],picture);
   leaf.scale.set(.043,.10,.002);
  }
 }
 // Wall-mounted 50-inch TV opposite the seating, with a low oak media cabinet.
 const tv=new T.Group();tv.position.set(-2.365,1.48,1.0);tv.rotation.y=Math.PI/2;root.add(tv);
 const bezel=mat('#171b1c',{roughness:.32});box(1.12,.65,.035,bezel,[0,0,0],.008,[0,0,0],tv);
 const reflection=document.createElement('canvas');reflection.width=256;reflection.height=144;
 const tvContext=reflection.getContext('2d'),gradient=tvContext.createLinearGradient(0,0,256,144);
 gradient.addColorStop(0,'#253337');gradient.addColorStop(.48,'#10191c');gradient.addColorStop(1,'#25302d');tvContext.fillStyle=gradient;tvContext.fillRect(0,0,256,144);
 tvContext.fillStyle='rgba(218,225,212,.035)';tvContext.beginPath();tvContext.moveTo(20,0);tvContext.lineTo(80,0);tvContext.lineTo(174,144);tvContext.lineTo(135,144);tvContext.closePath();tvContext.fill();
 const screenMap=new T.CanvasTexture(reflection);screenMap.colorSpace=T.SRGBColorSpace;
 add(new T.PlaneGeometry(1.085,.615),new T.MeshBasicMaterial({map:screenMap,toneMapped:false}),[0,0,.019],[0,0,0],tv);
 const cabinet=new T.Group();cabinet.position.set(-2.19,.34,1.0);cabinet.rotation.y=Math.PI/2;root.add(cabinet);
 box(1.45,.48,.32,oak,[0,0,0],.008,[0,0,0],cabinet);
 for(const x of [-.36,.36]){box(.70,.43,.015,oak,[x,0,.17],.004,[0,0,0],cabinet);box(.16,.009,.012,metal,[x,.10,.185],.003,[0,0,0],cabinet);}
 for(const x of [-.64,.64])for(const z of [-.12,.12])box(.035,.10,.035,metal,[x,-.29,z],.003,[0,0,0],cabinet);
 // Low rear console supplies depth cues beneath the art.
 box(1.7,.06,.34,oak,[0,.72,4.94]);for(const x of [-.78,.78])box(.035,.69,.30,metal,[x,.345,4.94]);
 add(new T.LatheGeometry([[.06,0],[.10,.03],[.11,.17],[.065,.25],[.045,.29]].map(p=>new T.Vector2(...p)),32),ceramic,[.46,.75,4.94]);
 const loungeFill=new T.PointLight('#ffdfac',4,6,2);loungeFill.position.set(0,2.4,2.5);root.add(loungeFill);
 const assets={walls:[wall],ceiling:[ceilingMaterial],sofa:[seat],armchair:[chairFabric],cushions:[sage,ochre],rug:[rug],wood:[oak],fittings:[fitting],shades:[shade]};
 const defaults=Object.fromEntries(Object.entries(assets).map(([key,mats])=>[key,'#'+mats[0].color.getHexString()]));
 return{root,room:ROOM,defaults,
  setColor(key,hex){if(!assets[key]||!/^#[0-9a-f]{6}$/i.test(hex))return false;assets[key].forEach(m=>m.color.set(hex));return true;},
  resetColors(){for(const [key,mats]of Object.entries(assets))mats.forEach(m=>m.color.set(defaults[key]));},
  setLighting(on,warm=true){const color=warm?'#ffdfac':'#edf3ff';lamp.intensity=on?6:0;loungeFill.intensity=on?4:0;for(const light of [lamp,loungeFill,...accentLights,...ceilingLights])light.color.set(color);ceilingLights.forEach(light=>light.intensity=on?14:0);accentLights.forEach(light=>light.intensity=on?1.5:0);diffuser.emissive.set(color);diffuser.emissiveIntensity=on?1.2:0;shade.emissive.set(color);shade.emissiveIntensity=on?.12:0;}
 };
}
