/* Anonymous, consented diagnostics. No form values, query strings or error text. */
(() => {
  'use strict';
  const endpoint = '/apps/curtainsuk-decision/journey';
  const key = 'cuk_journey_v1';
  const idleMs = 30 * 60 * 1000;
  const excluded = /(?:^|\/)(?:account|checkout|orders|apps)(?:\/|$)/i;
  const safePath = /^\/[a-z0-9/_-]{0,159}$/i;
  const release = 'journey-20261020-v1';
  const nativeFetch = window.fetch.bind(window);
  let journeyId = null;
  let enabled = false;
  let sent = 0;
  let timer = null;
  let queue = [];

  function path(value) {
    try {
      const url = new URL(value, location.origin);
      if (url.origin !== location.origin || excluded.test(url.pathname) || !safePath.test(url.pathname)) return null;
      return url.pathname;
    } catch { return null; }
  }

  function consent() {
    try { return window.Shopify?.customerPrivacy?.analyticsProcessingAllowed() === true; }
    catch { return false; }
  }

  function channel() {
    try {
      const medium = new URL(location.href).searchParams.get('utm_medium')?.toLowerCase() || '';
      if (/^(?:cpc|ppc|paid|paid-social|display)$/.test(medium)) return 'Paid';
      if (/^(?:email|e-mail|newsletter)$/.test(medium)) return 'Email';
      const source = new URL(document.referrer || location.origin).hostname.toLowerCase();
      if (/(?:^|\.)(?:google|bing|yahoo|duckduckgo)\./.test(source)) return 'Search';
      if (/(?:^|\.)(?:facebook|instagram|pinterest|tiktok|linkedin|youtube|x)\.com$/.test(source)) return 'Social';
      if (source === location.hostname || !document.referrer) return 'Direct';
      return 'Referral';
    } catch { return 'Unknown'; }
  }

  function identity() {
    const now = Date.now();
    try {
      const stored = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (stored && /^[0-9a-f-]{36}$/i.test(stored.id) && now - stored.last < idleMs) {
        sessionStorage.setItem(key, JSON.stringify({ id: stored.id, last: now }));
        return { id: stored.id, fresh: false };
      }
      const id = crypto.randomUUID();
      sessionStorage.setItem(key, JSON.stringify({ id, last: now }));
      return { id, fresh: true };
    } catch { return { id: crypto.randomUUID(), fresh: true }; }
  }

  function flush(beacon = false) {
    if (!enabled || !queue.length || !journeyId) return;
    if (timer) clearTimeout(timer);
    timer = null;
    const events = queue.splice(0, 12);
    const body = JSON.stringify({ journeyId, events });
    try {
      if (beacon && navigator.sendBeacon?.(endpoint, new Blob([body], { type: 'application/json' }))) return;
      void nativeFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: beacon, credentials: 'same-origin' }).catch(() => {});
    } catch { /* Tracking never blocks a customer action. */ }
  }

  function record(kind, name, code = null, status = null, pagePath = path(location.href)) {
    if (!enabled || !pagePath || sent >= 120 || !journeyId) return;
    queue.push({ eventId: crypto.randomUUID(), kind, name, code, status, pagePath, release,
      channel: name === 'VISIT_START' ? channel() : null });
    sent += 1;
    if (queue.length >= 12 || kind === 'ERROR') flush();
    else if (!timer) timer = setTimeout(flush, 2500);
  }

  function start() {
    if (!consent()) {
      enabled = false;
      queue = [];
      journeyId = null;
      if (timer) clearTimeout(timer);
      timer = null;
      try { sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
      return;
    }
    if (enabled) return;
    const visit = identity();
    journeyId = visit.id;
    enabled = true;
    if (visit.fresh) record('PAGE', 'VISIT_START');
    record('PAGE', 'PAGE_VIEW');
    if (path(location.href) === '/cart') record('ACTION', 'CART_VIEW');
  }

  document.addEventListener('visitorConsentCollected', start);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.addEventListener('load', start, { once: true });
  window.addEventListener('load', () => setTimeout(() => {
    const entry = performance.getEntriesByType?.('navigation')?.[0];
    if (entry && entry.duration >= 4000) record('PERFORMANCE', 'PAGE_SLOW', entry.duration >= 8000 ? 'PAGE_OVER_8S' : 'PAGE_4_TO_8S');
  }, 0), { once: true });
  // Shopify may load its consent API after deferred theme scripts.
  let privacyChecks = 0;
  const privacyTimer = setInterval(() => {
    start();
    if (enabled || ++privacyChecks >= 20) clearInterval(privacyTimer);
  }, 250);
  window.addEventListener('pagehide', () => flush(true));

  document.addEventListener('click', (event) => {
    const link = event.target?.closest?.('a[href]');
    const destination = link && path(link.href);
    if (destination && destination !== path(location.href)) record('ACTION', 'NAVIGATE', null, null, destination);
    if (link && /(?:^|\/)checkout(?:\/|$)/i.test(new URL(link.href).pathname)) record('ACTION', 'CHECKOUT_START');
  }, { capture: true, passive: true });

  window.addEventListener('error', (event) => {
    const asset = event.target && event.target !== window;
    record('ERROR', asset ? 'ASSET_FAILURE' : 'BROWSER_ERROR', asset ? 'ASSET_LOAD_FAILED' : 'BROWSER_EXCEPTION');
  }, true);
  window.addEventListener('unhandledrejection', () => record('ERROR', 'BROWSER_ERROR', 'PROMISE_REJECTION'));

  window.fetch = function (...args) {
    const result = nativeFetch(...args);
    if (enabled) {
      const requestUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      const apiUrl = (() => { try { return new URL(requestUrl, location.origin); } catch { return null; } })();
      const nativePath = apiUrl?.pathname || '';
      if (nativePath === '/cart/add.js') {
        void result.then((response) => { if (response.ok) record('ACTION', 'CART_ADD'); }, () => {});
      }
      if (/^\/apps\/curtainsuk-decision\/(?:my-home-checkout|checkout-handoff)$/.test(nativePath)) {
        void result.then((response) => { if (response.ok) record('ACTION', 'CHECKOUT_START'); }, () => {});
      }
      const observedApi = apiUrl && ((apiUrl.origin === location.origin &&
        (nativePath.startsWith('/apps/curtainsuk-decision/') || nativePath.startsWith('/api/')))
        || /^(?:curtainsuk-production-api|curtainsuk-staging-api|curtainsuk-staging-gateway)\.vercel\.app$/.test(apiUrl.hostname));
      if (observedApi && nativePath !== endpoint) {
        const started = performance.now();
        void result.then((response) => {
          if (performance.now() - started >= 5000) record('PERFORMANCE', 'API_SLOW', 'API_OVER_5S');
          if (response.status >= 500) record('ERROR', 'API_FAILURE', 'API_SERVER_ERROR', response.status);
          else if ([400, 404, 409].includes(response.status)) record('ERROR', 'API_FAILURE', 'API_REQUEST_REJECTED', response.status);
        }, () => {
          if (performance.now() - started >= 5000) record('PERFORMANCE', 'API_SLOW', 'API_OVER_5S');
          record('ERROR', 'API_FAILURE', 'API_NETWORK_ERROR');
        });
      }
    }
    return result;
  };
})();
