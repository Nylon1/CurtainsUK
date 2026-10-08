/** Durable, repeatable local browser captures. Never publishes V1 assignments. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import sharp from 'sharp';

const args=process.argv.slice(2);
const option=(key,fallback)=>{const index=args.indexOf(`--${key}`);return index<0?fallback:args[index+1];};
if(!args.includes('--output')||!args.includes('--selection'))
  throw Error('Usage: node capture-qa.mjs --output <private-evidence-dir> --selection <27-id-json> [--playwright <module>] [--browser <chrome.exe>] [--only <fabric-id>]');
const dir=resolve(option('output','')),selectionPath=resolve(option('selection',''));
const port=Number(option('port','4482'));
if(!Number.isSafeInteger(port)||port<1024||port>65535)throw Error('Invalid QA port');
const selection=JSON.parse(await readFile(selectionPath,'utf8'));
if(selection.length<24||selection.length>30||new Set(selection.map(x=>x.fabricId)).size!==selection.length)
  throw Error('QA selection must contain 24–30 unique fabric IDs');
const ledger=(await readFile(join(dir,'final-ledger.jsonl'),'utf8')).trim().split(/\r?\n/).map(JSON.parse);
const byId=new Map(ledger.map(row=>[row.fabric_id,row]));
for(const item of selection)if(byId.get(item.fabricId)?.state!=='V1_PASS')
  throw Error(`QA selection is not V1_PASS: ${item.fabricId}`);
const only=option('only',null),chosen=only?selection.filter(x=>x.fabricId===only):selection;
if(!chosen.length)throw Error('Selected --only ID not in QA selection');
const require=createRequire(import.meta.url);
const playwrightModule=option('playwright',process.env.CURTAINSUK_PLAYWRIGHT_MODULE||'playwright');
const {chromium}=require(playwrightModule);
const browserPath=option('browser',process.env.CURTAINSUK_CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
if(!existsSync(browserPath))throw Error(`Chrome executable unavailable: ${browserPath}`);
const captureDir=join(dir,'qa-captures');await mkdir(captureDir,{recursive:true});
const server=spawn(process.execPath,['scripts/room-visualiser-fixed140-tranche/qa-server.mjs','--output',dir,'--port',String(port)],
  {cwd:process.cwd(),stdio:['ignore','pipe','pipe']});
async function serverReady(){
  return await new Promise((accept,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Local QA server did not start')),10000);
    server.stdout.on('data',chunk=>{if(String(chunk).includes('Local V1 tranche QA')){clearTimeout(timeout);accept();}});
    server.stderr.on('data',chunk=>{clearTimeout(timeout);reject(Error(String(chunk)));});
    server.on('exit',code=>{clearTimeout(timeout);reject(Error(`Local QA server exited ${code}`));});
  });
}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const results=[];let browser;
try{
  await serverReady();
  browser=await chromium.launch({headless:true,executablePath:browserPath,args:[
    '--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox',
  ]});
  for(let index=0;index<chosen.length;index++){
    const item=chosen[index],row=byId.get(item.fabricId),folder=join(captureDir,item.fabricId);
    await mkdir(folder,{recursive:true});
    const page=await browser.newPage({viewport:{width:1100,height:800},deviceScaleFactor:1});
    const issues=[];
    page.on('pageerror',error=>issues.push(`PAGE_ERROR:${error.message}`));
    page.on('console',message=>{if(message.type()==='error'&&
      !message.text().startsWith('Failed to load resource: the server responded with a status of 404'))
      issues.push(`CONSOLE_ERROR:${message.text()}`);});
    page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('/favicon.ico'))
      issues.push(`HTTP_${response.status()}:${response.url()}`);});
    page.on('requestfailed',request=>issues.push(`REQUEST_FAILED:${request.url()}`));
    try{
      await page.goto(`http://127.0.0.1:${port}/?fabric=${encodeURIComponent(item.fabricId)}`,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.fixed140Proof?.ready===true,{timeout:25000});
      const views=[],geometryIds=new Set(),textureIds=new Set();
      for(const view of ['room','curtain','full']){
        if(view!=='room')await page.locator(`[data-view="${view}"]`).click();
        await page.waitForFunction(expected=>window.fixed140Proof?.view===expected,view,{timeout:10000});
        const proof=await page.evaluate(()=>{
          const p=window.fixed140Proof;
          return {ready:p.ready,view:p.view,contextLost:p.contextLost,geometryUuid:p.geometryUuid,
            textureUuid:p.textureUuid,vertices:p.metrics.vertices,triangles:p.metrics.triangles,
            finishedPairWidthCm:p.metrics.finishedPairWidthCm,flatPanelWidthCm:p.metrics.flatPanelWidthCm,
            wavePitchCm:p.metrics.wavePitchCm,sourceHeightCm:p.source.sourceHeightCm};
        });
        if(!proof.ready||proof.contextLost||proof.view!==view||proof.finishedPairWidthCm!==140||proof.wavePitchCm!==14)
          throw Error(`Frozen V1 browser proof failed in ${view}`);
        geometryIds.add(proof.geometryUuid);textureIds.add(proof.textureUuid);
        const file=join(folder,`${view}.jpg`);
        const bytes=await page.screenshot({path:file,type:'jpeg',quality:88,fullPage:false});
        views.push({view,file,bytes:bytes.length,sha256:sha(bytes),proof});
      }
      if(geometryIds.size!==1||textureIds.size!==1)throw Error('Camera switch rebuilt geometry or texture');
      if(issues.length)throw Error(issues.join('; '));
      results.push({fabricId:item.fabricId,reason:item.reason,supplier:row.supplier,
        usableWidthCm:row.width.cm,sourceSha256:row.source_sha256,
        status:'CAPTURED',views,issues:[]});
      console.log(`${index+1}/${chosen.length} ${item.fabricId} 3 views captured`);
    }catch(error){results.push({fabricId:item.fabricId,status:'QA_FAILURE',reason:String(error),issues});
      console.error(`${index+1}/${chosen.length} ${item.fabricId} ${String(error)}`);}
    finally{await page.close();}
    await writeFile(join(captureDir,'qa-results.json'),JSON.stringify(results,null,2)+'\n');
  }
  if(!only){
    const cols=3,cellW=360,cellH=288,perSheet=4;
    for(let start=0;start<results.length;start+=perSheet){
      const group=results.slice(start,start+perSheet),composite=[];
      for(let i=0;i<group.length;i++){
        const row=group[i];
        if(row.status!=='CAPTURED')continue;
        for(let j=0;j<cols;j++){
          const view=row.views[j],left=j*cellW,top=i*cellH;
          const thumb=await sharp(view.file).resize(cellW-8,cellH-37,{fit:'contain',background:'#f7f5ef'}).jpeg({quality:82}).toBuffer();
          composite.push({input:thumb,left:left+4,top:top+2});
          const label=`<svg width="${cellW}" height="32"><rect width="100%" height="100%" fill="#f7f5ef"/><text x="7" y="21" font-family="Arial" font-size="14" fill="#193e35">${row.fabricId} · ${row.usableWidthCm} cm · ${view.view}</text></svg>`;
          composite.push({input:Buffer.from(label),left,top:top+cellH-32});
        }
      }
      const file=join(captureDir,`contact-${String(start/perSheet+1).padStart(2,'0')}.jpg`);
      await sharp({create:{width:cols*cellW,height:group.length*cellH,channels:3,background:'#f7f5ef'}})
        .composite(composite).jpeg({quality:86}).toFile(file);
    }
  }
}finally{if(browser)await browser.close();server.kill();}
console.log(JSON.stringify({attempted:chosen.length,captured:results.filter(row=>row.status==='CAPTURED').length,
  failed:results.filter(row=>row.status!=='CAPTURED').map(row=>({fabricId:row.fabricId,reason:row.reason})),
  files:results.filter(row=>row.status==='CAPTURED').reduce((sum,row)=>sum+row.views.length,0)},null,2));
if(results.some(row=>row.status!=='CAPTURED'))process.exitCode=1;
