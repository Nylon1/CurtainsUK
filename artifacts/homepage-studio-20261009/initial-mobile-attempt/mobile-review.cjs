const { chromium } = require('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs/promises');
const path = require('node:path');

const output = __dirname;
const report = { capturedAt: new Date().toISOString(), previewTheme: 182466478459, physicalIphone: false, cases: [] };

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-gl=angle', '--use-angle=d3d11'] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto('https://www.curtainsuk.com/?preview_theme_id=182466478459', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.locator('.cukstudio').waitFor();
    const banner = page.locator('#shopify-pc__banner');
    await banner.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await banner.isVisible()) await banner.getByRole('button', { name: /decline|reject/i }).first().click();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [390, 320, 412, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => window.scrollTo(0, 0));
      const data = await page.evaluate(() => ({
        viewport: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        theme: window.Shopify?.theme,
        h1: [...document.querySelectorAll('h1')].map(e => e.textContent.trim()),
        overflowingStudio: [...document.querySelectorAll('.cukstudio *')].filter(e => { const r=e.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1); }).map(e => e.className),
        targets: [...document.querySelectorAll('.cukstudio a')].map(e => ({ text: e.textContent.trim().replace(/\s+/g,' '), href: e.getAttribute('href'), height: Math.round(e.getBoundingClientRect().height), width: Math.round(e.getBoundingClientRect().width) }))
      }));
      if (width === 390 || width === 320) {
        await page.screenshot({ path: path.join(output, `mobile-${width}-hero.png`), timeout: 20000 });
        for (const [name, selector] of [['rooms', '#homepage-room-visualiser'], ['headings', '#homepage-curtain-style']]) {
          await page.locator(selector).scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(output, `mobile-${width}-${name}.png`), timeout: 20000 });
        }
      }
      for (let y=0; y<await page.evaluate(()=>document.documentElement.scrollHeight); y+=750) {
        await page.evaluate(y => window.scrollTo(0,y),y);
        await page.waitForTimeout(80);
      }
      await page.waitForFunction(() => [...document.querySelectorAll('.cukstudio img')].every(i => i.complete && i.naturalWidth > 0), { timeout: 15000 });
      data.images = await page.locator('.cukstudio img').evaluateAll(images => images.map(i=>({alt:i.alt,width:i.naturalWidth,loading:i.loading,currentSrc:i.currentSrc})));
      report.cases.push(data);
      await fs.writeFile(path.join(output,'mobile-review.json'),JSON.stringify(report,null,2)+'\n');
      console.log(JSON.stringify({ width, scrollWidth: data.scrollWidth, overflow: data.overflowingStudio, images: data.images.length }));
    }
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:path.join(output,'mobile-390-full.png'),fullPage:true,timeout:20000});
    console.log('Mobile review complete. Physical iPhone testing is not included.');
  } finally { await browser.close(); }
})().catch(async error => { report.error=error.message; await fs.writeFile(path.join(output,'mobile-review.json'),JSON.stringify(report,null,2)+'\n'); console.error(error); process.exitCode=1; });
