/** Loopback-only renderer smoke. Never writes an assignment or serves a public route. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const fixture=process.argv[2];
const usableWidthCm=Number(process.argv[3]);
if(!fixture||!Number.isFinite(usableWidthCm))throw Error('Usage: node fixed140-local-smoke.mjs <source-image> <usable-width-cm>');
const original=await readFile(fixture),meta=await sharp(original).metadata();
const sha256=createHash('sha256').update(original).digest('hex');
const extension=extname(fixture).toLowerCase();
if(!['.jpg','.jpeg','.webp'].includes(extension))throw Error('Fixture must be JPEG or WebP');
const imagePath=`/room-visualiser/fixed140/${sha256}${extension}`;
const assignment={rendererProfile:'FIXED140_SINGLE_WIDTH_V1',fabricId:'LOCAL_SMOKE_NOT_CATALOGUE',usableWidthCm,
  sourceWidthPx:meta.width,sourceHeightPx:meta.height,sourceImage:imagePath,sha256};
const build=JSON.parse(await readFile('lib/room-visualiser/fixed140-build.json','utf8'));
const standardBuild=JSON.parse(await readFile('lib/room-visualiser/build.json','utf8'));
const pack=resolve(`public${build.assetBase}`),html=await readFile('lib/room-visualiser/runtime/fixed140-v1/customer.html','utf8');
const standardPack=resolve(`public${standardBuild.assetBase}`);
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)||!['127.0.0.1:4480','localhost:4480'].includes(req.headers.host)){res.writeHead(403);return res.end();}
  const path=new URL(req.url,'http://127.0.0.1:4480').pathname;
  let data,type;
  if(path==='/'){
    data=Buffer.from(html.replace('__VISUALISER_ASSET_BASE__',`http://127.0.0.1:4480${build.assetBase}`).replace('__STANDARD_ASSET_BASE__',`http://127.0.0.1:4480${standardBuild.assetBase}`).replace('__FIXED140_CONFIG__',JSON.stringify(assignment)));
    type=types['.html'];
  }else if(path===imagePath){data=original;type=types[extension];}
  else if(path.startsWith(build.assetBase)){
    const candidate=resolve(pack,path.slice(build.assetBase.length));
    if(candidate!==pack&&!candidate.startsWith(pack+'\\')){res.writeHead(403);return res.end();}
    try{data=await readFile(candidate);type=types[extname(candidate)]??'application/octet-stream';}
    catch{res.writeHead(404);return res.end();}
  }else if(path.startsWith(standardBuild.assetBase)){
    const candidate=resolve(standardPack,path.slice(standardBuild.assetBase.length));
    if(candidate!==standardPack&&!candidate.startsWith(standardPack+'\\')){res.writeHead(403);return res.end();}
    try{data=await readFile(candidate);type=types[extname(candidate)]??'application/octet-stream';}
    catch{res.writeHead(404);return res.end();}
  }else{res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':type,'Content-Length':data.length,'Cache-Control':'no-store'});
  res.end(req.method==='HEAD'?undefined:data);
});
server.listen(4480,'127.0.0.1',()=>console.log('Local FIXED140 smoke: http://127.0.0.1:4480/'));
