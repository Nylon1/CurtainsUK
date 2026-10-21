/* Add Making Studio to the existing Browse Fabrics journey without a second catalogue. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const filters = document.querySelector('[data-cuk-fabric-filters]');
  if (!filters) return;
  const guided = params.get('makingStudio') === '1';
  const requestedStep = Number(params.get('makingStep'));
  const step = Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= 10 ? requestedStep : 1;
  const preview = params.get('preview_theme_id');
  const profilePath = /^\/pages\/fabric\/[a-z0-9-]+$/i;
  const approvedImage = /^(?:https:\/\/curtainsuk-production-api\.vercel\.app\/room-visualiser\/(?:textures|fixed140)\/[a-f0-9]{64}\.(?:jpe?g|webp)|https:\/\/cdn\.shopify\.com\/s\/files\/1\/0256\/4551\/4861\/files\/cuk-fabric-[a-f0-9]{64}\.jpg)$/;
  function handover(path) {
    const url = new URL(path, location.origin);
    url.searchParams.set('makingStep', String(step));
    if (/^\d+$/.test(preview || '')) url.searchParams.set('preview_theme_id', preview);
    url.hash = 'cuk-making-studio';
    return url.href;
  }
  const style = document.createElement('style');
  style.textContent = `.cuk-making-chooser{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:24px 28px;margin:0 0 22px;border:1px solid #c8d1bd;border-radius:16px;background:#e9eddf;color:#244d3d;scroll-margin-top:170px}.cuk-making-chooser h2{font:clamp(25px,3vw,36px)/1.2 Georgia,serif;margin:0 0 8px}.cuk-making-chooser p{font-size:14px;line-height:1.6;margin:0}.cuk-making-chooser a{flex:none;color:inherit;text-underline-offset:4px;padding:12px 0}[data-cuk-shopping] .cuk-making-picker__select{grid-column:1/-1;display:flex;align-items:center;justify-content:center;width:100%;min-height:50px;padding:10px 14px;border:1px solid #c8ad79;border-radius:10px;background:#eee3ce;color:#244d3d;font:600 14px/1.35 Arial,sans-serif;cursor:pointer}[data-cuk-shopping] .cuk-fabric-journey__step>.cuk-making-picker__select:not(:disabled):hover{background:#e3d3b4;border-color:#a9854d}[data-cuk-shopping] .cuk-making-picker__select:focus-visible,.cuk-making-chooser a:focus-visible{outline:3px solid #b5914b;outline-offset:3px}[data-cuk-shopping] .cuk-making-picker__select:disabled{opacity:.6;cursor:wait}[data-cuk-shopping] .cuk-fabric-journey__step>.cuk-making-picker__status:not(:empty){display:block;grid-column:1/-1;font-size:12px;line-height:1.5;color:#244d3d;margin:0}@media(max-width:700px){.cuk-making-chooser{align-items:flex-start;flex-direction:column;gap:10px;padding:20px;scroll-margin-top:110px}}`;
  document.head.append(style);
  if (guided) {
    const banner = document.createElement('section');
    banner.id = 'cuk-making-fabric-chooser'; banner.className = 'cuk-making-chooser';
    banner.setAttribute('aria-label', 'Choose a Making Studio fabric');
    const intro = document.createElement('div');
    const title = document.createElement('h2'); title.textContent = 'Choose a fabric for your worktable.';
    const hint = document.createElement('p'); hint.textContent = `Explore the collection, then choose “Try Making Studio”. Your making journey will continue at step ${step} of 10.`;
    intro.append(title, hint); banner.append(intro);
    const returnPath = params.get('makingReturn');
    if (profilePath.test(returnPath || '')) {
      const back = document.createElement('a'); back.href = handover(returnPath); back.textContent = 'Back to Making Studio'; banner.append(back);
    }
    filters.before(banner);
    if (location.hash === '#cuk-making-fabric-chooser') requestAnimationFrame(() => banner.scrollIntoView());
  }
  let selection = null;
  const experience = window.CurtainsUKFabricExperience || {};
  window.CurtainsUKFabricExperience = { ...experience, enhanceCard(card, fabric, ...args) {
    experience.enhanceCard?.(card, fabric, ...args);
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,149}$/.test(fabric.id || '') || fabric.roomPreview?.available !== true) return;
    const journey = card.querySelector('.cuk-fabric-journey__step');
    if (!journey) return;
    const select = document.createElement('button');
    select.type = 'button'; select.className = 'cuk-making-picker__select';
    select.dataset.cukMakingSelect = '';
    select.textContent = 'Try Making Studio →';
    select.setAttribute('aria-label', `Try ${fabric.design} in ${fabric.colour} in Making Studio`);
    const status = document.createElement('p'); status.className = 'cuk-making-picker__status'; status.setAttribute('role', 'status');
    select.addEventListener('click', async () => {
      selection?.abort(); const attempt = new AbortController(); selection = attempt;
      const timeout = setTimeout(() => attempt.abort(), 15000);
      select.disabled = true; status.textContent = 'Preparing your fabric…';
      try {
        const response = await fetch(`/apps/curtainsuk-decision/catalog?view=retail&visualiser=1&fabric=${encodeURIComponent(fabric.id)}`, { credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: attempt.signal });
        if (!response.ok) throw Error('Catalogue unavailable');
        const chosen = (await response.json()).fabric;
        if (chosen?.id !== fabric.id || chosen.roomPreview?.available !== true || !approvedImage.test(chosen.roomPreview?.worktableImageUrl || '')) throw Error('Preview unavailable');
        const source = chosen.roomPreview.worktableSource;
        if (!source || !['calibrated', 'colour-only'].includes(source.scaleKind)) throw Error('Scale unavailable');
        const { fabricWidthCm: width, imageWidthCm: imageWidth, imageHeightCm: imageHeight, imageTopCm: imageTop, exampleCutCm: face } = source;
        if (![width, imageWidth, imageHeight, imageTop, face].every(Number.isFinite) || width < 70 || width > 500 || imageWidth < width || imageTop < 0 || ![100, 120].includes(face) || imageTop + face > imageHeight + .001) throw Error('Invalid physical coverage');
        const destination = new URL(chosen.fabricProfileUrl);
        if (destination.origin !== 'https://www.curtainsuk.com' || !profilePath.test(destination.pathname) || !destination.pathname.startsWith(`/pages/fabric/${chosen.id}-`)) throw Error('Invalid fabric destination');
        if (selection !== attempt || attempt.signal.aborted) return;
        location.assign(handover(destination.pathname));
      } catch {
        if (selection === attempt) status.textContent = 'This making preview could not be loaded. Try again or choose another fabric. You can still view this fabric or order a sample below.';
      } finally { clearTimeout(timeout); select.disabled = false; }
    });
    journey.append(select, status);
  } };
})();
