/** Loopback-only customer-view QA against the unchanged packaged V1 modules. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
const args=process.argv.slice(2),i=args.indexOf('--output');
if(i<0)throw Error('Pass --output <private-tranche-dir>');
const portIndex=args.indexOf('--port');
const port=portIndex<0?4482:Number(args[portIndex+1]);
if(!Number.isSafeInteger(port)||port<1024||port>65535)throw Error('Invalid QA port');
const dir=resolve(args[i+1]);
const rows=(await readFile(join(dir,'final-ledger.jsonl'),'utf8')).trim().split(/\r?\n/).map(JSON.parse);
const byId=new Map(rows.filter(row=>row.state==='V1_PASS').map(row=>[row.fabric_id,row]));
const v1=JSON.parse(await readFile('lib/room-visualiser/fixed140-build.json','utf8'));
const standard=JSON.parse(await readFile('lib/room-visualiser/build.json','utf8'));
const pack=resolve('public'+v1.assetBase),standardPack=resolve('public'+standard.assetBase);
const html=await readFile('lib/room-visualiser/runtime/fixed140-v1/customer.html','utf8');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)||![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)){
    res.writeHead(403);return res.end();
  }
  const url=new URL(req.url,`http://127.0.0.1:${port}`),path=url.pathname;
  let bytes;
  try{
    if(path==='/'){
      const row=byId.get(url.searchParams.get('fabric'));
      if(!row){res.writeHead(404);return res.end('Fixture unavailable');}
      const assignment={rendererProfile:'FIXED140_SINGLE_WIDTH_V1',fabricId:row.fabric_id,
        usableWidthCm:row.width.cm,sourceWidthPx:row.source_width_px,sourceHeightPx:row.source_height_px,
        sourceImage:row.asset_path,sha256:row.source_sha256};
      bytes=Buffer.from(html.replace('__VISUALISER_ASSET_BASE__',`http://127.0.0.1:${port}${v1.assetBase}`)
        .replace('__STANDARD_ASSET_BASE__',`http://127.0.0.1:${port}${standard.assetBase}`)
        .replace('__FIXED140_CONFIG__',JSON.stringify(assignment)));
    }else if(path.startsWith('/room-visualiser/fixed140/')){
      const row=rows.find(x=>x.state==='V1_PASS'&&x.asset_path===path);
      if(!row){res.writeHead(404);return res.end();}
      bytes=await readFile(join(dir,'prepared-assets',path.split('/').at(-1)));
    }else{
      const root=path.startsWith(v1.assetBase)?pack:path.startsWith(standard.assetBase)?standardPack:null;
      if(!root){res.writeHead(404);return res.end();}
      const base=root===pack?v1.assetBase:standard.assetBase;
      const file=resolve(root,path.slice(base.length));
      if(!file.startsWith(root+'\\')){res.writeHead(403);return res.end();}
      bytes=await readFile(file);
    }
    res.writeHead(200,{'Content-Type':mime[extname(path)]??(path==='/'?mime['.html']:'application/octet-stream'),
      'Content-Length':bytes.length,'Cache-Control':'no-store'});
    res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end();}
}).listen(port,'127.0.0.1',()=>console.log(`Local V1 tranche QA: http://127.0.0.1:${port}/?fabric=<id>`));
