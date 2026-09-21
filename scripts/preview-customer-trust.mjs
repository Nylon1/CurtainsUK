import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const root='artifacts/customer-trust-v1';
const manifest=JSON.parse(await readFile(root+'/publication-manifest.json','utf8'));
const routes=new Map(manifest.pages.map(p=>[p.url,`pages/${p.key}.html`]));
createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:4347');
 const route=manifest.aliases[url.pathname]||url.pathname;
 const file=route==='/'?'index.html':route==='/footer'?'footer.html':routes.get(route);
 if(!file){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(`<h1>Existing CurtainsUK journey</h1><p>This review does not implement or submit commerce. <a href="https://www.curtainsuk.com${encodeURI(url.pathname+url.search)}">Open existing live page</a></p><a href="/">Back to review</a>`);return;}
 try{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(await readFile(root+'/'+file));}catch{res.writeHead(404);res.end('Not found');}
}).listen(4347,'127.0.0.1',()=>console.log('Customer trust review: http://127.0.0.1:4347'));
