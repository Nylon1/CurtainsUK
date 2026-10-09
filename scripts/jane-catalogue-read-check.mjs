// Explicit read-only smoke test: one bounded existing retail search, no rebuild.
import {writeFile} from 'node:fs/promises';
import {createCatalogue} from '../lib/advisory/catalogue.mjs';
const started=new Date().toISOString();let requests=0,status=null;
try{
  const adapter=createCatalogue({fetchImpl:async(url,options)=>{requests++;const response=await fetch(url,options);status=response.status;return response;}});
  const fabrics=await adapter.retail({query:'Shambala',colour:'',pattern:''});
  const report={started,completed:new Date().toISOString(),mode:'read-only-existing-retail-projection',requests,query:'Shambala',maximumHydratedRows:24,maximumReturnedCards:6,returned:fabrics.length,records:fabrics.map(f=>({id:f.id,design:f.design,colour:f.colour,imageUrl:f.imageUrl,url:f.url,purchasable:f.purchasable})),pricesRead:false,wholesaleRead:false,fullMasterAdapter:'Contract-tested; exact-ID SQL independently verified. Credentialed REST integration not activated.'};
  await writeFile('artifacts/jane-phase2/retail-read.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({requests,returned:fabrics.length,ids:fabrics.map(f=>f.id)}));
}catch(e){await writeFile('artifacts/jane-phase2/retail-read.json',JSON.stringify({started,requests,status:'failed',httpStatus:status,code:e.code??'READ_FAILED',productionWrites:0},null,2)+'\n');console.error(JSON.stringify({code:e.code??'READ_FAILED',httpStatus:status}));process.exitCode=1;}
