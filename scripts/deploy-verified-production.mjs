// The manual Vercel release command. A changed or incomplete export cannot reach deploy.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';

const output=process.argv[2];
const scope=process.argv[3];
if(!output)throw Error('Usage: node scripts/deploy-verified-production.mjs <verified-export> [scope]');
if(scope)assert.match(scope,/^[a-z0-9-]+$/,'Invalid Vercel scope');
const source=resolve(output);
const receipt=JSON.parse(readFileSync(source+'.receipt.json','utf8'));
const verified=spawnSync(process.execPath,['scripts/prepare-production-source.mjs','--verify',source],{stdio:'inherit'});
if(verified.status!==0)throw Error('Production export integrity or protected asset guard failed.');
const link=JSON.parse(readFileSync(resolve(source,'.vercel/project.json'),'utf8'));
assert.equal(link.projectId,'prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA','Unexpected Vercel project');
assert.equal(link.orgId,'team_U8WXxsKS9LT2DmEllVkOpihz','Unexpected Vercel team');
const args=['deploy','--prod','--skip-domain','--yes','--build-env','CURTAINSUK_BUILD_SOURCE_COMMIT='+receipt.sourceCommit];
if(scope)args.push('--scope',scope);
const deployment=spawnSync('vercel',args,{cwd:source,stdio:'inherit',shell:process.platform==='win32'});
if(deployment.status!==0)throw Error('Staged production deployment failed.');
