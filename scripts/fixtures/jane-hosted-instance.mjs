import http from 'node:http';
import {Readable} from 'node:stream';
import {createHostedRuntime} from '../../lib/advisory/hosted-runtime.mjs';
process.once('message',({env})=>{
 const runtime=createHostedRuntime({env});
 const server=http.createServer(async(req,res)=>{
  try{const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(typeof v==='string')headers.set(k,v);
   const request=new Request('https://'+env.VERCEL_URL+'/api/advisory/consultation',{method:req.method,headers,body:Readable.toWeb(req),duplex:'half'});
   const response=await runtime.handle(request);res.writeHead(response.status,Object.fromEntries(response.headers));for await(const chunk of response.body??[])res.write(chunk);res.end();
  }catch{res.writeHead(503);res.end('{"error":"LOCAL_HARNESS_UNAVAILABLE"}');}
 });
 server.requestTimeout=30000;server.listen(0,'127.0.0.1',()=>process.send({port:server.address().port,pid:process.pid}));
 process.on('message',async m=>{if(m.action==='close'){server.close();await runtime.close();process.exit(0);}});
});
