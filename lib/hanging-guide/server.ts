import {readFile} from 'node:fs/promises';
import path from 'node:path';
import files from './assets.json';

const allowed = new Set(files);
const root = path.join(process.cwd(),'lib/hanging-guide/runtime');
const types:Record<string,string>={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4'};
export function hangingPreviewAllowed(request:Request){
 const host=new URL(request.url).hostname;
 return process.env.VERCEL_ENV==='preview'||(!process.env.VERCEL&&process.env.NODE_ENV!=='production'&&['127.0.0.1','localhost'].includes(host));
}
export async function hangingAsset(request:Request,parts:string[]=[]){
 const name=parts.length?parts.join('/'): 'index.html';
 if(!allowed.has(name))return new Response('Not found',{status:404});
 const body=await readFile(path.join(root,name));
 const type=types[path.extname(name)]??'application/octet-stream';
 const headers=new Headers({'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':name.endsWith('.html')||name.endsWith('.js')||name.endsWith('.css')?'no-store':'public, max-age=3600','Accept-Ranges':'bytes'});
 if(type==='video/mp4'){
  const range=/^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range')??'');
  if(range){
   const start=range[1]?Number(range[1]):Math.max(0,body.length-Number(range[2]));
   const end=range[1]?(range[2]?Number(range[2]):body.length-1):body.length-1;
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>=body.length){headers.set('Content-Range',`bytes */${body.length}`);return new Response(null,{status:416,headers});}
   headers.set('Content-Range',`bytes ${start}-${end}/${body.length}`);
   headers.set('Content-Length',String(end-start+1));
   return new Response(new Uint8Array(body.subarray(start,end+1)),{status:206,headers});
  }
 }
 headers.set('Content-Length',String(body.length));
 return new Response(new Uint8Array(body),{headers});
}
