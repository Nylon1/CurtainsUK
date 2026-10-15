import { createStudioScene } from "./scene.mjs";
import { CUSHION_VISUAL_SIZES,SHAPED_CONSTRUCTION_VERSION } from "./geometry.mjs";
const config=window.CUSHION_STUDIO_CONFIG;
if(!config?.ownerReview) throw new Error("Internal review only");
const roundPreview=new URLSearchParams(location.search).get("roundBaseline")==="1"?"baseline":"soft-fill";
const $=(id)=>document.getElementById(id);
const controls=[['plain','sdg-f1239-30'],['stripe','sdg-dstr237715'],['directional','sdg-dmlf236846']];
const select=$("review-size");
for(const size of CUSHION_VISUAL_SIZES){const option=new Option(`${size.shape} · ${size.label}`,size.id);select.add(option);}
const response=await fetch(`${config.apiBase}/catalogue?examples=1&limit=48`,{cache:'no-store'});
if(!response.ok) throw new Error(`Catalogue ${response.status}`);
const fabrics=(await response.json()).items;
const errors=[];
const scene=await createStudioScene($("render-stage"),{threeUrl:config.threeUrl,onRenderError:(message)=>errors.push(message)});
$("status").textContent="Ready. Choose a size and render its review set.";
let manifestUrl;
$("render-review").onclick=async()=>{
  const button=$("render-review");button.disabled=true;select.disabled=true;
  try{
    errors.length=0;
    const size=CUSHION_VISUAL_SIZES.find((size)=>size.id===select.value);
    const room=size.shape==='bed'?'king-bed':size.shape==='bolster'?'double-bed':'sofa-2';
    const views=[['Front','front','straight','configurator'],['Three-quarter','front','three-quarter','configurator'],['True side','front','side','configurator'],['Back','back','straight','configurator'],['Furniture','front','three-quarter','layout']];
    if(size.shape==='bolster') views.push(['End A','end1','side','configurator'],['End B','end2','side','configurator']);
    $('grid').replaceChildren();$('grid').style.setProperty('--columns',views.length);
    $('review-title').textContent=`${size.shape} · ${size.label}`;
    $('review-spec').textContent=`Filled · Unpiped · source placement X100/Y100 mm · ${room} · ${size.shape==='square'?'existing square construction':SHAPED_CONSTRUCTION_VERSION}. ${size.shape==='bolster'?'Body front/reverse show one continuous wrap; the two end panels match upright.':'Both outward faces share the exact selected motif placement.'}`;
    const captures=[];
    for(const [kind,id] of controls){
      const fabric=fabrics.find((fabric)=>fabric.id===id);
      if(!fabric?.calibration) throw new Error(`Missing calibrated ${kind} control`);
      const spec={version:1,id:`review-${size.id}-${kind}`,sizeId:size.id,fabricId:id,filling:'filled',edge:'unpiped',placementMm:{x:100,y:100},quantity:1,...(size.shape!=='square'?{constructionProfile:SHAPED_CONSTRUCTION_VERSION}:{}),...(size.shape==='bolster'?{bolsterEndPlacementMm:{x:100,y:100}}:{})};
      const design={version:1,id:'internal-range-review',name:'Internal range review',scene:room,colours:{furniture:'#304650',wall:'#e8e3d8',floor:'#b5a18a'},pieces:[{spec,position:{slot:1,offsetX:0,offsetY:0,rotation:0}}]};
      for(const [label,face,inspectionAngle,mode] of views){
        $('status').textContent=`Rendering ${kind} · ${label}…`;
        scene.update(design,fabrics,{mode,selectedId:spec.id,face,inspectionAngle,view:'close',roundPreview});
        await scene.ready();await new Promise(requestAnimationFrame);
        if(errors.length) throw new Error(errors.join('; '));
        const figure=document.createElement('figure'),image=new Image(),caption=document.createElement('figcaption');
        image.src=scene.capture();image.alt=`${size.label} ${kind} fabric ${label}`;await image.decode();
        const title=document.createElement('strong');title.textContent=`${kind} · ${label}`;
        caption.append(title,`${fabric.design} · ${fabric.colour || fabric.colourway || ''}`);
        figure.append(image,caption);$('grid').append(figure);
        captures.push({visualRoundProfile:size.shape==='round'?(roundPreview==='baseline'?'baseline':'soft-fill-v1'):undefined,kind,label,face,inspectionAngle,mode,scene:room,spec:structuredClone(spec),calibration:{widthMm:fabric.calibration.physicalWidthMm,heightMm:fabric.calibration.physicalHeightMm,sourceHash:fabric.calibration.sourceHash},rendered:true});
      }
    }
    const evidence={capturedAt:new Date().toISOString(),sizeId:size.id,renderer:'customer scene.mjs',captures,errors:[...errors]};
    const json=JSON.stringify(evidence,null,2);$('manifest').textContent=json;
    if(manifestUrl)URL.revokeObjectURL(manifestUrl);
    manifestUrl=URL.createObjectURL(new Blob([json],{type:'application/json'}));
    const download=$('download-manifest');download.href=manifestUrl;download.download=`range-${size.id}-manifest.json`;download.hidden=false;
    $('status').textContent=`Complete: ${captures.length} rendered views · no texture/render errors.`;
  }catch(error){$('status').textContent=`Review failed: ${error.message}`;console.error(error);}
  finally{button.disabled=false;select.disabled=false;}
};
