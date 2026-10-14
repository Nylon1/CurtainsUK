// A canonical profile may outlive a stock change. Recheck the same governed
// retail projection used by Browse Fabrics before enabling any curtain link.
(() => {
  'use strict';
  const validFabric = /^[A-Za-z0-9][A-Za-z0-9-]{0,149}$/;
  async function check(root) {
    const id = root.dataset.fabricMasterId;
    const links = [...root.querySelectorAll('[data-cuk-make-curtains]')];
    const status = root.querySelector('[data-cuk-curtain-status]');
    if (!validFabric.test(id || '') || !links.length) return;
    if (root.dataset.purchaseControlsEnabled !== 'true') {
      if (status) status.textContent = 'Made-to-measure ordering is currently unavailable.';
      return;
    }
    try {
      const response = await fetch('/apps/curtainsuk-decision/catalog?view=retail&browseGuide=1&fabric=' + encodeURIComponent(id), {
        credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw Error('Retail lookup unavailable');
      const result = await response.json();
      if (result.fabric?.id !== id || result.fabric.orderReady !== true) {
        if (status) status.textContent = 'Made-to-measure curtains are not currently available for this fabric. You can still explore its details or ask Jane for alternatives.';
        return;
      }
      if (links.some(link => link.dataset.href !== '/pages/curtain-visualiser?fabric=' + id)) {
        throw Error('Curtain link identity mismatch');
      }
      for (const link of links) {
        const href = link.dataset.href;
        link.href = href;
        link.removeAttribute('aria-disabled');
        link.removeAttribute('tabindex');
      }
      if (status) status.textContent = '';
    } catch {
      if (status) status.textContent = 'Current curtain availability could not be confirmed. Please refresh to try again.';
    }
  }
  function scan(scope = document) {
    scope.querySelectorAll('[data-cuk-canonical-fabric-detail]').forEach(root => {
      if (root.dataset.cukCurtainChecked) return;
      root.dataset.cukCurtainChecked = 'true';
      check(root);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan(), { once: true });
  else scan();
  document.addEventListener('shopify:section:load', event => scan(event.target));
})();
