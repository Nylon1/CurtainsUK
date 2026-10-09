const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output = __dirname;
const selectedWidths = process.env.HOMEPAGE_REVIEW_WIDTHS?.split(',').map(Number) || [390, 320, 412, 768, 1440];
const report = { at: new Date().toISOString(), surface: 'unpublished theme 182466478459', physicalIphone: false, cases: [], browserErrors: [] };
const save = () => fs.writeFile(path.join(output, 'interactive-review.json'), JSON.stringify(report, null, 2) + '\n');
const executable = 'C:/Users/hamza/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: executable, args: ['--disable-gpu'] });
  report.browser = browser.version();
  try {
    for (const width of selectedWidths) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, isMobile: width < 500, hasTouch: width < 500, deviceScaleFactor: 1 });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', e => report.browserErrors.push({ width, message: e.message }));
      console.log(`Loading ${width}px`);
      await page.goto('https://www.curtainsuk.com/?preview_theme_id=182466478459&homepage_review=09abc566', { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.locator('[data-home-studio][data-enhanced=true]').waitFor();
      const theme = await page.evaluate(() => window.Shopify.theme);
      assert.equal(theme.id, 182466478459);
      assert.equal(theme.role, 'unpublished');
      const banner = page.locator('#shopify-pc__banner');
      await banner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      if (await banner.isVisible()) {
        const decline = banner.getByRole('button', { name: /decline|reject/i }).first();
        await decline.focus();
        await page.keyboard.press('Enter');
        await banner.waitFor({ state: 'hidden', timeout: 10000 });
      }
      const evidence = { width, theme: theme.id, rooms: [], headings: [] };
      const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, h1: document.querySelectorAll('h1').length, missingTranslations: document.querySelector('.cukstudio').textContent.includes('Translation missing'), studioOverflow: [...document.querySelectorAll('.cukstudio *')].filter(e => { const r=e.getBoundingClientRect();return r.width>0&&(r.left < -1 || r.right > innerWidth + 1); }).map(e => e.className) }));
      assert.equal(layout.scroll, layout.width);
      assert.equal(layout.h1, 1);
      assert.equal(layout.missingTranslations, false);
      assert.deepEqual(layout.studioOverflow, []);
      assert.match(await page.locator('.cukstudio__hero-image > img').getAttribute('src'), /cuk-home-room-inspiration.webp/);
      if (width < 500) assert.ok(await page.evaluate(() => document.querySelector('.cukstudio__hero-image').getBoundingClientRect().top < document.querySelector('.cukstudio__hero-copy').getBoundingClientRect().top));
      evidence.layout = layout;
      console.log(`${width}px layout passed`);
      if (width === 390 || width === 1440) {
        await page.locator('.cukstudio__hero img').evaluate(i => i.decode());
        await page.screenshot({ path: path.join(output, `v2-${width}-hero.png`), timeout: 20000 });
      }
      for (const room of ['living', 'bedroom', 'lounge', 'office']) {
        const tab = page.locator(`[data-room="${room}"]`);
        await tab.click();
        await page.waitForFunction(room => document.querySelector(`[data-room="${room}"]`).getAttribute('aria-selected') === 'true', room);
        for (const mode of ['daylight', 'evening']) {
          await page.locator(`[data-mode="${mode}"]`).click();
          await page.waitForFunction(({ room, mode }) => { const panel=document.querySelector('[data-room-panel]'); return panel.getAttribute('aria-busy') === 'false' && document.querySelector('[data-room-image]').src.includes(`${room}-${mode}`); }, {room,mode});
          assert.match(await page.locator('[data-room-cta]').getAttribute('href'), new RegExp(`room=${room}&fabric=sdg-f1541-01`));
          evidence.rooms.push(`${room}:${mode}`);
        }
      }
      await page.locator('[data-room="living"]').click();
      await page.locator('[data-mode="daylight"]').click();
      await page.waitForFunction(() => document.querySelector('[data-room-image]').src.includes('living-daylight') && document.querySelector('[data-room-panel]').getAttribute('aria-busy') === 'false');
      await page.locator('[data-room="living"]').focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.querySelector('[data-room="bedroom"]').getAttribute('aria-selected') === 'true');
      evidence.keyboardRoomSwitch = true;
      if (width === 390 || width === 1440) {
        await page.setViewportSize({width,height:1600});
        await page.locator('[data-room-viewer]').evaluate(e=>{window.scrollTo(0,e.getBoundingClientRect().top+window.scrollY-180);});
        await page.waitForTimeout(500);
        await page.locator('[data-room-viewer]').screenshot({ path: path.join(output, `v2-${width}-rooms.png`), timeout: 20000 });
        await page.setViewportSize({width,height:1000});
      }
      for (const heading of ['wave', 'double-pinch', 'pencil-pleat', 'eyelet']) {
        await page.locator(`[data-heading="${heading}"]`).click();
        await page.waitForFunction(heading => document.querySelector(`[data-heading="${heading}"]`).getAttribute('aria-selected') === 'true', heading);
        assert.match(await page.locator('[data-heading-image]').getAttribute('src'), new RegExp(`heading-${heading}`));
        evidence.headings.push(heading);
      }
      await page.locator('[data-heading="wave"]').click();
      await page.waitForFunction(() => document.querySelector('[data-heading="wave"]').getAttribute('aria-selected') === 'true');
      if (width === 390 || width === 1440) await page.locator('#homepage-curtain-style').screenshot({ path: path.join(output, `v2-${width}-headings.png`), timeout: 20000 });
      for (const selector of ['.cukstudio__discovery', '.cukstudio__intelligence']) {
        await page.locator(selector).scrollIntoViewIfNeeded();
        await page.locator(`${selector} img`).evaluateAll(images => Promise.all(images.map(i => i.decode())));
      }
      evidence.images = await page.locator('.cukstudio img').evaluateAll(images => images.map(i=>({ alt:i.alt,loaded:i.complete&&i.naturalWidth>0 })));
      assert.ok(evidence.images.every(i=>i.loaded));
      evidence.ctaTargets = await page.locator('.cukstudio a').evaluateAll(links => [...new Set(links.map(a=>a.getAttribute('href')))]);
      evidence.smallTargets = await page.locator('.cukstudio a,.cukstudio button').evaluateAll(links => links.filter(a=>{const r=a.getBoundingClientRect();return r.height>0&&r.height<44;}).map(a=>({text:a.textContent.trim(),height:a.getBoundingClientRect().height})));
      if (width < 500) assert.deepEqual(evidence.smallTargets, []);
      evidence.rendererRequests = await page.evaluate(() => performance.getEntriesByType('resource').filter(r=>/\.glb(?:\?|$)|rooms\/viewer|room-visualiser\/.*\.mjs/.test(r.name)).map(r=>r.name));
      assert.deepEqual(evidence.rendererRequests, []);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.locator('.cukstudio__discovery-image img').first().evaluate(e=>getComputedStyle(e).transitionDuration), '0s');
      evidence.reducedMotion = true;
      report.cases.push(evidence);
      await save();
      console.log(`${width}px: all 8 room/light combinations, 4 headings, keyboard, imagery and layout passed.`);
      await context.close();
    }
    const context = await browser.newContext({ viewport: {width:390,height:844}, javaScriptEnabled:false });
    const page=await context.newPage();
    await page.goto('https://www.curtainsuk.com/?preview_theme_id=182466478459',{waitUntil:'domcontentloaded'});
    report.noJavascript = { roomLinks:await page.locator('[data-room][href*="room="]').count(),headingLinks:await page.locator('[data-heading][href*="curtain-style"]').count(),lightingHidden:await page.locator('[data-lighting]').isHidden() };
    assert.equal(report.noJavascript.roomLinks,4);assert.equal(report.noJavascript.headingLinks,4);assert.equal(report.noJavascript.lightingHidden,true);
    await context.close();
    report.complete=true;
    await save();
  } finally { await browser.close(); }
})().catch(async error => { report.error=error.stack; await save(); console.error(error); process.exitCode=1; });
