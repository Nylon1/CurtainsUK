import { SPEC } from './core.mjs';

/** Interpolate material-edge tangents, then integrate their fixed rest lengths.
 * A position lerp shortens cloth; this path never interpolates vertex positions.
 * Endpoint buffers are copied verbatim, retaining the approved poses exactly.
 */
export function createMotionSolver(closed, opened) {
  const {columns,rows,panels,flatPanelWidth,finishedPanelWidth}=SPEC;
  if(!(closed instanceof Float32Array)||!(opened instanceof Float32Array)||closed.length!==(columns+1)*(rows+1)*panels*3||opened.length!==closed.length||!closed.every(Number.isFinite)||!opened.every(Number.isFinite))throw Error('INVALID_MOTION_ENDPOINTS');
  const angles=[new Float64Array(columns*(rows+1)*panels),new Float64Array(columns*(rows+1)*panels)];
  const vertex=(p,j,i)=>3*(p*(rows+1)*(columns+1)+j*(columns+1)+(p?columns-i:i));
  for(let p=0;p<panels;p++)for(let j=0;j<=rows;j++)for(let i=0;i<columns;i++){
    const a=vertex(p,j,i),b=vertex(p,j,i+1),k=(p*(rows+1)+j)*columns+i;
    for(const [n,positions] of [closed,opened].entries())angles[n][k]=Math.atan2(positions[b+2]-positions[a+2],(p?-1:1)*(positions[b]-positions[a]));
  }
  const ds=flatPanelWidth/columns;
  return function solve(progress,target=new Float32Array(closed.length),{hemProgress=progress,settleDepthCm=0}={}) {
    if(!Number.isFinite(progress)||progress<0||progress>1)throw Error('INVALID_MOTION_PROGRESS');
    if(!Number.isFinite(hemProgress)||hemProgress<0||hemProgress>1||!Number.isFinite(settleDepthCm)||Math.abs(settleDepthCm)>0.2)throw Error('INVALID_MOTION_FALL');
    if(!(target instanceof Float32Array)||target.length!==closed.length||target.buffer===closed.buffer||target.buffer===opened.buffer)throw Error('INVALID_MOTION_TARGET');
    if(progress===0&&hemProgress===0&&settleDepthCm===0){target.set(closed);return target;}
    if(progress===1&&hemProgress===1&&settleDepthCm===0){target.set(opened);return target;}
    for(let p=0;p<panels;p++)for(let j=0;j<=rows;j++){
      const localProgress=progress+(hemProgress-progress)*j/rows;
      // Keep the supported heading exactly on its approved endpoint while the
      // lower cloth settles. Row-wide depth shifts preserve horizontal lengths.
      if((localProgress===0||localProgress===1)&&(j===0||settleDepthCm===0)){
        const base=3*(p*(rows+1)*(columns+1)+j*(columns+1));target.set((localProgress===0?closed:opened).subarray(base,base+3*(columns+1)),base);continue;
      }
      const start=vertex(p,j,0);let x=0,z=closed[start+2]+localProgress*(opened[start+2]-closed[start+2])+settleDepthCm*j/rows;
      for(let i=0;i<=columns;i++){
        const a=vertex(p,j,i);target[a]=p?finishedPanelWidth-x:x-finishedPanelWidth;target[a+1]=closed[a+1];target[a+2]=z;
        if(i<columns){const k=(p*(rows+1)+j)*columns+i,theta=angles[0][k]+localProgress*(angles[1][k]-angles[0][k]);x+=ds*Math.cos(theta);z+=ds*Math.sin(theta);}
      }
    }
    return target;
  };
}

export const MOTION_TIMING=Object.freeze({travelMs:4000,hemDelayMs:20,settleMs:450});
/** Track-led travel, a 20 ms delayed hem, then a sub-2 mm depth settle.
 * The heading never participates in the settle; final endpoint is exact.
 */
export function motionPoseAt(elapsedMs,from=0,to=1){
  if(!Number.isFinite(elapsedMs)||elapsedMs<0||![from,to].every(x=>Number.isFinite(x)&&x>=0&&x<=1)||from===to)throw Error('INVALID_MOTION_TIMELINE');
  const travelMs=MOTION_TIMING.travelMs*Math.abs(to-from),settleStart=travelMs+MOTION_TIMING.hemDelayMs,totalMs=settleStart+MOTION_TIMING.settleMs;
  const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const progress=from+(to-from)*ease(elapsedMs/travelMs),hemProgress=from+(to-from)*ease((elapsedMs-MOTION_TIMING.hemDelayMs)/travelMs);
  const s=Math.max(0,Math.min(1,(elapsedMs-settleStart)/MOTION_TIMING.settleMs));
  const settleDepthCm=s===0||s===1?0:0.35*Math.sin(2*Math.PI*s)*Math.sin(Math.PI*s)**2*Math.exp(-s);
  return {progress,hemProgress,settleDepthCm,done:elapsedMs>=totalMs,totalMs};
}
