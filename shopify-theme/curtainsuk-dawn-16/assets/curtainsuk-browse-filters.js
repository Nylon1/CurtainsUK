/* Browse presentation only. Values and matches remain governed by the catalogue API. */
(() => {
  'use strict';
  const palette = {white:'#f6f3e9',cream:'#eae1cb',beige:'#c7b79c',taupe:'#a79888',grey:'#92928c',black:'#333733',blue:'#587887',green:'#718367',pink:'#c99caa',red:'#9c4a4a',orange:'#bc8055',gold:'#b49a55',yellow:'#d4bd65',purple:'#86728d',brown:'#795c49',neutral:'#d1c7b6',multicolour:'linear-gradient(120deg,#738c87,#c99caa,#c3ac65)'};
  const labels = {activity:'Pattern activity',guidePrice:'Curtains from price'};
  const readable = value => String(value).replaceAll('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  // The catalogue controller replaces form fields after a result refresh. The URL is
  // its durable public selection state, so use it when that replacement is mid-flight.
  const values = (field, key) => {
    const fieldValue = String(field?.value || '').trim();
    const urlValue = key ? new URLSearchParams(window.location.search).get(key) : '';
    return String(fieldValue || urlValue || '').split(',').map(value => value.trim()).filter(Boolean);
  };
  const urlValues = key => String(new URLSearchParams(window.location.search).get(key) || '').split(',').map(value => value.trim()).filter(Boolean);
  const writeValues = (field, next, form) => { field.value = next.join(','); form.dispatchEvent(new Event('input', {bubbles:true})); };
  const hidden = (form, key) => form.elements[key] || (() => { const input = document.createElement('input'); input.type = 'hidden'; input.name = key; form.append(input); return input; })();

  function optionButton({key, choice, field, form, swatch, multiple}) {
    const selected = values(field, key).includes(choice.value);
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'cuk-intelligence-filter-choice';
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
    const heading = document.createElement(more ? 'summary' : 'legend'); heading.textContent = label; container.append(heading);
    const row = document.createElement('div'); row.className = `cuk-intelligence-filter-choices${swatch ? ' cuk-intelligence-filter-choices--swatches' : ''}`;
    for (const choice of choices) row.append(optionButton({key, choice, field, form, swatch, multiple:key !== 'guidePrice'}));
    container.append(row); return container;
  }

  function renderDiscovery(root, catalog, form) {
    const host = root.querySelector('[data-cuk-discovery]'); if (!host) return;
    const discovery = (catalog.facets?.discovery || []).filter(dimension => dimension.active && dimension.options?.length);
    const byKey = Object.fromEntries(discovery.map(dimension => [dimension.key, dimension]));
    host.replaceChildren();
    const colour = byKey.colour;
    if (colour) host.append(group({key:'colour', label:'Colour', options:colour.options, field:hidden(form,'colour'), form, swatch:true}));
    const price = group({key:'guidePrice', label:'Curtains from price', options:catalog.facets?.guidePrices || [], field:hidden(form,'guidePrice'), form});
    if (price) { host.append(price); const note = document.createElement('p'); note.className = 'cuk-browse-price-note'; note.textContent = 'Price guide. Final curtain price depends on measurements and options.'; host.append(note); }
    const moreKeys = ['pattern','activity','texture','finish','character','presence'];
    const more = document.createElement('details'); more.className = 'cuk-intelligence-more';
    const summary = document.createElement('summary'); summary.textContent = 'More filters'; more.append(summary);
    const groups = document.createElement('div'); groups.className = 'cuk-intelligence-more-groups';
    for (const key of moreKeys) { const dimension = byKey[key]; if (dimension) { const item = group({key, label:dimension.label || labels[key] || readable(key), options:dimension.options, field:hidden(form,key), form, more:true}); if (item) groups.append(item); } }
    if (groups.childElementCount) { more.append(groups); host.append(more); }
  }

  function renderActiveFilters(root, catalog, form) {
    const host = root.querySelector('[data-cuk-active-filters]'); const clear = root.querySelector('[data-cuk-clear-all]'); if (!host || !clear) return;
    if (!clear.dataset.cukResetBound) {
      clear.dataset.cukResetBound = 'true';
      clear.addEventListener('click', () => {
        // The catalogue controller owns reset semantics, including clearing
        // dynamic hidden visual-choice fields and restoring page one. Calling
        // the form reset event rather than only removing chips prevents the
        // old governed result set remaining active.
        form.reset();
      });
    }
    const dimensions = Object.fromEntries((catalog.facets?.discovery || []).map(dimension => [dimension.key, dimension]));
    const chips = [];
    for (const key of ['colour','guidePrice','pattern','activity','texture','finish','character','presence']) {
      const field = form.elements[key]; if (!field) continue;
      // After reset, the catalogue controller may still retain replaced hidden
      // fields. Its URL is authoritative for chips and the customer-visible state.
      for (const value of urlValues(key)) {
        const label = key === 'guidePrice' ? (catalog.facets?.guidePrices || []).find(band => band.value === value)?.label : (dimensions[key]?.options || []).find(option => option.value === value)?.label;
        if (!label) continue;
        const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'cuk-filter-chip'; chip.textContent = `${key === 'guidePrice' ? 'Curtains from: ' : ''}${key === 'guidePrice' ? label : readable(label)} ×`;
        chip.addEventListener('click', () => writeValues(field, urlValues(key).filter(item => item !== value), form)); chips.push(chip);
      }
    }
    host.replaceChildren(...chips); clear.hidden = chips.length === 0;
  }

  const existing = window.CurtainsUKFabricExperience || {};
  window.CurtainsUKFabricExperience = {...existing, renderDiscovery, renderActiveFilters};
})();
