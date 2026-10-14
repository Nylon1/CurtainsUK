import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {MemoryStore} from '../lib/advisory/store.mjs';
import {createSpecialistService} from '../lib/advisory/specialist-service.mjs';
import {createSpecialistMock} from '../lib/advisory/specialist-provider.mjs';

const port=Number(process.env.SPECIALIST_PREVIEW_PORT||8791);
const owner=randomUUID(),store=new MemoryStore();
const service=createSpecialistService({store,providerForSession:()=>createSpecialistMock()});
const root=new URL('../experiments/specialist-advisory-preview/index.html',import.meta.url);
const assets=new Map([
  ['/theme/curtainsuk-advisory-team.js',new URL('../shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-advisory-team.js',import.meta.url)],
  ['/theme/curtainsuk-specialist-chat.js',new URL('../shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-specialist-chat.js',import.meta.url)],
  ['/theme/curtainsuk-specialist-chat.css',new URL('../shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-specialist-chat.css',import.meta.url)]
]);
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://127.0.0.1:${port}`);
    if(url.pathname==='/apps/curtainsuk-decision/specialists'){
      if(req.method==='GET')return json(res,200,{csrf:'local-preview-only',ownerBinding:'a'.repeat(32)});
      if(req.method!=='POST')return json(res,405,{error:'METHOD_NOT_ALLOWED'});
      let body='';for await(const chunk of req){body+=chunk;if(body.length>16000)return json(res,413,{error:'INPUT_TOO_LARGE'});}
      try{return json(res,200,await service.execute(owner,JSON.parse(body)));}
      catch(error){return json(res,error.status||503,{error:error.code||'PREVIEW_ERROR'});}
    }
    const file=url.pathname==='/'?root:assets.get(url.pathname);
    if(!file){res.writeHead(404);return res.end();}
    res.writeHead(200,{'Content-Type':url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-store'});
    res.end(await readFile(file));
  }catch{res.writeHead(503);res.end();}
}).listen(port,'127.0.0.1',()=>process.stdout.write(`Synthetic specialist preview: http://127.0.0.1:${port}/\n`));
