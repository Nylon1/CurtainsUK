/** Centimetre-scale presentation model. Never a cutting plan, price or order. */
export const SCENES = Object.freeze({
  hide: {title:'Hide & Reveal',eyebrow:'Workday to wind-down',description:'A desk, a library, a little everyday clutter. Draw the curtain and the whole wall takes on a different character.',layouts:['straight']},
  divide: {title:'Divide & Enclose',eyebrow:'One room, more possibilities',description:'Keep the same living and dining room. Use a straight boundary, screen a corner or wrap the workspace in a curved enclosure.',layouts:['straight','corner','curve']},
  screens: {title:'Screens & Layers',eyebrow:'Separation without a wall',description:'An executive lounge inspired by our Manchester Airport work. Compare light, texture and the view through each material in the same position.',layouts:['straight']},
});
export const PURPOSES=[
  {name:'Hide a workspace or storage',scene:'hide',layout:'straight',material:'fabric'},
  {name:'Divide a space',scene:'divide',layout:'straight',material:'fabric'},
  {name:'Create a private enclosure',scene:'divide',layout:'curve',material:'fabric'},
  {name:'Add a decorative screen',scene:'screens',layout:'straight',material:'ball'},
];
export const LAYOUTS={straight:'Straight division',corner:'L-shaped corner',curve:'Curved enclosure'};
export const MATERIALS={fabric:'Opaque decorative fabric',voile:'Sheer voile',ball:'Ball-chain screen',linked:'Linked aluminium chain',layered:'Fabric + voile',mixed:'Voile + ball chain'};
// Shared room/installation datum, in centimetres. Illustrative installation only.
export const INSTALLATION=Object.freeze({ceiling:294,rail:290.5,railRadius:1.7,head:286,hem:1.5});
export const ROOM=Object.freeze({left:-375,right:375,back:-330,front:650});
/** All views stay inside the same enclosed shell; no wall cutaway is needed. */
export function roomCamera(state,aspect=1.6){
  if(state.view==='reverse')return {position:[0,175,-310],target:[0,145,state.scene==='hide'?-105:65],fov:Math.max(75,Math.min(92,2*Math.atan(300/(205*Math.max(1,aspect)))*180/Math.PI))};
  if(state.view==='curtain')return {position:[state.scene==='hide'?50:180,175,410],target:[-30,135,state.scene==='hide'?-105:0],fov:45};
  return {position:[190,165,490],target:[-10,135,state.scene==='hide'?-75:0],fov:Math.max(45,2*Math.atan(420/(700*Math.max(1,aspect)))*180/Math.PI)};
}
export const DEFAULT_STATE=Object.freeze({scene:'hide',layout:'straight',material:'fabric',draw:'pair',construction:'lined',heading:'wave',view:'room',open:1,layer:1,density:'light',light:'daylight',wall:'chalk',fabric:'sdg-f1541-01'});
const choices={scene:Object.keys(SCENES),layout:Object.keys(LAYOUTS),material:Object.keys(MATERIALS),draw:['pair','left','right'],construction:['lined','double'],heading:['wave'],view:['room','curtain','reverse'],density:['light','dense'],light:['daylight','evening','inspection'],wall:['chalk','sage','clay']};
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
/** Shopify reserves `view` for selecting a page template. The public page
 * uses `camera` while the app-proxy runtime retains its existing `view` key. */
