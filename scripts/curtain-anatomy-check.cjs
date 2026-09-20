const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');
const theme = path.resolve(__dirname, '../shopify-theme/curtainsuk-new-design-live-base');
const output = path.resolve(__dirname, '../artifacts/curtain-style-v2');
const { Liquid } = require(path.join(output, 'test-deps/node_modules/liquidjs'));
const { chromium } = require(process.env.CUK_PLAYWRIGHT || 'C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const section = fs.readFileSync(path.join(theme, 'sections/curtainsuk-curtain-style.liquid'), 'utf8');
const locales = fs.readFileSync(path.join(theme, 'locales/en.default.json'), 'utf8');
const locale = JSON.parse(locales.slice(locales.indexOf('{')));
const forms = ['wave','double-pinch','pencil-pleat','eyelet'];
const layers = ['heading','flow','structure','fabric','room','floor'];
const javascript = section.split('{% javascript %}')[1].split('{% endjavascript %}')[0];
const css = section.split('{% stylesheet %}')[1].split('{% endstylesheet %}')[0];
new vm.Script(javascript);
assert.ok(!/fetch\(|localStorage|sessionStorage|cart\/|checkout|window\.location/.test(javascript), 'Anatomy must not mutate commerce or navigate');
assert.ok(!/vercel\.app|staging\.|pinch-pleat-master|triple/i.test(section), 'No leaked routes or disallowed master');
assert.ok(css.includes('prefers-reduced-motion:reduce'));
for (const form of forms) for (const layer of layers) assert.ok(locale.curtain_anatomy[form + '_' + layer]);
for (const form of forms) {
  const asset = fs.readFileSync(path.join(theme,'assets/cuk-anatomy-'+form+'.png'));
  const original = fs.readFileSync('C:/Users/hamza/CurtainsUK-Geometry-Study-v1/'+form+'-master.png');
  assert.equal(crypto.createHash('sha256').update(asset).digest('hex'),crypto.createHash('sha256').update(original).digest('hex'));
  assert.equal(asset.readUInt32BE(16),1448);
  assert.equal(asset.readUInt32BE(20),1086);
}
const engine = new Liquid({ root:path.join(theme,'snippets'), extname:'.liquid' });
engine.registerFilter('t', key => {
  const value = key.split('.').reduce((value,k) => value?.[k],locale);
  assert.equal(typeof value,'string','Missing translation '+key);
  return value;
});
engine.registerFilter('asset_url', name => '/assets/'+name);
engine.registerTag('doc',{parse(tag,tokens){while(tokens.length){const t=tokens.shift();if(t.name==='enddoc')break}},render(){return ''}});
const body = section.replace(/{% stylesheet %}[\s\S]*?{% endstylesheet %}/,'').replace(/{% javascript %}[\s\S]*?{% endjavascript %}/,'').replace(/{% schema %}[\s\S]*?{% endschema %}/,'');
(async()=>{
  const html = await engine.parseAndRender(body,{section:{id:'local-v2'},images:{}});
  assert.equal((html.match(/data-anatomy-panel /g)||[]).length,4);
  assert.equal((html.match(/data-anatomy-layer=/g)||[]).length,24);
  assert.equal((html.match(/<h1>/g)||[]).length,1);
  const server = http.createServer((req,res)=>{
    if (req.url.startsWith('/assets/')) {
      const name=path.basename(req.url);
      if (!/^cuk-(anatomy-(wave|double-pinch|pencil-pleat|eyelet)|studio-(presence-more|length-(short|soft-break|puddle)|position-(window-led|high-wide)))\.png$/.test(name)) {res.writeHead(404).end();return;}
      res.setHeader('Content-Type','image/png');
      res.end(fs.readFileSync(path.join(theme,'assets',name)));return;
    }
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Curtain Anatomy local verification</title><style>body{margin:0;--font-body-family:Arial,sans-serif;--font-heading-family:Georgia,serif}'+css+'</style>'+html+'<script>'+javascript+'</script></html>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  const browser = await chromium.launch({executablePath:process.env.CUK_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const results={assetIntegrity:'4 originals byte-identical',translations:'all resolved',matrix:[],links:[],noCommerceStateWrites:true};
  try {
    for (const width of [1440,390,412]) {
      const page=await browser.newPage({viewport:{width,height:1000}});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url);
      await page.locator('[data-curtain-anatomy][data-ready]').waitFor();
      await page.locator('.canatomy__master').first().evaluate(image=>image.decode());
      const tabs=page.locator('[data-anatomy-tabs] button');
      const selectedPanel=page.locator('[data-anatomy-panel]:visible');
      const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}));
      assert.equal(geometry.width,width);assert.ok(geometry.scroll<=width,'No horizontal overflow at '+width);
      for (let f=0;f<4;f++) {
        await tabs.nth(f).click();
        assert.equal(await selectedPanel.count(),1);
        assert.equal(await selectedPanel.getAttribute('data-form'),forms[f]);
        await selectedPanel.locator('.canatomy__master').evaluate(image=>image.decode());
        for (const layer of layers) {
          await selectedPanel.locator('[data-layer="'+layer+'"]').click();
          assert.equal(await selectedPanel.getAttribute('data-focus'),layer);
          assert.equal(await selectedPanel.locator('[data-anatomy-layer][open]').count(),1);
          assert.equal(await selectedPanel.locator('[data-anatomy-layer][open]').getAttribute('data-anatomy-layer'),layer);
          assert.equal(await selectedPanel.locator('[data-layer][aria-pressed="true"]').getAttribute('data-layer'),layer);
          assert.ok((await selectedPanel.locator('[data-anatomy-layer][open] p').innerText()).length>25);
          const box=await selectedPanel.locator('[data-layer="'+layer+'"]').boundingBox();
          assert.ok(box.width>=44 && box.height>=44);
        }
        if(width===1440) {
          await selectedPanel.locator('[data-layer="heading"]').click();
          await page.waitForTimeout(450);
          await page.locator('.canatomy__experience').screenshot({path:path.join(output,forms[f]+'-desktop.png')});
        }
      }
      const rememberedLayer = await selectedPanel.getAttribute('data-focus');
      await tabs.nth(3).focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await selectedPanel.getAttribute('data-form'),'wave');
      await page.keyboard.press('End');
      assert.equal(await selectedPanel.getAttribute('data-form'),'eyelet');
      await page.keyboard.press('Home');
      assert.equal(await selectedPanel.getAttribute('data-form'),'wave');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await selectedPanel.getAttribute('data-form'),'eyelet');
      const visual=selectedPanel.locator('[data-anatomy-visual]');
      await visual.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:1,clientX:220,clientY:150});
      await visual.dispatchEvent('pointerup',{pointerType:'touch',pointerId:1,clientX:100,clientY:158});
      assert.equal(await selectedPanel.getAttribute('data-form'),'wave');
      assert.equal(await selectedPanel.getAttribute('data-focus'),rememberedLayer);
      const waveVisual=selectedPanel.locator('[data-anatomy-visual]');
      await waveVisual.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:1,clientX:220,clientY:150});
      await waveVisual.dispatchEvent('pointerup',{pointerType:'touch',pointerId:1,clientX:200,clientY:290});
      assert.equal(await selectedPanel.getAttribute('data-form'),'wave','Vertical scrolling must not change form');
      await selectedPanel.locator('[data-anatomy-layer="fabric"] summary').focus();
      await page.keyboard.press('Enter');
      assert.equal(await selectedPanel.getAttribute('data-focus'),'fabric');
      await selectedPanel.locator('[data-layer="heading"]').click();
      await selectedPanel.locator('[data-closeup]').click();
      assert.equal(await selectedPanel.getAttribute('data-closeup'),'true');
      await tabs.nth(1).click();
      assert.equal(await selectedPanel.getAttribute('data-closeup'),'true','Keep heading magnified while comparing forms');
      assert.equal(await selectedPanel.locator('.canatomy__focus').isVisible(),false,'Unscaled focus frame must be hidden in close-up');
      await page.waitForTimeout(450);
      await selectedPanel.locator('[data-anatomy-visual]').screenshot({path:path.join(output,'heading-closeup-'+width+'.png')});
      await selectedPanel.locator('[data-anatomy-layer="flow"] summary').click();
      assert.equal(await selectedPanel.getAttribute('data-closeup'),'false','Reset magnification for non-heading layers');
      await selectedPanel.locator('[data-anatomy-layer="heading"] summary').click();
      await tabs.nth(0).click();
      await page.waitForTimeout(450);
      const visualBox=await selectedPanel.locator('[data-anatomy-visual]').boundingBox();
      if(width<750) assert.ok(visualBox.width>=width-1,'Mobile image is full viewport width');
      const links=await page.locator('.canatomy a').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href')));
      const supported={activity:['low','statement'],pattern:['stripe','geometric','botanical'],texture:['visible-weave','relief'],presence:['light','substantial']};
      for(const link of links) {
        assert.ok(link.startsWith('/'));
        const u=new URL(link,'https://www.curtainsuk.com');
        assert.ok(['/pages/fabric-library','/pages/curtain-visualiser','/apps/curtainsuk-decision/consultation'].includes(u.pathname));
        if(u.pathname==='/pages/fabric-library')for(const [key,value]of u.searchParams){if(key==='view')assert.equal(value,'browse-fabrics');else assert.ok(supported[key]?.includes(value),key+'='+value);}
        if(u.pathname.includes('consultation'))assert.equal(u.search,'?experience=premium&entry=match');
      }
      for(const detail of await page.locator('.canatomy__knowledge-item').all()) {
        await detail.locator('summary').click();
        assert.equal(await detail.getAttribute('open'),'');
        await detail.locator('summary').click();
      }
      const studio=page.locator('[data-curtain-studio]');
      const lessonTabs=studio.locator('[data-studio-lessons] button');
      assert.equal(await studio.locator('[data-studio-view]').count(),9);
      assert.ok(!(await studio.innerText()).includes('Less presence'));
      let studioStates=0;
      for(let g=0;g<3;g++) {
        await lessonTabs.nth(g).click();
        const group=studio.locator('[data-studio-group]:visible');
        assert.equal(await group.count(),1);
        const stateTabs=group.locator('[data-studio-states] button');
        for(let s=0;s<await stateTabs.count();s++) {
          await stateTabs.nth(s).click();
          const view=group.locator('[data-studio-view]:visible');
          assert.equal(await view.count(),1);
          const image=view.locator('img');
          await image.evaluate(i=>i.decode());
          assert.equal(await image.evaluate(i=>i.naturalWidth),1448);
          const box=await stateTabs.nth(s).boundingBox();
          assert.ok(box.height>=44 && box.width>=44);
          if(width<750)assert.equal(Math.round((await view.locator('[data-studio-image]').boundingBox()).width),width);
          studioStates++;
        }
        await stateTabs.first().focus();await page.keyboard.press('End');
        assert.equal(await stateTabs.last().getAttribute('aria-selected'),'true');
        await page.keyboard.press('Home');
        assert.equal(await stateTabs.first().getAttribute('aria-selected'),'true');
        const visual=group.locator('[data-studio-view]:visible [data-studio-image]');
        await visual.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:9,clientX:250,clientY:140});
        await visual.dispatchEvent('pointerup',{pointerType:'touch',pointerId:9,clientX:120,clientY:145});
        assert.equal(await stateTabs.nth(1).getAttribute('aria-selected'),'true');
        if(g===1){await group.locator('[data-studio-detail]').click();assert.equal(await group.getAttribute('data-detail'),'true');await group.locator('[data-studio-detail]').click();}
      }
      assert.equal(studioStates,9);
      await lessonTabs.first().click();
      await page.screenshot({path:path.join(output,'page-'+width+'.png'),fullPage:true});
      assert.deepEqual(errors,[]);
      results.matrix.push({width,states:24,studioStates,keyboard:true,swipe:true,headingMagnification:true,verticalScrollPreserved:true,hotspots44px:true,fullWidthMobile:width<750?true:null,height:geometry.height,horizontalOverflow:0});
      results.links= [...new Set(links)];
      await page.close();
    }
    const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    await reduced.goto(url);
    assert.equal(await reduced.locator('.canatomy__focus').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
    results.reducedMotion=true;
    await reduced.close();
    const noJS=await browser.newPage({javaScriptEnabled:false});
    await noJS.goto(url);
    assert.equal(await noJS.locator('[data-anatomy-panel]:visible').count(),4);
    assert.equal(await noJS.locator('[data-anatomy-tabs]:visible').count(),0);
    assert.equal(await noJS.locator('[data-studio-view]:visible').count(),9);
    assert.equal(await noJS.locator('[data-studio-lessons]:visible').count(),0);
    await noJS.locator('[data-anatomy-layer="fabric"]').first().locator('summary').click();
    assert.equal(await noJS.locator('[data-anatomy-layer="fabric"]').first().getAttribute('open'),'');
    results.noJS='Four heading studies, nine Studio states and native disclosures readable';
    await noJS.close();
    const failed=await browser.newPage();
    await failed.route('**/assets/cuk-anatomy-wave.png',route=>route.abort());
    await failed.goto(url);
    await failed.locator('[data-anatomy-panel]:visible .canatomy__image-error:visible').waitFor();
    assert.equal(await failed.locator('[data-anatomy-panel]:visible [data-anatomy-layer]').count(),6);
    await failed.locator('[data-anatomy-tabs] button').nth(1).click();
    assert.equal(await failed.locator('[data-anatomy-panel]:visible').getAttribute('data-form'),'double-pinch');
    results.imageFailure='Text available, other forms usable';
    await failed.close();
    fs.writeFileSync(path.join(output,'local-verification.json'),JSON.stringify(results,null,2)+'\n');
    console.log(JSON.stringify(results,null,2));
  } finally {
    await browser.close();server.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
