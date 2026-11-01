/** Centimetre-scale presentation model. Never a cutting plan, price or order. */
export const SCENES = Object.freeze({
  hide: {title:'Hide & Reveal',eyebrow:'Workday to wind-down',description:'A desk, a library, a little everyday clutter. Draw the curtain and the whole wall takes on a different character.',layouts:['straight'],camera:[380,280,690],target:[-20,115,-95]},
  divide: {title:'Divide & Enclose',eyebrow:'One room, more possibilities',description:'Keep the same living and dining room. Use a straight boundary, screen a corner or wrap the workspace in a curved enclosure.',layouts:['straight','corner','curve'],camera:[530,430,780],target:[0,105,-10]},
  screens: {title:'Screens & Layers',eyebrow:'Separation without a wall',description:'An executive lounge inspired by our Manchester Airport work. Compare light, texture and the view through each material in the same position.',layouts:['straight'],camera:[400,300,720],target:[0,110,-30]},
});
export const PURPOSES=[
  {name:'Hide a workspace or storage',scene:'hide',layout:'straight',material:'fabric'},
  {name:'Divide a space',scene:'divide',layout:'straight',material:'fabric'},
  {name:'Create a private enclosure',scene:'divide',layout:'curve',material:'fabric'},
  {name:'Add a decorative screen',scene:'screens',layout:'straight',material:'ball'},
];
export const LAYOUTS={straight:'Straight division',corner:'L-shaped corner',curve:'Curved enclosure'};
export const MATERIALS={fabric:'Opaque decorative fabric',voile:'Sheer voile',ball:'Ball-chain screen',linked:'Linked aluminium chain',layered:'Fabric + voile',mixed:'Voile + ball chain'};
export const DEFAULT_STATE=Object.freeze({scene:'hide',layout:'straight',material:'fabric',draw:'pair',construction:'lined',heading:'wave',view:'room',open:1,layer:1,density:'light',light:'daylight',wall:'chalk',fabric:'sdg-f1541-01'});
const choices={scene:Object.keys(SCENES),layout:Object.keys(LAYOUTS),material:Object.keys(MATERIALS),draw:['pair','left','right'],construction:['lined','double'],heading:['wave','pencil'],view:['room','curtain','reverse'],density:['light','dense'],light:['daylight','evening','inspection'],wall:['chalk','sage','clay']};
export function normaliseState(input={}) {
  const s={...DEFAULT_STATE};
  for(const [key,list] of Object.entries(choices))if(list.includes(input[key]))s[key]=input[key];
  for(const key of ['open','layer'])if(input[key]!=null&&input[key]!==''&&Number.isFinite(Number(input[key])))s[key]=Math.max(0,Math.min(1,Number(input[key])));
  if(typeof input.fabric==='string'&&/^[a-zA-Z0-9-]{1,150}$/.test(input.fabric))s.fabric=input.fabric;
  if(!SCENES[s.scene].layouts.includes(s.layout))s.layout='straight';
  if(s.scene!=='screens')s.material='fabric';
  return s;
}
export function readState(search) {
  const p=new URLSearchParams(search),data={};
  for(const key of Object.keys(DEFAULT_STATE))if(p.getAll(key).length===1)data[key]=p.get(key);
  return {state:normaliseState(data),invalidFabric:p.getAll('fabric').length>1||(p.has('fabric')&&!/^[a-zA-Z0-9-]{1,150}$/.test(p.get('fabric')))};
}
export function stateQuery(s){return new URLSearchParams(Object.entries(normaliseState(s)).map(([k,v])=>[k,String(v)]));}
function roundedCorner(a,b,c,r=35){
  const da=Math.hypot(b[0]-a[0],b[1]-a[1]),dc=Math.hypot(c[0]-b[0],c[1]-b[1]);
  const p=[b[0]+(a[0]-b[0])*r/da,b[1]+(a[1]-b[1])*r/da],q=[b[0]+(c[0]-b[0])*r/dc,b[1]+(c[1]-b[1])*r/dc];
  return [a,p,...Array.from({length:16},(_,i)=>{const t=(i+1)/16;return[(1-t)**2*p[0]+2*(1-t)*t*b[0]+t*t*q[0],(1-t)**2*p[1]+2*(1-t)*t*b[1]+t*t*q[1]];}),c];
}
export function routePoints(state){
  if(state.scene==='hide')return[[-285,-105],[250,-105]];
  if(state.scene==='screens')return[[-250,-20],[190,-20]];
  if(state.layout==='corner')return roundedCorner([-295,-225],[-295,65],[180,65],45);
  if(state.layout==='curve')return[[-265,-230],[-265,-95],...Array.from({length:41},(_,i)=>{const a=Math.PI-i*Math.PI/40;return[-95+170*Math.cos(a),-95+170*Math.sin(a)];}),[75,-230]];
  return[[-295,65],[180,65]];
}
export function makeRoute(points){
  const segments=[];let length=0;
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d>1e-8){segments.push({a,b,d,start:length});length+=d;}}
  return {points,length,at(distance){const d=Math.max(0,Math.min(length,distance));const s=segments.find(s=>d<=s.start+s.d)||segments.at(-1),t=(d-s.start)/s.d;return {x:s.a[0]+t*(s.b[0]-s.a[0]),z:s.a[1]+t*(s.b[1]-s.a[1]),nx:-(s.b[1]-s.a[1])/s.d,nz:(s.b[0]-s.a[0])/s.d};}};
}
export function panelSpans(length,draw,openness){
  const count=draw==='pair'?2:1,full=length/count,span=full*(1-.85*openness);
  return Array.from({length:count},(_,i)=>({start:draw==='right'||i===1?length-span:0,span,full,cloth:full*2.15,index:i}));
}
/** Sample equal material distances along a sinusoidal cross section. UVs remain
 * material coordinates; gathering never shrinks or stretches the artwork. */
