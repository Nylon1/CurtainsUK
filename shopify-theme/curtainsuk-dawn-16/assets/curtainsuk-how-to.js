/* Illustrated guidance only. No APIs, consultation sessions, analytics or storage. */
(() => {
  function initialise(root) {
    if (root.dataset.howReady) return;
    root.dataset.howReady = 'true';
    const panels = Array.from(root.querySelectorAll('[data-guide]'));
    const links = Array.from(root.querySelectorAll('[data-guide-link]'));
    function show(id, moveFocus = false) {
      const selected = panels.find(panel => panel.id === id);
      if (!selected) return;
      panels.forEach(panel => { panel.hidden = panel !== selected; });
      links.forEach(link => {
        if (link.dataset.guideLink === id) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
      if (moveFocus) {
        const title = selected.querySelector('h2');
        title.tabIndex = -1;
        title.focus({ preventScroll: true });
        selected.scrollIntoView({ block: 'start', behavior: 'auto' });
      }
    }
    function step(panel, index) {
      panel.dataset.stage = String(index);
      panel.querySelectorAll('[data-step]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.step) === index)));
      const selected = panel.querySelector(`[data-step="${index}"]`);
      panel.querySelector('[data-stage-number]').textContent = String(index + 1).padStart(2, '0');
      panel.querySelector('[data-stage-title]').textContent = selected.querySelector('strong').textContent;
      panel.querySelector('[data-next]').textContent = index === 2 ? 'Start again ↺' : 'Next step →';
    }
    root.addEventListener('click', event => {
      const anchor = event.target.closest('a[href^="#"]');
      if (anchor && panels.some(panel => `#${panel.id}` === anchor.getAttribute('href'))) {
        event.preventDefault();
        const id = anchor.getAttribute('href').slice(1);
        history.replaceState(null, '', `#${id}`);
        show(id, true);
      }
      const button = event.target.closest('[data-step], [data-next]');
      if (button) {
        const panel = button.closest('[data-guide]');
        const index = button.hasAttribute('data-step') ? Number(button.dataset.step) : (Number(panel.dataset.stage) + 1) % 3;
        step(panel, index);
      }
    });
    window.addEventListener('hashchange', () => show(location.hash.slice(1)));
    show(panels.some(panel => panel.id === location.hash.slice(1)) ? location.hash.slice(1) : panels[0].id);
  }
  document.querySelectorAll('[data-how-to]').forEach(initialise);
  document.addEventListener('shopify:section:load', event => event.target.querySelectorAll('[data-how-to]').forEach(initialise));
})();
