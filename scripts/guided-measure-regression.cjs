const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=path.resolve(__dirname,'../artifacts/guided-measure-v1');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();
 const report={candidate:182339731835,checks:[],requestsToStaging:[],ordersOrPaymentsSubmitted:false};
 page.on('request',req=>{if(/vercel\.app/.test(req.url()))report.requestsToStaging.push(req.url());});
 const base='https://www.curtainsuk.com';
 async function go(route){const r=await page.goto(base+route,{waitUntil:'domcontentloaded'});assert.ok(r.status()<400,route);}
 try{
  await go('/?preview_theme_id=182339731835');assert.equal(await page.evaluate(()=>Shopify.theme.id),182339731835);report.checks.push({name:'homepage',result:'PASS'});
  await go('/pages/how-to-measure');await page.locator('[data-guided-measure] [data-step]').waitFor();assert.equal(await page.locator('[data-guided-measure]').count(),1);assert.ok((await page.locator('body').innerText()).includes('Let’s measure it together'));assert.ok(await page.locator('a[href="/pages/how-to-measure"]').count()>0);report.checks.push({name:'existing measure hub replaced, entry retained',result:'PASS'});
  await go('/apps/curtainsuk-decision/consultation?experience=premium&entry=match');await page.getByRole('heading',{name:'Let us read your room.',exact:true}).waitFor({timeout:60000});report.checks.push({name:'Fabric Intelligence entry',result:'PASS',scope:'Entry loaded; no HCI submission or logic change'});
  await go('/pages/fabric-library?view=browse-fabrics');await page.locator('[data-cuk-fabric-grid] [data-sample]').first().waitFor({timeout:60000});report.checks.push({name:'Browse Fabrics',result:'PASS',cards:await page.locator('[data-cuk-fabric-grid] [data-sample]').count()});
  const id='sdg-f1325-03';await go('/pages/fabric-library?view=browse-fabrics&fabric='+id+'&window=standard-window');const detail=page.locator('[data-cuk-fabric-detail]');await detail.locator('[data-sample]').first().waitFor({timeout:60000});assert.ok((await detail.innerText()).includes('Abeja'));const make=detail.locator('a[href*="/pages/curtain-visualiser?"]').first();const makeHref=await make.getAttribute('href');assert.equal(new URL(makeHref,base).searchParams.get('fabric'),id);report.checks.push({name:'Fabric Detail / exact Fabric Master identity',result:'PASS',fabricId:id,makeHref});
  const before=await context.request.get(base+'/cart.js');assert.equal((await before.json()).item_count,0,'Test browser basket must start empty');
  const preparedPromise=page.waitForResponse(r=>r.url().includes('/sample-order')&&r.request().method()==='POST');await detail.locator('[data-sample]').first().click();const preparedResponse=await preparedPromise;assert.ok(preparedResponse.ok());const prepared=await preparedResponse.json();assert.equal(prepared.priceMinor,250);assert.equal(prepared.properties['Fabric Master ID'],id);
  if(prepared.purchaseEnabled){await page.waitForURL('**/cart',{timeout:30000});const cart=await (await context.request.get(base+'/cart.js')).json();const line=cart.items.find(x=>x.properties?.['Fabric Master ID']===id);assert.ok(line);assert.equal(line.final_price,250);assert.equal(line.quantity,1);report.checks.push({name:'£2.50 sample handoff and cart identity',result:'PASS',priceMinor:line.final_price,fabricId:id});const cleaned=await context.request.post(base+'/cart/change.js',{data:{id:line.key,quantity:0}});assert.ok(cleaned.ok());assert.equal((await cleaned.json()).item_count,0);report.testCartCleaned=true;}
  else{report.checks.push({name:'£2.50 sample server handoff',result:'PASS',priceMinor:prepared.priceMinor,fabricId:id,cart:'Purchase disabled by existing server gate; no cart write'});}
  await go(makeHref);await page.waitForFunction(id=>document.querySelector('select[name="fabricId"]')?.value===id,id,{timeout:60000});assert.equal(await page.locator('select[name="windowSlug"]').inputValue(),'standard-window');report.checks.push({name:'Make Curtains identity continuity',result:'PASS',fabricId:id,scope:'Entry and selected fabric verified; no pricing/order submission'});
  await go('/pages/samples');assert.ok(await page.locator('[data-cuk-sample-basket]').count()>0);report.checks.push({name:'Samples route retained',result:'PASS'});
  await go('/pages/how-to-fit');assert.ok((await page.locator('main').innerText()).length>100);report.checks.push({name:'Fitting help route',result:'PASS'});
  assert.deepEqual(report.requestsToStaging,[]);report.result='PASS';
 }finally{fs.writeFileSync(path.join(output,'storefront-regression.json'),JSON.stringify(report,null,2));await context.close();await browser.close();}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
