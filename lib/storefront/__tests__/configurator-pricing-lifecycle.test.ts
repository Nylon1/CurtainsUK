import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { buildShopifyCatalogPayload } from '../shopify-contract';
import { calculateStagingPriceForTest } from '../staging-pricing';
import { STOREFRONT_FABRICS_BY_ID } from '../fabrics';
import { priceRejectionDetails } from '../price-rejection';

const scripts = 'shopify-theme/curtainsuk-dawn-16/assets/';
const fabric = { ...[...STOREFRONT_FABRICS_BY_ID.values()][0], supplierCostPerMetre: { amountMinor: 1000, currency: 'GBP' as const }, supplierCostEffectiveFrom: '2026-09-20' };
const complete = { windowSlug: 'standard-window', measurementBasis: 'TRACK_WIDTH', widthCm: '180', dropCm: '220',
  fabricId: fabric.id, heading: 'PENCIL_PLEAT', lining: 'STANDARD', construction: 'PAIR', stackDirection: 'SPLIT' };

class Element {
  value = ''; textContent = ''; innerHTML = ''; disabled = false; hidden = false; required = false;
  options: Element[] = []; dataset: any = {}; listeners: Record<string, Function[]> = {};
  elements: any = { customerAccepted: { checked: false }, shippingPostcode: { value: '' }, shippingRegion: { value: '' } };
  classList = { add() {}, remove() {}, toggle() {} }; children: Record<string, Element> = {};
  appendChild(node: Element) { this.options.push(node); return node; }
  replaceChildren(...nodes: Element[]) { this.options = nodes; }
  get selectedOptions() { return this.options.filter(o => o.value === this.value); }
  addEventListener(name: string, callback: Function) { (this.listeners[name] ||= []).push(callback); }
  async fire(name: string, event: any = {}) { for (const callback of this.listeners[name] || []) await callback({ preventDefault() {}, target: this, ...event }); }
  querySelector(selector: string): any { if (selector === '[data-cuk-browse-fabrics]') return null; return this.children[selector] ||= new Element(); }
  querySelectorAll() { return []; }
  setAttribute() {} focus() {} scrollIntoView() {} append() {}
}

async function harness(remembered: Record<string, unknown> = {}, rejectConstruction = false, holdResponse = false) {
  const form: any = new Element();
  form.elements = Object.fromEntries(Object.keys(complete).map(name => [name, new Element()]));
  // Native selects discard values assigned before matching options exist.
  for (const name of ['construction', 'stackDirection']) {
    const field = form.elements[name]; let selected = '';
    Object.defineProperty(field, 'value', { get: () => selected, set: value => {
      selected = field.options.some((option: Element) => option.value === value) ? value : '';
    } });
  }
  // The actual premium wizard makes fields on other steps optional.
  form.checkValidity = form.reportValidity = () => true;
  const pending: Promise<any>[] = [];
  form.requestSubmit = () => { pending.push(form.fire('submit')); };
  const root: any = new Element();
  root.dataset = { engineBase: '/apps/curtainsuk-decision', roomsEnabled: 'false', productionCheckout: 'true' };
  root.children['.cuk-form'] = form;
  const rootQuery = root.querySelector.bind(root);
  root.querySelector = (selector: string) => selector === '[data-cuk-reviewed-resume]' ? null : rootQuery(selector);
  root.dispatchEvent = () => {};
  const saved = new Map([['curtainsuk_staging_project_v1', JSON.stringify(remembered)]]);
  const storage = { getItem: (key: string) => saved.get(key) || null, setItem: (key: string, value: string) => saved.set(key, value), removeItem: (key: string) => saved.delete(key) };
  const timers = new Map<number, Function>(); let timer = 0;
  const requests: any[] = [];
  let releaseResponse: (() => void) | undefined;
  const catalog = buildShopifyCatalogPayload();
  const context: any = { window: { dispatchEvent() {} }, document: { querySelectorAll: () => [], createElement: () => new Element() },
    localStorage: storage, sessionStorage: { getItem: () => null, removeItem() {}, setItem() {} },
    location: { origin: 'https://www.curtainsuk.com', href: 'https://www.curtainsuk.com/pages/curtain-visualiser', search: '', hash: '' },
    history: { state: null, replaceState() {} }, URL, URLSearchParams, FormData, crypto, CustomEvent: class { constructor(public type: string, public detail: any) {} },
    setTimeout: (callback: Function) => { timers.set(++timer, callback); return timer; }, clearTimeout: (id: number) => timers.delete(id),
    fetch: async (_url: string, options: any) => {
      if (options.method !== 'POST') return { ok: true, json: async () => catalog };
      const body = JSON.parse(options.body); requests.push(body);
      if (holdResponse) await new Promise<void>(resolve => { releaseResponse = resolve; });
      let code = '', message = '';
      let calculation: ReturnType<typeof calculateStagingPriceForTest> | undefined;
      try {
        if (rejectConstruction) body.construction = '';
        calculation = calculateStagingPriceForTest(body, fabric);
      } catch (error) { const rejection = priceRejectionDetails(error); code = rejection?.diagnosticCode || 'INVALID'; message = rejection?.customerMessage || 'Invalid'; }
      return { ok: !code, status: code ? 400 : 200, headers: { get: () => code || null }, json: async () => code ? { error: message } : calculation };
    },
  };
  runInNewContext(readFileSync(scripts + 'curtainsuk-mtm-configurator.js', 'utf8'), context);
  const source = readFileSync(scripts + 'curtainsuk-storefront.js', 'utf8');
  const instrumented = source.replace('  document.querySelectorAll("[data-cuk-configurator]").forEach(initConfigurator);', '  globalThis.initForTest = initConfigurator;');
  assert.notEqual(instrumented, source);
  runInNewContext(instrumented, context);
  await context.initForTest(root);
  async function flush(wait = true) { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); if (wait) await Promise.all(pending.splice(0)); }
  async function change(name: string, value: string) {
    const field = form.elements[name]; field.value = value;
    await field.fire('change'); await form.fire('change', { target: field });
  }
  return { form, root, requests, flush, change, releaseResponse: () => releaseResponse?.() };
}

