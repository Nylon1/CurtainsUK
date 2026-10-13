// Package the existing review UI and routes for an isolated Vercel Preview.
// This never writes project environment variables or a production deployment.
import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {readPrivateFile} from './jane-private-file.mjs';

const projectRef='hqysjumypgeapgmqkcrx';
const config=await readPrivateFile(process.env.ADVISORY_PRIVATE_TRIAL_PATH);
const publishable=config?.env?.ADVISORY_AUTH_PUBLISHABLE_KEY;
if(config.projectRef!==projectRef||!/^sb_publishable_[A-Za-z0-9_-]{8,200}$/.test(publishable))throw Error('REVIEW_PUBLISHABLE_KEY_REQUIRED');
const staging=join(homedir(),'.codex','tmp','jane-hosted-review-package');
const root=join(staging,'.vercel','output'),functions=root+'/functions',staticDir=root+'/static';
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
await mkdir(functions,{recursive:true});
await mkdir(staticDir,{recursive:true});
await mkdir(join(staging,'.vercel'),{recursive:true});
await writeFile(join(staging,'.vercel','project.json'),JSON.stringify({projectId:'prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA',orgId:'team_U8WXxsKS9LT2DmEllVkOpihz',projectName:'curtainsuk-staging-api'}));

const webEntry=`import React from 'react';
import {createRoot} from 'react-dom/client';
import JaneReviewChat from './app/jane-review/JaneReviewChat.jsx';
createRoot(document.getElementById('app')).render(React.createElement(JaneReviewChat,{projectRef:'${projectRef}',publishableKey:__ADVISORY_PUBLISHABLE_KEY__}));`;
const browser=await build({
  stdin:{contents:webEntry,resolveDir:process.cwd(),sourcefile:'jane-review-entry.jsx',loader:'jsx'},
  bundle:true,platform:'browser',format:'esm',target:'es2022',minify:true,jsx:'automatic',
  outfile:staticDir+'/jane-review.js',
  define:{__ADVISORY_PUBLISHABLE_KEY__:JSON.stringify(publishable)},
  plugins:[{name:'next-image-review-shim',setup(plugin){
    plugin.onResolve({filter:/^next\/image$/},()=>({path:'image',namespace:'jane-review'}));
    plugin.onLoad({filter:/.*/,namespace:'jane-review'},()=>({contents:`import React from 'react';export default function Image({unoptimized,priority,fill,...props}){return React.createElement('img',{...props,loading:priority?'eager':'lazy'});}`,loader:'js',resolveDir:process.cwd()}));
  }}],
  metafile:true,logLevel:'silent'
});
if(browser.warnings.length)throw Error('REVIEW_BROWSER_BUNDLE_WARNINGS');
await copyFile('app/jane-review/jane-review.css',staticDir+'/jane-review.css');
await copyFile('shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-adviser-jane.webp',staticDir+'/jane-review-portrait.webp');
const html=`<!doctype html><html lang="en-GB"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Jane | Protected consultation review</title><link rel="stylesheet" href="/jane-review.css"><div id="app"></div><script type="module" src="/jane-review.js"></script></html>`;
await writeFile(staticDir+'/jane-review.html',html);

const routes=[
  {path:'api/advisory/review-chat',file:'app/api/advisory/review-chat/route.js',method:'POST',duration:120},
  {path:'api/advisory/review-fabric',file:'app/api/advisory/review-fabric/route.js',method:'GET',duration:30}
];
const receipts={};
for(const route of routes){
  const dir=functions+'/'+route.path+'.func';
  await mkdir(dir,{recursive:true});
  const entry=`import {Readable} from 'node:stream';import {${route.method}} from './${route.file}';
export default async function handler(req,res){
  try{
    const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(typeof value==='string')headers.set(key,value);
    const request=new Request('https://'+process.env.VERCEL_URL+req.url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
    const response=await ${route.method}(request);res.writeHead(response.status,Object.fromEntries(response.headers));
    for await(const chunk of response.body??[])res.write(chunk);res.end();
  }catch{res.writeHead(503,{'Cache-Control':'no-store','Content-Type':'application/json'});res.end('{"error":"SERVICE_UNAVAILABLE"}');}
}`;
  const result=await build({stdin:{contents:entry,resolveDir:process.cwd(),sourcefile:'jane-review-route.mjs'},bundle:true,platform:'node',target:'node24',format:'cjs',outfile:dir+'/index.cjs',external:['pg-native'],metafile:true,logLevel:'silent'});
  if(result.warnings.length)throw Error('REVIEW_ROUTE_BUNDLE_WARNINGS');
  await writeFile(dir+'/.vc-config.json',JSON.stringify({runtime:'nodejs24.x',handler:'index.cjs',launcherType:'Nodejs',shouldAddHelpers:false,maxDuration:route.duration,regions:['fra1']}));
  receipts[route.path]=createHash('sha256').update(await readFile(dir+'/index.cjs')).digest('hex');
}
await writeFile(root+'/config.json',JSON.stringify({version:3,routes:[
  {src:'/jane-review',dest:'/jane-review.html'},
  {src:'/jane-review-portrait',dest:'/jane-review-portrait.webp'},
  ...routes.map(route=>({src:'/'+route.path,dest:'/'+route.path})),
  {handle:'filesystem'}
]}));
const receipt={sourceCommit,classification:'PROTECTED_REVIEW_ONLY',staging,routes:receipts,uiSha256:createHash('sha256').update(await readFile(staticDir+'/jane-review.js')).digest('hex'),publishableKeySha256:createHash('sha256').update(publishable).digest('hex'),publicKeyEmbedded:true,privateKeyEmbedded:false};
await writeFile(join(staging,'review-package.json'),JSON.stringify(receipt,null,2));
console.log(JSON.stringify(receipt));
