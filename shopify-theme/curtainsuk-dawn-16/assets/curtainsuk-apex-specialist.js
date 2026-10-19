(() => {
  const initialise = root => {
    if (root.dataset.apexReady) return;
    root.dataset.apexReady = 'true';
    const buttons = [...root.querySelectorAll('[data-apex-shape]')];
    const panels = [...root.querySelectorAll('[data-apex-panel]')];
    const select = id => {
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.apexShape === id)));
      panels.forEach(panel => { panel.hidden = panel.dataset.apexPanel !== id; });
    };
    if (buttons.length && panels.length === buttons.length) {
      buttons.forEach(button => button.addEventListener('click', () => select(button.dataset.apexShape)));
      select(buttons[0].dataset.apexShape);
      root.querySelector('[data-apex-shape-controls]').hidden = false;
    }
    const dialog = root.querySelector('[data-apex-dialog]');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    let opener;
    root.querySelectorAll('[data-apex-enlarge]').forEach(link => link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      const image = dialog.querySelector('[data-apex-dialog-image]');
      image.src = link.href;
      image.alt = link.querySelector('img').alt;
      dialog.querySelector('[data-apex-dialog-caption]').textContent = link.dataset.caption;
      dialog.showModal();
      dialog.querySelector('[data-apex-close]').focus();
    }));
    dialog.querySelector('[data-apex-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => opener?.focus({preventScroll:true}));
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
  };
  const scan = target => target.querySelectorAll('[data-apex-page]').forEach(initialise);
  scan(document);
  document.addEventListener('shopify:section:load', event => scan(event.target));
})();
