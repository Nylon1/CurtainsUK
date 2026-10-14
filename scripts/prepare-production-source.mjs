// Export the complete protected Git tree, independent of sparse checkout and CRLF.
import {execFileSync} from 'node:child_process';
import {mkdir,access,unlink,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';

const target=process.argv[2];
if(!target)throw Error('Usage: node scripts/prepare-production-source.mjs <new-output-directory>');
const output=resolve(target),archive=output+'.tar';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const head=git('rev-parse','HEAD');
const remote=git('ls-remote','origin','refs/heads/release/production').split(/\s+/)[0];
if(head!==remote)throw Error('Only exact current protected release/production HEAD may be packaged.');
if(git('status','--porcelain','--untracked-files=no'))throw Error('Tracked source changes must be committed through the protected PR workflow first.');
for(const path of [output,archive]) {
  try {await access(path);}catch(error){if(error.code==='ENOENT')continue;throw error;}
  throw Error('Output already exists: '+path);
}
await mkdir(dirname(output),{recursive:true});await mkdir(output);
execFileSync('git',['archive','--format=tar','--output='+archive,head],{stdio:'inherit'});
execFileSync('tar',['-xf',archive,'-C',output],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/verify-released-visualiser-assets.mjs'],{cwd:output,stdio:'inherit'});
const receipt={sourceCommit:head,sourceTree:git('rev-parse','HEAD^{tree}'),output,verifiedAt:new Date().toISOString()};
await writeFile(output+'.receipt.json',JSON.stringify(receipt,null,2)+'\n');
await unlink(archive);
console.log(JSON.stringify(receipt));
