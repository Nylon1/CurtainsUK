// Local browser review only. No OpenAI, checkout, migration or indexer access.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const origin='http://127.0.0.1:8794',id='pt-3697-770',out='artifacts/jane-fabric-handoff-20261012';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage(),errors=[],commands=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(r.url()===origin+'/api/consultation'){const b=r.postDataJSON();commands.push({action:b.action,fabricIds:b.context?.fabricIds,consent:b.context?.consent});}});
const report={classification:'LOCAL_BROWSER_HANDOFF_WITH_BOUNDED_PUBLIC_RETAIL_READ',fabricId:id,checks:[],screenshots:[],paidCalls:0,hostedWrites:0,publicActivation:false};
try{
 await page.goto(origin+'/fabric-detail?fabric='+id);
 const link=page.getByRole('link',{name:'Ask Jane about this fabric, '+id+' (private AI preview)',exact:true});
 await link.waitFor({timeout:20000});
 assert.equal(new URL(await link.getAttribute('href'),origin).searchParams.get('fabric'),id);
 report.checks.push('Existing detail renderer opens Jane with exact selected ID');
 await link.click();await page.locator('#fabric-reference-card img').waitFor({timeout:20000});
 assert.match(await page.locator('#fabric-reference-card').innerText(),new RegExp(id));
 assert.equal(commands.filter(x=>x.action==='context').length,0);
 assert.equal(await page.locator('#fabric-share').isDisabled(),true);
 await page.locator('#start').click();await page.locator('#waiting').waitFor();await page.locator('#skip-wait').click();
 assert.equal(await page.locator('#fabric-share').isDisabled(),true);
 await page.locator('#fabric-share-consent').focus();await page.keyboard.press('Space');await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'fabric-share');await page.keyboard.press('Enter');
 await page.locator('#fabric-reference-status').getByText('Shared with this consultation.',{exact:false}).waitFor({timeout:15000});
 assert.deepEqual(commands.filter(x=>x.action==='context'),[{action:'context',fabricIds:[id],consent:true}]);
 report.checks.push('No automatic context mutation; keyboard consent/Tab/Enter shares exact ID once');
 await page.locator('#message').fill('I would like a calm room with oak furniture.');await page.locator('#message-form button').click();
 await page.waitForFunction(()=>document.querySelectorAll('#transcript .bubble').length===3);
 assert.match(await page.locator('#transcript .bubble').last().innerText(),/SHAMBALA.*LAGOON/);
 assert.doesNotMatch(await page.locator('#transcript .bubble').last().innerText(),/patterns feel too busy/);
 report.checks.push('Mock consultation continues with selected-fabric context');
 for(const width of [320,390,412,768,1440]){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(()=>scrollTo(0,0));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow at '+width);
  if([390,1440].includes(width)){const name='fabric-handoff-'+width+'.png';await page.screenshot({path:out+'/'+name,fullPage:true});report.screenshots.push(name);}
 }
 report.checks.push('No horizontal overflow at 320/390/412/768/1440');
 await page.reload();await page.locator('#resume').waitFor();await page.locator('#resume').click();
 await page.locator('#fabric-reference-status').getByText('Shared with this consultation.',{exact:false}).waitFor({timeout:15000});
 assert.equal(commands.filter(x=>x.action==='context').length,1);
 report.checks.push('Reload/resume restores selected fabric without duplicate context');
 await page.locator('#save-open').click();await page.locator('#delete').click();await page.locator('#start').waitFor();
 assert.equal(await page.locator('#fabric-reference').isVisible(),false);
 report.checks.push('Deletion clears selected-fabric consultation display');
 const bad=await context.newPage();let lookups=0;
 bad.on('request',r=>{if(r.url().includes('/api/fabric-reference'))lookups++;});
 await bad.goto(origin+'/?entry=fabric-detail&fabric=bad%3Cscript%3E');await bad.locator('#fabric-reference-status').getByText('This fabric link is invalid.',{exact:false}).waitFor();
 assert.equal(lookups,0);await bad.close();report.checks.push('Invalid ID refused before retail lookup');
 const failure=await context.newPage();await failure.route('**/api/fabric-reference?*',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
 await failure.goto(origin+'/?entry=fabric-detail&fabric='+id);await failure.getByText('The fabric could not be verified.',{exact:false}).waitFor();
 assert.equal(await failure.locator('#fabric-share').isDisabled(),true);await failure.locator('#fabric-retry').click();await failure.getByText('The fabric could not be verified.',{exact:false}).waitFor();
 await failure.close();report.checks.push('Lookup failure stays visible, retry available, sharing blocked');
 assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
 assert.equal(await page.locator('.portrait img').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 report.checks.push('Actual reduced-motion media query and zero-duration portrait transition verified');
 const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const touch=await mobile.newPage();
 await touch.goto(origin+'/fabric-detail?fabric='+id);const touchLink=touch.getByRole('link',{name:'Ask Jane about this fabric, '+id+' (private AI preview)',exact:true});await touchLink.waitFor({timeout:20000});await touchLink.tap();
 await touch.locator('#fabric-reference-card img').waitFor({timeout:20000});assert.match(await touch.locator('#fabric-reference-card').innerText(),new RegExp(id));await mobile.close();
 report.checks.push('Browser-emulated touch opens same exact fabric; not physical iPhone testing');
 assert.deepEqual(errors,[]);report.consoleErrors=errors;report.browser=browser.version();report.physicalIphone='pending';report.spokenScreenReader='pending';report.completedAt=new Date().toISOString();
 await writeFile(out+'/browser-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}
