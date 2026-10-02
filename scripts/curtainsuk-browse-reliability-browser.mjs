/** Local, read-only browser fault injection for the Dawn Browse client. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.CUK_PLAYWRIGHT
  ? pathToFileURL(resolve(process.env.CUK_PLAYWRIGHT, 'index.mjs')).href : 'playwright');

const theme = resolve('shopify-theme/curtainsuk-dawn-16/assets');
const measureMode = process.argv.includes('--measure') || process.argv.includes('--baseline');
const baselineMode = process.argv.includes('--baseline');
const storefrontSource = baselineMode ? execFileSync('git', ['show', 'origin/release/production:shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-storefront.js']) : null;
const fabric = (design, id = design.toLowerCase()) => ({
  id, supplier: 'Prestigious Textiles', brand: 'Prestigious Textiles', collection: 'Test Collection', design,
  colour: 'Blue', availability: 'Check availability', sampleAvailable: false, composition: [],
  imageReferences: [], patterns: ['Plain'], characters: [],
  browseGuide: { currency: 'GBP', policy: 'curtainsuk-browse-guide-v1', amountMinor: 12345 },
  metadata: { alt: design, title: design, h1: design, metaDescription: design }, images: [], browseReady: true,
});
const catalog = (query, page = 1) => ({
  fabrics: [fabric(query || (page === 2 ? 'Second Page' : 'Initial Fabric'))],
  page, pages: 2, pageSize: 24, total: 25,
  facets: { brands: [], collections: [], colour: [], pattern: [], style: [], character: [], guidePrices: [] },
});
const html = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/curtainsuk-storefront.css"></head><body>
<section class="cuk-shell" data-cuk-fabric-browser data-cuk-shopping data-engine-base="/api"><div class="cuk-wrap"><div class="cuk-section__head"><h1>Browse all fabrics</h1></div>
<form data-cuk-fabric-filters><input name="query" aria-label="Search fabrics"><select name="colour" aria-label="Colour"><option value="">All</option><option value="Blue">Blue</option></select><select name="pattern" aria-label="Pattern"><option value="">All</option><option value="Plain">Plain</option></select><select name="style" aria-label="Style"><option value="">All</option><option value="Modern">Modern</option></select><input type="hidden" name="guidePrice"><div data-cuk-discovery></div><button type="reset">Reset</button><span data-cuk-active-filters></span></form>
<p data-cuk-fabric-count></p><p class="cuk-browse-loading" data-cuk-browse-status role="status" aria-live="polite"></p>
<div class="cuk-error cuk-browse-error" data-cuk-error role="alert" hidden><p data-cuk-error-message></p><button class="cuk-button cuk-button--secondary" data-cuk-retry type="button">Try again</button></div>
<div class="cuk-fabrics" data-cuk-fabric-grid aria-live="polite"><p>Loading fabrics…</p></div>
<nav data-cuk-pagination><button data-cuk-previous type="button" disabled>Previous</button><button data-cuk-next type="button" disabled>Next</button></nav>
<div data-cuk-fabric-detail hidden></div></div></section><script src="/curtainsuk-fabric-experience.js" defer></script><script src="/curtainsuk-storefront.js" defer></script></body></html>`;

(async () => {
  const server = createServer((request, response) => {
    if (['/curtainsuk-storefront.js', '/curtainsuk-storefront.css', '/curtainsuk-fabric-experience.js'].includes(request.url)) {
      response.setHeader('Content-Type', request.url.endsWith('.js') ? 'text/javascript' : 'text/css');
      response.end(request.url === '/curtainsuk-storefront.js' && storefrontSource || readFileSync(resolve(theme, request.url.slice(1)))); return;
    }
    response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  let mode = 'normal', calls = [], failedRequests = 0;
  const page = await browser.newPage({ viewport: { width: 1365, height: 850 } });
  page.on('requestfailed', request => { if (request.url().includes('/api/catalog')) failedRequests++; });
  await page.addInitScript(() => {
    const original = window.fetch;
    window.__browseSignals = [];
    window.__browseActive = 0;
    window.__browseMaxActive = 0;
    window.fetch = (url, options) => {
      if (!String(url).includes('/api/catalog')) return original(url, options);
      window.__browseSignals.push(options.signal);
      window.__browseActive++;
      window.__browseMaxActive = Math.max(window.__browseMaxActive, window.__browseActive);
      return original(url, options).finally(() => { window.__browseActive--; });
    };
  });
  await page.route('**/api/catalog?**', async route => {
    const url = new URL(route.request().url());
    calls.push(url);
    const query = url.searchParams.get('query') || '';
    if (mode === 'slow' && query === 'slow' || mode === 'slowPage2' && url.searchParams.get('page') === '2') await new Promise(resolve => setTimeout(resolve, 1400));
    const transient = (mode === 'temporary503' && query === 'recover' || mode === 'temporary429' && query === 'rate-limited')
      && calls.filter(u => u.searchParams.get('query') === query).length === 1;
    const failure = mode === 'permanent503' && query === 'fail'
      || mode === 'permanentPage2' && url.searchParams.get('page') === '2'
      || mode === 'permanentInitial';
    try {
      if (transient || failure) await route.fulfill({ status: mode === 'temporary429' ? 429 : 503, headers: mode === 'temporary429' ? { 'Retry-After': '1' } : {}, contentType: 'application/json', body: '{}' });
      else if (url.searchParams.has('fabric')) await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ fabric: fabric('Initial Fabric') }) });
      else await route.fulfill({ contentType: 'application/json', body: JSON.stringify(catalog(query, Number(url.searchParams.get('page')) || 1)) });
    } catch { /* An aborted route cannot be fulfilled. */ }
  });
  try {
    await page.goto(`${origin}/pages/fabric-library?view=browse-fabrics`);
    await page.locator('.cuk-browse-price').waitFor();
    await page.locator('.cuk-discovery-group').waitFor();
    await page.locator('.cuk-experience-actions').waitFor();
    assert.match(await page.locator('.cuk-browse-price').innerText(), /£123\.45/);
    assert.equal(await page.locator('[data-cuk-error]').isVisible(), false);
    assert.equal(calls[0].searchParams.get('browseGuide'), '1');

    if (measureMode) {
      mode = 'slow';
      await page.locator('input[name=query]').fill('slow');
      await page.waitForTimeout(450);
      const changedAt = Date.now();
      await page.locator('input[name=query]').fill('fast');
      await page.locator('.cuk-fabric h3').filter({ hasText: 'fast' }).waitFor();
      const latestMs = Date.now() - changedAt;
      await page.waitForTimeout(1550);
      const metrics = await page.evaluate(() => ({ maxClientFetches: window.__browseMaxActive, abortedSignals: window.__browseSignals.filter(signal => signal?.aborted).length }));
      console.log(JSON.stringify({ source: baselineMode ? 'protected-base' : 'fix', ...metrics, latestMs, catalogCalls: calls.length, abortedNetworkRequests: failedRequests }));
      return;
    }

    mode = 'slow';
    const cardTop = (await page.locator('.cuk-fabric').first().boundingBox()).y;
    await page.locator('input[name=query]').fill('slow');
    await page.waitForTimeout(450);
    assert.equal(await page.locator('[data-cuk-fabric-grid]').getAttribute('aria-busy'), 'true');
    assert.match(await page.locator('[data-cuk-browse-status]').innerText(), /Refreshing fabrics/);
    assert.equal(await page.locator('.cuk-fabric').first().isVisible(), true);
    assert.ok(Math.abs((await page.locator('.cuk-fabric').first().boundingBox()).y - cardTop) < 8, 'refresh layout shift');
    await page.locator('input[name=query]').fill('fast');
    assert.equal(await page.evaluate(() => window.__browseSignals[1].aborted), true, 'superseded fetch aborted');
    await page.locator('.cuk-fabric h3').filter({ hasText: 'fast' }).waitFor();
    await page.waitForTimeout(1550);
    assert.match(await page.locator('.cuk-fabric h3').innerText(), /fast/);
    assert.equal(await page.locator('[data-cuk-error]').isVisible(), false);

    await page.locator('input[name=query]').fill('slow');
    await page.waitForTimeout(450);
    const resetSignal = await page.evaluate(() => window.__browseSignals.length - 1);
    await page.locator('button[type=reset]').click();
    assert.equal(await page.evaluate(index => window.__browseSignals[index].aborted, resetSignal), true);
    await page.locator('.cuk-fabric h3').filter({ hasText: 'Initial Fabric' }).waitFor();
    await page.waitForTimeout(1500);
    assert.match(await page.locator('.cuk-fabric h3').innerText(), /Initial Fabric/);

    mode = 'slowPage2';
    await page.locator('[data-cuk-next]').click();
    await page.waitForTimeout(150);
    const pageSignal = await page.evaluate(() => window.__browseSignals.length - 1);
    await page.locator('input[name=query]').fill('latest');
    assert.equal(await page.evaluate(index => window.__browseSignals[index].aborted, pageSignal), true);
    await page.locator('.cuk-fabric h3').filter({ hasText: 'latest' }).waitFor();
    await page.waitForTimeout(1500);
    assert.match(await page.locator('.cuk-fabric h3').innerText(), /latest/);

    mode = 'temporary503';
    await page.locator('input[name=query]').fill('recover');
    await page.locator('.cuk-fabric h3').filter({ hasText: 'recover' }).waitFor();
    assert.equal(calls.filter(u => u.searchParams.get('query') === 'recover').length, 2);
    assert.equal(await page.locator('[data-cuk-error]').isVisible(), false);

    mode = 'temporary429';
    await page.locator('input[name=query]').fill('rate-limited');
    await page.locator('.cuk-fabric h3').filter({ hasText: 'rate-limited' }).waitFor();
    assert.equal(calls.filter(u => u.searchParams.get('query') === 'rate-limited').length, 2);

    mode = 'permanent503';
    await page.locator('input[name=query]').fill('fail');
    await page.locator('[data-cuk-error]').waitFor({ state: 'visible' });
    assert.equal(calls.filter(u => u.searchParams.get('query') === 'fail').length, 2);
    assert.equal(await page.locator('[data-cuk-fabric-grid]').getAttribute('data-cuk-stale'), 'true');
    assert.equal(await page.locator('[data-cuk-fabric-grid]').evaluate(el => el.inert), true);
    assert.match(await page.locator('[data-cuk-browse-status]').innerText(), /not been refreshed/);
    mode = 'normal';
    await page.getByRole('button', { name: 'Try again' }).click();
    await page.locator('.cuk-fabric h3').filter({ hasText: 'fail' }).waitFor();
    assert.equal(calls.filter(u => u.searchParams.get('query') === 'fail').length, 3);
    assert.equal(await page.locator('[data-cuk-error]').isVisible(), false);

    await page.locator('button[type=reset]').click();
    await page.locator('.cuk-fabric h3').filter({ hasText: 'Initial Fabric' }).waitFor();
    mode = 'permanentPage2';
    await page.locator('[data-cuk-next]').click();
    await page.locator('[data-cuk-error]').waitFor({ state: 'visible' });
    assert.equal(calls.at(-1).searchParams.get('page'), '2');
    mode = 'normal';
    await page.getByRole('button', { name: 'Try again' }).click();
    await page.locator('.cuk-fabric h3').filter({ hasText: 'Second Page' }).waitFor();
    assert.equal(calls.at(-1).searchParams.get('page'), '2');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('select[name=colour]').selectOption('Blue');
    await page.locator('select[name=pattern]').selectOption('Plain');
    await page.locator('select[name=style]').selectOption('Modern');
    await page.locator('.cuk-fabric h3').filter({ hasText: 'Initial Fabric' }).waitFor();
    assert.equal(calls.at(-1).searchParams.get('colour'), 'Blue');
    assert.equal(calls.at(-1).searchParams.get('pattern'), 'Plain');
    assert.equal(calls.at(-1).searchParams.get('style'), 'Modern');
    assert.equal(calls.at(-1).searchParams.get('naila'), null);
    await page.locator('a[href*="fabric="]').first().click();
    await page.locator('.cuk-material-hero').waitFor();
    assert.equal(await page.locator('[data-cuk-error]').isVisible(), false);
    await page.goBack();
    await page.locator('.cuk-browse-price').waitFor();
    assert.match(await page.locator('.cuk-browse-price').innerText(), /£123\.45/);
    mode = 'permanentInitial';
    await page.goto(`${origin}/pages/fabric-library?view=browse-fabrics`);
    await page.locator('[data-cuk-error]').waitFor({ state: 'visible' });
    assert.equal(await page.locator('[data-cuk-fabric-grid]').innerText(), '');
    assert.equal(await page.locator('[data-cuk-fabric-grid]').getAttribute('aria-busy'), null);
    mode = 'normal';
    await page.getByRole('button', { name: 'Try again' }).click();
    await page.locator('.cuk-browse-price').waitFor();
    console.log(JSON.stringify({ desktopAndMobile: 'passed', cancellation: 'passed', resetAndPaginationRaces: 'passed', retryAndRecovery: 'passed', firstLoadRecovery: 'passed', paginationRetry: 'passed', staleCards: 'inert and labelled', pricingGuide: 'preserved', fabricIntelligenceAndDetailBack: 'passed', disabledNaila: 'passed', abortedNetworkRequests: failedRequests, totalCatalogCalls: calls.length }));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
