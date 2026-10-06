import {FABRICS} from '../fabrics.mjs';
import {DEFAULT_FABRIC,validFabricId,fabricActions,previewPlan as classify} from './catalogue-contract.mjs';
export {DEFAULT_FABRIC,validFabricId,fabricActions};
export const previewPlan=record=>classify(record,FABRICS);
export async function resolveFabric(id,{signal}={}){
  if(!validFabricId(id))throw Error('This fabric link is not valid. Please choose a fabric from the catalogue.');
  // A stalled connection must reach the explicit retry state as well as an
  // ordinary failed response. This controller also works in older mobile Safari.
  const controller=new AbortController(),abort=()=>controller.abort(signal?.reason),timer=setTimeout(()=>controller.abort(),25000);
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  try{
    const response=await fetch(new URL('/apps/curtainsuk-decision/catalog?'+new URLSearchParams({view:'retail',visualiser:'1',fabric:id}),location.origin),{signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw Error(response.status===404?'This fabric is no longer available in the catalogue.':'The fabric catalogue could not load. Please try again.');
    const {fabric}=await response.json();
    if(!fabric||fabric.id!==id)throw Error('This fabric is no longer available in the catalogue.');
    return fabric;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
