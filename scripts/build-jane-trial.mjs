// Tiny Build Output API package for the approved preview. Uses the exact Next
// route implementation, not another consultation engine or customer storefront.
import {build} from 'esbuild';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='.vercel/output',dir=root+'/functions/api/advisory/consultation.func';
await mkdir(dir,{recursive:true});await mkdir(root+'/static',{recursive:true});
await writeFile('.vercel/project.json',JSON.stringify({projectId:'prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA',orgId:'team_U8WXxsKS9LT2DmEllVkOpihz',projectName:'curtainsuk-staging-api'}));
const entry=`import {Readable} from 'node:stream';import {POST} from './app/api/advisory/consultation/route.js';
export default async function handler(req,res){
 try{const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(typeof value==='string')headers.set(key,value);
 const request=new Request('https://'+process.env.VERCEL_URL+'/api/advisory/consultation',{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
 const response=await POST(request);res.writeHead(response.status,Object.fromEntries(response.headers));for await(const chunk of response.body??[])res.write(chunk);res.end();
 }catch{res.writeHead(503,{'Cache-Control':'no-store'});res.end('{"error":"SERVICE_UNAVAILABLE"}');}
}`;
const result=await build({stdin:{contents:entry,resolveDir:process.cwd(),sourcefile:'jane-trial-adapter.mjs'},bundle:true,platform:'node',target:'node24',format:'cjs',outfile:dir+'/index.cjs',external:['pg-native'],metafile:true,logLevel:'silent'});
if(result.warnings.length)throw Error('REVIEW_BUNDLE_WARNINGS');
await writeFile(dir+'/.vc-config.json',JSON.stringify({runtime:'nodejs24.x',handler:'index.cjs',launcherType:'Nodejs',shouldAddHelpers:false,maxDuration:30,regions:['fra1']}));
await writeFile(root+'/config.json',JSON.stringify({version:3,routes:[{src:'/api/advisory/consultation',dest:'/api/advisory/consultation'},{handle:'filesystem'}]}));
await writeFile(root+'/static/index.html','<!doctype html><html lang="en-GB"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex,nofollow"><title>Jane | Protected infrastructure trial</title><body><main><h1>Jane: protected infrastructure trial</h1><p>AI adviser development. Invented test accounts and scripted mock responses only.</p><p>The consultation API requires a short-lived signed deployment approval and verified test-account access. No public AI consultation is active.</p><p><a href="https://github.com/Nylon1/CurtainsUK/pull/169">Development and evidence: draft PR #169</a></p></main></body></html>');
const bundle=await readFile(dir+'/index.cjs'),sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const receipt={sourceCommit,classification:'PREVIEW_ONLY_API_PACKAGE',bytes:bundle.length,sha256:createHash('sha256').update(bundle).digest('hex'),inputs:Object.keys(result.metafile.inputs),model:'mock-only'};
await writeFile('artifacts/jane-hosted-trial-20261011/package.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify({sourceCommit,bytes:receipt.bytes,sha256:receipt.sha256}));
