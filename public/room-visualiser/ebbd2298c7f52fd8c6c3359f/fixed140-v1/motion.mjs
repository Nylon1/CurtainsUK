import {FIXED140} from './fixed140_wave_core.mjs';

// V1 Closed geometry remains frozen. This separate pose family derives a parked
// five-Wave stack for each panel from the same physical material increments.
export const FIXED140_OPEN=Object.freeze({stackWidthCm:28,sharpness:4});
const {panels,rows,columns,finishedPanelWidthCm,wavesPerPanel}=FIXED140;
const stride=(rows+1)*(columns+1);
const vertex=(panel,row,wallIndex)=>3*(panel*stride+row*(columns+1)+(panel?columns-wallIndex:wallIndex));
const phase=(index,row,panel)=>2*Math.PI*wavesPerPanel*(index+.5)/columns+
  .16*Math.sin(Math.PI*(row/rows)/2)+.025*Math.sin(2*Math.PI*index/columns+panel*.7);
const sharpness=row=>FIXED140_OPEN.sharpness+.2*row/rows;

function section(angle,row,panel,flatWidthCm){
  const ds=flatWidthCm/columns;let x=0,z=0;
  const points=[[0,0]];
  for(let i=0;i<columns;i++){
    const theta=angle*Math.tanh(sharpness(row)*Math.sin(phase(i,row,panel)));
    x+=ds*Math.cos(theta);z+=ds*Math.sin(theta);points.push([x,z]);
  }
  return{points,width:x};
}

function openSection(row,panel,flatWidthCm){
  let low=0,high=Math.PI/2;
  if(section(high,row,panel,flatWidthCm).width>FIXED140_OPEN.stackWidthCm)
    throw Error('FIXED140_STACK_UNSUPPORTED_WIDTH');
  for(let i=0;i<48;i++){
    const mid=(low+high)/2;
    if(section(mid,row,panel,flatWidthCm).width>FIXED140_OPEN.stackWidthCm)low=mid;
    else high=mid;
  }
  return section((low+high)/2,row,panel,flatWidthCm).points;
}

export function buildFixed140OpenPosition(closed,flatWidthCm){
  if(!(closed instanceof Float32Array)||closed.length!==panels*stride*3||
     !Number.isFinite(flatWidthCm)||flatWidthCm<70||flatWidthCm>140)
    throw Error('INVALID_FIXED140_OPEN_INPUT');
  const open=new Float32Array(closed.length);
  for(let p=0;p<panels;p++)for(let j=0;j<=rows;j++){
    const points=openSection(j,p,flatWidthCm),wall=vertex(p,j,0),z0=closed[wall+2];
    for(let i=0;i<=columns;i++){
      const k=vertex(p,j,i);
      open[k]=(p?1:-1)*(finishedPanelWidthCm-points[i][0]);
      open[k+1]=closed[k+1];open[k+2]=z0+points[i][1];
    }
  }
  return open;
}

/** Integrate material-length unit tangents; never interpolate mesh X/Z positions. */
export function createFixed140TravelSolver(closed,open,flatWidthCm){
  if(!(closed instanceof Float32Array)||!(open instanceof Float32Array)||
    closed.length!==panels*stride*3||open.length!==closed.length)
    throw Error('INVALID_FIXED140_TRAVEL_INPUT');
  const ds=flatWidthCm/columns,from=new Float64Array(panels*(rows+1)*columns),delta=new Float64Array(from.length);
  for(let p=0;p<panels;p++)for(let j=0;j<=rows;j++)for(let i=0;i<columns;i++){
    const a=vertex(p,j,i),b=vertex(p,j,i+1),k=(p*(rows+1)+j)*columns+i;
    const sign=p?-1:1;
    from[k]=Math.atan2(closed[b+2]-closed[a+2],sign*(closed[b]-closed[a]));
    delta[k]=Math.atan2(open[b+2]-open[a+2],sign*(open[b]-open[a]))-from[k];
  }
  return function solve(progress,target=new Float32Array(closed.length),fall={}){
    if(!Number.isFinite(progress)||progress<0||progress>1||
      !(target instanceof Float32Array)||target.length!==closed.length||
      target.buffer===closed.buffer||target.buffer===open.buffer)throw Error('INVALID_FIXED140_TRAVEL_PROGRESS');
    const hem=fall.hemProgress??progress,settle=fall.settleDepthCm??0;
    if(!Number.isFinite(hem)||hem<0||hem>1||!Number.isFinite(settle)||Math.abs(settle)>.25)
      throw Error('INVALID_FIXED140_TRAVEL_FALL');
    if(progress===hem&&settle===0&&(progress===0||progress===1)){
      target.set(progress===0?closed:open);return target;
    }
    for(let p=0;p<panels;p++)for(let j=0;j<=rows;j++){
      const t=progress+(hem-progress)*j/rows,wall=vertex(p,j,0);
      let x=0,z=closed[wall+2]+t*(open[wall+2]-closed[wall+2])+settle*j/rows;
      for(let i=0;i<=columns;i++){
        const v=vertex(p,j,i),k=(p*(rows+1)+j)*columns+i;
        target[v]=(p?1:-1)*(finishedPanelWidthCm-x);
        target[v+1]=closed[v+1];target[v+2]=z;
        if(i<columns){
          const theta=from[k]+delta[k]*t;
          x+=ds*Math.cos(theta);z+=ds*Math.sin(theta);
        }
      }
    }
    return target;
  };
}
