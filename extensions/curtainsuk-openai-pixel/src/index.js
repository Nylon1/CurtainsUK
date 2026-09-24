import {register} from '@shopify/web-pixels-extension';

register(({analytics, browser, settings}) => {
  const pixelId = String(settings?.pixelId || '').trim();
  if (!pixelId) return;

  const PIXEL_URL = 'https://cdn.oaistatic.com/assets/openai-pixel.js';
  const OPPREF_KEY = 'curtainsuk_oppref';

  const rememberOppref = async (url) => {
    try {
      const value = new URL(url).searchParams.get('oppref');
      if (value) await browser.localStorage.setItem(OPPREF_KEY, value.slice(0, 500));
    } catch {}
  };

  const ensurePixel = (() => {
    let promise;
    return () => {
      if (promise) return promise;
      promise = new Promise((resolve) => {
        if (self.oaiq) return resolve(self.oaiq);
        const q = function () { q.q.push(arguments); };
        q.q = [];
        self.oaiq = q;
        q('init', pixelId);
        importScripts(PIXEL_URL);
        resolve(q);
      });
      return promise;
    };
  })();

  const measure = async (name, data = {}) => {
    const q = await ensurePixel();
    q('measure', name, data);
  };

  analytics.subscribe('page_viewed', async (event) => {
    await rememberOppref(event.context?.document?.location?.href || '');
  });

  analytics.subscribe('curtainsuk:fabric_intelligence_started', () =>
    measure('contents_viewed', {type: 'fabric_intelligence'})
  );
  analytics.subscribe('curtainsuk:palette_created', () =>
    measure('contents_viewed', {type: 'palette_created'})
  );
  analytics.subscribe('curtainsuk:fabric_selected', () =>
    measure('contents_viewed', {type: 'fabric_selected'})
  );
  analytics.subscribe('curtainsuk:quote_submitted', () =>
    measure('lead_created', {type: 'customer_action'})
  );

  analytics.subscribe('checkout_started', () =>
    measure('checkout_started', {type: 'customer_action'})
  );
  analytics.subscribe('checkout_completed', () =>
    measure('order_created', {type: 'customer_action'})
  );
});
