/** Controlled browser regression for the governed Browse filters. No live writes. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { governedBrowseFilters } from '../lib/fabric-master/browse-filters';

const { chromium } = await import(process.env.CUK_PLAYWRIGHT
  ? pathToFileURL(resolve(process.env.CUK_PLAYWRIGHT, 'index.mjs')).href : 'playwright');

const theme = resolve('shopify-theme/curtainsuk-dawn-16/assets');
const colours: Record<string, number> = {
  'beige/taupe': 774, black: 696, blue: 2850, brown: 1583, green: 2524, grey: 3083,
  multicolour: 52, neutral: 355, orange: 815, pink: 1186, purple: 481, red: 1327,
  'white/cream': 1369, 'yellow/gold': 449,
};
const fabric = (id = 'test-fabric') => ({
  id, supplier: 'Prestigious Textiles', brand: 'Prestigious Textiles', collection: 'Test Collection',
  design: 'Test Fabric', colour: 'Blue', availability: 'Check availability', sampleAvailable: false,
  composition: [], imageReferences: [], images: [], patterns: ['Plain'], characters: [], browseReady: true,
  browseGuide: { currency: 'GBP', policy: 'curtainsuk-browse-guide-v1', amountMinor: 12345 },
  metadata: { alt: 'Test Fabric', title: 'Test Fabric', h1: 'Test Fabric', metaDescription: 'Test Fabric' },
});
const discovery = [
  { key: 'colour', label: 'Colour', active: true, options: Object.entries(colours).map(([value, count]) => ({ value, label: value, count })) },
  { key: 'pattern', label: 'Pattern character', active: true, options: [{ value: 'botanical', label: 'botanical', count: 2667 }] },
  { key: 'texture', label: 'Texture', active: true, options: [{ value: 'smooth', label: 'smooth', count: 2446 }] },
  { key: 'finish', label: 'Finish / sheen', active: true, options: [{ value: 'matte', label: 'matte', count: 5209 }] },
  { key: 'character', label: 'Character / style', active: true, options: [{ value: 'calm', label: 'calm', count: 2443 }] },
];
const guidePrices = [{ value: '50-100', label: '£50 – under £100' }];
const html = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/curtainsuk-storefront.css"><link rel="stylesheet" href="/curtainsuk-browse-filters.css"></head><body>
<section data-cuk-fabric-browser data-cuk-shopping data-engine-base="/api"><div class="cuk-wrap"><div class="cuk-section__head"><h1>Browse all fabrics</h1></div>
<form data-cuk-fabric-filters><input name="query" aria-label="Search fabrics"><input type="hidden" name="guidePrice"><div data-cuk-discovery></div><div data-cuk-active-filters aria-live="polite"></div><button type="reset" data-cuk-clear-all hidden>Clear all</button></form>
<p data-cuk-fabric-count aria-live="polite"></p><p data-cuk-browse-status role="status" aria-live="polite"></p>
<div data-cuk-error role="alert" hidden><p data-cuk-error-message></p><button data-cuk-retry type="button">Try again</button></div>
<div data-cuk-fabric-grid><p>Loading fabrics…</p></div><nav data-cuk-pagination><button data-cuk-previous type="button" disabled>Previous</button><button data-cuk-next type="button" disabled>Next</button></nav>
<div data-cuk-fabric-detail hidden></div></div></section>
<script src="/curtainsuk-fabric-experience.js" defer></script><script src="/curtainsuk-browse-filters.js" defer></script><script src="/curtainsuk-storefront.js" defer></script></body></html>`;

const requests: URL[] = [];
const server = createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/api/catalog') {
    requests.push(url);
    response.setHeader('Content-Type', 'application/json');
    if (url.searchParams.has('fabric')) { response.end(JSON.stringify({ fabric: fabric() })); return; }
    const selected = governedBrowseFilters(url.searchParams).colour as string[];
    const total = selected.length === 1 ? colours[selected[0]] ?? 11815
      : selected.includes('blue') && selected.includes('green') ? 4392 : 11815;
    const page = Number(url.searchParams.get('page')) || 1;
    response.end(JSON.stringify({
      schemaVersion: '3.0.0', fabrics: [fabric()], page, pageSize: 24, total, pages: Math.ceil(total / 24),
      facets: { brands: [], collections: [], colour: [], pattern: [], style: [], character: [],
        guidePrices, discovery },
    }));
    return;
  }
  const asset = url.pathname.slice(1);
  if (['curtainsuk-storefront.js', 'curtainsuk-storefront.css', 'curtainsuk-browse-filters.js',
    'curtainsuk-browse-filters.css', 'curtainsuk-fabric-experience.js'].includes(asset)) {
    response.setHeader('Content-Type', asset.endsWith('.js') ? 'text/javascript' : 'text/css');
    response.end(readFileSync(resolve(theme, asset))); return;
  }
  response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html);
});
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('local browser server failed');
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true, channel: 'chrome' });

try {
  const table: { width: string; colour: string; expected: number; actual: number; swatch: boolean; reload: boolean; detailBack: boolean }[] = [];
  for (const [width, pixels] of [['desktop', 1365], ['mobile', 390]] as const) {
    const page = await browser.newPage({ viewport: { width: pixels, height: 900 } });
    const failures: string[] = [];
    page.on('pageerror', (error: Error) => failures.push(error.message));
    for (const [colour, expected] of Object.entries(colours)) {
      await page.goto(`${origin}/pages/fabric-library?view=browse-fabrics`);
      await page.locator(`[data-choice="colour:${colour}"]`).waitFor();
      const choice = page.locator(`[data-choice="colour:${colour}"]`);
      assert.match(await choice.innerText(), new RegExp(colour, 'i'), `${width} ${colour} visible label`);
      const swatch = await choice.locator('i').count() === 1 && await choice.locator('i').isVisible();
      assert.equal(swatch, true, `${width} ${colour} swatch`);
      await choice.click();
      await page.waitForFunction((value: string) => new URL(location.href).searchParams.get('colour') === value, colour);
      assert.equal(await page.locator(`[data-choice="colour:${colour}"]`).getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('[name="colour"]').inputValue(), colour);
      assert.match(await page.locator('[data-cuk-active-filters]').innerText(), new RegExp(colour, 'i'));
      const countText = await page.locator('[data-cuk-fabric-count]').innerText();
      const actual = Number(countText.match(/^([\d,]+) fabrics/)?.[1].replaceAll(',', ''));
      assert.equal(actual, expected, `${width} ${colour} count`);
      assert.equal(countText, `${expected} fabrics · Page 1 of ${Math.ceil(expected / 24)}`);
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-choice')), `colour:${colour}`, `${width} ${colour} focus`);
      await page.reload();
      await page.waitForFunction((value: string) => new URL(location.href).searchParams.get('colour') === value, colour);
      assert.equal(await page.locator('[data-cuk-fabric-count]').innerText(), `${expected} fabrics · Page 1 of ${Math.ceil(expected / 24)}`);
      const reload = await page.locator('[name="colour"]').inputValue() === colour;
      assert.equal(reload, true);
      await page.locator('[data-cuk-fabric-grid] a[href*="fabric="]').first().click();
      await page.locator('[data-cuk-fabric-detail]').waitFor({ state: 'visible' });
      await page.goBack();
      await page.waitForFunction((value: string) => new URL(location.href).searchParams.get('colour') === value, colour);
      const detailBack = await page.locator('[data-cuk-fabric-count]').innerText() === `${expected} fabrics · Page 1 of ${Math.ceil(expected / 24)}`;
      assert.equal(detailBack, true, `${width} ${colour} Detail back`);
      await page.locator('[data-cuk-clear-all]').click();
      await page.waitForFunction(() => !new URL(location.href).searchParams.has('colour'));
      assert.equal(await page.locator('[name="colour"]').inputValue(), '');
      assert.equal(await page.locator('[data-cuk-active-filters] .cuk-filter-chip').count(), 0);
      table.push({ width, colour, expected, actual, swatch, reload, detailBack });
    }
    await page.goto(`${origin}/pages/fabric-library?view=browse-fabrics&colour=blue%2Cgreen&guidePrice=50-100&pattern=botanical&texture=smooth&finish=matte&character=calm&page=2&naila=1&supplierCost=999`);
    await page.waitForFunction(() => new URL(location.href).searchParams.get('colour') === 'blue,green');
    const first = requests.at(-1)!;
    for (const key of ['colour', 'guidePrice', 'pattern', 'texture', 'finish', 'character'])
      assert.equal(first.searchParams.get(key), new URL(page.url()).searchParams.get(key), `${key} first request`);
    assert.equal(first.searchParams.get('page'), '2');
    assert.equal(first.searchParams.get('naila'), null);
    assert.equal(first.searchParams.get('supplierCost'), null);
    assert.deepEqual(governedBrowseFilters(first.searchParams).colour, ['blue', 'green']);
    for (const key of ['pattern', 'texture', 'finish', 'character'])
      assert.deepEqual(governedBrowseFilters(first.searchParams)[key], [first.searchParams.get(key)]);
    assert.equal(await page.locator('[name="colour"]').inputValue(), 'blue,green');
    assert.equal(await page.locator('[data-cuk-active-filters] .cuk-filter-chip').count(), 7);
    await page.locator('[data-cuk-fabric-grid] a[href*="fabric="]').first().click();
    await page.locator('[data-cuk-fabric-detail]').waitFor({ state: 'visible' });
    await page.goBack();
    await page.waitForFunction(() => new URL(location.href).searchParams.get('page') === '2');
    assert.equal(await page.locator('[data-cuk-fabric-count]').innerText(), '4392 fabrics · Page 2 of 183');
    await page.locator('.cuk-filter-chip[data-filter-key="colour"][data-filter-value="blue"]').focus();
    await page.locator('[name="colour"]').evaluate((field: HTMLInputElement) => {
      field.value = 'blue,green,red';
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(() => new URL(location.href).searchParams.get('colour') === 'blue,green,red');
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.filterValue), 'blue', `${width} retained chip focus`);
    await page.locator('.cuk-filter-chip[data-filter-key="colour"][data-filter-value="blue"]').click();
    await page.waitForFunction(() => new URL(location.href).searchParams.get('colour') === 'green,red');
    assert.notEqual(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.filterValue), 'blue', `${width} removed chip not focused`);
    await page.locator('.cuk-filter-chip[data-filter-key="colour"][data-filter-value="red"]').click();
    await page.waitForFunction(() => new URL(location.href).searchParams.get('colour') === 'green');
    assert.equal(await page.locator('[name="colour"]').inputValue(), 'green');
    assert.match(await page.locator('[data-cuk-active-filters]').innerText(), /Green/);
    assert.doesNotMatch(await page.locator('[data-cuk-active-filters]').innerText(), /Blue/);
    await page.locator('[data-cuk-clear-all]').click();
    await page.waitForFunction(() => !new URL(location.href).searchParams.has('colour'));
    assert.equal(await page.locator('[data-cuk-clear-all]').isHidden(), true, `${width} clear control disappears after reset`);
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-cuk-clear-all')), false, `${width} no focus on hidden reset control`);
    assert.equal(await page.locator('[name="colour"]').inputValue(), '');
    assert.equal(await page.locator('[data-cuk-active-filters] .cuk-filter-chip').count(), 0);
    await page.goto(`${origin}/pages/fabric-library?view=browse-fabrics&colour=white%2Fblack&guidePrice=bogus&naila=1`);
    await page.locator('[data-choice="colour:blue"]').waitFor();
    assert.equal(requests.at(-1)!.searchParams.has('colour'), false);
    assert.equal(requests.at(-1)!.searchParams.has('guidePrice'), false);
    assert.equal(requests.at(-1)!.searchParams.has('naila'), false);
    assert.deepEqual(failures, [], `${width} browser errors`);
    await page.close();
  }
  console.log(JSON.stringify({ colourChecks: table.length, allPassed: true, table }, null, 2));
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
