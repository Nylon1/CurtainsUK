/** Offline projection only: the browser loads the compressed result, never HDR. */
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),deps='C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const {chromium}=require(deps+'playwright'),sharp=require(deps+'sharp');
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
try{
 const p=await b.newPage();await p.goto('http://127.0.0.1:4382/?mode=baseline&fabric=sdg-f1541-01');await p.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});
 const result=await p.evaluate(async()=>{
  const T=await import('three'),{HDRLoader}=await import('/experiment/HDRLoader.js');
  const hdr=await new HDRLoader().loadAsync('/experiment/assets/window/garden_nook_4k.hdr'),{data,width,height}=hdr.image;
  function bake(w,h,panorama){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d'),pixels=ctx.createImageData(w,h),fov=95*Math.PI/180;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const rx=(2*(x+.5)/w-1)*Math.tan(fov/2),ry=(1-2*(y+.5)/h)*Math.tan(fov/2)*h/w;
    const u=panorama?(x+.5)/w:.327+Math.atan2(rx,1)/(2*Math.PI),v=panorama?(y+.5)/h:.49-Math.atan2(ry,Math.hypot(rx,1))/Math.PI;
    const sx=((u%1+1)%1)*(width-1),sy=Math.max(0,Math.min(height-1,v*(height-1))),x0=Math.floor(sx),y0=Math.floor(sy),dx=sx-x0,dy=sy-y0,dst=(y*w+x)*4;
    for(let ch=0;ch<3;ch++){let linear=0;for(let j=0;j<2;j++)for(let i=0;i<2;i++){const index=(Math.min(height-1,y0+j)*width+Math.min(width-1,x0+i))*4+ch;linear+=T.DataUtils.fromHalfFloat(data[index])*(i?dx:1-dx)*(j?dy:1-dy);}linear*=.95;const mapped=linear/(1+linear);pixels.data[dst+ch]=Math.round(255*(mapped<=.0031308?12.92*mapped:1.055*Math.pow(mapped,1/2.4)-.055));}pixels.data[dst+3]=255;
   }ctx.putImageData(pixels,0,0);return c.toDataURL('image/png').split(',')[1];
  }
  const result={source:{width,height},garden:bake(1024,768,false),panorama:bake(1024,512,true)};hdr.dispose();return result;
 });
 const root='experiments/room-visualiser-2/assets/window';
 await sharp(Buffer.from(result.garden,'base64')).webp({quality:89,effort:5}).toFile(root+'/garden.webp');
 await sharp(Buffer.from(result.panorama,'base64')).jpeg({quality:87}).toFile('C:/Users/hamza/curtainsuk-visualiser-2-window-evidence-20261009/source-panorama.jpg');
 await writeFile(root+'/projection.json',JSON.stringify({source:result.source,output:{width:1024,height:768},horizontalFovDegrees:95,yawTurns:.327,horizonTurns:.49,exposure:.95,method:'Bilinear rectilinear HDR projection, Reinhard highlight compression, sRGB encoding',sourceFileOfflineOnly:true},null,2));
 console.log({source:result.source,output:root+'/garden.webp'});
}finally{await b.close();}
