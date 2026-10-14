// Loaded only when the fabric browser's Jane handoff setting is enabled.
(() => {
  'use strict';
  const validFabric = /^[A-Za-z0-9][A-Za-z0-9-]{0,149}$/;
  window.CurtainsUKJaneFabricHandoff = {
    mount(detail, id, eligibility) {
      if (!validFabric.test(id) || eligibility?.browseReady !== true || eligibility?.launchReady !== true) return;
      const host = detail.querySelector('.cuk-material-intro, .cuk-fabric-detail');
      if (!host) return;
      host.querySelector('[data-jane-fabric-link]')?.remove();
      const link = document.createElement('a');
      link.className = 'cuk-text-link';
      link.dataset.janeFabricLink = id;
      link.href = '/pages/meet-our-team?entry=fabric-detail&jane_fabric=' + encodeURIComponent(id);
      link.textContent = 'Ask Jane about this fabric';
      link.setAttribute('aria-label', 'Ask Jane, AI interior design adviser, about this fabric');
      const note = document.createElement('p');
      note.className = 'fine';
      note.textContent = eligibility.orderReady === true
        ? 'Jane can discuss this exact fabric after you choose to share it.'
        : 'This fabric is not currently available for curtains. Jane can help you explore alternatives after you choose to share it.';
      host.append(link, note);
    }
  };
})();
