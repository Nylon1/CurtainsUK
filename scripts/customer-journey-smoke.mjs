import { chromium } from '@playwright/test';

const origin = process.env.CURTAINSUK_SMOKE_ORIGIN || 'https://www.curtainsuk.com';
const browserPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
const routes = [
  ['Home', '/'],
  ['Browse fabrics', '/pages/fabric-library'],
  ['Shop by window', '/pages/solve-my-window'],
  ['Curtain configurator and price', '/pages/curtain-visualiser'],
  ['Room visualiser', '/pages/room-visualiser', 'room-visualiser'],
  ['Design My Home cart', '/pages/build-my-rooms'],
  ['Cushion studio', '/pages/cushion-studio', 'cushion-studio'],
  ['Smart track studio', '/pages/smart-track-studio', 'smart-track'],
  ['Smart track motors', '/pages/smart-track-motors', 'smart-track'],
  ['Smart track fitting', '/pages/smart-track-fitting-guide', 'smart-track'],
  ['Beyond Windows', '/pages/curtains-beyond-windows', 'beyond-windows'],
  ['Hotel Design Studio', '/pages/hotel-design-studio', 'hotel-studio'],
  ['Hanging guide', '/pages/how-to-hang-curtains', 'hanging'],
  ['Roman landing', '/apps/curtainsuk-decision/roman/roman.html'],
  ['Roman shop and price', '/apps/curtainsuk-decision/roman/shop.html'],
  ['Roman measuring', '/apps/curtainsuk-decision/roman/measure.html'],
  ['Roman installation', '/apps/curtainsuk-decision/roman/install.html'],
  ['Fabric Intelligence', '/apps/curtainsuk-decision/consultation?experience=premium&entry=match'],
  ['Meet AI advisers', '/pages/meet-our-team'],
  ['Guided measure', '/pages/how-to-measure'],
  ['Fabric samples', '/pages/samples'],
  ['Shopify sample', '/products/fabric-sample'],
  ['Shopify cart', '/cart'],
];

const browser = await chromium.launch({ headless: true, ...(browserPath ? { executablePath: browserPath } : {}) });
const context = await browser.newContext({ viewport: { width: 1365, height: 800 } });
const results = [];
async function waitForToolFrame(page, slug) {
  const path = `/apps/curtainsuk-decision/${slug}`;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const frame = page.frames().find(candidate =>
      candidate !== page.mainFrame() && candidate.url().includes(path));
    if (frame) return frame;
    await page.waitForTimeout(250);
  }
  return null;
}

