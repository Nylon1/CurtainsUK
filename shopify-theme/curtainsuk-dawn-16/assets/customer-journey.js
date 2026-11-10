/* Consented journey analytics; isolated, minimal fault diagnostics work without analytics consent. */
(() => {
  'use strict';
  const endpoint = '/apps/curtainsuk-decision/journey';
  const key = 'cuk_journey_v1';
  const idleMs = 30 * 60 * 1000;
  const excluded = /(?:^|\/)(?:account|checkout|orders|apps)(?:\/|$)/i;
  const safePath = /^\/[a-z0-9/_-]{0,159}$/i;
  const release = 'journey-20261110-v6';
  const myHomeSteps = new Set(['MY_HOME_CART_VIEW', 'MY_HOME_REVIEW_READY', 'MY_HOME_REVIEW_BLOCKED',
    'MY_HOME_REVIEW_FAILED', 'MY_HOME_ORDER_NOW', 'MY_HOME_HANDOFF_READY',
    'MY_HOME_HANDOFF_FAILED', 'MY_HOME_RETURNED']);
  const productMix = /^(?:CURTAIN|ROMAN|CUSHION|TRACK)(?:_(?:CURTAIN|ROMAN|CUSHION|TRACK)){0,3}$/;
  const nativeFetch = window.fetch.bind(window);
  let journeyId = null;
  let enabled = false;
  let sent = 0;
  let timer = null;
  let queue = [];
  let faultCount = 0;
  const reportedFaults = new Set();

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
    if (page === '/pages/how-to-hang-curtains') return 'HANGING_GUIDE';
    if (page === '/pages/curtains-beyond-windows') return 'BEYOND_WINDOWS';
    if (page === '/pages/hotel-design-studio') return 'HOTEL_STUDIO';
    if (page.startsWith('/pages/roman-')) return 'ROMAN_BLINDS';
    if (page === '/pages/room-visualiser' || page === '/pages/curtain-visualiser') return 'ROOM_VISUALISER';
    if (page.startsWith('/pages/smart-track-')) return 'SMART_TRACK_STUDIO';
    if (page === '/pages/build-my-rooms') return 'DESIGN_MY_HOME';
    if (page === '/pages/how-to-fit') return 'FITTING_GUIDE';
    if (page.startsWith('/products/')) return 'PRODUCT_PAGE';
    if (page.startsWith('/policies/')) return 'POLICY_PAGE';
    return 'GENERAL';
  }

  function apiFeature(route) {
    if (/\/price(?:\/|$)/i.test(route)) return 'PRICE_CALCULATOR';
    if (/jane/i.test(route)) return 'JANE_ADVISOR';
    if (/specialists|advisor/i.test(route)) return 'SPECIALISTS';
    if (/consultation|fabric-intelligence|review-fabric/i.test(route)) return 'FABRIC_INTELLIGENCE';
    if (/catalog|stock/i.test(route)) return 'FABRIC_STOCK';
    if (/cushion/i.test(route)) return 'CUSHION_STUDIO';
    if (/room-visualiser|curtain-visualiser/i.test(route)) return 'ROOM_VISUALISER';
    if (/smart-track/i.test(route)) return 'SMART_TRACK_STUDIO';
    if (/roman/i.test(route)) return 'ROMAN_BLINDS';
    if (/hanging/i.test(route)) return 'HANGING_GUIDE';
    if (/hotel-studio/i.test(route)) return 'HOTEL_STUDIO';
    if (/beyond-windows/i.test(route)) return 'BEYOND_WINDOWS';
    if (/my-home|checkout-handoff/i.test(route)) return 'DESIGN_MY_HOME';
    return feature();
  }

  const apiOperations = new Set(['jane', 'specialists', 'catalog', 'naila-catalog', 'premium-catalog',
    'consultation', 'premium-session', 'premium-command', 'hci-session', 'hci-command',
    'price', 'rooms', 'sample-order', 'checkout-handoff', 'review-request', 'review-acceptance',
    'room-visualiser', 'cushion-studio', 'smart-track', 'my-home-checkout',
    'roman', 'hanging', 'hotel-studio', 'beyond-windows']);

  function safeApiRoute(route) {
    const proxy = route.match(/^\/apps\/curtainsuk-decision\/([a-z-]+)/);
    if (proxy && apiOperations.has(proxy[1])) return `/apps/curtainsuk-decision/${proxy[1]}`;
    const direct = route.match(/^\/api\/staging\/shopify-proxy\/([a-z-]+)/);
    if (direct && apiOperations.has(direct[1])) return `/api/staging/shopify-proxy/${direct[1]}`;
    if (route === '/api/curtain-consultation-premium') return route;
    return null;
  }

  function priceContext(response, route) {
    if (route !== '/apps/curtainsuk-decision/price') return null;
    try {
      const raw = response.headers?.get?.('X-CurtainsUK-Pricing-Context');
      if (!raw || raw.length > 700) return null;
      const value = JSON.parse(raw);
      const allowed = {
        windowSlug: ['standard-window', 'patio-sliding-doors', 'french-doors', 'bifold-doors', 'bay-window', 'UNKNOWN'],
        masterWindowSlug: ['standard-window', 'sliding-doors', 'patio-doors', 'french-doors', 'bifold-doors', 'bay-window', 'UNKNOWN'],
        hardware: ['TRACK', 'POLE', 'UNSELECTED', 'UNRECOGNISED'],
        heading: ['PENCIL_PLEAT', 'DOUBLE_PINCH', 'WAVE', 'EYELET', 'UNSELECTED', 'UNRECOGNISED'],
        construction: ['PAIR', 'SINGLE', 'UNSELECTED', 'UNRECOGNISED'],
        storefrontRelease: ['mtm-configurator-20261022-v1', 'UNKNOWN'],
      };
      if (Object.keys(value).sort().join(',') !== 'apiRelease,construction,hardware,heading,masterWindowSlug,storefrontRelease,windowSlug'
        || !Object.entries(allowed).every(([key, values]) => values.includes(value[key]))
        || !/^(?:UNKNOWN|dpl_[A-Za-z0-9]{1,64})$/.test(value.apiRelease)) return null;
      return value;
    } catch { return null; }
  }

  function apiDetail(message, route, method, cause = null, reasonCode = null, pricingContext = null) {
    const frames = stackFrames(cause);
    const first = frames[0];
    let causeMessage = null;
    try { causeMessage = typeof cause === 'string' ? cause : cause?.message; } catch { /* Cross-origin errors may be inaccessible. */ }
    return { type: message === 'NETWORK_REQUEST_FAILED' ? 'NetworkError' : 'HttpError', message,
      script: first?.script || null, line: first?.line || null, column: first?.column || null,
      origin: first?.origin || 'APP', feature: apiFeature(route),
      messageText: redactedMessage(causeMessage), frames, reasonCode, ...(pricingContext ? { pricingContext } : {}), request: safeApiRoute(route)
        ? { method: /^(GET|POST|PUT|PATCH|DELETE)$/.test(method) ? method : 'GET', route: safeApiRoute(route) } : null };
  }

  function redactedMessage(value) {
    if (typeof value !== 'string' || !value || value.length > 2048) return null;
    const clean = value.replace(/[\r\n\t]+/g, ' ').replace(/https?:\/\/[^\s<>"']+/gi, '[URL]')
      .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[EMAIL]')
      .replace(/\b(?:\+?\d[\d ()-]{7,}\d)\b/g, '[NUMBER]')
      .replace(/\b(?:eyJ[a-z0-9_-]{20,}|[a-f0-9]{32,})\b/gi, '[TOKEN]')
      .replace(/\b(?:sk-[a-z0-9_-]{8,}|shpat_[a-z0-9_-]{8,}|Bearer\s+[a-z0-9._-]{8,})\b/gi, '[TOKEN]')
      .replace(/\b(?:token|key|secret|password|authorization|session|capability)=[^\s&]+/gi, '[REDACTED]')
      .replace(/(['"`])[^'"`]{1,100}\1/g, "'[value]'")
      .replace(/[^\x20-\x7e]/g, '?').replace(/\s{2,}/g, ' ').trim();
    return clean ? clean.slice(0, 180) : null;
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
      const script = (own || url.hostname === 'cdn.shopify.com') && /^[a-z0-9][a-z0-9._-]{0,79}\.m?js$/.test(name) ? name : null;
      // Shopify serves its platform listener from the shop hostname, alongside theme assets.
      if (own && /^shop_events_listener-[a-f0-9]+\.js$/.test(name)) return { origin: 'SHOPIFY', script };
      if (theme && (own || url.hostname === 'cdn.shopify.com')) return { origin: 'THEME', script };
      if (own && url.pathname.startsWith('/apps/curtainsuk-decision/')) return { origin: 'APP', script };
      if (own) return { origin: url.hostname === location.hostname ? 'THEME' : 'APP', script };
      if (url.hostname === 'cdn.shopify.com' || url.hostname.endsWith('.shopify.com')) return { origin: 'SHOPIFY', script: null };
      return { origin: 'EXTERNAL', script: null };
    } catch { return null; }
  }

  function stackFrames(reason) {
    if (!reason || typeof reason !== 'object') return [];
    let stack;
    try { stack = reason.stack; } catch { return []; }
    if (typeof stack !== 'string') return [];
    const frames = [];
    for (const row of stack.slice(0, 8192).split('\n').slice(1, 9)) {
      const found = row.match(/((?:https?:\/\/|chrome-extension:\/\/|moz-extension:\/\/)[^\s)]+?):(\d+):(\d+)(?=[\s)]|$)/);
      if (!found) continue;
      const source = safeSource(found[1]);
      const line = Number(found[2]);
      const column = Number(found[3]);
      if (!source || !Number.isInteger(line) || !Number.isInteger(column)
        || line < 1 || column < 1 || line > 10000000 || column > 10000000) continue;
      frames.push({ script: source.script, line, column, origin: source.origin });
      if (frames.length === 3) break;
    }
    return frames;
  }

  function errorDetail(reason, locationHint = null, messageHint = null, asset = false) {
    let name = asset ? 'ResourceError' : (reason && typeof reason === 'object' ? 'Error' : 'NonErrorRejection');
    let message = typeof reason === 'string' ? reason : messageHint;
    if (reason && typeof reason === 'object') {
      try {
        if (errorTypes.has(reason.name)) name = reason.name;
        message = reason.message || messageHint;
      } catch { /* Error objects from another context may be inaccessible. */ }
    }
    const frames = stackFrames(reason);
    const source = safeSource(locationHint?.url);
    const integer = (value) => Number.isInteger(value) && value > 0 && value <= 10000000 ? value : null;
    const locationFrame = source && integer(locationHint?.line) && integer(locationHint?.column)
      ? { script: source.script, line: locationHint.line, column: locationHint.column, origin: source.origin } : null;
    if (locationFrame && !frames.some((frame) => frame.script === locationFrame.script && frame.line === locationFrame.line))
      frames.unshift(locationFrame);
    const first = frames[0];
    return { type: name, message: asset ? 'ASSET_LOAD_FAILED' : safeMessage(message),
      script: first?.script || source?.script || null, line: first?.line || integer(locationHint?.line),
      column: first?.column || integer(locationHint?.column), origin: first?.origin || source?.origin || 'UNKNOWN',
      feature: feature(), messageText: asset ? null : redactedMessage(message), frames: frames.slice(0, 3), reasonCode: null, request: null };
  }

  function reportFaultWithoutConsent(name, code, status, pagePath, detail) {
    if (!pagePath || faultCount >= 12 || !detail || detail.origin === 'EXTENSION'
      || (name === 'API_FAILURE' && status !== null && status < 500)) return;
    const diagnostic = { type: detail.type, message: detail.message,
      script: detail.script, line: detail.line, column: detail.column,
      origin: detail.origin, feature: detail.feature };
    const signature = [name, code, pagePath, diagnostic.script, diagnostic.line].join('|');
    if (reportedFaults.has(signature)) return;
    reportedFaults.add(signature);
    faultCount += 1;
    const id = crypto.randomUUID();
    // Each fault is its own journey. No cookie, storage, referral, campaign or customer identity is read.
    const body = JSON.stringify({ journeyId: id, events: [{ eventId: id, kind: 'ERROR', name,
      code, status, pagePath, release: release + '-fault', detail: diagnostic, channel: null }] });
    try {
      void nativeFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body, keepalive: true, credentials: 'omit' }).catch(() => {});
    } catch { /* Diagnostics never block shopping. */ }
  }

  function record(kind, name, code = null, status = null, pagePath = path(location.href), detail = null) {
    if (kind === 'ERROR' && !enabled) {
      reportFaultWithoutConsent(name, code, status, pagePath, detail);
      return;
    }
    if (!enabled || !pagePath || sent >= (kind === 'ERROR' ? 120 : 90) || !journeyId) return;
    const qa = (() => { try { return sessionStorage.getItem('cuk_qa_telemetry') === '1'; } catch { return false; } })();
    queue.push({ eventId: crypto.randomUUID(), kind, name, code, status, pagePath, release: qa ? release + '-qa' : release, detail,
      channel: name === 'VISIT_START' ? channel() : null });
    sent += 1;
    if (queue.length >= 12 || kind === 'ERROR' || myHomeSteps.has(name)) flush();
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

  // The made-to-measure cart does not use Shopify's native cart/add.js path.
  // Product mix is a fixed category list, never a product, fabric or customer value.
  window.CurtainsUKJourney = Object.freeze({
    trackMyHome(name, mix) {
      if (path(location.href) !== '/pages/build-my-rooms' || !myHomeSteps.has(name)
        || typeof mix !== 'string' || !productMix.test(mix) || !enabled) return false;
      record('ACTION', name, mix, null, '/pages/build-my-rooms');
      return true;
    }
  });

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
  // App-proxy tools run in their own window. A parent window's error handlers
  // cannot observe their failures, even when the iframe is on the same origin.
  const observedFrames = new WeakSet();
  const observedDocuments = new WeakSet();
  function observeEmbeddedFrame(frame) {
    if (!frame?.addEventListener || observedFrames.has(frame)) return;
    const configured = frame.getAttribute?.('src') || frame.dataset?.source || frame.src || '';
    let configuredRoute;
    try {
      const url = new URL(configured, location.origin);
      if (url.origin !== location.origin) return;
      configuredRoute = safeApiRoute(url.pathname);
    } catch { return; }
    if (!configuredRoute) return;
    observedFrames.add(frame);
    frame.addEventListener('error', () => record('ERROR', 'BROWSER_ERROR', 'EMBEDDED_FRAME_LOAD_FAILED',
      null, path(location.href), { type: 'ResourceError', message: 'ASSET_LOAD_FAILED',
        script: null, line: null, column: null, origin: 'APP', feature: apiFeature(configuredRoute),
        messageText: null, frames: [], reasonCode: 'EMBEDDED_FRAME_LOAD_FAILED',
        request: { method: 'GET', route: configuredRoute } }));
    const attach = () => {
      try {
        const child = frame.contentWindow;
        const childDocument = child?.document;
        const childRoute = safeApiRoute(child.location.pathname);
        if (!childDocument || !childRoute || child.location.origin !== location.origin
          || observedDocuments.has(childDocument)) return;
        observedDocuments.add(childDocument);
        const detail = (cause, hint = null, message = null, asset = false) => {
          const value = errorDetail(cause, hint, message, asset);
          value.feature = apiFeature(childRoute);
          value.request = { method: 'GET', route: childRoute };
          if (value.origin === 'UNKNOWN') value.origin = 'APP';
          return value;
        };
        child.addEventListener('error', (event) => {
          const asset = event.target && event.target !== child;
          const source = asset ? (event.target?.currentSrc || event.target?.src || event.target?.href) : event.filename;
          record('ERROR', asset ? 'ASSET_FAILURE' : 'BROWSER_ERROR',
            asset ? 'EMBEDDED_ASSET_FAILED' : 'EMBEDDED_EXCEPTION', null, path(location.href),
            detail(asset ? null : event.error, source ? { url: source, line: event.lineno, column: event.colno } : null,
              event.message, asset));
        }, true);
        child.addEventListener('unhandledrejection', (event) => record('ERROR', 'BROWSER_ERROR',
          'EMBEDDED_PROMISE_REJECTION', null, path(location.href), detail(event.reason)));
        const childFetch = child.fetch.bind(child);
        child.fetch = (...args) => {
          const result = childFetch(...args);
          const requestUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
          let route = null;
          try {
            const url = new URL(requestUrl, child.location.origin);
            if (url.origin === location.origin) route = safeApiRoute(url.pathname);
          } catch { /* A malformed URL remains the tool's own error. */ }
          if (route) {
            const method = String(args[1]?.method || args[0]?.method || 'GET').toUpperCase();
            void result.then((response) => {
              if (response.status >= 500 || [400, 404, 409].includes(response.status))
                record('ERROR', 'API_FAILURE', response.status >= 500 ? 'API_SERVER_ERROR' : 'API_REQUEST_REJECTED',
                  response.status, path(location.href), apiDetail(response.status >= 500 ? 'HTTP_SERVER_ERROR' :
                    'HTTP_REQUEST_REJECTED', route, method));
            }, (error) => {
              if (error?.name === 'AbortError' || args[1]?.signal?.aborted) return;
              record('ERROR', 'API_FAILURE', 'API_NETWORK_ERROR', null, path(location.href),
                apiDetail('NETWORK_REQUEST_FAILED', route, method, error));
            });
          }
          return result;
        };
      } catch { /* Cross-origin or sandboxed frames are outside this collector. */ }
    };
    frame.addEventListener('load', attach);
    try { if (frame.contentDocument?.readyState === 'complete') attach(); }
    catch { /* A redirected frame may no longer be same-origin. */ }
  }
  function scanEmbeddedFrames() {
    document.querySelectorAll?.('iframe').forEach(observeEmbeddedFrame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scanEmbeddedFrames, { once: true });
  else scanEmbeddedFrames();
  if (typeof MutationObserver !== 'undefined' && document.documentElement)
    new MutationObserver(scanEmbeddedFrames).observe(document.documentElement, { childList: true, subtree: true });
  const roomFrameReasons = new Set(['ROOM_FRAME_ABOUT_BLANK', 'ROOM_FRAME_NOT_READY',
    'ROOM_FRAME_INACCESSIBLE', 'ROOM_FRAME_LOAD_ERROR', 'ROOM_FRAME_CHILD_ERROR',
    'ROOM_FRAME_GRAPHICS_UNAVAILABLE', 'ROOM_FRAME_MODULE_UNAVAILABLE',
    'ROOM_FRAME_ASSET_UNAVAILABLE', 'ROOM_FRAME_NETWORK_UNAVAILABLE', 'ROOM_FRAME_RENDER_FAILED']);
  document.addEventListener('curtainsuk:room-frame-error', (event) => {
    if (path(location.href) !== '/pages/room-visualiser') return;
    const reason = event.detail?.reason;
    if (!roomFrameReasons.has(reason)) return;
    record('ERROR', 'BROWSER_ERROR', reason, null, '/pages/room-visualiser', {
      type: ['ROOM_FRAME_ABOUT_BLANK', 'ROOM_FRAME_NOT_READY', 'ROOM_FRAME_INACCESSIBLE'].includes(reason)
        ? 'TimeoutError' : 'ResourceError',
      message: 'MESSAGE_UNAVAILABLE', script: null, line: null, column: null,
      origin: 'APP', feature: 'ROOM_VISUALISER', messageText: null, frames: [],
      reasonCode: reason, request: { method: 'GET', route: '/apps/curtainsuk-decision/room-visualiser' },
    });
  });

  window.fetch = function (...args) {
    const result = nativeFetch(...args);
    const requestUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    const apiUrl = (() => { try { return new URL(requestUrl, location.origin); } catch { return null; } })();
    const nativePath = apiUrl?.pathname || '';
    const method = String(args[1]?.method || args[0]?.method || 'GET').toUpperCase();
    if (enabled) {
      if (nativePath === '/cart/add.js') {
        void result.then((response) => { if (response.ok) record('ACTION', 'CART_ADD'); }, () => {});
      }
      if (/^\/apps\/curtainsuk-decision\/(?:my-home-checkout|checkout-handoff)$/.test(nativePath)) {
        void result.then((response) => { if (response.ok) record('ACTION', 'CHECKOUT_START'); }, () => {});
      }
    }
    const observedApi = apiUrl && ((apiUrl.origin === location.origin &&
        (nativePath.startsWith('/apps/curtainsuk-decision/') || nativePath.startsWith('/api/')))
        || /^(?:curtainsuk-production-api|curtainsuk-staging-api|curtainsuk-staging-gateway)\.vercel\.app$/.test(apiUrl.hostname));
    if (observedApi && nativePath !== endpoint) {
        const started = performance.now();
        void result.then((response) => {
          if (enabled && performance.now() - started >= 5000) record('PERFORMANCE', 'API_SLOW', 'API_OVER_5S');
          const diagnostic = response.headers?.get?.('X-CurtainsUK-Diagnostic-Code');
          const reasonCode = safeApiRoute(nativePath) && /^[A-Z][A-Z0-9_]{1,63}$/.test(diagnostic || '') ? diagnostic : null;
          if (response.status >= 500) record('ERROR', 'API_FAILURE', 'API_SERVER_ERROR', response.status,
            path(location.href), apiDetail('HTTP_SERVER_ERROR', nativePath, method, null, reasonCode));
          else if ([400, 404, 409].includes(response.status)) record('ERROR', 'API_FAILURE', 'API_REQUEST_REJECTED',
            response.status, path(location.href), apiDetail('HTTP_REQUEST_REJECTED', nativePath, method, null, reasonCode, priceContext(response, nativePath)));
        }, (error) => {
          if (enabled && performance.now() - started >= 5000) record('PERFORMANCE', 'API_SLOW', 'API_OVER_5S');
          record('ERROR', 'API_FAILURE', 'API_NETWORK_ERROR', null, path(location.href),
            apiDetail('NETWORK_REQUEST_FAILED', nativePath, method, error));
        });
    }
    return result;
  };
})();
