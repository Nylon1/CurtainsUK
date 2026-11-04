import {calculate} from './measurements.js';
import {calculateEyelet} from './eyelet-measurements.js';
import {calculateWave} from './wave-measurements.js';
import {calculatePinch} from './pinch-measurements.js';
export const LAST_GUIDE = 'curtainsuk.hanging.last';
export const guides = {
 pencil:{name:'Pencil pleat',page:'pencil.html',key:'curtainsuk.plan.d19.v1',steps:6,calculate},
 eyelet:{name:'Eyelet',page:'eyelet.html',key:'curtainsuk.plan.eyelet.v1',steps:5,calculate:calculateEyelet},
 wave:{name:'Wave',page:'wave.html',key:'curtainsuk.plan.wave.v1',steps:6,calculate:calculateWave},
 pinch:{name:'Pinch pleat',page:'pinch.html',key:'curtainsuk.plan.pinch.v1',steps:5,calculate:calculatePinch}
};
export function savedGuides(storage){
 const saved=[];
 for(const [id,g] of Object.entries(guides)){
  try{
   const s=JSON.parse(storage.getItem(g.key));
   if(!s?.data||typeof s.data!=='object')continue;
   const plan=g.calculate(s.data);
   const done=Array.from({length:g.steps},(_,i)=>s.done?.[i]===true&&(id!=='pencil'||s.version===3));
   saved.push({id,name:g.name,page:g.page,width:plan.width,completed:done.filter(Boolean).length,steps:g.steps,finished:done.every(Boolean)});
  }catch{}
 }
 return saved;
}
export function latestGuide(storage,saved=savedGuides(storage)){
 let last;try{last=storage.getItem(LAST_GUIDE);}catch{}
 return saved.find(g=>g.id===last)??saved[0]??null;
}
