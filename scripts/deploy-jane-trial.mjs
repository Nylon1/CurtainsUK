// Explicit operator action, never called by an adviser or customer endpoint.
// Existing Vercel project is manually deployed, so use deployment-scoped env.
// CLI --env NAME reads process.env; values never appear in argv or output.
import {spawn} from 'node:child_process';
import {readPrivateFile} from './jane-private-file.mjs';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const c=await readPrivateFile(process.env.ADVISORY_PRIVATE_TRIAL_PATH);
execFileSync('git',['diff','--exit-code','HEAD','--','app/api/advisory','lib/advisory','scripts','package.json','package-lock.json'],{stdio:'ignore'});
const receipt=JSON.parse(await readFile('artifacts/jane-hosted-trial-20261011/package.json','utf8'));
if(c.projectRef!=='hqysjumypgeapgmqkcrx'||Date.parse(c.expiresAt)<=Date.now()||receipt.sourceCommit!==execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()||receipt.sha256!==createHash('sha256').update(await readFile('.vercel/output/functions/api/advisory/consultation.func/index.cjs')).digest('hex'))throw Error('REVIEWED_PACKAGE_REQUIRED');
c.env.ADVISORY_SOURCE_COMMIT=receipt.sourceCommit;
const args=[process.env.ADVISORY_VERCEL_CLI_PATH,'deploy','--prebuilt','--target','preview','--project','prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA','--scope','team_U8WXxsKS9LT2DmEllVkOpihz','--no-wait','--meta','janeSourceCommit='+receipt.sourceCommit,'--meta','janeBundleSha256='+receipt.sha256,...Object.keys(c.env).flatMap(key=>['--env',key])];
const child=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe'],windowsHide:true,env:{...process.env,...c.env}});
// Retain only safe deployment URL and coarse progress. No environment values.
const safeOutput=b=>{for(const line of b.toString().split(/\r?\n/)){const urls=line.match(/https:\/\/[a-z0-9.-]+\.vercel\.app\b/g);if(urls)for(const url of urls)console.log(url);if(/Error:/.test(line))console.error('VERCEL_DEPLOYMENT_FAILED: inspect scoped build diagnostics.');}};
child.stdout.on('data',safeOutput);child.stderr.on('data',safeOutput);child.on('error',()=>{process.exitCode=1;});child.on('close',code=>{process.exitCode=code??1;});
