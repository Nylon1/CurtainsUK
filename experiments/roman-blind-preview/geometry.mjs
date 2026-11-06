// Metres throughout. Conventional odd half-section plan, including bottom half.
// See SOURCES.md for published method and independent calculator readback.
export const SIZE=1.4;
export const SPEC=Object.freeze({headrail:.07,minDepth:.15,maxDepth:.20,cascadeIncrement:.02});
export function foldPlan(style='stacked',drop=SIZE){
 if(!['stacked','cascade'].includes(style)||!Number.isFinite(drop)||drop<=SPEC.headrail)throw Error('Invalid blind specification');
 const body=drop-SPEC.headrail,increment=style==='cascade'?SPEC.cascadeIncrement:0;
 const target=(SPEC.minDepth+SPEC.maxDepth)/2;
 const candidates=[];
 for(let rods=1;rods<=20;rods++){
  const halfSections=2*rods+1;
  const depth=(body-increment*rods*rods)/halfSections;
  if(depth>=SPEC.minDepth-1e-10&&depth<=SPEC.maxDepth+1e-10)candidates.push({rods,halfSections,depth});
 }
 if(!candidates.length)throw Error('No fold plan within target depth');
 candidates.sort((a,b)=>Math.abs(a.depth-target)-Math.abs(b.depth-target)||a.rods-b.rods);
 const {rods,halfSections,depth}=candidates[0];
 const sections=Array.from({length:rods},(_,i)=>({length:2*(depth+i*increment),foldDepth:depth+i*increment}));
 const bottomHalf=depth+rods*increment;
 let coordinate=SPEC.headrail;const rodPositions=sections.map(section=>(coordinate+=section.length));
 return{depth,sections,rodCount:rods,halfSections,headrail:SPEC.headrail,increment,bottomHalf,rodPositions,drop};
}
export const FOLDS=foldPlan().rodCount;
const plans={stacked:foldPlan('stacked'),cascade:foldPlan('cascade')};
function progress(phase,band,rods){return Math.max(0,Math.min(1,phase*rods-(rods-1-band)));}
// A finite-radius return replaces the sharp doubled-back sheet. Its semicircle
// consumes real material length; the two straight legs still meet at the rods.
function foldRadius(p,length){return Math.min(.012*Math.sin(p*Math.PI/2),length*p/Math.PI);}
function atPhase(s,phase,style){
 const plan=plans[style];
 if(s<=SPEC.headrail)return{down:s,depth:0};
 let local=s-SPEC.headrail,band=0,start=SPEC.headrail,back=0;
 while(band<plan.sections.length&&local>plan.sections[band].length){
  const p=progress(phase,band,plan.rodCount);local-=plan.sections[band].length;
  start+=plan.sections[band].length*(1-p);back+=2*foldRadius(p,plan.sections[band].length);band++;
 }
 // The bottom half remains a hanging flap below the last lifting rod.
 if(band===plan.sections.length)return{down:start+local,depth:-back};
 const p=progress(phase,band,plan.rodCount),length=plan.sections[band].length;
 if(p===0)return{down:start+local,depth:-back};
 const h=length*(1-p),radius=foldRadius(p,length),arc=Math.PI*radius;
 const front=(length-arc+h)/2,returnLength=(length-arc-h)/2;
 let down,depth;
 if(local<front){
  const t=local/front;
  // The face gently bows as it loses tension, with smooth tangency at each end.
  const fullness=.008*Math.sin(p*Math.PI/2)+.009*Math.sin(p*Math.PI);
  down=local;depth=fullness*Math.sin(Math.PI*t)**2;
 }else if(local<=front+arc&&radius>1e-10){
  const angle=(local-front)/radius;
  down=front+radius*Math.sin(angle);depth=-radius*(1-Math.cos(angle));
 }else{
  const tail=local-front-arc,t=returnLength>1e-10?tail/returnLength:1;
  down=front-tail;depth=-2*radius-.0025*p*Math.sin(Math.PI*t)**2;
 }
 return{down:start+down,depth:-back+depth};
}
function phaseDrop(phase,style){const plan=plans[style];let down=plan.headrail;plan.sections.forEach(({length},i)=>{down+=length*(1-progress(phase,i,plan.rodCount));});return down+plan.bottomHalf;}
export function visibleDrop(raised,style='stacked'){return SIZE+(phaseDrop(1,style)-SIZE)*raised;}
export function phaseForLift(raised,style='stacked'){let low=0,high=1;const desired=visibleDrop(raised,style);for(let i=0;i<24;i++){const mid=(low+high)/2;if(phaseDrop(mid,style)>desired)low=mid;else high=mid;}return(low+high)/2;}
export function foldPoint(s,raised,phase=phaseForLift(raised),style='stacked'){return atPhase(s,phase,style);}
export function coverage(raised,style='stacked'){const covered=visibleDrop(raised,style)*100;return{coveredCm:covered,clearCm:SIZE*100-covered,percent:covered/SIZE};}
export function sourceUv(x,s,fullWidth){if(fullWidth<SIZE)throw Error('Source square does not cover this preview');return[(fullWidth-SIZE)/(2*fullWidth)+x/fullWidth,1-s/fullWidth];}
// Cloth relief in material coordinates: rod pockets, gentle panel fullness and hem.
// Only depth changes; the cut plan, UVs and reported vertical coverage stay fixed.
export function clothRelief(s,style='stacked'){
 const plan=plans[style],marks=plan.rodPositions;
 let seam=0,highlight=0;
 for(const mark of marks){const d=s-mark;seam+=Math.exp(-.5*(d/.0028)**2);highlight+=Math.exp(-.5*((d+.005)/.004)**2);}
 const boundaries=[0,...marks,SIZE];let lo=0,hi=SIZE;
 for(let i=0;i<boundaries.length-1;i++)if(s>=boundaries[i]&&s<=boundaries[i+1]){lo=boundaries[i];hi=boundaries[i+1];break;}
 const wave=Math.sin(Math.PI*(s-lo)/(hi-lo));
 const hem=Math.exp(-.5*((s-(SIZE-.012))/.008)**2);
 return{depth:.0032*wave*wave-.0011*seam+.005*hem,shade:1-.105*seam+.018*highlight-.045*Math.exp(-.5*((s-(SIZE-.003))/.0025)**2)};
}
// Small creases develop only around the fold currently being gathered. They
// follow the lift position, so pausing the blind also pauses the cloth response.
export function gatheringProfile(s,phase,style='stacked'){
 const plan=plans[style];let start=SPEC.headrail;
 for(let band=0;band<plan.rodCount;band++){
  const length=plan.sections[band].length,p=progress(phase,band,plan.rodCount);
  if(s>=start&&s<=start+length){
   const turn=length*(1-p/2),distance=s-start-turn;
   const strength=Math.sin(Math.PI*p)*Math.exp(-.5*(distance/.065)**2);
   return{strength,distance,phase:p};
  }
  start+=length;
 }
 return{strength:0,distance:0,phase:0};
}
export function gatheringDepth(u,profile){
 const edge=Math.sin(Math.PI*u);
 // Broad cloth fullness plus shallow diagonal creases between lifting points.
 return profile.strength*edge*(.006+.0035*Math.sin(7*Math.PI*u+profile.distance*95)*Math.sin(profile.distance*50+u*5));
}
