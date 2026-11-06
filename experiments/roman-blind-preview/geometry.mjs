// Metres throughout. Source UVs stay attached to the same point on the cloth.
export const SIZE=1.4;
export const SPEC=Object.freeze({headrail:.07,minDepth:.15,maxDepth:.20,cascadeIncrement:.02});
export const FOLDS=Math.round((SIZE-SPEC.headrail)/(2*((SPEC.minDepth+SPEC.maxDepth)/2)));
export function foldPlan(style='stacked'){
 const step=style==='cascade'?SPEC.cascadeIncrement:0;
 const body=SIZE-SPEC.headrail;
 // A stepped return shortens each of the first n-1 cloth sections by its step.
 // Distribute the available cloth evenly so the raised front depths agree.
 const depth=(body+step*(FOLDS-1))/(2*FOLDS);
 const sections=Array.from({length:FOLDS},(_,i)=>({gap:i<FOLDS-1?step:0,length:2*depth-(i<FOLDS-1?step:0)}));
 return {depth,sections,count:FOLDS,headrail:SPEC.headrail,increment:step};
}
const plans={stacked:foldPlan('stacked'),cascade:foldPlan('cascade')};
function progress(phase,band){return Math.max(0,Math.min(1,phase*FOLDS-(FOLDS-1-band)));}
function atPhase(s,phase,style){
 if(s<=SPEC.headrail)return{down:s,depth:0};
 const {sections}=plans[style];let local=s-SPEC.headrail,band=0;
 while(band<sections.length-1&&local>sections[band].length){local-=sections[band].length;band++;}
 let start=SPEC.headrail,back=0;
 for(let i=0;i<band;i++){const c=progress(phase,i);start+=sections[i].length*(1-c)+sections[i].gap*c;back+=.012*c;}
 const p=progress(phase,band),{length,gap}=sections[band],h=length*(1-p)+gap*p;
 const turn=(length+h)/2,delta=local-turn,radius=.004*p,curve=Math.sqrt(delta*delta+radius*radius);
 return{down:start+(p===0?local:turn-Math.abs(delta)),depth:-back-(p===0?0:.006*p*(1+delta/Math.max(curve,.000001)))};
}
function phaseDrop(phase,style){
 const {sections}=plans[style];let start=SPEC.headrail,maximum=SPEC.headrail;
 sections.forEach(({length,gap},band)=>{const p=progress(phase,band),h=length*(1-p)+gap*p;maximum=Math.max(maximum,start+(length+h)/2);start+=h;});return maximum;
}
export function visibleDrop(raised,style='stacked'){return SIZE+(phaseDrop(1,style)-SIZE)*raised;}
export function phaseForLift(raised,style='stacked'){let low=0,high=1;const desired=visibleDrop(raised,style);for(let i=0;i<24;i++){const mid=(low+high)/2;if(phaseDrop(mid,style)>desired)low=mid;else high=mid;}return(low+high)/2;}
export function foldPoint(s,raised,phase=phaseForLift(raised),style='stacked'){return atPhase(s,phase,style);}
export function coverage(raised,style='stacked'){const covered=visibleDrop(raised,style)*100;return{coveredCm:covered,clearCm:SIZE*100-covered,percent:covered/(SIZE*100)*100};}
export function sourceUv(x,s,fullWidth){if(fullWidth<SIZE)throw Error('Source square does not cover this preview');return[(fullWidth-SIZE)/(2*fullWidth)+x/fullWidth,1-s/fullWidth];}
