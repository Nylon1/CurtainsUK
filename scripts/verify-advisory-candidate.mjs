// Offline reconciliation of fresh read-only Admin evidence; never uploads.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const read=name=>readFile(name,'utf8').then(JSON.parse);
const [current,prior,manifest,bodies]=await Promise.all([
  'artifacts/jane-completion/theme-readback.json','artifacts/specialist-advisory-release/readback.json',
  'artifacts/specialist-advisory-release/release-manifest.json','artifacts/jane-completion/live-targets.json'
].map(read));
const {live,preview,page,themes}=current.data;
if(themes.nodes.length!==1||themes.nodes[0].id!==live.id||live.role!=='MAIN'||preview.role!=='DEVELOPMENT'||live.files.pageInfo.hasNextPage||preview.files.pageInfo.hasNextPage||manifest.files.length!==20)throw Error('Incomplete or changed theme authority');
const digest=(bytes,algorithm)=>createHash(algorithm).update(bytes).digest('hex');
const same=(a,b)=>a?.padStart(32,'0')===b?.padStart(32,'0');
const files=[];
for(const file of manifest.files){
  const bytes=await readFile('shopify-theme/curtainsuk-dawn-16/'+file.filename),remote=preview.files.nodes.find(f=>f.filename===file.filename),before=live.files.nodes.find(f=>f.filename===file.filename);
  const previewMatches=remote&&(same(remote.checksumMd5,digest(bytes,'md5'))||(!file.filename.endsWith('.webp')&&same(remote.checksumMd5,digest(bytes.toString('utf8').replace(/\r\n/g,'\n'),'md5'))));
  files.push({...file,sourceMatchesManifest:digest(bytes,'sha256')===file.sha256,previewMatches:!!previewMatches,liveMatchesPrior:same(before?.checksumMd5??null,file.liveBeforeMd5),currentLiveMd5:before?.checksumMd5??null});
}
const changes=live.files.nodes.filter(f=>!same(prior.main.files.nodes.find(p=>p.filename===f.filename)?.checksumMd5,f.checksumMd5)).map(f=>f.filename);
const removed=prior.main.files.nodes.filter(p=>!live.files.nodes.some(f=>f.filename===p.filename)).map(p=>p.filename);
const oldBodies=await read('artifacts/specialist-advisory-release/live-targets-before.json');
const targets=bodies.data.theme.files.nodes.map(f=>({filename:f.filename,unchanged:f.body.content===oldBodies.data.theme.files.nodes.find(p=>p.filename===f.filename)?.body.content}));
const ready=files.every(f=>f.sourceMatchesManifest&&f.previewMatches&&f.liveMatchesPrior)&&targets.every(t=>t.unchanged)&&page.isPublished===false&&page.handle==='meet-our-team'&&page.templateSuffix==='meet-our-team';
const result={checkedAt:new Date().toISOString(),status:ready?'SCOPED_FILES_READY_OWNER_RELEASE_APPROVAL_REQUIRED':'DRIFT_REQUIRES_RECONCILIATION',live:live.id,preview:preview.id,page,files,liveFileCount:live.files.nodes.length,unrelatedLiveChanges:changes,removedLiveFiles:removed,existingTargets:targets,physicalIPhone:'pending',screenReader:'pending',actualReducedMotion:'pending'};
await writeFile('artifacts/jane-completion/team-release-readiness.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,scope:files.length,matches:files.filter(f=>f.sourceMatchesManifest&&f.previewMatches&&f.liveMatchesPrior).length,unrelatedLiveChanges:changes,removedLiveFiles:removed,targets}));if(!ready)process.exitCode=1;
