const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.CUK_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'artifacts/homepage-film');
const assetDir = path.join(root, 'shopify-theme/curtainsuk-dawn-16/assets');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.webp':'image/webp' };
const server = http.createServer((req,res) => {
  const file = req.url.startsWith('/assets/') ? path.join(assetDir,path.basename(req.url)) : path.join(output,'player.html');
  if (!fs.existsSync(file)) {res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  const reports=[];
  try {
    for (const width of [1440,390,320]) {
      const page=await browser.newPage({viewport:{width,height:960}});
      const errors=[];const requests=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('request',r=>{if(/\.(mp4|m3u8)(?:\?|$)/.test(r.url())) requests.push(r.url());});
      await page.goto(process.env.CUK_FILM_URL || `http://127.0.0.1:${server.address().port}`);
      await page.locator('[data-fabric-film][data-ready]').waitFor();
      const film=page.locator('[data-fabric-film]');
      await film.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      assert.equal(requests.length,0,'No video download before interaction');
      assert.equal(await page.locator('video[data-src]').getAttribute('src'),null);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      assert.equal(overflow,false,`No horizontal overflow at ${width}`);
      await film.screenshot({path:path.join(output,`film-${width}.png`)});
      await page.locator('[data-film-chapter="55.7"]').click();
      await page.waitForFunction(()=>{const v=document.querySelector('video[data-src]');return v.readyState>=2 && v.currentTime>=55.6 && !v.paused;},null,{timeout:60000});
      const playback=await page.locator('video[data-src]').evaluate(v=>({time:v.currentTime,muted:v.muted,volume:v.volume,duration:v.duration,width:v.videoWidth,height:v.videoHeight,audioBytes:v.webkitAudioDecodedByteCount||0}));
      assert.equal(playback.muted,false); assert.ok(playback.volume>0); assert.ok(playback.duration>107);
      assert.ok(playback.audioBytes>0,'Audio decoded');
      await page.locator('[data-film-speed]').selectOption('1.5');
      assert.equal(await page.locator('video[data-src]').evaluate(v=>v.playbackRate),1.5);
      await page.locator('video[data-src]').evaluate(v=>v.pause());
      assert.equal(await page.locator('video[data-src]').evaluate(v=>v.paused),true);
      await page.locator('[data-film-chapter="28.5"]').click();
      await page.waitForFunction(()=>document.querySelector('[data-film-chapter="28.5"]').getAttribute('aria-current')==='true');
      await page.locator('[data-film-replay]').click();
      assert.ok(await page.locator('video[data-src]').evaluate(v=>v.currentTime<2));
      for (const seconds of ['4.5','28.5','41.2','55.7','60.2','64.2']) {
        await page.locator(`[data-film-chapter="${seconds}"]`).click();
        await page.waitForFunction(s=>Math.abs(document.querySelector('video[data-src]').currentTime-Number(s))<1,seconds);
      }
      assert.equal(await film.locator('a[href="/pages/fabric-library?view=browse-fabrics"]').count(),1);
      assert.equal(await film.locator('a[href="/pages/samples"]').count(),1);
      assert.deepEqual(errors,[]);
      reports.push({width,pass:true,videoRequests:requests.length,playback,errors});
      await page.close();
    }
    const nojs=await browser.newPage({javaScriptEnabled:false});
    await nojs.goto(`http://127.0.0.1:${server.address().port}`);
    assert.match(await nojs.locator('[data-film-cover]').getAttribute('href'),/^https:\/\/cdn.shopify.com\/videos\//);
    reports.push({noJavaScriptFallback:true});
    const failure=await browser.newPage();
    const rejected=[]; failure.on('pageerror',e=>rejected.push(e.message));
    await failure.route('**/*.mp4',route=>route.abort());
    await failure.goto(`http://127.0.0.1:${server.address().port}`);
    await failure.locator('[data-film-cover]').focus();
    await failure.keyboard.press('Enter');
    await failure.locator('[data-film-status]').waitFor({state:'visible'});
    assert.match(await failure.locator('[data-film-status]').innerText(),/could not load/);
    assert.deepEqual(rejected,[]);
    reports.push({keyboardPlay:true,networkErrorHandled:true});
    fs.writeFileSync(path.join(output,process.env.CUK_FILM_URL?'live-check.json':'check.json'),JSON.stringify(reports,null,2));
    console.log(JSON.stringify(reports,null,2));
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