export function designUrl(destination,state){
  const url=new URL(destination,'https://www.curtainsuk.com'),params=stateQuery(state);
  if(url.pathname==='/pages/curtains-beyond-windows'){
    params.set('camera',params.get('view'));
    params.delete('view');
  }
  url.search=params.toString();
  return url;
}
export function stateQuery(s){return new URLSearchParams(Object.entries(normaliseState(s)).map(([k,v])=>[k,String(v)]));}
function roundedCorner(a,b,c,r=35){
  const da=Math.hypot(b[0]-a[0],b[1]-a[1]),dc=Math.hypot(c[0]-b[0],c[1]-b[1]);
  const p=[b[0]+(a[0]-b[0])*r/da,b[1]+(a[1]-b[1])*r/da],q=[b[0]+(c[0]-b[0])*r/dc,b[1]+(c[1]-b[1])*r/dc];
  return [a,p,...Array.from({length:16},(_,i)=>{const t=(i+1)/16;return[(1-t)**2*p[0]+2*(1-t)*t*b[0]+t*t*q[0],(1-t)**2*p[1]+2*(1-t)*t*b[1]+t*t*q[1]];}),c];
}
export function routePoints(state){
  // Straight curtains meet the finished side walls. The corner route starts
  // at the back wall and finishes at the right wall; only the curved activity
  // enclosure has free-standing ends. Two centimetres clears the track caps.
  const left=ROOM.left+2,right=ROOM.right-2,back=ROOM.back+2;
  if(state.scene==='hide')return[[left,-105],[right,-105]];
  if(state.scene==='screens')return[[left,-20],[right,-20]];
  if(state.layout==='corner')return roundedCorner([-265,back],[-265,65],[right,65],45);
  if(state.layout==='curve')return[[-265,-230],[-265,-95],...Array.from({length:41},(_,i)=>{const a=Math.PI-i*Math.PI/40;return[-95+170*Math.cos(a),-95+170*Math.sin(a)];}),[75,-230]];
  return[[left,65],[right,65]];
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
  const approved=record?.beyondPreview,url=record?.roomPreview?.worktableImageUrl;
  if(!url||!approved||!['plain','patterned'].includes(approved.mode)||record.roomPreview.rendererProfile!=='STANDARD')throw Error('Choose an approved plain or complete-repeat fabric.');
  const {width,height,top,tileWidth,tileHeight}=approved;
  const calibrated=approved.mode==='patterned';
  return {url,width,height,top,tileWidth,tileHeight,calibrated,label:calibrated?`Verified straight repeat ${tileWidth} x ${tileHeight} cm - pattern scale retained`:'Plain fabric - approximate colour and texture; weave scale is not verified'};
}
export function useExamples(s){
  if(s.scene==='hide')return {title:'A finished wall, with everyday life behind it',items:['Hide a home office at the end of the day','Replace wardrobe or recess doors with fabric','Conceal utility shelves or hobby storage']};
  if(s.scene==='screens')return {title:'Define a space without building a wall',items:['Zone lounge and restaurant seating','Soften the view from an entrance or reception','Create a decorative backdrop with layered screens']};
  if(s.layout==='corner')return {title:'Make more of an unused corner',items:['Screen a desk within a shared living room','Make a dressing corner beside clothes storage','Create a screened reading or retreat area']};
  if(s.layout==='curve')return {title:'Create a room within a room',items:['Wrap a home workspace in a movable boundary','Create a dressing or fitting enclosure','Explore a treatment bay, subject to specialist specification']};
  return {title:'One room can serve more than one purpose',items:['Separate living and dining areas','Screen a guest sleeping zone','Define private dining or shared hall activities']};
}
export function projectBrief(s,record){
  return `Curtains Beyond Windows\n${SCENES[s.scene].title} — ${LAYOUTS[s.layout]}\nMaterial: ${MATERIALS[s.material]}\nFabric: ${record?`${record.design} — ${record.colour} (${record.id})`:s.fabric}\nDraw: ${s.draw==='pair'?'Centre-opening pair':s.draw+' one-way draw'}\nHeading concept: ${['ball','linked'].includes(s.material)?'Screen suspension to be specified':'Wave'}\nConstruction: ${['fabric','layered'].includes(s.material)?s.construction==='double'?'double-faced — selected decorative fabric on both sides, instead of lining':'decorative face with neutral lining reverse':'no opaque fabric layer'}; voile unlined; metallic screens separate systems.\nMeasurements needed: actual track route and each segment, finished drop, fixing surface, parking space and clear access.\nPlease confirm fabric suitability, heading/track compatibility, lining, installation, supply and pricing.\nScene dimensions and source images are visual examples, not manufacturing quantities.\nNo acoustic, fire or privacy certification is implied.\nConfiguration: ${stateQuery(s)}`;
}
export function commercePolicy(s,record,actions){
  // Current automated contract covers window openings only, not freestanding
  // partitions. Keep project purchase gated; the existing flow can still be
  // opened explicitly as a fabric-only handoff for a supported window opening.
  return {profile:actions.profile,sample:actions.sampleAvailable?actions.sample:null,
    make:record?.orderReady===true&&s.material==='fabric'?actions.make:null,
    quoteRequired:true,configurationTransferred:false};
}
