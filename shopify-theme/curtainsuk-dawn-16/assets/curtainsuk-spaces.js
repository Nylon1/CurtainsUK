// Keep Shop by Window choices in the URL so forward, Back and refresh agree.
(() => {
  const chapters = [...document.querySelectorAll('[data-shop-window-space]')];
  const allowed = new Set(['blend', 'coordinate', 'lift', 'contrast']);
  const colour = (value) => /^#[a-f0-9]{6}$/i.test(value || '') ? value : '';
  const params = new URLSearchParams(location.search);
  const selected = chapters.find((chapter) => chapter.dataset.shopWindowSpace === params.get('space'));
  if (selected && allowed.has(params.get('direction'))) {
    const radio = [...selected.querySelectorAll('input[type="radio"]')].find((input) => input.value === params.get('direction'));
    if (radio) radio.checked = true;
  }
  function context(chapter) {
    const radio = chapter.querySelector('input[type="radio"]:checked');
    return {
      space: chapter.dataset.shopWindowSpace || '',
      direction: radio && allowed.has(radio.value) ? radio.value : '',
      colour: colour(radio?.dataset.shopWindowColour || chapter.dataset.shopWindowPrimary),
      primary: colour(chapter.dataset.shopWindowPrimary),
      secondary: colour(chapter.dataset.shopWindowSecondary),
      accent: colour(chapter.dataset.shopWindowAccent),
    };
  }
  function updateLink(chapter) {
    const link = chapter.querySelector('[data-shop-window-handoff]');
    if (!link) return;
    const base = link.dataset.baseHref || link.getAttribute('href');
    link.dataset.baseHref = base;
    const url = new URL(base, location.origin);
    for (const [key, value] of Object.entries(context(chapter))) if (value) url.searchParams.set(key, value);
    url.searchParams.set('source', 'shop-by-window');
    link.href = url.pathname + url.search;
  }
  function save(chapter) {
    updateLink(chapter);
    const url = new URL(location.href);
    const state = context(chapter);
    for (const [key, value] of Object.entries(state)) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    history.replaceState(history.state, '', url);
  }
  for (const chapter of chapters) {
    chapter.addEventListener('change', (event) => {
      if (event.target.matches('input[type="radio"]')) save(chapter);
    });
    chapter.querySelector('[data-shop-window-handoff]')?.addEventListener('click', () => save(chapter));
    updateLink(chapter);
  }
})();
