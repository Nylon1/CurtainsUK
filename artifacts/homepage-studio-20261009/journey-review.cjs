const {chromium}=require('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const report={at:new Date().toISOString(),routes:[],noOrdersOrPayments:true};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/hamza/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--disable-gpu']});
 try {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  await page.goto('https://www.curtainsuk.com/?preview_theme_id=182466478459&homepage_review=7ee80927',{waitUntil:'domcontentloaded'});
  await page.locator('[data-home-studio][data-enhanced=true]').waitFor();
  const banner=page.locator('#shopify-pc__banner');await banner.waitFor({state:'visible',timeout:5000}).catch(()=>{});
  if(await banner.isVisible()){await banner.getByRole('button',{name:/decline|reject/i}).first().focus();await page.keyboard.press('Enter');await banner.waitFor({state:'hidden'});}
  const menu=page.locator('curtainsuk-header [data-open="menu"]');await menu.click();await page.waitForFunction(()=>document.querySelector('dialog[data-dialog="menu"]').open);await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[data-dialog="menu"]').open);report.mobileMenu=true;
  await page.route('**/cuk-home-office-evening.webp*',route=>route.abort());
  await page.locator('[data-room="office"]').click();await page.waitForFunction(()=>document.querySelector('[data-room="office"]').getAttribute('aria-selected')==='true');
  await page.locator('[data-mode="evening"]').click();await page.locator('[data-room-error]').waitFor({state:'visible'});
  assert.match(await page.locator('[data-room-image]').getAttribute('src'),/office-daylight/);assert.equal(await page.locator('[data-mode="daylight"]').getAttribute('aria-pressed'),'true');
  await page.unroute('**/cuk-home-office-evening.webp*');await page.locator('[data-mode="evening"]').click();await page.waitForFunction(()=>document.querySelector('[data-room-image]').src.includes('office-evening')&&document.querySelector('[data-room-panel]').getAttribute('aria-busy')==='false');
  report.imageFailureAndRetry=true;
  await page.locator('[data-room="living"]').click();await page.locator('[data-room="bedroom"]').click();await page.locator('[data-room="lounge"]').click();await page.locator('[data-mode="daylight"]').click();await page.waitForFunction(()=>document.querySelector('[data-room-image]').src.includes('lounge-daylight')&&document.querySelector('[data-room-panel]').getAttribute('aria-busy')==='false');
  report.rapidSwitchFinalState='lounge:daylight';
  const cta=page.locator('[data-room-cta]');await cta.evaluate(e=>e.scrollIntoView({block:'center'}));await cta.click();await page.waitForURL(/\/pages\/room-visualiser\?room=lounge/);
  report.roomHandoff=await page.evaluate(()=>({url:location.href,theme:window.Shopify?.theme?.id,frames:[...document.querySelectorAll('iframe')].map(f=>f.getAttribute('src')).filter(s=>s?.includes('/apps/curtainsuk-decision/room-visualiser'))}));
  assert.ok(report.roomHandoff.frames.some(s=>s.includes('room=lounge')&&s.includes('fabric=sdg-f1541-01')));
  for(const route of ['/pages/fabric-library?view=browse-fabrics','/pages/fabric-library?view=curtain-style','/pages/samples','/pages/solve-my-window','/apps/curtainsuk-decision/consultation?experience=premium&entry=match','/apps/curtainsuk-decision/consultation?experience=premium&entry=guided']){
   const response=await context.request.get('https://www.curtainsuk.com'+route);report.routes.push({route,status:response.status()});assert.ok(response.ok(),route);
  }
  report.complete=true;
 }finally{await browser.close();}
 await fs.writeFile(path.join(__dirname,'journey-review.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(async e=>{report.error=e.stack;await fs.writeFile(path.join(__dirname,'journey-review.json'),JSON.stringify(report,null,2)+'\n');console.error(e);process.exitCode=1;});
