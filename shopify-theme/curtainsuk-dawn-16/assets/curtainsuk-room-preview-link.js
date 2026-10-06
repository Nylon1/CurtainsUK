(() => {
  if (window.CurtainsUKRoomPreviewLinkLoaded) return;
  window.CurtainsUKRoomPreviewLinkLoaded = true;
  const unavailable = 'Room preview not available for this fabric yet.';

  async function check(root) {
    if (root.dataset.cukPreviewChecked) return;
    root.dataset.cukPreviewChecked = 'true';
    const id = root.dataset.fabricId;
    const link = root.querySelector('[data-cuk-room-preview-link]');
    const status = root.querySelector('[data-cuk-room-preview-status]');
    if (!link || !status) return;
    if (!/^[a-z0-9-]{1,120}$/i.test(id || '')) {
      status.textContent = unavailable;
      return;
    }

    try {
      const response = await fetch(`/apps/curtainsuk-decision/catalog?view=retail&visualiser=1&fabric=${encodeURIComponent(id)}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Catalogue unavailable');
      const result = await response.json();
      const preview = result.fabric?.roomPreview;
      const expectedUrl = `/pages/room-visualiser?fabric=${encodeURIComponent(id)}`;
      if (result.fabric?.id === id && preview?.available === true && preview.url === expectedUrl) {
        link.hidden = false;
        link.style.display = '';
        status.hidden = true;
        status.style.display = 'none';
      } else {
        status.textContent = unavailable;
      }
    } catch {
      status.textContent = 'Room preview temporarily unavailable.';
    }
  }

  function checkAll(scope = document) {
    scope.querySelectorAll('[data-cuk-room-preview]').forEach(check);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => checkAll(), { once: true });
  } else {
    checkAll();
  }
  document.addEventListener('shopify:section:load', event => checkAll(event.target));
})();
