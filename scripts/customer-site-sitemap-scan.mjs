import { chromium } from '@playwright/test';

const origin = process.env.CURTAINSUK_SMOKE_ORIGIN || 'https://www.curtainsuk.com';
const browserPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
const rotationValue = process.argv.find(value => value.startsWith('--rotation='))?.split('=')[1];
const rotation = rotationValue === undefined ? null : Number(rotationValue);
if (rotation !== null && (!Number.isInteger(rotation) || rotation < 0 || rotation > 5))
  throw Error('Rotation must be one of 0, 1, 2, 3, 4 or 5');
const browser = await chromium.launch({ headless: true, ...(browserPath ? { executablePath: browserPath } : {}) });
try {
  const page = await browser.newPage();
  const landing = await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (landing?.status() !== 200) throw Error(`Storefront returned HTTP ${landing?.status()}`);
  const report = await page.evaluate(async (slot) => {
    const xml = text => new DOMParser().parseFromString(text, 'application/xml');
    const locs = document => [...document.querySelectorAll('loc')].map(node => node.textContent?.trim()).filter(Boolean);
    const get = async url => {
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw Error(`${new URL(url).pathname}: HTTP ${response.status}`);
      return response.text();
    };
    const index = locs(xml(await get('/sitemap.xml')));
    const selected = [];
    for (const sitemap of index) {
      const pathname = new URL(sitemap).pathname;
      const urls = locs(xml(await get(sitemap))).filter(url => new URL(url).origin === location.origin);
      if (slot !== null) {
        urls.forEach((url, index) => { if (index % 6 === slot) selected.push(url); });
      } else if (pathname.includes('sitemap_pages_') || pathname.includes('sitemap_collections_') ||
          pathname.includes('sitemap_articles_') || pathname.includes('sitemap_blogs_')) selected.push(...urls);
      else if (pathname.includes('sitemap_products_')) {
        for (let i = 0; i < urls.length; i += Math.max(1, Math.floor(urls.length / 25))) selected.push(urls[i]);
      } else if (pathname.includes('sitemap_metaobject_pages_')) {
        for (let i = 0; i < urls.length; i += Math.max(1, Math.floor(urls.length / 5))) selected.push(urls[i]);
      }
    }
    const urls = [...new Set(selected)];
    let cursor = 0;
    const failures = [];
    const throttled = [];
    const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
    const worker = async () => {
      while (cursor < urls.length) {
        const url = urls[cursor++];
        try {
          const response = await fetch(url, { method: 'HEAD', cache: 'no-store',
            signal: AbortSignal.timeout(15_000) });
          if (response.status === 429) throttled.push(url);
          else if (response.status !== 200) failures.push(`${new URL(url).pathname}: HTTP ${response.status}`);
        } catch { failures.push(`${new URL(url).pathname}: request failed`); }
        await pause(250);
      }
    };
    await Promise.all(Array.from({ length: 3 }, worker));
    for (const url of throttled) {
      await pause(600);
      try {
        const response = await fetch(url, { method: 'GET', cache: 'no-store',
          signal: AbortSignal.timeout(20_000) });
        if (response.status !== 200) failures.push(`${new URL(url).pathname}: GET HTTP ${response.status}`);
      } catch { failures.push(`${new URL(url).pathname}: GET request failed`); }
    }
    return { mode: slot === null ? 'daily pages and canaries' : `rotation ${slot + 1} of 6`,
      sitemapCount: index.length, checked: urls.length, headThrottledRetried: throttled.length,
      failures: failures.slice(0, 30),
      failureCount: failures.length };
  }, rotation);
  console.log(JSON.stringify(report, null, 2));
  if (report.failureCount) process.exitCode = 1;
} finally { await browser.close(); }
