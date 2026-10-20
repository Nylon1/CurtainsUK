/* Browse presentation only. Values and matches remain governed by the catalogue API. */
(() => {
  'use strict';
  const palette = {white:'#f6f3e9',cream:'#eae1cb',beige:'#c7b79c',taupe:'#a79888',grey:'#92928c',black:'#333733',blue:'#587887',green:'#718367',pink:'#c99caa',red:'#9c4a4a',orange:'#bc8055',gold:'#b49a55',yellow:'#d4bd65',purple:'#86728d',brown:'#795c49',neutral:'#d1c7b6',multicolour:'linear-gradient(120deg,#738c87,#c99caa,#c3ac65)','white/cream':'linear-gradient(120deg,#f6f3e9 50%,#eae1cb 50%)','beige/taupe':'linear-gradient(120deg,#c7b79c 50%,#a79888 50%)','yellow/gold':'linear-gradient(120deg,#d4bd65 50%,#b49a55 50%)'};
  const labels = {activity:'Pattern activity',guidePrice:'Fabric price guide'};
  const readable = value => String(value).replaceAll('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  // The controller restores the URL once. After that, the form owns the latest
  // intent, including an intentionally empty value while a response is pending.
  const values = field => String(field?.value || '').split(',').map(value => value.trim()).filter(Boolean);
  const writeValues = (field, next, form) => { field.value = next.join(','); form.dispatchEvent(new Event('input', {bubbles:true})); };
  const hidden = (form, key) => form.elements[key] || (() => { const input = document.createElement('input'); input.type = 'hidden'; input.name = key; form.append(input); return input; })();

  function optionButton({key, choice, field, form, swatch, multiple}) {
    const selected = values(field, key).includes(choice.value);
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'cuk-intelligence-filter-choice';
    button.dataset.filterKey = key; button.dataset.filterValue = choice.value;
    button.dataset.choice = `${key}:${choice.value}`; button.setAttribute('aria-pressed', String(selected));
    if (swatch && palette[choice.value]) { const paint = document.createElement('i'); paint.style.background = palette[choice.value]; paint.setAttribute('aria-hidden', 'true'); button.append(paint); }
    const copy = document.createElement('span'); copy.textContent = key === 'guidePrice' ? (choice.label || choice.value) : readable(choice.label || choice.value); button.append(copy);
    button.addEventListener('click', () => {
      const current = values(field, key);
      const next = multiple ? (current.includes(choice.value) ? current.filter(value => value !== choice.value) : [...current, choice.value]) : (current[0] === choice.value ? [] : [choice.value]);
      writeValues(field, next, form);
    });
    return button;
  }

  function group({key, label, options, field, form, swatch = false, more = false}) {
    const choices = Array.isArray(options) ? options.filter(choice => choice && choice.value) : [];
    if (!choices.length) return null;
    const container = document.createElement(more ? 'details' : 'fieldset');
    container.className = more ? 'cuk-intelligence-more-group' : 'cuk-intelligence-primary-group';
    container.dataset.facetKey = key;
    const heading = document.createElement(more ? 'summary' : 'legend'); heading.textContent = label; container.append(heading);
    const row = document.createElement('div'); row.className = `cuk-intelligence-filter-choices${swatch ? ' cuk-intelligence-filter-choices--swatches' : ''}`;
    for (const choice of choices) row.append(optionButton({key, choice, field, form, swatch, multiple:key !== 'guidePrice'}));
    container.append(row); return container;
  }

  function renderDiscovery(root, catalog, form) {
    const host = root.querySelector('[data-cuk-discovery]'); if (!host) return;
    const discovery = (catalog.facets?.discovery || []).filter(dimension => dimension.active && dimension.options?.length);
    const byKey = Object.fromEntries(discovery.map(dimension => [dimension.key, dimension]));
    const focused = host.contains(document.activeElement) ? document.activeElement : null;
    const focusedChoice = focused?.dataset?.choice;
    const focusedGroup = focused?.tagName === 'SUMMARY' ? focused.closest('[data-facet-key]')?.dataset.facetKey : null;
    const focusedMore = focused?.tagName === 'SUMMARY' && focused.parentElement?.classList.contains('cuk-intelligence-more');
    const moreOpen = host.querySelector('.cuk-intelligence-more')?.open;
    const openGroups = new Set([...host.querySelectorAll('.cuk-intelligence-more-group[open]')].map(item => item.dataset.facetKey));
    host.replaceChildren();
    const colour = byKey.colour;
    if (colour) host.append(group({key:'colour', label:'Colour', options:colour.options, field:hidden(form,'colour'), form, swatch:true}));
    const price = group({key:'guidePrice', label:'Fabric price guide per metre', options:catalog.facets?.guidePrices || [], field:hidden(form,'guidePrice'), form});
    if (price) { host.append(price); const note = document.createElement('p'); note.className = 'cuk-browse-price-note'; note.textContent = 'Filters use the fabric guide, not the finished curtain total. Cards also show an example pair where pricing is available.'; host.append(note); }
    const moreKeys = ['pattern','activity','texture','finish','character','presence'];
    const more = document.createElement('details'); more.className = 'cuk-intelligence-more';
    const summary = document.createElement('summary'); summary.textContent = 'More filters'; more.append(summary);
    const groups = document.createElement('div'); groups.className = 'cuk-intelligence-more-groups';
    for (const key of moreKeys) { const dimension = byKey[key]; if (dimension) { const item = group({key, label:dimension.label || labels[key] || readable(key), options:dimension.options, field:hidden(form,key), form, more:true}); if (item) groups.append(item); } }
    if (groups.childElementCount) {
      more.append(groups); more.open = moreOpen ?? false;
      for (const item of groups.children) item.open = openGroups.has(item.dataset.facetKey);
      host.append(more);
    }
    const replacement = focusedChoice
      ? [...host.querySelectorAll('[data-choice]')].find(item => item.dataset.choice === focusedChoice)
      : focusedGroup ? [...host.querySelectorAll('[data-facet-key]')].find(item => item.dataset.facetKey === focusedGroup)?.querySelector('summary')
      : focusedMore ? host.querySelector('.cuk-intelligence-more > summary') : null;
    replacement?.focus({ preventScroll: true });
  }

  function renderActiveFilters(root, catalog, form) {
    const host = root.querySelector('[data-cuk-active-filters]'); const clear = root.querySelector('[data-cuk-clear-all]'); if (!host || !clear) return;
    if (!clear.dataset.cukResetBound) {
      clear.dataset.cukResetBound = 'true';
      clear.addEventListener('click', event => {
        event.preventDefault();
        // The catalogue controller owns reset semantics, including clearing
        // dynamic hidden visual-choice fields and restoring page one. Calling
        // the form reset event rather than only removing chips prevents the
        // old governed result set remaining active.
        form.reset();
      });
    }
    const dimensions = Object.fromEntries((catalog.facets?.discovery || []).map(dimension => [dimension.key, dimension]));
    const chips = [];
    const query = String(form.elements.query?.value || '').trim();
    if (query) {
      const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'cuk-filter-chip';
      chip.dataset.filterKey = 'query'; chip.dataset.filterValue = query; chip.textContent = `Search: ${query} ×`;
      chip.setAttribute('aria-label', `Remove search: ${query}`);
      chip.addEventListener('click', () => writeValues(form.elements.query, [], form));
      chips.push(chip);
    }
    for (const key of ['colour','guidePrice','pattern','activity','texture','finish','character','presence']) {
      const field = form.elements[key]; if (!field) continue;
      for (const value of values(field)) {
        const label = key === 'guidePrice' ? (catalog.facets?.guidePrices || []).find(band => band.value === value)?.label : (dimensions[key]?.options || []).find(option => option.value === value)?.label;
        if (!label) continue;
        const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'cuk-filter-chip'; chip.dataset.filterKey = key; chip.dataset.filterValue = value; chip.textContent = `${key === 'guidePrice' ? 'Fabric guide: ' : ''}${key === 'guidePrice' ? label : readable(label)} ×`;
        chip.setAttribute('aria-label', `Remove ${key === 'guidePrice' ? label : readable(label)}`);
        chip.addEventListener('click', () => writeValues(field, values(field).filter(item => item !== value), form)); chips.push(chip);
      }
    }
    const focused = host.contains(document.activeElement) ? document.activeElement : null;
    const focusedKey = focused?.dataset?.filterKey, focusedValue = focused?.dataset?.filterValue;
    const focusedIndex = [...host.children].indexOf(focused);
    host.replaceChildren(...chips); clear.hidden = chips.length === 0;
    if (clear.hidden && document.activeElement === clear) form.elements.query?.focus({ preventScroll: true });
    if (focusedKey && focusedValue) {
      const replacement = chips.find(chip => chip.dataset.filterKey === focusedKey && chip.dataset.filterValue === focusedValue)
        || chips[Math.min(focusedIndex, chips.length - 1)] || form.elements.query;
      replacement?.focus({ preventScroll: true });
    }
  }

  function syncSelection(root, catalog, form) {
    for (const button of root.querySelectorAll('[data-cuk-discovery] [data-choice]')) {
      button.setAttribute('aria-pressed', String(values(form.elements[button.dataset.filterKey]).includes(button.dataset.filterValue)));
    }
    renderActiveFilters(root, catalog, form);
  }

  function arrangeCardJourney(card) {
    const host = card.querySelector('.cuk-fabric__actions');
    if (!host) return;
    const details = host.querySelector('[data-cuk-view-fabric]');
    const room = host.querySelector('a[href*="/pages/room-visualiser?fabric="]');
    const sample = host.querySelector('[data-sample],a[href*="intent=sample"]');
    const make = host.querySelector('a[href*="curtain-visualiser"]')
      || [...host.querySelectorAll('button[disabled]')].find(button => /curtain/i.test(button.textContent));
    const journey = document.createElement('div'); journey.className = 'cuk-fabric-journey';
    for (const [number, title, nodes] of [
      ['01', 'Discover it', [details, room]],
      ['02', 'Feel it at home', [sample]],
      ['03', 'Make it yours', [make]],
    ]) {
      const available = nodes.filter(Boolean); if (!available.length) continue;
      const step = document.createElement('div'); step.className = 'cuk-fabric-journey__step';
      const label = document.createElement('p');
      const index = document.createElement('span'); index.textContent = number;
      label.append(index, document.createTextNode(title)); step.append(label, ...available);
      journey.append(step);
    }
    // Move the original nodes: sample handlers, session links and stock gates survive.
    host.prepend(journey);
    const old = host.querySelector('.cuk-experience-actions');
    if (old && !old.children.length) old.remove();
  }

  function addQuickView(card, fabric) {
    const swatch = card.querySelector('.cuk-fabric__swatch');
    if (!swatch || !fabric.imageReferences?.[0]) return;
    const trigger = document.createElement('button');
    trigger.type = 'button'; trigger.className = 'cuk-fabric-peek-trigger'; trigger.textContent = 'Look closer ↗';
    trigger.setAttribute('aria-label', `Look closer at ${fabric.design} in ${fabric.colour}`);
    trigger.setAttribute('aria-haspopup', 'dialog');
    swatch.append(trigger);
    trigger.addEventListener('click', () => {
      const dialog = document.createElement('dialog'); dialog.className = 'cuk-fabric-peek';
      dialog.setAttribute('aria-label', `${fabric.design} in ${fabric.colour}, fabric preview`);
      const make = (tag, text, className = '') => {
        const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
      };
      const close = make('button', 'Close preview ×', 'cuk-fabric-peek__close'); close.type = 'button';
      const photo = make('div', '', 'cuk-fabric-peek__photo');
      const image = document.createElement('img');
      const url = new URL(fabric.imageReferences[0]); url.searchParams.set('width', '1400');
      image.src = url.href; image.alt = `${fabric.design} in ${fabric.colour} by ${fabric.brand || fabric.supplier}`;
      image.decoding = 'async';
      photo.append(image);
      const zoom = make('div', '', 'cuk-fabric-peek__zoom');
      const label = make('label', 'Zoom into the fabric'); const range = document.createElement('input');
      range.type = 'range'; range.min = '100'; range.max = '250'; range.step = '25'; range.value = '100';
      range.setAttribute('aria-label', 'Fabric photograph zoom'); range.setAttribute('aria-valuetext', '100 percent');
      const output = make('output', '100%');
      range.addEventListener('input', () => {
        image.style.width = `${range.value}%`; output.textContent = `${range.value}%`;
        range.setAttribute('aria-valuetext', `${range.value} percent`);
      });
      label.append(range); zoom.append(label, output);
      const visuals = make('div', '', 'cuk-fabric-peek__visuals'); visuals.append(photo, zoom);
      const copy = make('div', '', 'cuk-fabric-peek__copy');
      copy.append(make('p', fabric.brand || fabric.supplier, 'cuk-eyebrow'), make('h2', fabric.design),
        make('p', fabric.colour, 'cuk-fabric-peek__colour'));
      const price = card.querySelector('.cuk-browse-price')?.textContent;
      if (price) copy.append(make('p', price, 'cuk-fabric-peek__price'));
      const estimate = card.querySelector('.cuk-curtain-estimate');
      if (estimate) copy.append(estimate.cloneNode(true));
      const tags = (fabric.intelligence?.dimensions || []).filter(d => ['pattern', 'texture'].includes(d.key)).flatMap(d => d.values).slice(0, 4);
      if (tags.length) copy.append(make('p', tags.map(readable).join(' · '), 'cuk-fabric-peek__tags'));
      copy.append(make('p', 'Imagine it in your room. A sample lets you see the colour and feel the texture in your own light.'));
      copy.append(make('p', fabric.availability || 'Check availability', 'cuk-fabric-peek__availability'));
      const actions = make('div', '', 'cuk-fabric-peek__actions cuk-fabric__actions');
      // Reuse existing commerce actions and eligibility. No new checkout path.
      const sample = card.querySelector('[data-sample],a[href*="intent=sample"]');
      if (sample) {
        const order = make('button', 'Order a sample', 'cuk-button cuk-button--secondary'); order.type = 'button'; order.disabled = sample.disabled; order.setAttribute('data-sample', '');
        order.addEventListener('click', () => { dialog.close(); sample.click(); sample.focus(); });
        actions.append(order);
      }
      for (const [selector, text] of [
        ['a[href*="curtain-visualiser"]', 'Make curtains →'],
        ['[data-cuk-view-fabric]', 'View full fabric details ↗'],
        ['a[href^="/pages/room-visualiser?fabric="]', 'See in my room ↗'],
        ['[data-jane-fabric-link]', 'Ask Jane, fabric specialist ↗'],
      ]) {
        const original = card.querySelector(selector);
        if (original) {
          const link = make('a', text, selector.includes('curtain-visualiser') ? 'cuk-button' : 'cuk-button cuk-button--secondary');
          link.href = original.href;
          if (selector === '[data-cuk-view-fabric]') link.setAttribute('data-cuk-view-fabric', '');
          actions.append(link);
        }
      }
      copy.append(actions, make('p', 'Screen colours can vary. Zoom is illustrative, not a physical scale. Final price depends on measurements and options.', 'cuk-fabric-peek__note'));
      const layout = make('div', '', 'cuk-fabric-peek__layout'); layout.append(visuals, copy); dialog.append(close, layout);
      arrangeCardJourney(dialog);
      image.addEventListener('error', () => { photo.replaceChildren(make('p', 'This photograph could not load. You can still view the full fabric details.')); range.disabled = true; });
      close.addEventListener('click', () => dialog.close());
      dialog.addEventListener('close', () => {
        document.documentElement.classList.remove('cuk-fabric-peek-open'); dialog.remove();
        if (trigger.isConnected) trigger.focus({preventScroll:true});
      }, {once:true});
      document.body.append(dialog); document.documentElement.classList.add('cuk-fabric-peek-open'); dialog.showModal();
    });
  }

  const existing = window.CurtainsUKFabricExperience || {};
  window.CurtainsUKFabricExperience = {...existing, renderDiscovery, renderActiveFilters, syncSelection,
    enhanceCard(card, fabric, ...args) {
      const roomLink = card.querySelector('a[href^="/pages/room-visualiser?fabric="]');
      existing.enhanceCard?.(card, fabric, ...args);
      if (roomLink && !card.contains(roomLink)) card.querySelector('.cuk-fabric__actions')?.append(roomLink);
      const price = card.querySelector('.cuk-browse-price');
      if (price && fabric.browseGuide?.amountMinor) price.textContent = `Fabric guide ${new Intl.NumberFormat('en-GB', {style:'currency',currency:'GBP'}).format(fabric.browseGuide.amountMinor / 100)} /m`;
      if ('curtainEstimate' in fabric) {
        const panel = document.createElement('div'); panel.className = 'cuk-curtain-estimate';
        const label = document.createElement('span'); label.textContent = 'Your curtain pair, estimated';
        const total = document.createElement('strong');
        const estimate = fabric.curtainEstimate;
        total.textContent = estimate?.amountMinor ? new Intl.NumberFormat('en-GB', {style:'currency',currency:'GBP'}).format(estimate.amountMinor / 100) : 'Price on configuration';
        const basis = document.createElement('small');
        basis.textContent = '200 cm track width × 200 cm finished drop · Pencil pleat · Standard lining';
        const note = document.createElement('small');
        note.textContent = 'Includes VAT. Guide only; delivery extra.';
        panel.append(label, total, basis, note);
        if (price) price.after(panel);
        else card.querySelector('.cuk-fabric__body')?.append(panel);
        card.querySelector('.cuk-browse-price-note')?.remove();
      }
      const roomAction = card.querySelector('a[href^="/pages/room-visualiser?fabric="]');
      if (roomAction) { roomAction.classList.add('cuk-button--secondary'); roomAction.textContent = 'See in my room ↗'; }
      const janeAction = card.querySelector('[data-jane-fabric-link]');
      if (janeAction) { janeAction.textContent = 'Ask Jane, fabric specialist ↗'; janeAction.setAttribute('aria-label', `Ask Jane, AI fabric specialist, about ${fabric.design} in ${fabric.colour}`); }
      arrangeCardJourney(card);
      addQuickView(card, fabric);
    }};
})();