test('page load and restored incomplete state never auto-submit pricing', async () => {
  for (const remembered of [{}, { ...complete, construction: '' }, { ...complete, widthCm: '' }, { ...complete, dropCm: '0' }, { ...complete, construction: 'RETIRED' }]) {
    const h = await harness(remembered);
    await h.flush(); assert.equal(h.requests.length, 0);
    await h.change('lining', 'BLACKOUT'); await h.flush();
    assert.equal(h.requests.length, 0);
  }
});

test('valid saved Pair and Single restore after catalogue options exist without initial auto-pricing', async () => {
  for (const choice of [{ construction: 'PAIR', stackDirection: 'SPLIT' }, { construction: 'SINGLE', stackDirection: 'RIGHT' }]) {
    const h = await harness({ ...complete, ...choice });
    assert.equal(h.form.elements.construction.value, choice.construction);
    assert.equal(h.form.elements.stackDirection.value, choice.stackDirection);
    await h.flush(); assert.equal(h.requests.length, 0);
    await h.change('dropCm', '240'); await h.flush(); assert.equal(h.requests.length, 1);
  }
});

test('leaving the measurement step with construction still empty cannot price; completed choices price once', async () => {
  const h = await harness({ ...complete, construction: '', stackDirection: '' });
  await h.change('dropCm', '230'); await h.flush(); assert.equal(h.requests.length, 0);
  await h.change('construction', 'PAIR'); await h.flush(); assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].stackDirection, 'SPLIT');
  assert.equal(h.root.querySelector('[data-cuk-error]').hidden, true, h.root.querySelector('[data-cuk-error]').textContent);
  assert.equal(h.root.querySelector('[data-cuk-result]').hidden, false);
  await h.form.fire('input'); await h.form.fire('change'); await h.flush();
  assert.equal(h.requests.length, 1);
  assert.equal(h.root.querySelector('[data-cuk-result]').hidden, false);
});

test('returning to a previous complete configuration restores a price after transient edits', async () => {
  const h = await harness(complete);
  await h.change('dropCm', '230'); await h.flush();
  await h.change('widthCm', ''); await h.flush();
  assert.equal(h.root.querySelector('[data-cuk-result]').hidden, true);
  await h.change('widthCm', '180'); await h.flush();
  assert.equal(h.requests.length, 2);
  assert.equal(h.root.querySelector('[data-cuk-result]').hidden, false);
});

test('empty/reset measurements and stale single openings do not send price requests', async () => {
  const h = await harness(complete);
  await h.change('widthCm', ''); await h.flush(); assert.equal(h.requests.length, 0);
  await h.change('construction', 'SINGLE'); await h.change('widthCm', '180'); await h.flush();
  assert.equal(h.requests.length, 0);
  assert.equal(h.form.elements.stackDirection.value, '');
  await h.change('stackDirection', 'LEFT'); await h.flush(); assert.equal(h.requests.length, 1);
  await h.change('widthCm', '190'); await h.form.fire('reset');
  h.form.elements.widthCm.value = ''; await h.flush();
  assert.equal(h.requests.length, 1);
});

test('a stale server construction rule causes one specific rejection, not a 650ms resubmission loop', async () => {
  const h = await harness(complete, true);
  await h.change('dropCm', '230'); await h.flush();
  assert.equal(h.requests.length, 1);
  assert.match(h.root.querySelector('[data-cuk-error]').textContent, /arrangement isn't available for the selected window/);
  for (let i = 0; i < 5; i++) { await h.change('dropCm', String(231 + i)); await h.flush(); }
  assert.equal(h.requests.length, 1);
});

test('an in-flight response cannot expose stale checkout or trigger a request for newly emptied fields', async () => {
  const h = await harness(complete, false, true);
  await h.change('dropCm', '230'); await h.flush(false);
  assert.equal(h.requests.length, 1);
  await h.change('widthCm', '');
  h.releaseResponse(); await h.flush(); await h.flush();
  assert.equal(h.requests.length, 1);
  assert.equal(h.root.querySelector('[data-cuk-result]').hidden, true);
});
