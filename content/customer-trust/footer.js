(() => {
  document.querySelectorAll('[data-cuk-trust-footer]').forEach(root => {
    if (root.dataset.ready) return;
    root.dataset.ready = 'true';
    const media = matchMedia('(min-width:750px)');
    const adapt = () => root.querySelectorAll('[data-trust-group]').forEach(group => { group.open = media.matches; });
    adapt();
    media.addEventListener('change', adapt);
    root.querySelector('[data-cookie-settings]')?.addEventListener('click', async () => {
      const status = root.querySelector('[data-cookie-status]');
      status.textContent = '';
      try {
        if (typeof window.privacyBanner?.showPreferences !== 'function') throw new Error('UNAVAILABLE');
        await window.privacyBanner.showPreferences();
      } catch {
        status.textContent = root.dataset.cookieUnavailable;
      }
    });
  });
})();
