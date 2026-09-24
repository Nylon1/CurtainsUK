(() => {
  if (window.__curtainsukPremiumReady) return;
  window.__curtainsukPremiumReady = true;
  document.querySelectorAll("[data-cuk-discovery]").forEach(section => {
    const query = new URLSearchParams(location.search);
    if (query.has("fabric")) section.hidden = true;
    section.querySelectorAll("[data-cuk-assisted-entry]").forEach(link => {
      const windowType = query.get("window");
      if (windowType && /^[a-z-]{1,60}$/.test(windowType)) {
        const target = new URL(link.href); target.searchParams.set("window", windowType); link.href = target.href;
      }
    });
  });

  const KEY = 'curtainsuk_hci_context_v1';
  const read = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  };
  const fragment = new URLSearchParams(location.hash.slice(1));
  if (fragment.has('cuk_hci')) {
    try {
      const raw = fragment.get('cuk_hci');
      if (raw.length > 12000) throw new Error('Context too large');
      const value = JSON.parse(raw);
      if (
        typeof value.sessionId === 'string' &&
        /^[a-f0-9-]{36}$/.test(value.sessionId) &&
        typeof value.profileSummary === 'string' &&
        value.profileSummary.length <= 4000
      ) {
        localStorage.setItem(
          KEY,
          JSON.stringify({
            sessionId: value.sessionId,
            profileSummary: value.profileSummary,
            fabricMasterId: String(value.fabricMasterId || '').slice(0, 100),
            supplierSku: String(value.supplierSku || '').slice(0, 100),
            strategyId: String(value.strategyId || '').slice(0, 100),
            refinementDigest: String(value.refinementDigest || '').slice(0, 100),
            commerceToken: String(value.commerceToken || '').slice(0, 2000),
            windowSlug: String(value.windowSlug || '').slice(0, 60),
            returnOrigin: location.origin,
          }),
        );
      }
    } catch {
      /* A malformed consultation context cannot change the curtain configuration. */
    }
    fragment.delete('cuk_hci');
    history.replaceState(
      history.state,
      '',
      `${location.pathname}${location.search}${fragment.size ? `#${fragment}` : ''}`,
    );
  }
  const context = read(KEY);
  if (context)
    document
      .querySelectorAll('[data-cuk-configurator]>.cuk-wrap,[data-cuk-fabric-browser]>.cuk-wrap')
      .forEach((root) => {
        const notice = document.createElement('aside');
        notice.className = 'cuk-journey-context';
        const text = document.createElement('p');
        text.textContent = `Your consultation · ${context.profileSummary}`;
        const link = document.createElement('a');
        link.textContent = 'Return to my shortlist';
        link.href = `/apps/curtainsuk-decision/consultation?session=${encodeURIComponent(context.sessionId)}`;
        const details = document.createElement('details'),
          summary = document.createElement('summary');
        summary.textContent = 'Your profile';
        details.append(summary, text);
        notice.append(link, details);
        root.prepend(notice);
      });
  const detailObserver = new MutationObserver(() => {
    const actions = document.querySelector('.cuk-fabric-detail__actions');
    if (!actions) return;
    detailObserver.disconnect();
    const head = document.querySelector('[data-cuk-fabric-browser] .cuk-section__head');
    if (head) head.hidden = true;
    const title = document.querySelector('.cuk-fabric-detail h2');
    if (title) {
      const h1 = document.createElement('h1');
      h1.innerHTML = title.innerHTML;
      title.replaceWith(h1);
    }
    const bar = document.createElement('div');
    bar.className = 'cuk-shell cuk-mobile-fabric-bar';
    const sample = actions.querySelector('[data-sample]'),
      make = actions.querySelector('a');
    if (sample) {
      const button = document.createElement('button');
      button.className = 'cuk-button cuk-button--secondary';
      button.textContent = 'Order a Sample';
      button.disabled = sample.disabled;
      button.onclick = () => sample.click();
      bar.append(button);
    }
    if (make) {
      const link = make.cloneNode(true);
      link.textContent = 'Make Curtains';
      bar.append(link);
    }
    document.body.append(bar);
    new IntersectionObserver(([entry]) => {
      bar.hidden = entry.isIntersecting;
    }).observe(actions);
  });
  detailObserver.observe(document.body, { childList: true, subtree: true });
  if (new URLSearchParams(location.search).get('intent') === 'sample') {
    const sampleObserver = new MutationObserver(() => {
      const button = document.querySelector('[data-cuk-fabric-detail] [data-sample]');
      if (!button) return;
      sampleObserver.disconnect();
      if (!button.disabled) {
        button.click();
        const message = document.createElement('p');
        message.className = 'cuk-journey-context';
        message.textContent = 'Sample saved to your sample requests. Your consultation is kept for when you return.';
        button.after(message);
      }
      const url = new URL(location.href);
      url.searchParams.delete('intent');
      history.replaceState(history.state, '', url);
    });
    sampleObserver.observe(document.body, { childList: true, subtree: true });
  }
  document.querySelectorAll('[data-cuk-configurator]').forEach((root) => {
    const form = root.querySelector('form.cuk-form');
    if (!form || form.dataset.wizardReady) return;
    form.dataset.wizardReady = 'true';
    root.classList.add('cuk-wizard');
    const titles = ['Window', 'Measurements', 'Fabric', 'Heading', 'Lining', 'Pair / single', 'Price'];
    const children = [...form.children],
      first = form.querySelector('fieldset');
    const panes = titles.map(() => {
      const pane = document.createElement('div');
      pane.className = 'cuk-wizard-pane';
      return pane;
    });
    panes[0].append(first);
    children
      .filter((node) => node.matches('[data-cuk-standard],[data-cuk-specialist-shape],[data-cuk-awkward]'))
      .forEach((node) => panes[1].append(node));
    for (const [index, names] of [
      [2, ['fabricId']],
      [3, ['heading']],
      [4, ['lining']],
      [5, ['construction', 'stackDirection']],
    ]) {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'cuk-step';
      const legend = document.createElement('legend');
      legend.textContent = [
        '',
        '',
        'Choose your fabric',
        'Shape the look',
        'Choose your lining',
        'One curtain, or a pair?',
      ][index];
      fieldset.append(legend);
      const grid = document.createElement('div');
      grid.className = 'cuk-fields';
      names.forEach((name) => {
        const field = form.elements[name]?.closest('.cuk-field');
        if (field) grid.append(field);
      });
      fieldset.append(grid);
      panes[index].append(fieldset);
    }
    children
      .filter((node) => node.parentElement === form)
      .forEach((node) => {
        if (
          node.tagName === 'FIELDSET' &&
          !node.querySelector('input,select,textarea') &&
          !node.matches('[data-cuk-review-evidence]')
        )
          node.remove();
        else panes[6].append(node);
      });
    panes.forEach((pane) => form.append(pane));
    const measureHelp = document.createElement('a');
    measureHelp.className = 'cuk-measure-help';
    measureHelp.textContent = 'Need help measuring?';
    const updateMeasureHelp = () => {
      const windowSlug = form.elements.windowSlug.value;
      const guide = windowSlug === 'bay-window' ? 'bay' : ['apex-window','gable-end-window','triangular-window'].includes(windowSlug) ? 'apex' : ['french-doors','patio-sliding-doors','bifold-doors'].includes(windowSlug) ? 'doors' : 'standard';
      const target = new URL(`/pages/how-to-measure-${guide}`, location.origin);
      target.searchParams.set('window', windowSlug);
      if (form.elements.fabricId.value) target.searchParams.set('fabric', form.elements.fabricId.value);
      measureHelp.href = target.href;
    };
    form.addEventListener('change', updateMeasureHelp);
    measureHelp.addEventListener('click', updateMeasureHelp);
    updateMeasureHelp();
    panes[1].prepend(measureHelp);
    const fabricPreview = document.createElement('div');
    fabricPreview.className = 'cuk-config-fabric';
    panes[2].prepend(fabricPreview);
    let displayedFabric = '',
      previewGeneration = 0;
    const loadFabricPreview = async () => {
      const id = form.elements.fabricId.value;
      if (!id || id === displayedFabric) return;
      displayedFabric = id;
      const generation = ++previewGeneration;
      try {
        const url = new URL(`${root.dataset.engineBase.replace(/\/$/, '')}/catalog`, location.origin);
        url.searchParams.set('view', 'retail');
        url.searchParams.set('fabric', id);
        const response = await fetch(url);
        if (!response.ok) throw new Error();
        const { fabric } = await response.json();
        if (generation !== previewGeneration || fabric?.id !== id) return;
        fabricPreview.replaceChildren();
        const image = document.createElement('img');
        image.src = fabric.images[0].url + '?width=240';
        image.alt = fabric.metadata.alt;
        const text = document.createElement('div');
        const brand = document.createElement('p'),
          name = document.createElement('p');
        brand.className = 'cuk-eyebrow';
        brand.textContent = fabric.brand;
        name.textContent = `${fabric.design} · ${fabric.colour}`;
        text.append(brand, name);
        fabricPreview.append(image, text);
      } catch {
        fabricPreview.textContent = 'Your selected fabric is retained. Photography is temporarily unavailable.';
      }
    };
    form.elements.fabricId.addEventListener('change', loadFabricPreview);
    const initialFabricObserver = new MutationObserver(() => {
      if (form.elements.fabricId.value) {
        loadFabricPreview();
        initialFabricObserver.disconnect();
      }
    });
    initialFabricObserver.observe(form.elements.fabricId, { childList: true, subtree: true });
    loadFabricPreview();
    const headingNote = document.createElement('p');
    headingNote.className = 'cuk-hint';
    headingNote.textContent =
      'The heading shapes the look: wave feels clean and contemporary, pinch pleat more tailored, and pencil pleat softer and gathered.';
    panes[3].append(headingNote);
    const liningNote = document.createElement('p');
    liningNote.className = 'cuk-hint';
    liningNote.textContent =
      'Choose blackout lining for greater light control. Bonded lining / interlining is one combined layer.';
    panes[4].append(liningNote);
    const summary = document.createElement('p');
    summary.className = 'cuk-wizard-summary';
    panes[6].prepend(summary);
    const summaryFields = ['windowSlug', 'fabricId', 'heading', 'lining', 'construction'];
    const updateSummary = () => {
      updateMeasureHelp();
      summary.textContent = summaryFields
        .map((name) => form.elements[name]?.selectedOptions?.[0]?.textContent)
        .filter(Boolean)
        .join(' · ');
    };
    // Catalogue options arrive asynchronously, including when resuming the Price step.
    // Observe only select contents; do not move the customer's current step or focus.
    const summaryObserver = new MutationObserver(updateSummary);
    summaryFields.forEach((name) => {
      if (form.elements[name]) summaryObserver.observe(form.elements[name], { childList: true, subtree: true, characterData: true });
    });
    form.addEventListener('change', updateSummary);
    updateSummary();
    const nav = document.createElement('nav');
    nav.className = 'cuk-wizard-nav';
    nav.setAttribute('aria-label', 'Curtain configuration steps');
    const controls = document.createElement('div');
    controls.className = 'cuk-wizard-controls';
    const back = document.createElement('button'),
      next = document.createElement('button');
    back.type = next.type = 'button';
    back.className = 'cuk-button cuk-button--secondary';
    next.className = 'cuk-button';
    back.textContent = 'Back';
    next.textContent = 'Continue';
    controls.append(back, next);
    let step = Math.min(6, Math.max(0, Number(sessionStorage.getItem('cuk_config_step_v1')) || 0));
    const show = (index, focus = true) => {
      step = index;
      sessionStorage.setItem('cuk_config_step_v1', String(step));
      panes.forEach((pane, i) => {
        pane.hidden = i !== step;
      });
      [...nav.children].forEach((button, i) => {
        if (i === step) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      back.hidden = step === 0;
      next.hidden = step === 6;
      updateSummary();
      if (focus) {
        panes[step].tabIndex = -1;
        panes[step].focus({ preventScroll: true });
        nav.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    };
    const valid = () =>
      [...panes[step].querySelectorAll('input,select,textarea')].every(
        (field) => field.disabled || field.closest('.cuk-hidden') || field.reportValidity(),
      );
    titles.forEach((title, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${index + 1} ${title}`;
      button.onclick = () => {
        if (index <= step || valid()) show(index);
      };
      nav.append(button);
    });
    back.onclick = () => show(Math.max(0, step - 1));
    next.onclick = () => {
      if (valid()) show(Math.min(6, step + 1));
    };
    form.prepend(nav);
    panes.forEach((pane) => form.append(pane));
    form.append(controls);
    form.addEventListener(
      'invalid',
      (event) => {
        const index = panes.findIndex((pane) => pane.contains(event.target));
        if (index >= 0 && index !== step) show(index);
      },
      true,
    );
    form.addEventListener('keydown', (event) => {
      if (
        event.key === 'Enter' &&
        event.target.tagName !== 'TEXTAREA' &&
        event.target.tagName !== 'BUTTON' &&
        step < 6
      ) {
        event.preventDefault();
        next.click();
      }
    });
    show(step, false);
  });
})();
