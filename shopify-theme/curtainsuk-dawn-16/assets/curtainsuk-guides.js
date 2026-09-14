(() => {
  const preview = [...document.querySelectorAll('template[data-cuk-hidden-guide]')].find(t => t.dataset.cukHiddenGuide === location.pathname);
  if (preview && !document.querySelector('[data-cuk-guide]')) {
    document.querySelector('.template-404')?.remove();
    preview.parentNode.insertBefore(preview.content.cloneNode(true), preview);
    document.title = (document.querySelector('[data-cuk-guide] h1')?.textContent || 'CurtainsUK guide') + ' | CurtainsUK';
  }
  const root = document.querySelector('[data-cuk-guide]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const params = new URLSearchParams(location.search);
  const groups = {standard:['standard-window'],doors:['patio-sliding-doors','french-doors','bifold-doors'],bay:['bay-window'],apex:['apex-window','gable-end-window','triangular-window']};
  const allowed = groups[root.dataset.guide] || [];
  const original = params.get('window');
  let selected = allowed.includes(original) ? original : root.dataset.window;
  const chooser = root.querySelector('[data-cuk-guide-window]');
  if (chooser && [...chooser.options].some(o => o.value === selected)) chooser.value = selected;
  const update = () => {
    const link = root.querySelector('[data-cuk-guide-continue]');
    if (!link) return;
    const target = new URL(link.href);
    target.searchParams.set('window',selected);
    const fabric = params.get('fabric');
    if (fabric && /^[a-zA-Z0-9_-]{1,100}$/.test(fabric)) target.searchParams.set('fabric',fabric);
    link.href = target.href;
  };
  chooser?.addEventListener('change', () => {selected = chooser.value;update();});
  root.querySelectorAll('a[href^="/pages/how-to-"]').forEach(link => {
    const target = new URL(link.href);
    for (const name of ['window','fabric']) if (params.get(name)) target.searchParams.set(name,params.get(name));
    link.href = target.href;
  });
  update();
})();
