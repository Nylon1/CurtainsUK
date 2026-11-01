/** The published STANDARD manifest is the approval boundary, not a repeat-size guess.
 * Live catalogue data still owns preview availability and commercial actions. */
export const FABRIC_SCOPE='Choose from approved plain fabrics and complete straight-repeat patterns. Plain previews show colour and general texture, not verified weave scale.';
export function createBeyondCatalogue(manifest){
  const approved=new Map(manifest.fabrics.filter(a=>a.mode==='plain'||a.mode==='patterned'&&a.calibration?.kind==='multiple-repeats').map(a=>[a.fabricId,a]));
  function qualify(record){
    const asset=approved.get(record?.id),preview=record?.roomPreview,source=preview?.worktableSource;
    if(!asset||preview?.available!==true||preview.rendererProfile!=='STANDARD'||!source)return null;
    let image;try{image=new URL(preview.worktableImageUrl);}catch{return null;}
    if(image.protocol!=='https:'||image.hostname!=='curtainsuk-production-api.vercel.app'||image.pathname!==asset.image||image.search)return null;
    const width=source.imageWidthCm,height=source.imageHeightCm,top=source.imageTopCm||0;
    if(!(width>0&&height>top))return null;
    if(asset.mode==='patterned'&&(source.scaleKind!=='calibrated'||/HALF|OFFSET|STAGGER|BRICK/i.test(record.patternMatchType||'')||
      record.horizontalRepeatMm/10!==asset.hRepeat||record.verticalRepeatMm/10!==asset.vRepeat||
      width!==asset.physicalClothCm?.[0]||height!==asset.physicalClothCm?.[1]||top!==0||asset.hRepeat>width||asset.vRepeat>height))return null;
    return {...record,beyondPreview:{mode:asset.mode,width,height,top,tileWidth:asset.mode==='patterned'?asset.hRepeat:width,tileHeight:asset.mode==='patterned'?asset.vRepeat:height-top}};
  }
  const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
  const restricted=()=>reply({code:'FABRIC_NOT_APPROVED',error:'This fabric is not available in Beyond Windows. Choose an approved plain or complete-repeat fabric.'},422);
  async function catalogue(request){
    const input=new URL(request.url).searchParams,url=new URL('https://www.curtainsuk.com/apps/curtainsuk-decision/catalog');
    url.searchParams.set('view','retail');url.searchParams.set('visualiser','1');
    for(const key of['fabric','query','colour','pattern','cursor']){
      if(input.getAll(key).length>1)return reply({error:'Ambiguous catalogue request'},400);
      const value=input.get(key);if(value&&value.length>200)return reply({error:'Catalogue request too long'},400);
      if(value&&key!=='cursor')url.searchParams.set(key,value);
    }
    const fabric=input.get('fabric'),cursor=input.get('cursor')||'0';
    if(!/^\d{1,6}(?::\d{1,2})?$/.test(cursor))return reply({error:'Invalid catalogue cursor'},400);
    let [page,offset=0]=cursor.split(':').map(Number);
    if(page>240000||offset>24)return reply({error:'Invalid catalogue cursor'},400);
    if(fabric&&!approved.has(fabric))return restricted();
    try{
      // Leave time inside the shared browser's 15-second request timeout.
      const signal=AbortSignal.timeout(12000),started=Date.now(),fabrics=[];
      let facets={},refineSearch=false;
      // Bounded scan, with a source-page offset so filtering never loses the rest
      // of a partially consumed page. Opaque cursors work with the existing picker.
      for(let scan=0;scan<8;scan++){
        if(!fabric)url.searchParams.set('cursor',String(page));
        const response=await fetch(url,{signal,headers:{Accept:'application/json'},cache:'no-store'});
        if(!response.ok)return reply({error:'Fabric catalogue unavailable'},response.status===404?404:503);
        const data=await response.json();
        if(fabric){const record=data.fabric?.id===fabric?qualify(data.fabric):null;return record?reply({fabric:record}):restricted();}
        if(!Array.isArray(data.fabrics))throw Error('Invalid catalogue');
        facets=data.facets||{};refineSearch=Boolean(data.refineSearch);
        const next=data.nextCursor==null?null:Number(data.nextCursor);
        if(next!==null&&(!Number.isInteger(next)||next<=page||next>240000))throw Error('Invalid upstream cursor');
        for(let i=offset;i<data.fabrics.length;i++){
          const record=qualify(data.fabrics[i]);if(record)fabrics.push(record);
          if(fabrics.length===24)return reply({fabrics,facets,refineSearch,nextCursor:i+1<data.fabrics.length?`${page}:${i+1}`:next===null?null:String(next)});
        }
        if(next===null)return reply({fabrics,facets,refineSearch,nextCursor:null});
        page=next;offset=0;
        if(Date.now()-started>8000)break;
      }
      return reply({fabrics,facets,refineSearch:fabrics.length===0,nextCursor:String(page)});
    }catch{return reply({error:'Fabric catalogue unavailable. Please retry.'},503);}
  }
  return {catalogue,qualify};
}
