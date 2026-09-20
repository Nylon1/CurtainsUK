const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { Liquid } = require('../artifacts/curtain-style-v2/test-deps/node_modules/liquidjs');
const { chromium } = require('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const theme = path.resolve(__dirname, '../shopify-theme/curtainsuk-new-design-live-base');
const output = path.resolve(__dirname, '../artifacts/guided-measure-v1');
const preview = process.argv.includes('--preview');
const serve = process.argv.includes('--serve');
const storeKey = 'curtainsuk.guided-measure.v1';
const source = fs.readFileSync(path.join(theme,'assets/curtainsuk-guided-measure.js'),'utf8');
new vm.Script(source);
assert.ok(!/fetch\(|XMLHttpRequest|\/cart\/|\/checkout|vercel\.app/.test(source));
const rawLocale = fs.readFileSync(path.join(theme,'locales/en.default.json'),'utf8');
const locale = JSON.parse(rawLocale.slice(rawLocale.indexOf('{')));
if (!locale.guided_measure) Object.assign(locale,JSON.parse(fs.readFileSync(path.join(output,'translations.json'),'utf8')));
const engine = new Liquid({root:path.join(theme,'snippets'),extname:'.liquid'});
engine.registerFilter('t',key=>{const value=key.split('.').reduce((v,k)=>v?.[k],locale);assert.equal(typeof value,'string','Missing translation '+key);return value;});
engine.registerFilter('asset_url',name=>'/assets/'+name);
engine.registerFilter('stylesheet_tag',url=>`<link rel="stylesheet" href="${url}">`);
engine.registerTag('doc',{parse(tag,tokens){while(tokens.length)if(tokens.shift().name==='enddoc')break;},render(){return '';}});
const section = fs.readFileSync(path.join(theme,'snippets/curtainsuk-guided-measure-content.liquid'),'utf8');
(async()=>{
 const body=await engine.parseAndRender(section,{section_id:'guided-test'});
 const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/assets/')){const file=path.basename(req.url);if(!['curtainsuk-guided-measure.css','curtainsuk-guided-measure.js'].includes(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(path.join(theme,'assets',file)));return;}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Guided Measure verification</title><style>body{margin:0;font-family:Arial,sans-serif}</style>'+body+'</html>');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const local='http://127.0.0.1:'+server.address().port;
 if(serve){console.log('LOCAL_REVIEW_URL='+local);return;}
 const url=preview?'https://www.curtainsuk.com/pages/how-to-measure?preview_theme_id=182339731835':local;
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const report={url,widths:[],checks:[],errors:[],noProductionMutations:true};
 try {
  for(const width of [1440,390,412]){
   const context=await browser.newContext({viewport:{width,height:950},acceptDownloads:true});
   const page=await context.newPage();
   page.on('pageerror',e=>{if(/guided-measure/.test(e.stack||''))report.errors.push(e.message);});
   await page.goto(url,{waitUntil:'domcontentloaded'});
   const root=page.locator('[data-guided-measure]');
   await root.locator('[data-step]').waitFor();
   if(preview){report.theme=await page.evaluate(()=>({id:Shopify.theme.id,role:Shopify.theme.role}));assert.equal(report.theme.id,182339731835);assert.equal(report.theme.role,'unpublished');}
   const action=async name=>root.locator(`[data-action="${name}"]`).first().click();
   const choose=async(key,val)=>{await root.locator(`[data-choice="${key}"][data-value="${val}"]`).click();await action('next');};
   const step=async name=>assert.equal(await root.locator('[data-step]').getAttribute('data-step'),name);
   const reset=async()=>{await page.evaluate(k=>localStorage.removeItem(k),storeKey);await page.reload({waitUntil:'domcontentloaded'});await root.locator('[data-step]').waitFor();};
   const setup=async(hardware='track',opening='standard',heading='double_pinch')=>{await reset();await choose('hardware',hardware);if(hardware==='none')return;await choose('opening',opening);if(hardware==='track')await choose('heading',heading);};
   const reading=async(key,val)=>{await root.locator(`input[name="${key}"]`).fill(val);await action('next');};
   const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),storeKey);
   const screen=async name=>{await root.screenshot({animations:'disabled',path:path.join(output,`${preview?'preview':'local'}-${width}-${name}.png`)});};
   const layout=async()=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');assert.equal(await root.locator('input:visible').count(),1);const box=await root.locator('input:visible').boundingBox();assert.ok(box.height>=44);};
   await screen('entry');
   await setup();await step('width');await layout();
   for(const val of ['', '0','-10','1e3','200cm']){await root.locator('input').fill(val);await action('next');await step('width');assert.ok(await root.locator('.gmeasure__error').isVisible());}
   await action('help');assert.ok(await root.locator('.gmeasure__help').isVisible());assert.ok(await root.locator('.gmeasure__help a[href="mailto:enquiries@curtainsuk.com"]').isVisible());await action('help');
   await screen('track-width');
   await reading('width','0200.50');await choose('finish','floor');await step('drop');await layout();
   assert.ok((await root.locator('.gmeasure__instruction').innerText()).includes('top of the track'));
   await screen('track-drop');await action('help');assert.ok(await root.locator('[data-visual="track-drop-anchor-detail"]').isVisible());await screen('track-anchor-help');await action('help');await reading('drop','245.25');await step('check');
   assert.ok((await root.innerText()).includes('0200.50 cm'));assert.ok((await root.locator('svg').first().textContent()).includes('245.25 cm'));
   await screen('check');await action('edit-width');assert.equal(await root.locator('input').inputValue(),'0200.50');await action('next');await action('next');assert.equal(await root.locator('input').inputValue(),'245.25');await action('next');await action('confirm');
   await step('brief');let saved=await state(), brief=saved.briefs.at(-1);
   assert.equal(brief.rawMeasurements.width.value,'0200.50');assert.equal(brief.rawMeasurements.drop.value,'245.25');assert.equal(brief.rawMeasurements.drop.startAnchor,'top_track');assert.equal(brief.workshopDerived,null);assert.equal(brief.confirmedProductionSpecification,null);assert.equal(brief.customerConfirmation,true);
   const download=page.waitForEvent('download');await action('download');const file=await download;await file.saveAs(path.join(output,`brief-${width}.json`));assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output,`brief-${width}.json`))),brief);
   await screen('brief');await page.reload({waitUntil:'domcontentloaded'});await root.locator('[data-brief]').waitFor();
   await action('edit-width');await root.locator('input').fill('201');await action('next');await action('next');await action('next');await action('confirm');saved=await state();assert.equal(saved.briefs.length,2);assert.equal(saved.briefs[0].rawMeasurements.width.value,'0200.50');assert.equal(saved.briefs[1].rawMeasurements.width.value,'201');
   for(const heading of ['wave','pencil']){await setup('track','standard',heading);await reading('width','210');await choose('finish','floor');const expected=heading==='wave'?'bottom of the track':'top of the track';assert.ok((await root.locator('.gmeasure__instruction').innerText()).includes(expected));await screen(heading+'-drop');await reading('drop','240');await action('confirm');assert.equal((await state()).briefs.at(-1).rawMeasurements.drop.startAnchor,heading==='wave'?'bottom_track':'top_track');}
   await setup('pole');await screen('pole-width');assert.ok((await root.locator('.gmeasure__instruction').innerText()).includes('between the finials'));await reading('width','200');await choose('finish','short');await screen('pole-drop');assert.ok((await root.locator('.gmeasure__instruction').innerText()).includes('bottom of the pole'));await reading('drop','180');await action('confirm');brief=(await state()).briefs.at(-1);assert.equal(brief.rawMeasurements.drop.startAnchor,'bottom_pole');assert.equal(brief.rawMeasurements.width.startAnchor,'inner_left_finial_boundary');
   await setup('track','bay','double_pinch');await screen('bay-width');assert.ok((await root.locator('.gmeasure__instruction').innerText()).includes('following the track around the bay'));await reading('width','510');await choose('finish','floor');await reading('drop','230');await screen('bay-check');await action('confirm');brief=(await state()).briefs.at(-1);assert.equal(brief.rawMeasurements.width.path,'complete_fitted_track_route');assert.equal(brief.reviewState,'bay_workroom_review_required');assert.equal(brief.rawMeasurements.additionalReadings.length,0);
   for(const [hardware,opening,heading,text] of [['none','standard','pencil','Fit your hardware first'],['pole','bay','pencil','A bay needs a fitted bay track'],['track','bay','wave','Wave is not recommended'],['track','standard','unknown','identify your heading']]){await setup(hardware,opening,heading);assert.equal(await root.locator('input').count(),0);assert.ok((await root.innerText()).includes(text));await screen(hardware==='none'?'no-hardware':hardware+'-'+opening+'-'+heading+'-stop');}
   for(const finish of ['soft_break','puddle']){await setup();await reading('width','200');await choose('finish',finish);assert.equal(await root.locator('input').count(),0);assert.ok((await root.innerText()).includes('confirm your finishing point'));assert.equal((await state()).finish,finish);await screen(finish+'-review');}
   for(const opening of ['doors','wide','wall']){await setup('track',opening,'pencil');assert.ok((await root.locator('.gmeasure__instruction').innerText()).includes('full width of your track'));}
   // A changed anchor retains evidence but cannot confirm until the new line is rechecked.
   await setup();await reading('width','200');await choose('finish','floor');await reading('drop','240');await action('edit-hardware');await action('next');await action('next');await choose('heading','wave');await action('next');await action('next');assert.equal(await root.locator('input').inputValue(),'240');assert.equal((await state()).checkedDrop,'');assert.ok((await root.innerText()).includes('Check this reading'));await action('next');await action('confirm');assert.equal((await state()).briefs.at(-1).rawMeasurements.drop.startAnchor,'bottom_track');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   report.widths.push({width,result:'PASS',journeys:['standard-track','Wave-track','Pencil-track','pole','bay','not-fitted','bay-pole-stop','bay-wave-stop','unknown-heading','soft-break-review','puddle-review','doors','wide','wall'],rawStringsPreserved:true,immutableConfirmedRevisions:true,downloadVerified:true,backAndReload:true});
   await context.close();
  }
  const nojs=await browser.newContext({javaScriptEnabled:false});const np=await nojs.newPage();await np.goto(url,{waitUntil:'domcontentloaded'});assert.ok((await np.locator('noscript').allTextContents()).join(' ').includes('Guided Measure needs JavaScript'));await nojs.close();report.checks.push('No-JavaScript help');
  const privateContext=await browser.newContext();await privateContext.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('disabled');}});});const pp=await privateContext.newPage();await pp.goto(url,{waitUntil:'domcontentloaded'});await pp.locator('[data-guided-measure] [data-step]').waitFor();assert.ok((await pp.locator('.gmeasure__storage').innerText()).includes('cannot save'));await privateContext.close();report.checks.push('Storage-disabled warning');
  const corrupt=await browser.newContext();await corrupt.addInitScript(k=>localStorage.setItem(k,JSON.stringify({version:'cuk-fitted-hardware-v1-2026-09-20',step:'brief',hardware:'pole',opening:'standard',width:'200',drop:'240',briefs:[{}]})),storeKey);const cp=await corrupt.newPage();await cp.goto(url,{waitUntil:'domcontentloaded'});await cp.locator('[data-guided-measure] [data-step]').waitFor();assert.equal(await cp.locator('[data-brief]').count(),0);assert.equal(await cp.locator('[data-step]').getAttribute('data-step'),'width');await corrupt.close();report.checks.push('Malformed resume cannot present confirmed brief');
  assert.deepEqual(report.errors,[]);report.result='PASS';
 }finally{fs.writeFileSync(path.join(output,preview?'preview-verification.json':'local-verification.json'),JSON.stringify(report,null,2));await browser.close();server.close();}
 console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
