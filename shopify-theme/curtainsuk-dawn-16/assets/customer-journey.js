/* Anonymous, consented diagnostics. No form values, query strings or error text. */
(() => {
  'use strict';
  const endpoint = '/apps/curtainsuk-decision/journey';
  const key = 'cuk_journey_v1';
  const idleMs = 30 * 60 * 1000;
  const excluded = /(?:^|\/)(?:account|checkout|orders|apps)(?:\/|$)/i;
  const safePath = /^\/[a-z0-9/_-]{0,159}$/i;
  const release = 'journey-20261020-v2';
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

  const errorTypes = new Set(['Error', 'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError', 'URIError',
    'EvalError', 'SecurityError', 'NetworkError', 'AbortError', 'TimeoutError', 'NotFoundError',
    'DataError', 'InvalidStateError', 'DOMException', 'ResourceError', 'NonErrorRejection']);

  function feature() {
    const page = path(location.href) || '';
    if (page === '/pages/fabric-library' || page.startsWith('/pages/fabric/')) return 'FABRICS';
    if (page === '/pages/cushion-studio') return 'CUSHION_STUDIO';
    if (page === '/pages/room-visualiser' || page === '/pages/curtain-visualiser') return 'ROOM_VISUALISER';
    if (page.startsWith('/pages/smart-track-')) return 'SMART_TRACK_STUDIO';
    if (page === '/pages/build-my-rooms') return 'DESIGN_MY_HOME';
    if (page === '/pages/how-to-fit') return 'FITTING_GUIDE';
    if (page.startsWith('/products/')) return 'PRODUCT_PAGE';
    if (page.startsWith('/policies/')) return 'POLICY_PAGE';
    return 'GENERAL';
  }

  function apiFeature(route) {
    if (/jane/i.test(route)) return 'JANE_ADVISOR';
    if (/specialists|advisor/i.test(route)) return 'SPECIALISTS';
    if (/consultation|fabric-intelligence|review-fabric/i.test(route)) return 'FABRIC_INTELLIGENCE';
    if (/catalog|stock/i.test(route)) return 'FABRIC_STOCK';
    if (/cushion/i.test(route)) return 'CUSHION_STUDIO';
    if (/room-visualiser|curtain-visualiser/i.test(route)) return 'ROOM_VISUALISER';
    if (/smart-track/i.test(route)) return 'SMART_TRACK_STUDIO';
    if (/my-home|checkout-handoff/i.test(route)) return 'DESIGN_MY_HOME';
    return feature();
  }

  function apiDetail(message, route) {
    return { type: message === 'NETWORK_REQUEST_FAILED' ? 'NetworkError' : 'HttpError', message,
      script: null, line: null, column: null, origin: 'APP', feature: apiFeature(route) };
  }

  function safeMessage(value) {
    if (typeof value !== 'string') return 'MESSAGE_UNAVAILABLE';
    if (/failed to fetch|network request failed|load failed/i.test(value)) return 'NETWORK_REQUEST_FAILED';
    if (/cannot read (?:properties|property) of undefined/i.test(value)) return 'PROPERTY_READ_UNDEFINED';
    if (/cannot read (?:properties|property) of null/i.test(value)) return 'PROPERTY_READ_NULL';
    if (/cannot set (?:properties|property) of undefined/i.test(value)) return 'PROPERTY_SET_UNDEFINED';
    if (/cannot set (?:properties|property) of null/i.test(value)) return 'PROPERTY_SET_NULL';
    if (/is not a function/i.test(value)) return 'NOT_A_FUNCTION';
    if (/is not defined/i.test(value)) return 'UNDEFINED_IDENTIFIER';
    if (/unexpected token/i.test(value)) return 'UNEXPECTED_TOKEN';
    if (/abort(?:ed|error)/i.test(value)) return 'REQUEST_ABORTED';
    if (/script error/i.test(value)) return 'SCRIPT_ERROR';
    return 'MESSAGE_WITHHELD';
  }

  function safeSource(value) {
    if (typeof value !== 'string' || !value || value.length > 2048) return null;
    try {
      const url = new URL(value, location.origin);
      const name = url.pathname.split('/').pop() || '';
      if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:')
        return { origin: 'EXTENSION', script: null };
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      const own = url.hostname === location.hostname || /^(?:curtainsuk-production-api|curtainsuk-staging-api|curtainsuk-staging-gateway)\.vercel\.app$/.test(url.hostname);
      const theme = /^curtainsuk-[a-z0-9._-]{1,65}\.js$/.test(name) || name === 'customer-journey.js';
      const script = theme ? name : (own && /^(?:global|theme|vendor)\.js$/.test(name) ? name : null);
      if (theme && (own || url.hostname === 'cdn.shopify.com')) return { origin: 'THEME', script };
      if (own) return { origin: url.hostname === location.hostname ? 'THEME' : 'APP', script };
      if (url.hostname === 'cdn.shopify.com' || url.hostname.endsWith('.shopify.com')) return { origin: 'SHOPIFY', script: null };
      return { origin: 'EXTERNAL', script: null };
    } catch { return null; }
  }

  function stackLocation(reason) {
    if (!reason || typeof reason !== 'object') return null;
    let stack;
    try { stack = reason.stack; } catch { return null; }
    if (typeof stack !== 'string') return null;
    const frame = stack.slice(0, 8192).match(/((?:https?:\/\/|chrome-extension:\/\/|moz-extension:\/\/)[^\s)]+?):(\d+):(\d+)(?=[\s)]|$)/);
    return frame ? { url: frame[1], line: Number(frame[2]), column: Number(frame[3]) } : null;
  }

  function errorDetail(reason, locationHint = null, messageHint = null, asset = false) {
    let name = asset ? 'ResourceError' : (reason && typeof reason === 'object' ? 'Error' : 'NonErrorRejection');
    let message = messageHint;
    if (reason && typeof reason === 'object') {
      try {
        if (errorTypes.has(reason.name)) name = reason.name;
        message = reason.message || messageHint;
      } catch { /* Error objects from another context may be inaccessible. */ }
    }
    const frame = locationHint || stackLocation(reason);
    const source = safeSource(frame?.url);
    const integer = (value) => Number.isInteger(value) && value > 0 && value <= 10000000 ? value : null;
    return { type: name, message: asset ? 'ASSET_LOAD_FAILED' : safeMessage(message), script: source?.script || null,
      line: integer(frame?.line), column: integer(frame?.column), origin: source?.origin || 'UNKNOWN', feature: feature() };
  }

  function record(kind, name, code = null, status = null, pagePath = path(location.href), detail = null) {
    if (!enabled || !pagePath || sent >= 120 || !journeyId) return;
    queue.push({ eventId: crypto.randomUUID(), kind, name, code, status, pagePath, release, detail,
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
    const source = asset ? (event.target?.currentSrc || event.target?.src || event.target?.href) : event.filename;
    const locationHint = source ? { url: source, line: event.lineno, column: event.colno } : null;
    record('ERROR', asset ? 'ASSET_FAILURE' : 'BROWSER_ERROR', asset ? 'ASSET_LOAD_FAILED' : 'BROWSER_EXCEPTION',
      null, path(location.href), errorDetail(asset ? null : event.error, locationHint, event.message, asset));
  }, true);
  window.addEventListener('unhandledrejection', (event) => record('ERROR', 'BROWSER_ERROR', 'PROMISE_REJECTION',
    null, path(location.href), errorDetail(event.reason)));

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
          if (response.status >= 500) record('ERROR', 'API_FAILURE', 'API_SERVER_ERROR', response.status,
            path(location.href), apiDetail('HTTP_SERVER_ERROR', nativePath));
          else if ([400, 404, 409].includes(response.status)) record('ERROR', 'API_FAILURE', 'API_REQUEST_REJECTED',
            response.status, path(location.href), apiDetail('HTTP_REQUEST_REJECTED', nativePath));
        }, () => {
          if (performance.now() - started >= 5000) record('PERFORMANCE', 'API_SLOW', 'API_OVER_5S');
          record('ERROR', 'API_FAILURE', 'API_NETWORK_ERROR', null, path(location.href),
            apiDetail('NETWORK_REQUEST_FAILED', nativePath));
        });
      }
    }
    return result;
  };
})();
