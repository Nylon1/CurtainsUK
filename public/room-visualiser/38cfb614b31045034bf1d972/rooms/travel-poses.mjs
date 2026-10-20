import {SPEC} from '../core.mjs';
import {createMotionSolver} from '../motion.mjs';

/** Add a small non-uniform carrier progression to the approved length-based path.
 * Reintegrate unit material tangents, never lerp positions or touch UV buffers.
 * Endpoint geometry and the original engine remain unchanged.
 */
export function createTravelSolver(closed,opened){
  const baseSolve=createMotionSolver(closed,opened);
  const {columns,rows,panels,flatPanelWidth,finishedPanelWidth}=SPEC,ds=flatPanelWidth/columns;
  const vertex=(p,j,i)=>3*(p*(rows+1)*(columns+1)+j*(columns+1)+(p?columns-i:i));
  const theta0=new Float64Array(panels*(rows+1)*columns),delta=new Float64Array(theta0.length),phase=new Float64Array(panels*columns);
  for(let p=0;p<panels;p++)for(let i=0;i<columns;i++)phase[p*columns+i]=Math.sin(Math.PI*SPEC.wavesPerPanel*(i+.5)/columns+p*.6);
  for(let p=0;p<panels;p++)for(let j=0;j<=rows;j++)for(let i=0;i<columns;i++){
    const a=vertex(p,j,i),b=vertex(p,j,i+1),direction=p?-1:1;
    const k=(p*(rows+1)+j)*columns+i;theta0[k]=Math.atan2(closed[b+2]-closed[a+2],direction*(closed[b]-closed[a]));delta[k]=Math.atan2(opened[b+2]-opened[a+2],direction*(opened[b]-opened[a]))-theta0[k];
  }
  return function solve(progress,target=new Float32Array(closed.length),fall={}){
    if(!(target instanceof Float32Array)||target.length!==closed.length||target.buffer===closed.buffer||target.buffer===opened.buffer)throw Error('INVALID_MOTION_TARGET');
    const hemProgress=fall.hemProgress??progress,settleDepthCm=fall.settleDepthCm??0;
    if(!Number.isFinite(progress)||progress<0||progress>1)throw Error('INVALID_MOTION_PROGRESS');
    if(!Number.isFinite(hemProgress)||hemProgress<0||hemProgress>1||!Number.isFinite(settleDepthCm)||Math.abs(settleDepthCm)>.2)throw Error('INVALID_MOTION_FALL');
    if((progress===0||progress===1)&&hemProgress===progress&&settleDepthCm===0)return baseSolve(progress,target,fall);
    for(let p=0;p<panels;p++)for(let j=0;j<=rows;j++){
      const local=progress+(hemProgress-progress)*j/rows,envelope=.014*Math.sin(Math.PI*local)**2;
      // Heading may be parked while the body completes its tiny follow-through.
      if((local===0||local===1)&&(j===0||settleDepthCm===0)){const start=3*(p*(rows+1)*(columns+1)+j*(columns+1));target.set((local===0?closed:opened).subarray(start,start+3*(columns+1)),start);continue;}
      const start=vertex(p,j,0);let x=0,z=closed[start+2]+local*(opened[start+2]-closed[start+2])+settleDepthCm*j/rows;
      for(let i=0;i<=columns;i++){
        const a=vertex(p,j,i);target[a]=p?finishedPanelWidth-x:x-finishedPanelWidth;target[a+1]=closed[a+1];target[a+2]=z;
        if(i<columns){const k=(p*(rows+1)+j)*columns+i,theta=theta0[k]+delta[k]*(local+envelope*phase[p*columns+i]);x+=ds*Math.cos(theta);z+=ds*Math.sin(theta);}
      }
    }
    return target;
  };
}
