// Local-only review harness. Never imports a production key or enables OpenAI.
import http from 'node:http';
import {Readable} from 'node:stream';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {createConsultationService} from '../lib/advisory/service.mjs';
import {createMockProvider} from '../lib/advisory/mock-provider.mjs';
import {createCatalogue} from '../lib/advisory/catalogue.mjs';
import {EncryptedPreviewStore} from '../lib/advisory/store.mjs';
import {createHttpHandler} from '../lib/advisory/http.mjs';
import {token,digest,BoundedLimiter} from '../lib/advisory/security.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const port=8789,host='127.0.0.1:'+port,origin='http://'+host;
const directory=path.join(os.homedir(),'.curtainsuk-jane-private-preview');await mkdir(directory,{recursive:true});
const keyPath=path.join(directory,'storage.key');let key;
try{key=await readFile(keyPath);}catch(e){if(e.code!=='ENOENT')throw e;key=randomBytes(32);await writeFile(keyPath,key,{flag:'wx',mode:0o600});}
const store=await new EncryptedPreviewStore(path.join(directory,'sessions'),key).initialise();
// Two read-only identities verified through bounded SQL on 2026-10-09. These
// fixtures are not availability data and cannot be returned as retail products.
const fixtures=[{id:'pt-3697-770',design:'SHAMBALA',colour:'LAGOON'},{id:'sdg-f1541-01',design:'Bergamot',colour:'Blush/Linen'}];
// Development diagnostics contain status/timing only, never queries or customer
// messages. Keep transient upstream failures distinguishable from validation.
const publicCatalogue=createCatalogue({fetchImpl:async(...args)=>{
  const started=Date.now();
  try{const response=await fetch(...args);console.log(JSON.stringify({event:'preview_catalogue',status:response.status,durationMs:Date.now()-started}));return response;}
  catch(error){console.log(JSON.stringify({event:'preview_catalogue',failure:error.name==='TimeoutError'?'timeout':'network',durationMs:Date.now()-started}));throw error;}
}});
const catalogue={lookup:async ids=>fixtures.filter(f=>ids.includes(f.id)).map(f=>({...f,purchasable:false,availability:'KNOWLEDGE_ONLY_NOT_A_PURCHASE_OFFER'})),identities:async prefix=>fixtures.filter(f=>f.id.startsWith(prefix)).map(f=>f.id),retail:args=>publicCatalogue.retail(args)};
const service=createConsultationService({store,provider:createMockProvider(),catalogue});
function principal(request){const cookie=(request.headers.get('cookie')??'').split(';').map(c=>c.trim()).find(c=>c.startsWith('jane_preview='))?.slice(13);if(!/^[A-Za-z0-9_-]{43}$/.test(cookie??''))return null;return {owner:digest(cookie),csrf:digest(cookie+':csrf')};}
const handler=createHttpHandler({service,origin,authenticate:principal,limiter:new BoundedLimiter({limit:30})});
const globalLimit=new BoundedLimiter({limit:180});
const files=new Map([
  ['/', ['experiments/jane-advisory-preview/index.html','text/html; charset=utf-8']],
  ['/preview.css',['experiments/jane-advisory-preview/preview.css','text/css; charset=utf-8']],
  ['/preview.mjs',['experiments/jane-advisory-preview/preview.mjs','text/javascript; charset=utf-8']],
  ['/evaluation',['artifacts/jane-readiness/review-gallery.html','text/html; charset=utf-8']],
  ['/readiness',['artifacts/jane-completion/review-gallery.html','text/html; charset=utf-8']],
  ['/review-gallery.css',['artifacts/jane-readiness/review-gallery.css','text/css; charset=utf-8']],
  ['/jane-1440.jpg',['artifacts/jane-readiness/jane-1440.jpg','image/jpeg']],
  ['/jane-390.jpg',['artifacts/jane-readiness/jane-390.jpg','image/jpeg']],
  ['/welcome-clock.mjs',['lib/advisory/welcome-clock.mjs','text/javascript; charset=utf-8']],
  ['/jane.webp',['shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-adviser-jane.webp','image/webp']]
]);
const security={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' https://cdn.shopify.com; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};
const server=http.createServer(async(req,res)=>{
  try{
    if(req.headers.host!==host){res.writeHead(403,security);res.end();return;}
    globalLimit.take('local');
    const url=new URL(req.url,origin),headers=new Headers();for(const [name,value]of Object.entries(req.headers))if(typeof value==='string')headers.set(name,value);
    if(req.method==='GET'&&url.pathname==='/bootstrap'){
      let identity=principal(new Request(origin,{headers}));const responseHeaders={...security,'Content-Type':'application/json'};
      if(!identity){const cookie=token();responseHeaders['Set-Cookie']='jane_preview='+cookie+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=7776000';identity={csrf:digest(cookie+':csrf')};}
      res.writeHead(200,responseHeaders);res.end(JSON.stringify({csrf:identity.csrf,mode:'scripted-mock'}));return;
    }
    if(url.pathname==='/api/consultation'){
      const request=new Request(origin+url.pathname,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
      const response=await handler(request);res.writeHead(response.status,{...security,...Object.fromEntries(response.headers)});for await(const chunk of response.body??[])res.write(chunk);res.end();return;
    }
    if(req.method==='GET'&&files.has(url.pathname)){const [filename,type]=files.get(url.pathname);res.writeHead(200,{...security,'Content-Type':type});res.end(await readFile(path.join(root,filename)));return;}
    res.writeHead(404,security);res.end();
  }catch{if(!res.headersSent)res.writeHead(503,{...security,'Content-Type':'application/json'});res.end(JSON.stringify({error:'PREVIEW_UNAVAILABLE',message:'The local preview could not complete the request.'}));}
});
server.requestTimeout=30000;server.headersTimeout=10000;server.listen(port,'127.0.0.1',()=>console.log('Jane scripted preview: '+origin+' (local only; no model/API charges)'));
