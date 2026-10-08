import sharp from 'sharp';

/** Conservative signal for a pale editorial title band above darker artwork.
 * It is a review trigger, not an autonomous approval/rejection decision.
 */
export async function editorialBandSignal(bytes) {
  const {data,info}=await sharp(bytes).resize(128,128,{fit:'fill'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const light=[];
  for(let y=0;y<info.height;y++){
    let count=0;
    for(let x=0;x<info.width;x++){
      const k=(y*info.width+x)*info.channels,r=data[k],g=data[k+1],b=data[k+2];
      if(Math.min(r,g,b)>220&&Math.max(r,g,b)-Math.min(r,g,b)<24)count++;
    }
    light.push(count/info.width);
  }
  const mean=(from,to)=>light.slice(from,to).reduce((a,b)=>a+b,0)/(to-from);
  let top=0,position=0;
  for(let start=5;start<=25;start++){
    const score=mean(start,start+8);
    if(score>top){top=score;position=start;}
  }
  const body=mean(45,110);
  return {topLightFraction:top,bodyLightFraction:body,bandStartFraction:position/128,
    contrast:top-body,suspect:top>.72&&top-body>.32};
}
