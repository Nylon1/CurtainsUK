import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync('shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-rooms.js', 'utf8');
const helpers = source.slice(source.indexOf('  function verifiedCheckoutUrl('), source.indexOf('  async function command('));
const start = "root.querySelector('[data-checkout]')?.addEventListener('click',async()=>{";
const handler = source.slice(source.indexOf(start) + start.length, source.indexOf('\n      });', source.indexOf(start)));
const theme = readFileSync('shopify-theme/curtainsuk-dawn-16/layout/theme.liquid', 'utf8');
const bridge = theme.match(/<!-- CurtainsUK OpenAI Ads measurement bridge -->\s*<script>([\s\S]*?)<\/script>/)![1];

function fixture(options: { status?: string; url?: string; changedRevision?: boolean; navigationFails?: boolean; analyticsFails?: boolean; lookupFails?: boolean; paused?: boolean } = {}) {
  const calls: any[][] = [], navigation: string[] = [], errors: string[] = [];
  const listeners = new Map<string, (event: any) => void>();
  let release!: () => void, commandCount = 0, standardsAtNavigation = -1;
  const wait = options.paused ? new Promise<void>(resolve => { release = resolve; }) : Promise.resolve();
  const window = {
    dataLayer: [] as any[],
    oaiq: (...args: any[]) => calls.push(args),
    addEventListener: (name: string, callback: (event: any) => void) => listeners.set(name, callback),
    dispatchEvent: (event: any) => { if (options.analyticsFails) throw Error('analytics unavailable'); listeners.get(event.type)?.(event); },
    location: { pathname: '/pages/build-my-rooms', href: 'https://www.curtainsuk.com/pages/build-my-rooms', assign(url: string) {
      standardsAtNavigation = calls.filter(call => call[1] === 'checkout_started').length;
      if (options.navigationFails) throw Error('navigation blocked');
      navigation.push(url);
    } },
    Shopify: { customerPrivacy: { marketingAllowed: () => true }, loadFeatures: (_: any, callback: any) => callback(null) },
  };
  if (options.analyticsFails) window.dataLayer.push = () => { throw Error('dataLayer unavailable'); };
  const context = vm.createContext({
    window, URL,
    CustomEvent: class { constructor(public type: string, public options: any) {} get detail() { return this.options.detail; } },
    document: { title: 'Synthetic checkout', cookie: '', readyState: 'complete', addEventListener() {}, querySelectorAll: () => [] },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    checkingOut: false, house: { house_id: 'synthetic-house', revision: 7 }, postcode: 'SW1A 1AA', base: '/synthetic',
    review: { total: 69495, currency: 'GBP', reviewToken: 'synthetic', lines: [{ configuration_id: 'synthetic-curtain' }] },
    root: { querySelector: () => ({ checked: true, focus() {} }), querySelectorAll: () => [] },
    Store: { read: () => ({ revision: options.changedRevision ? 8 : 7 }) },
    reviewPayload: () => ({}), sync() {}, render() {}, updateCheckout() {}, error: (message: string) => errors.push(message),
    command: async () => { commandCount++; await wait; if (options.lookupFails) throw Error('lookup unavailable'); return { status: options.status || 'SUCCESS', checkoutUrl: options.url || 'https://carpetup.myshopify.com/checkouts/synthetic' }; },
  });
  vm.runInContext(bridge, context);
  vm.runInContext(`${helpers}\nglobalThis.checkoutHandler = async () => {${handler}\n};`, context);
  return { calls, navigation, errors, window, run: () => context.checkoutHandler(), release: () => release(), commandCount: () => commandCount, standardsAtNavigation: () => standardsAtNavigation };
}

test('House checkout records diagnostic handoff, then one standard event after verified navigation', async () => {
  const f = fixture(); await f.run();
  assert.equal(f.navigation.length, 1); assert.equal(f.standardsAtNavigation(), 0);
  const standard = f.calls.filter(call => call[1] === 'checkout_started');
  assert.equal(standard.length, 1); assert.equal(standard[0][3].event_id, 'checkout_rooms_synthetic-house_7');
  assert.equal(standard[0][2].amount, 69495); assert.equal(standard[0][2].currency, 'GBP');
  assert.equal(standard[0][2].contents[0].content_type, 'curtain_order');
  assert.deepEqual(f.window.dataLayer.map(row => row.event), ['curtainsuk_checkout_handoff_reached', 'curtainsuk_checkout_opened']);
  assert.equal(f.calls.filter(call => call[3]?.custom_event_name === 'checkout_handoff_reached').length, 1);
  assert.equal(f.calls.filter(call => call[1] === 'order_created').length, 0);
});
test('reopening the same handoff retains the same standard event ID', async () => {
  const f = fixture(); await f.run(); await f.run();
  assert.deepEqual([...new Set(f.calls.filter(call => call[1] === 'checkout_started').map(call => call[3].event_id))], ['checkout_rooms_synthetic-house_7']);
});
test('a concurrent click cannot create a second handoff or standard event', async () => {
  const f = fixture({ paused: true }); const first = f.run(); await f.run(); f.release(); await first;
  assert.equal(f.commandCount(), 1); assert.equal(f.navigation.length, 1); assert.equal(f.calls.filter(call => call[1] === 'checkout_started').length, 1);
});
for (const url of ['https://example.invalid/checkout', 'http://carpetup.myshopify.com/checkout', 'https://user:secret@carpetup.myshopify.com/checkout', 'https://carpetup.myshopify.com:444/checkout']) {
  test(`unverified checkout URL is rejected: ${url.replace('user:secret@', '[redacted]@')}`, async () => {
    const f = fixture({ url }); await f.run(); assert.equal(f.navigation.length, 0); assert.equal(f.window.dataLayer.length, 0); assert.equal(f.calls.filter(call => call[1] === 'checkout_started').length, 0); assert.equal(f.errors.length, 1);
  });
}
test('navigation failure leaves handoff diagnostic only', async () => {
  const f = fixture({ navigationFails: true }); await f.run(); assert.equal(f.navigation.length, 0); assert.equal(f.calls.filter(call => call[1] === 'checkout_started').length, 0); assert.deepEqual(f.window.dataLayer.map(row => row.event), ['curtainsuk_checkout_handoff_reached']);
});
test('changed house revision and failed lookup never produce checkout events', async () => {
  for (const options of [{ changedRevision: true }, { lookupFails: true }, { status: 'STOCK_CHANGED' }, { status: 'PRICE_CHANGED' }, { status: 'REVIEW_REQUIRED' }]) {
    const f = fixture(options); await f.run(); assert.equal(f.navigation.length, 0); assert.equal(f.window.dataLayer.length, 0); assert.equal(f.calls.filter(call => call[1] === 'checkout_started').length, 0);
  }
});
test('analytics failures cannot prevent verified checkout navigation', async () => {
  const f = fixture({ analyticsFails: true }); await f.run(); assert.equal(f.navigation.length, 1); assert.equal(f.errors.length, 0);
});
