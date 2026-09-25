import { readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { verifyCohort, passed } from './lib/pt-live-verification-core.mjs';
const arg=(name,fallback)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const requestedDirectory=arg('directory','');
if(!requestedDirectory)throw Error('PUBLIC_CHECK_MANIFEST_DIRECTORY_REQUIRED');
const directory=resolve(requestedDirectory);
const read=async name=>JSON.parse((await readFile(resolve(directory,name),'utf8')).replace(/^\uFEFF/,''));
const allManifest=await read('manifest.json'),coverage=await read('pdf-price-coverage.json');
const start=Number(arg('start','0')),count=Number(arg('count','500')),concurrency=Number(arg('concurrency','1'));
if(!Number.isInteger(start)||!Number.isInteger(count)||start<0||count<1||count>500||start+count>allManifest.length)throw Error('PUBLIC_CHECK_SCOPE_INVALID');
const manifest=allManifest.slice(start,start+count);
const sourceFingerprint=createHash('sha256').update(JSON.stringify({manifest,coverage})).digest('hex');
const prefix=arg('output-prefix','curtainsuk-live-verification');
if(!/^[a-z0-9-]{1,80}$/.test(prefix))throw Error('PUBLIC_CHECK_OUTPUT_PREFIX_INVALID');
const progressName=`${prefix}-progress-${start}-${count}.json`;
let resume=[];
if(process.argv.includes('--resume')) {
  const previous=await read(progressName).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(previous) {
    if(previous.sourceFingerprint!==sourceFingerprint)throw Error('PUBLIC_CHECK_RESUME_SOURCE_CHANGED');
    resume=previous.results;
  }
}
const report=await verifyCohort({manifest,coverage,concurrency,resume,onProgress:async(results,metrics)=>{
  const temporary=resolve(directory,`${progressName}.tmp`);
  await writeFile(temporary,JSON.stringify({sourceFingerprint,checked:results.length,metrics,results},null,2));
  await rename(temporary,resolve(directory,progressName));
  if(results.length%10===0)console.log(JSON.stringify({checked:results.length,passed:results.filter(passed).length}));
}});
await writeFile(resolve(directory,`${prefix}-${start}-${count}.json`),JSON.stringify({...report,sourceFingerprint},null,2));
console.log(JSON.stringify({summary:report.summary,metrics:report.metrics}));
if(!report.results.every(passed))process.exitCode=1;
