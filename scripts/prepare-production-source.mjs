// Export exact protected Git HEAD, repair archive line endings, then audit every tracked file.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {mkdir,access,writeFile,readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {auditProductionExport} from './audit-production-export.mjs';

const verification=process.argv[2]==='--verify';
const candidate=process.argv[2]==='--candidate';
const target=(verification||candidate)?process.argv[3]:process.argv[2];
if(!target)throw Error('Usage: node scripts/prepare-production-source.mjs [--verify|--candidate] <output-directory>');
const output=resolve(target);
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const head=git('rev-parse','HEAD');
if(candidate||(verification&&process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_BASE_REF==='release/production')){
  assert.equal(process.env.GITHUB_ACTIONS,'true','Candidate export is CI-only.');
  assert.equal(process.env.GITHUB_BASE_REF,'release/production','Candidate export requires a protected release PR.');
  assert.equal(head,process.env.CANDIDATE_SOURCE_SHA,'Candidate export must use the exact PR HEAD.');
}else if(process.env.GITHUB_ACTIONS==='true'){
  assert.equal(process.env.GITHUB_REF,'refs/heads/release/production','CI export requires the protected branch.');
  assert.equal(head,process.env.GITHUB_SHA,'CI export requires the exact workflow SHA.');
}else{
  const remote=git('ls-remote','origin','refs/heads/release/production').split(/\s+/)[0];
  assert.equal(head,remote,'Only exact current protected release/production HEAD may be packaged.');
}
assert.equal(git('status','--porcelain','--untracked-files=no'),'','Tracked source changes must be committed first.');
const receiptPath=output+'.receipt.json';
if(!verification){
  try {await access(output);throw Error('Output already exists: '+output);}
  catch(error){if(error.code!=='ENOENT')throw error;}
  await mkdir(dirname(output),{recursive:true});
  await mkdir(output);
  const archive=spawn('git',['archive','--format=tar',head],{stdio:['ignore','pipe','inherit']});
  const extraction=spawn('tar',['-xf','-','-C',output],{stdio:['pipe','inherit','inherit']});
  archive.stdout.pipe(extraction.stdin);
  await Promise.all([archive,extraction].map(child=>new Promise((done,fail)=>{
    child.once('error',fail);
    child.once('close',code=>code===0?done():fail(Error(child.spawnfile+' exited '+code)));
  })));
}
const report=await auditProductionExport(output,{repair:!verification,allowVercelLink:verification});
if(verification){
  const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
  for(const key of ['sourceCommit','sourceTree','trackedFiles','trackedBytes','contentDigest','publishedLineEndingExceptions','protectedAssetGuard'])
    assert.deepEqual(report[key],receipt[key],'Receipt mismatch: '+key);
}else await writeFile(receiptPath,JSON.stringify({...report,output,verifiedAt:new Date().toISOString()},null,2)+'\n');
console.log(JSON.stringify({sourceCommit:head,sourceTree:report.sourceTree,trackedFiles:report.trackedFiles,trackedBytes:report.trackedBytes,normalizedFiles:report.normalizedFiles,publishedLineEndingExceptions:report.publishedLineEndingExceptions.length,contentDigest:report.contentDigest,protectedAssetGuard:report.protectedAssetGuard,receiptPath}));
