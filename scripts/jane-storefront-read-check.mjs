// Reachability only; no forms, cart mutation, checkout or customer AI calls.
import {writeFile} from 'node:fs/promises';
const paths=['/','/pages/fabric-library','/pages/fabric-library?view=browse-fabrics','/apps/curtainsuk-decision/consultation?experience=premium&entry=guided','/pages/room-visualiser','/pages/build-my-rooms','/pages/how-to-measure','/pages/how-to-fit','/pages/samples','/pages/contact-us','/cart','/pages/meet-our-team'];
const results=[];
for(let i=0;i<paths.length;i+=3){
  results.push(...await Promise.all(paths.slice(i,i+3).map(async route=>{
    try{const response=await fetch('https://www.curtainsuk.com'+route,{signal:AbortSignal.timeout(15000)});const result={route,status:response.status,finalUrl:response.url,contentType:response.headers.get('content-type')};await response.body?.cancel();return result;}catch{return {route,status:'NETWORK_ERROR'};}
  })));
}
const report={checkedAt:new Date().toISOString(),scope:'Read-only route reachability, not exhaustive interaction or checkout testing',results,customerSubmissions:0,purchases:0};
await writeFile('artifacts/jane-phase2/storefront-reachability.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(results));
