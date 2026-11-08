export const TRAVEL=Object.freeze({travelMs:1600,hemDelayMs:6,settleMs:210,settleAmplitudeCm:.22});
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
function cubic(segment,time){
  const {start,duration,from,to,velocity}=segment,u=clamp((time-start)/duration),m=velocity*duration;
  if(time<=start)return {p:from,v:velocity};if(time>=start+duration)return {p:to,v:0};
  return {p:(2*u**3-3*u*u+1)*from+(u**3-2*u*u+u)*m+(-2*u**3+3*u*u)*to,v:((6*u*u-6*u)*from+(3*u*u-4*u+1)*m+(-6*u*u+6*u)*to)/duration};
}
function bounded(segment){
  // Check cubic derivative roots analytically before accepting a reversal.
  const d=segment.to-segment.from,m=segment.velocity*segment.duration,a=-6*d+3*m,b=6*d-4*m,c=m;
  const roots=Math.abs(a)<1e-12?[Math.abs(b)>1e-12?-c/b:-1]:b*b-4*a*c>=0?[(-b+Math.sqrt(b*b-4*a*c))/(2*a),(-b-Math.sqrt(b*b-4*a*c))/(2*a)]:[];
  return roots.filter(u=>u>0&&u<1).every(u=>{const p=cubic(segment,segment.start+u*segment.duration).p;return p>=0&&p<=1;});
}
/** Review clock: C1 heading retargets, delayed body, exact parked endpoints.
 * Pause freezes logical time, so resuming never discards hem/settle state.
 */
export function createTravelController(initial=0){
  if(!Number.isFinite(initial)||initial<0||initial>1)throw Error('INVALID_TRAVEL_POSITION');
  let origin=initial,segments=[],offset=0,held=0,paused=true;
  const logical=now=>paused?held:now-offset;
  function heading(time){const segment=segments.findLast(s=>s.start<=time);return segment?cubic(segment,time):{p:origin,v:0};}
  function depth(time){const s=segments.findLast(s=>s.start<=time);if(!s)return 0;const elapsed=time-s.start;
    const carry=s.depth*(1-smooth(elapsed/120));const t=clamp((elapsed-s.duration-TRAVEL.hemDelayMs)/TRAVEL.settleMs);
    return carry+(t===0||t===1?0:TRAVEL.settleAmplitudeCm*Math.sin(2*Math.PI*t)*Math.sin(Math.PI*t)**2*Math.exp(-t));
  }
  function sample(now){if(!Number.isFinite(now))throw Error('INVALID_TRAVEL_TIME');const time=logical(now),h=heading(time),s=segments.at(-1),done=!s||time>=s.start+s.duration+TRAVEL.hemDelayMs+TRAVEL.settleMs;
    return{progress:h.p,velocity:h.v,hemProgress:heading(time-TRAVEL.hemDelayMs).p,settleDepthCm:depth(time),done,paused,running:!paused&&!done,durationMs:s?s.duration+TRAVEL.hemDelayMs+TRAVEL.settleMs:0,target:s?.to??origin,logicalTime:time};
  }
  function scrub(position,now){if(!Number.isFinite(position)||position<0||position>1)throw Error('INVALID_TRAVEL_POSITION');origin=position;segments=[];held=now;offset=0;paused=true;return sample(now);}
  function target(to,now,reduced=false){if(to!==0&&to!==1)throw Error('INVALID_TRAVEL_TARGET');if(reduced)return scrub(to,now);
    const previous=sample(now);if(!previous.done&&previous.target===to){if(paused)resume(now);return sample(now);}
    const time=logical(now);if(previous.progress===to&&previous.velocity===0)return previous;
    const segment={start:time,from:previous.progress,to,velocity:paused?0:previous.velocity,depth:previous.settleDepthCm,duration:Math.max(180,TRAVEL.travelMs*Math.abs(to-previous.progress))};
    while(!bounded(segment))segment.duration*=.8;
    segments.push(segment);offset=now-time;paused=false;return sample(now);
  }
  function pause(now){held=logical(now);paused=true;return sample(now);}
  function resume(now){offset=now-held;paused=false;return sample(now);}
  return {sample,target,pause,resume,scrub};
}