export function foldSection(span,cloth,folds,columns=240){
  const n=960,arc=(amp,save=false)=>{let l=0,x0=0,z0=0;const rows=save?[[0,0,0]]:null;
    for(let i=1;i<=n;i++){const u=i/n,x=span*u,z=amp*Math.sin(u*folds*2*Math.PI);l+=Math.hypot(x-x0,z-z0);if(rows)rows.push([l,x,z]);x0=x;z0=z;}return rows||l;};
  let lo=0,hi=cloth/folds;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(arc(mid)>cloth)hi=mid;else lo=mid;}
  const points=arc((lo+hi)/2,true),out=[];let k=1;
  for(let i=0;i<=columns;i++){const target=i/columns*cloth;while(k<points.length-1&&points[k][0]<target)k++;const a=points[k-1],b=points[k],t=Math.max(0,Math.min(1,(target-a[0])/(b[0]-a[0])));out.push([a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2])]);}return out;
}
export function textureSpec(record){
  const source=record?.roomPreview?.worktableSource,url=record?.roomPreview?.worktableImageUrl;
  const width=source?.imageWidthCm,height=source?.imageHeightCm,top=source?.imageTopCm||0;
  const repeatX=record?.horizontalRepeatMm/10,repeatY=record?.verticalRepeatMm/10;
  if(url&&source?.scaleKind==='calibrated'&&width>0&&height>top&&repeatX>0&&repeatY>0&&repeatX<=width&&repeatY<=height-top&&!/HALF|OFFSET|STAGGER|BRICK/i.test(record.patternMatchType||''))
    return {url,width,height,top,tileWidth:repeatX,tileHeight:repeatY,calibrated:true,label:`Supplier repeat ${repeatX} × ${repeatY} cm · pattern scale retained`};
  const photo=record?.images?.find(i=>i.imageType==='MAIN')?.url||record?.imageReferences?.[0];
  return {url:url||photo||null,width:width||140,height:height||140,top,tileWidth:width||140,tileHeight:height||140,calibrated:false,label:'Approximate colour and texture preview · pattern scale not established'};
}
export function projectBrief(s,record){
  return `Curtains Beyond Windows\n${SCENES[s.scene].title} — ${LAYOUTS[s.layout]}\nMaterial: ${MATERIALS[s.material]}\nFabric: ${record?`${record.design} — ${record.colour} (${record.id})`:s.fabric}\nDraw: ${s.draw==='pair'?'Centre-opening pair':s.draw+' one-way draw'}\nHeading concept: ${s.heading==='wave'?'Wave':'Pencil pleat'}\nConstruction: ${['fabric','layered'].includes(s.material)?s.construction==='double'?'double-faced — selected decorative fabric on both sides, instead of lining':'decorative face with neutral lining reverse':'no opaque fabric layer'}; voile unlined; metallic screens separate systems.\nMeasurements needed: actual track route and each segment, finished drop, fixing surface, parking space and clear access.\nPlease confirm fabric suitability, heading/track compatibility, lining, installation, supply and pricing.\nScene dimensions and source images are visual examples, not manufacturing quantities.\nNo acoustic, fire or privacy certification is implied.\nConfiguration: ${stateQuery(s)}`;
}
export function commercePolicy(s,record,actions){
  // Current automated contract covers window openings only, not freestanding
  // partitions. Keep project purchase gated; the existing flow can still be
  // opened explicitly as a fabric-only handoff for a supported window opening.
  return {profile:actions.profile,sample:actions.sampleAvailable?actions.sample:null,
    make:record?.orderReady===true&&s.material==='fabric'?actions.make:null,
    quoteRequired:true,configurationTransferred:false};
}
