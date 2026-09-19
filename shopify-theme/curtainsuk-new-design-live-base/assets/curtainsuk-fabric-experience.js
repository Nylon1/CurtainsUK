/* Browse/detail presentation only. Commerce, evidence and price approval remain server-owned. */
(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const title = value => String(value).replace(/(^|\s)\S/g, c => c.toUpperCase());
  const palette = {'white/cream':'#eee9dc','beige/taupe':'#b7a78e',grey:'#92928c',black:'#333733',blue:'#587887',green:'#718367',pink:'#c99caa',red:'#9c4a4a',orange:'#bc8055','yellow/gold':'#c3ac65',purple:'#86728d',brown:'#795c49',neutral:'#d1c7b6',multicolour:'linear-gradient(120deg,#738c87,#c99caa,#c3ac65)'};
  const guideText = fabric => {
    const guide = fabric.browseGuide;
    return guide?.currency === 'GBP' && guide.policy === 'curtainsuk-browse-guide-v1' && Number.isSafeInteger(guide.amountMinor) && guide.amountMinor > 0
      ? `Curtains from ${new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:guide.amountMinor % 100 ? 2 : 0}).format(guide.amountMinor/100)}` : null;
  };
  const builder = (fabric, windowSlug) => `/pages/curtain-visualiser?fabric=${encodeURIComponent(fabric.id)}${windowSlug ? `&window=${encodeURIComponent(windowSlug)}` : ''}`;
  const actions = (fabric, windowSlug) => `<div class="cuk-experience-actions">
    <button type="button" class="cuk-button cuk-button--secondary" data-sample ${fabric.sampleAvailable === true ? '' : 'disabled'}>Order a sample</button>
    ${fabric.orderReady === true ? `<a class="cuk-button" href="${builder(fabric,windowSlug)}">Make curtains →</a>` : '<button type="button" class="cuk-button" disabled>Make curtains</button>'}
    </div><p class="cuk-hint cuk-action-status">${escape(fabric.availability)}</p><p role="status" data-cuk-sample-status></p>`;

  function orderSample(container, fabric, windowSlug, button, saveSample) {
    if (!fabric.sampleAvailable || button.disabled) return;
    const basket = document.querySelector('[data-cuk-sample-basket]');
    if (!basket) { container.querySelector('[data-cuk-sample-status]').textContent = 'Sample ordering could not be loaded. Please refresh and try again.'; return; }
    saveSample(fabric, windowSlug);
    // Reuse the existing sample-order client, including its live revalidation and signed identity properties.
    // Always same-origin, even if a legacy theme setting contains an absolute API URL.
    container.dataset.engineBase = '/apps/curtainsuk-decision';
    container.dataset.purchaseControlsEnabled = basket.dataset.purchaseControlsEnabled;
    let context = null;
    try { const saved = JSON.parse(localStorage.getItem('curtainsuk_hci_context_v1') || 'null'); if (saved?.fabricMasterId === fabric.id) context = saved; } catch { /* no consultation context */ }
    window.dispatchEvent(new CustomEvent('curtainsuk:sample-add',{detail:{root:container,button,sample:{fabricId:fabric.id,design:fabric.design,colour:fabric.colour,windowSlug,consultationContext:context}}}));
  }

  function renderDiscovery(root, catalog, form) {
    const host = root.querySelector('[data-cuk-discovery]');
    if (!host) return;
    const savedSamples = document.querySelector('#samples'); if (savedSamples) savedSamples.hidden = true;
    const focusedValue = host.contains(document.activeElement) ? document.activeElement.dataset.choice : null;
    const group = (key, label, choices, treatment) => {
      const field = form.elements[key];
      if (!field) return null;
      const set = document.createElement('fieldset'); set.className = `cuk-discovery-group cuk-discovery-group--${treatment}`;
      const legend = document.createElement('legend'); legend.textContent = label; set.append(legend);
      const row = document.createElement('div'); row.className = 'cuk-discovery-choices';
      for (const choice of [{value:'',label:'All'},...choices]) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'cuk-discovery-choice';
        button.dataset.choice = `${key}:${choice.value}`; button.setAttribute('aria-pressed',String(field.value === choice.value));
        if (treatment === 'swatches' && palette[choice.value]) {
          const swatch = document.createElement('i'); swatch.style.background = palette[choice.value]; swatch.setAttribute('aria-hidden','true'); button.append(swatch);
        }
        if (treatment === 'fabric-images' && /^https:\/\/cdn\.shopify\.com\//.test(choice.image || '')) {
          const img = document.createElement('img'); img.src = `${choice.image}?width=120`; img.alt = ''; img.width = 60; img.height = 60; img.loading = 'lazy'; button.append(img);
        }
        const text = document.createElement('span'); text.textContent = choice.label; button.append(text);
        button.addEventListener('click',()=>{field.value = choice.value; form.dispatchEvent(new Event('input',{bubbles:true}));}); row.append(button);
      }
      set.append(row); return set;
    };
    host.replaceChildren(group('guidePrice','Curtains from price',catalog.facets.guidePrices || [],'continuum'));
    for (const dimension of catalog.facets.discovery || []) {
      // A taxonomy alone is not coverage. Server activation AND governed options are required.
      if (dimension.active !== true || !dimension.options?.length) continue;
      let field = form.elements[dimension.key];
      if (!field) { field = document.createElement('input'); field.type = 'hidden'; field.name = dimension.key; form.append(field); }
      const set = group(dimension.key,dimension.label,dimension.options,dimension.treatment); if (set) host.append(set);
    }
    if (focusedValue) [...host.querySelectorAll('[data-choice]')].find(el=>el.dataset.choice === focusedValue)?.focus({preventScroll:true});
  }

  function enhanceCard(card, fabric, windowSlug, saveSample) {
    const descriptor = card.querySelector('.cuk-browse-descriptor');
    descriptor.textContent = (fabric.intelligence?.dimensions || []).filter(d=>['pattern','texture'].includes(d.key)).flatMap(d=>d.values).slice(0,2).map(title).join(' · ');
    const host = card.querySelector('.cuk-fabric__actions');
    const view = host.querySelector('a'); view.className = 'cuk-text-link cuk-view-fabric';
    host.replaceChildren(view); host.insertAdjacentHTML('beforeend',actions(fabric,windowSlug));
    card.querySelector('.cuk-fabric__body > .cuk-hint')?.remove();
    card.querySelector('[data-sample]')?.addEventListener('click',event=>orderSample(card,fabric,windowSlug,event.currentTarget,saveSample));
  }

  function renderDetail(root, fabric, windowSlug, saveSample) {
    root.setAttribute('data-cuk-fabric-experience','');
    root.querySelector('.cuk-section__head').hidden = true;
    const detail = root.querySelector('[data-cuk-fabric-detail]');
    const guide = guideText(fabric), main = fabric.images?.[0], intelligence = fabric.intelligence;
    const image = (asset, eager = false) => `<img src="${escape(asset.url)}?width=1400" srcset="${escape(asset.url)}?width=600 600w, ${escape(asset.url)}?width=1000 1000w, ${escape(asset.url)}?width=1600 1600w" sizes="(max-width:749px) 100vw, 60vw" width="${asset.width}" height="${asset.height}" alt="${escape(fabric.metadata.alt)}${eager ? '' : ` — ${escape(title(asset.imageType.toLowerCase()))} view`}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}>`;
    detail.innerHTML = `<a class="cuk-text-link cuk-detail-back" href="/pages/fabric-library?view=browse-fabrics${windowSlug ? `&window=${encodeURIComponent(windowSlug)}` : ''}">← Browse all fabrics</a>
      <div class="cuk-material-hero"><div class="cuk-material-photo">${main ? image(main,true) : ''}<span class="cuk-material-caption">${escape(fabric.brand)} · ${escape(fabric.design)} · ${escape(fabric.colour)}</span></div>
      <div class="cuk-material-intro"><p class="cuk-eyebrow">${escape(fabric.brand)} / ${escape(fabric.collection)}</p><h1>${escape(fabric.design)}</h1><p class="cuk-material-colour">${escape(fabric.colour)}</p>
      <p class="cuk-material-opening">Consider the colour. Look closer at the surface. Imagine the fabric in your light.</p>
      <p class="cuk-browse-price">${escape(guide || 'Price guide unavailable')}</p>${guide ? '<p class="cuk-browse-price-note">Price guide. Final price depends on measurements and options.</p>' : ''}
      ${actions(fabric,windowSlug)}<p class="cuk-material-note">A sample helps you judge colour and feel at home. Final price and availability are checked for your measurements and options.</p>
      <a class="cuk-text-link cuk-material-room" href="/apps/curtainsuk-decision/consultation?experience=premium&amp;entry=match">See how this works in my room →</a></div></div>
      ${intelligence?.dimensions.length ? `<section class="cuk-material-intelligence"><header><p class="cuk-eyebrow">CURTAINSUK FABRIC INTELLIGENCE</p><h2>A fabric in context.</h2><p>Our reviewed interpretation of its appearance. The supplier’s specifications remain the factual reference.</p></header>
      <div class="cuk-material-dimensions">${intelligence.dimensions.map(d=>`<div class="cuk-material-dimension"><h3>${escape(d.label)}</h3><div>${d.values.map(v=>`<span class="cuk-material-attribute">${d.key === 'colour' && palette[v] ? `<i style="background:${palette[v]}" aria-hidden="true"></i>` : ''}${escape(title(v))}</span>`).join('')}</div></div>`).join('')}</div>
      ${intelligence.dimensions.some(d=>d.key==='colour') ? '<p class="cuk-material-note">Colour-family swatches are guides, not exact fabric colour matches. Check the supplier photograph and a physical sample in your room.</p>' : ''}
      <div class="cuk-material-advice">${intelligence.advice.map(a=>`<article><h3>${escape(a.label)}</h3><p>${escape(a.text)}</p></article>`).join('')}</div></section>` : ''}
      ${(fabric.images || []).length > 1 ? `<section class="cuk-material-gallery" aria-label="More supplier photography">${fabric.images.slice(1,5).map(asset=>`<figure>${image(asset)}<figcaption>${escape(title(asset.imageType.toLowerCase()))} · supplier photography</figcaption></figure>`).join('')}</section>` : ''}
      <section class="cuk-material-facts"><div><p class="cuk-eyebrow">SUPPLIER FACTS</p><h2>The fabric, precisely.</h2><p>Specifications held against this exact supplier colourway. Full width and usable width are shown separately where supplied.</p></div><dl>${(fabric.supplierFacts?.facts || []).map(f=>`<div><dt>${escape(f.label)}</dt><dd>${escape(f.value)}</dd></div>`).join('')}</dl></section>
      <aside class="cuk-material-close"><div><p class="cuk-eyebrow">FROM SCREEN TO SPACE</p><h2>See it in your own light.</h2><p>Check the colour and surface alongside the furnishings you already love.</p></div><div>${actions(fabric,windowSlug)}</div></aside>`;
    detail.querySelectorAll('[data-sample]').forEach(button=>button.addEventListener('click',()=>orderSample(button.closest('.cuk-material-intro, .cuk-material-close'),fabric,windowSlug,button,saveSample)));
    // Existing saved-sample infrastructure is retained, but the detail has its own direct actions.
    const samples = document.querySelector('#samples'); if (samples) samples.hidden = true;
    document.title = fabric.metadata.title;
    const description = document.querySelector('meta[name="description"]'); if (description) description.content = fabric.metadata.metaDescription;
    const canonical = document.querySelector('link[rel="canonical"]'); if (canonical) canonical.href = `${location.origin}/pages/fabric-library?view=browse-fabrics&fabric=${encodeURIComponent(fabric.id)}`;
  }
  window.CurtainsUKFabricExperience = {renderDiscovery,enhanceCard,renderDetail};
})();
