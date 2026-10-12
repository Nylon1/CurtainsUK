import {readFabric} from '/fabric-reference.mjs';
try{
  const params=new URLSearchParams(location.search),id=params.get('fabric');
  if(params.getAll('fabric').length!==1||!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,149}$/.test(id??''))throw Error('Choose an exact fabric ID for this local review.');
  await fetch('/bootstrap',{cache:'no-store'});const f=await readFabric(id);
  const fabric={...f,collection:'',sampleAvailable:false,orderReady:false,images:[{url:f.imageUrl,width:600,height:600,imageType:'SUPPLIER'}],metadata:{alt:f.design+' · '+f.colour,title:f.design+' · private handoff review',metaDescription:f.description??''},roomPreview:{available:!!f.roomPreview,url:f.roomPreview}};
  window.CurtainsUKFabricExperience.renderDetail(document.getElementById('detail-root'),fabric,null,()=>{});
}catch(e){document.getElementById('detail-error').textContent=e.message;}
