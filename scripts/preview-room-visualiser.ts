import "./curtainsuk-server-script-loader.mjs";
// Read-only loopback harness. It is not a Next route and cannot accept remote clients.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {loadEnvConfig} from '@next/env';
import {visualiserPage,withRoomPreview} from '../lib/room-visualiser/server';
import {retailFabricDetail,searchRetailFabrics} from '../lib/fabric-master/retail-repository';
import {searchVisualiserFabrics} from '../lib/room-visualiser/visualiser-catalogue';
loadEnvConfig(process.cwd());
const port=Number.parseInt(process.env.VISUALISER_PREVIEW_PORT||'4380',10);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('INVALID_PREVIEW_PORT');
const base=`http://127.0.0.1:${port}`,root=resolve('public');
createServer(async(req,res)=>{
  if(req.headers.host!==`127.0.0.1:${port}`||req.method!=='GET'){res.writeHead(403);res.end();return;}
  try{
    const url=new URL(req.url!,base);
    if(url.pathname==='/pages/room-visualiser'){
      const response=await visualiserPage(new Request(url));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    if(url.pathname==='/apps/curtainsuk-decision/catalog'){
      const params=url.searchParams;params.delete('naila');params.delete('browseGuide');params.delete('guidePrice');
      const fabric=params.has('fabric')?await retailFabricDetail(params.get('fabric')!,false,{includeIntelligence:false}):null;
      const result=params.has('fabric')?{fabric:fabric?withRoomPreview(fabric):null}:params.get('visualiser')==='1'?await searchVisualiserFabrics(params):await searchRetailFabrics(params,{includeIntelligence:false});
      const body='fabrics' in result&&params.get('visualiser')!=='1'?{...result,fabrics:result.fabrics.map(withRoomPreview)}:result;
      res.writeHead(params.has('fabric')&&!fabric?404:200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));return;
    }
    const file=resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+sep))throw Error('INVALID_PATH');
    const types:Record<string,string>={mjs:'text/javascript',js:'text/javascript',css:'text/css',json:'application/json',html:'text/html',webp:'image/webp',jpg:'image/jpeg',png:'image/png',glb:'model/gltf-binary',bin:'application/octet-stream'};
    res.writeHead(200,{'Content-Type':types[file.split('.').at(-1)!]??'application/octet-stream'});res.end(await readFile(file));
  }catch(error){console.error(error instanceof Error?error.message:'PREVIEW_ERROR');if(!res.headersSent)res.writeHead(500);res.end('Preview unavailable');}
}).listen(port,'127.0.0.1',()=>console.log(base+'/pages/room-visualiser'));
