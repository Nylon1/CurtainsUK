// Deploy only the reviewed Build Output package to an authenticated Preview.
// Deployment-scoped values stay in process.env, never in command arguments.
import {spawn,execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import {readPrivateFile} from './jane-private-file.mjs';

const config=await readPrivateFile(process.env.ADVISORY_PRIVATE_TRIAL_PATH);
const receipt=JSON.parse(await readFile(join(homedir(),'.codex','tmp','jane-hosted-review-package','review-package.json'),'utf8'));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
execFileSync('git',['diff','--exit-code','HEAD','--','app/jane-review','app/api/advisory','lib/advisory','scripts','package.json','package-lock.json'],{stdio:'ignore'});
if(config.projectRef!=='hqysjumypgeapgmqkcrx'||Date.parse(config.expiresAt)<=Date.now()||receipt.sourceCommit!==head||receipt.classification!=='PROTECTED_REVIEW_ONLY'||receipt.staging!==join(homedir(),'.codex','tmp','jane-hosted-review-package')||config.env.ADVISORY_REVIEW_CHAT!=='true'||receipt.publishableKeySha256!==createHash('sha256').update(config.env.ADVISORY_AUTH_PUBLISHABLE_KEY).digest('hex'))throw Error('REVIEWED_PREVIEW_REQUIRED');
for(const [path,expected] of Object.entries(receipt.routes)){
  const actual=createHash('sha256').update(await readFile(join(receipt.staging,'.vercel','output','functions',path+'.func','index.cjs'))).digest('hex');
  if(actual!==expected)throw Error('REVIEW_BUNDLE_MISMATCH');
}
const ui=createHash('sha256').update(await readFile(join(receipt.staging,'.vercel','output','static','jane-review.js'))).digest('hex');
if(ui!==receipt.uiSha256)throw Error('REVIEW_UI_MISMATCH');
const env={...config.env,ADVISORY_SOURCE_COMMIT:head};
const args=[process.env.ADVISORY_VERCEL_CLI_PATH,'deploy','--prebuilt','--target','preview','--project','prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA','--scope','team_U8WXxsKS9LT2DmEllVkOpihz','--no-wait','--meta','janeSourceCommit='+head,'--meta','janeReviewUiSha256='+ui,...Object.keys(env).flatMap(key=>['--env',key])];
const child=spawn(process.execPath,args,{cwd:receipt.staging,stdio:['ignore','pipe','pipe'],windowsHide:true,env:{...process.env,...env}});
const safeOutput=buffer=>{for(const line of buffer.toString().split(/\r?\n/)){const urls=line.match(/https:\/\/[a-z0-9.-]+\.vercel\.app\b/g);if(urls)for(const url of urls)console.log(url);if(/Error:/.test(line))console.error('VERCEL_PREVIEW_DEPLOYMENT_FAILED');}};
child.stdout.on('data',safeOutput);
child.stderr.on('data',safeOutput);
child.on('error',()=>{process.exitCode=1;});
child.on('close',code=>{process.exitCode=code??1;});
