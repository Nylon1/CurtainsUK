// Loopback-only QA fixture for the shared room shell. It reads an existing
// approved V1 asset from production; it never builds or publishes imagery.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import registry from '../../lib/room-visualiser/fixed140-assignments.json';
import {visualiserPage,withRoomPreview} from '../../lib/room-visualiser/server';

const port=4481,origin=`http://127.0.0.1:${port}`;
const [id,assignment]=Object.entries(registry.assignments)[0];
const v1=withRoomPreview({id,design:'Approved V1 source',colour:'Supplier colourway',brand:'Prestigious Textiles',
  images:[],sampleAvailable:false,orderReady:false});
const standard=withRoomPreview({id:'sdg-f1541-01',design:'Bergamot',colour:'Blush/Linen',brand:'Clarke & Clarke',
  horizontalRepeatMm:450,verticalRepeatMm:465,images:[],sampleAvailable:false,orderReady:false});
const types:Record<string,string>={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.glb':'model/gltf-binary','.bin':'application/octet-stream'};
const root=resolve('public');
createServer(async(req,res)=>{
  if(req.headers.host!==`127.0.0.1:${port}`||req.method!=='GET'){res.writeHead(403).end();return;}
  const url=new URL(req.url!,origin);
  try{
    if(url.pathname==='/pages/room-visualiser'){
      const response=await visualiserPage(new Request(url));
      const qa=`<div style="position:fixed;right:8px;bottom:8px;z-index:9999;background:white;padding:8px"><button id="qa-standard">QA: STANDARD</button><button id="qa-fixed140">QA: FIXED140</button></div><script>
        document.querySelector('#qa-standard').onclick=()=>window.visualiserCustomer.selectRecord(${JSON.stringify(standard)});
        document.querySelector('#qa-fixed140').onclick=()=>window.visualiserCustomer.selectRecord(${JSON.stringify(v1)});
      </script>`;
      res.writeHead(200,Object.fromEntries(response.headers)).end((await response.text()).replace('</body>',`${qa}</body>`));return;
    }
    if(url.pathname==='/apps/curtainsuk-decision/catalog'){
      const fabric=url.searchParams.get('fabric')===id?v1:standard;
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({fabric}));return;
    }
    if(url.pathname===assignment.sourceImage){
      const response=await fetch(`https://curtainsuk-production-api.vercel.app${assignment.sourceImage}`);
      if(!response.ok)throw Error(`APPROVED_SOURCE_UNAVAILABLE:${response.status}`);
      res.writeHead(200,{'Content-Type':response.headers.get('content-type')??'image/jpeg','Cache-Control':'no-store'});
      res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    const file=resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+sep))throw Error('INVALID_PATH');
    const bytes=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(bytes);
  }catch(error){console.error(String(error));if(!res.headersSent)res.writeHead(404);res.end('Preview unavailable');}
}).listen(port,'127.0.0.1',()=>console.log(`${origin}/pages/room-visualiser?fabric=${id}`));
