import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const trusted=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const candidate=resolve(process.argv[2]||'.');
const baselinePath=process.argv[3]&&resolve(process.argv[3]);
const read=p=>JSON.parse(readFileSync(resolve(trusted,p),'utf8'));
const manifest=read('release/capabilities.json'), lock=read('release/protected-tests.lock.json');
export const sha=b=>createHash('sha256').update(String(b).replaceAll('\r\n','\n')).digest('hex');
for(const [path,digest] of Object.entries(lock)) assert.equal(sha(readFileSync(resolve(trusted,path))),digest,`Protected assertion changed: ${path}`);
const baseline=read('release/baseline.json');
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
assert.equal(spawnSync('git',['merge-base','--is-ancestor',baseline.reconstructedSourceCommit,'HEAD'],{cwd:candidate}).status,0,'Candidate omits the recorded production lineage');
function run(root){
 mkdirSync(resolve(root,'release'),{recursive:true});
 if(root!==trusted) copyFileSync(resolve(trusted,'release/capabilities.json'),resolve(root,'release/capabilities.json'));
 const results={};
 for(const [capability,files] of Object.entries(manifest.testGroups)){
  for(const file of files){
   mkdirSync(dirname(resolve(root,file)),{recursive:true});
   copyFileSync(resolve(trusted,'release/protected-tests',file),resolve(root,file));
  }
  const r=spawnSync(process.execPath,['--import','tsx','--test','--test-reporter=tap',...files],{cwd:root,encoding:'utf8',timeout:180000});
  const count=Number(r.stdout?.match(/# tests (\d+)/)?.[1]||0);
  const skipped=Number(r.stdout?.match(/# skipped (\d+)/)?.[1]||0);
  results[capability]={status:r.status===0&&count>0&&skipped===0?'PASS':'FAIL',tests:count};
  mkdirSync(resolve(root,'artifacts/production-gate'),{recursive:true});
  writeFileSync(resolve(root,`artifacts/production-gate/${capability}.tap`),(r.stdout||'')+(r.stderr||''));
  console.log(`${root===candidate?'candidate':'baseline'} ${capability}: ${results[capability].status} (${count})`);
 }
 return {commit:git(root,'rev-parse','HEAD'),capabilities:results};
}
const current=run(candidate),previous=baselinePath?run(baselinePath):null;
const compared=previous&&Object.keys(current.capabilities).every(k=>previous.capabilities[k].status==='PASS'&&current.capabilities[k].status==='PASS'&&previous.capabilities[k].tests===current.capabilities[k].tests);
const report={manifestVersion:manifest.version,manifestSha256:sha(readFileSync(resolve(trusted,'release/capabilities.json'))),candidate:current,baseline:previous,comparison:compared?'PASS':'BLOCKED',scope:'OFFLINE_CONTRACTS_ONLY',deploymentReady:false};
writeFileSync(resolve(candidate,'artifacts/production-gate/result.json'),JSON.stringify(report,null,2));
if(Object.values(current.capabilities).some(x=>x.status!=='PASS')||(baselinePath&&!compared)) process.exitCode=1;