try {
  for (const [name, route, embedded] of routes) {
    const page = await context.newPage();
    const failures = [];
    page.on('pageerror', error => {
      const stack = String(error.stack || '');
      if (/curtainsuk-|\/apps\/curtainsuk-decision\//i.test(stack) && !/shop_events_listener/i.test(stack))
        failures.push('first-party browser exception');
    });
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.origin === origin && response.status() >= 500 &&
          (/^\/apps\/curtainsuk-decision\//.test(url.pathname) || /^\/pages\//.test(url.pathname)))
        failures.push(`HTTP ${response.status()} ${url.pathname}`);
    });
    try {
      const response = await page.goto(new URL(route, origin).href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      if (response?.status() !== 200) failures.push(`page HTTP ${response?.status() ?? 'no response'}`);
      const body = (await page.locator('body').innerText({ timeout: 10_000 })).trim();
      if (body.length < 40) failures.push('blank or nearly blank page');
      if (/^(?:404|not found|application error)$/i.test(body.slice(0, 40))) failures.push('error page');
      if (embedded) {
        const tool = await waitForToolFrame(page, embedded);
        if (!tool)
          failures.push(`${embedded} frame did not load within 15 seconds`);
        else if (route === '/pages/smart-track-studio') {
          await tool.locator('canvas').first().waitFor({ state: 'attached', timeout: 10_000 });
          await tool.waitForFunction(() => /YOUR TRACK · INCLUDES VAT\s*£[\d,.]+/.test(document.body.innerText),
            undefined, { timeout: 10_000 });
          const content = await tool.locator('body').innerText();
          if (!/YOUR TRACK · INCLUDES VAT\s*£[\d,.]+/.test(content))
            failures.push('track price or interactive scene unavailable');
        }
      }
    } catch (error) { failures.push(String(error.message).slice(0, 160)); }
    results.push({ name, route, status: failures.length ? 'FAIL' : 'PASS', failures });
    await page.close();
  }
  {
    const page = await context.newPage();
    const failures = [];
    try {
      await page.goto(new URL('/pages/curtain-visualiser', origin).href, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('select[name="windowSlug"]')?.options.length > 1);
      await page.locator('select[name="windowSlug"]').selectOption('standard-window');
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.locator('select[name="measurementBasis"]').selectOption('TRACK_WIDTH');
      await page.locator('input[name="widthCm"]').fill('200');
      await page.locator('input[name="dropCm"]').fill('220');
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForFunction(() => document.querySelector('select[name="fabricId"]')?.options.length > 1);
      await page.locator('select[name="fabricId"]').selectOption({ index: 1 });
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.locator('select[name="heading"]').selectOption('PENCIL_PLEAT');
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.locator('select[name="lining"]').selectOption('STANDARD');
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.locator('select[name="construction"]').selectOption('PAIR');
      await page.locator('select[name="stackDirection"]').selectOption('SPLIT');
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByText('INSTANT PRICE', { exact: true }).waitFor({ timeout: 20_000 });
      const body = await page.locator('body').innerText();
      if (!/INSTANT PRICE\s*£[\d,.]+/.test(body) || !body.includes('200 cm width × 220 cm drop'))
        failures.push('no usable live curtain price or dimensions');
    } catch (error) { failures.push(String(error.message).slice(0, 160)); }
    results.push({ name: 'Curtain live price', route: '/pages/curtain-visualiser',
      status: failures.length ? 'FAIL' : 'PASS', failures });
    await page.close();
  }
  {
    const page = await context.newPage();
    const failures = [];
    try {
      await page.goto(new URL('/apps/curtainsuk-decision/roman/shop.html', origin).href,
        { waitUntil: 'domcontentloaded' });
      await page.locator('.fabric-card').first().waitFor({ timeout: 20_000 });
      await page.locator('#width').fill('140');
      await page.locator('#drop').fill('140');
      await page.locator('.fabric-card').first().click();
      await page.waitForFunction(() => /ESTIMATED PRICE\s*£[\d,.]+/.test(document.body.innerText),
        undefined, { timeout: 20_000 });
      const body = await page.locator('body').innerText();
      if (!body.includes('140 × 140 cm') || !body.includes('full Evans kit'))
        failures.push('Roman price lacks dimensions or complete kit');
    } catch (error) { failures.push(String(error.message).slice(0, 160)); }
    results.push({ name: 'Roman live price', route: '/apps/curtainsuk-decision/roman/shop.html',
      status: failures.length ? 'FAIL' : 'PASS', failures });
    await page.close();
  }
  {
    const page = await context.newPage();
    const failures = [];
    try {
      await page.goto(new URL('/pages/fabric-library?view=browse-fabrics', origin).href,
        { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Try Fiona' }).click({ timeout: 15_000 });
      if (!await page.getByRole('button', { name: 'Start my consultation' }).isVisible())
        failures.push('Naila/Fiona consultation entry unavailable');
    } catch (error) { failures.push(String(error.message).slice(0, 160)); }
    results.push({ name: 'Naila/Fiona entry', route: '/pages/fabric-library',
      status: failures.length ? 'FAIL' : 'PASS', failures });
    await page.close();
  }
  for (const adviser of ['jane', 'james', 'noah', 'natalie', 'ben']) {
    const page = await context.newPage();
    const failures = [];
    try {
      await page.goto(new URL('/pages/meet-our-team', origin).href, { waitUntil: 'domcontentloaded' });
      await page.locator(`[data-advisory-open][data-adviser="${adviser}"]:visible`).first().click();
      await page.locator('[data-advisory-skip]').click();
      const dialog = page.locator('[data-advisory-dialog]');
      const content = await dialog.innerText();
      if (!await dialog.evaluate(node => node.open) ||
          !content.toLowerCase().includes(adviser) ||
          !content.includes('Sign in and consent'))
        failures.push('adviser sign-in boundary unavailable');
    } catch (error) { failures.push(String(error.message).slice(0, 160)); }
    results.push({ name: `${adviser} adviser boundary`, route: '/pages/meet-our-team',
      status: failures.length ? 'FAIL' : 'PASS', failures });
    await page.close();
  }
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true,
    deviceScaleFactor: 1 });
  try {
    for (const [name, route, embedded] of [
      ['Home', '/'], ['Curtain configurator', '/pages/curtain-visualiser'],
      ['Roman shop', '/apps/curtainsuk-decision/roman/shop.html'],
      ['Cushion studio', '/pages/cushion-studio', 'cushion-studio'],
      ['Smart track studio', '/pages/smart-track-studio', 'smart-track'],
      ['Room visualiser', '/pages/room-visualiser', 'room-visualiser'],
      ['Shopping cart', '/pages/build-my-rooms'],
    ]) {
      const page = await mobile.newPage();
      const failures = [];
      try {
        const response = await page.goto(new URL(route, origin).href,
          { waitUntil: 'domcontentloaded', timeout: 30_000 });
        if (response?.status() !== 200) failures.push(`page HTTP ${response?.status() ?? 'no response'}`);
        if ((await page.locator('body').innerText()).trim().length < 40) failures.push('blank page');
        if (embedded) {
          if (!await waitForToolFrame(page, embedded))
            failures.push('mobile tool frame did not load within 15 seconds');
        }
      } catch (error) { failures.push(String(error.message).slice(0, 160)); }
      results.push({ name: `Mobile ${name}`, route, status: failures.length ? 'FAIL' : 'PASS', failures });
      await page.close();
    }
  } finally { await mobile.close(); }
} finally { await browser.close(); }

for (const result of results) console.log(`${result.status} ${result.name} ${result.route}${result.failures.length ? `: ${result.failures.join('; ')}` : ''}`);
console.log(`Checked ${results.length} critical public journeys; ${results.filter(result => result.status === 'FAIL').length} failed.`);
if (results.some(result => result.status === 'FAIL')) process.exitCode = 1;
