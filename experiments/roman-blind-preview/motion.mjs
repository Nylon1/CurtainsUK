// Eight seconds for full travel, with gentle acceleration and deceleration.
export const FULL_TRAVEL_MS=8000;
export function makeMotion(from,to,started){
 return{from,to,started,duration:Math.max(550,Math.abs(to-from)*FULL_TRAVEL_MS)};
}
export function motionPosition(motion,now){
 const t=Math.max(0,Math.min(1,(now-motion.started)/motion.duration));
 const ramp=.12;
 const travelled=t<ramp?t*t/(2*ramp):t>1-ramp?(1-ramp)-(1-t)*(1-t)/(2*ramp):t-ramp/2;
 const eased=travelled/(1-ramp);
 return t===1?motion.to:motion.from+(motion.to-motion.from)*eased;
}
