/* Make Curtains only. Capabilities come from the same master used by pricing. */
(() => {
  'use strict';
  const release = 'mtm-configurator-20261022-v1';
  const arrangementMessage = "This curtain arrangement isn't available for the selected window. Please choose one of the available Pair / Single options.";
  const routeFor = (windowType, state) => windowType?.configuration?.routes?.find(route =>
    route.measurementBasis === state.measurementBasis && route.heading === state.heading);
  const constructionFor = (windowType, state) => routeFor(windowType, state)?.constructions.find(choice => choice.value === state.construction);

  function reconcile(windowType, state) {
    const next = { ...state };
    const routes = windowType?.configuration?.routes || [];
    const bases = [...new Set(routes.map(route => route.measurementBasis))];
    if (!bases.includes(next.measurementBasis)) next.measurementBasis = bases.length === 1 ? bases[0] : '';
    const headings = routes.filter(route => route.measurementBasis === next.measurementBasis).map(route => route.heading);
    if (!headings.includes(next.heading)) next.heading = headings[0] || '';
    const choices = routeFor(windowType, next)?.constructions || [];
    if (!choices.some(choice => choice.value === next.construction)) next.construction = choices.length === 1 ? choices[0].value : '';
    const stacks = constructionFor(windowType, next)?.stackDirections || [];
    if (!stacks.includes(next.stackDirection)) next.stackDirection = stacks.length === 1 ? stacks[0] : '';
    return next;
  }

  // This intentionally ignores HTML required/disabled flags: the wizard changes
  // them for step navigation, but pricing needs every active field to be complete.
  function validate(windowType, state) {
    if (!windowType?.configuration?.routes?.length) return { field: 'windowSlug', message: 'Choose an available window to configure your curtains.' };
    if (!windowType.configuration.routes.some(route => route.measurementBasis === state.measurementBasis)) return { field: 'measurementBasis', message: 'Choose your fitted track or pole before checking the price.' };
    const limits = windowType.configuration.measurements;
    for (const [field, low, high] of [['widthCm', limits.minimumWidthCm, limits.maximumWidthCm], ['dropCm', limits.minimumDropCm, limits.maximumDropCm]]) {
      const raw = state[field];
      const value = Number(raw);
      if ((typeof raw !== 'number' && typeof raw !== 'string') || String(raw).trim() === '' || !Number.isFinite(value) || value <= 0 || value < low || value > high || (limits.suspiciousLikelyMillimetresAtCm && value >= limits.suspiciousLikelyMillimetresAtCm)) {
        return { field, message: 'Please complete your width and drop within the supported range, in centimetres.' };
      }
    }
    if (!state.fabricId) return { field: 'fabricId', message: 'Choose a fabric before checking the price.' };
    if (!routeFor(windowType, state)) return { field: 'heading', message: 'Choose an available heading for your fitted track or pole.' };
    if (!windowType.linings.includes(state.lining)) return { field: 'lining', message: 'Choose an available lining.' };
    if (!constructionFor(windowType, state)) return { field: 'construction', message: arrangementMessage };
    if (!constructionFor(windowType, state).stackDirections.includes(state.stackDirection)) return { field: 'stackDirection', message: 'Choose an opening direction for your pair or single curtain.' };
    return null;
  }

  function sync(form, windowType, restored = {}) {
    const state = { ...read(form), ...restored };
    const next = reconcile(windowType, state);
    const labels = { TRACK_WIDTH: 'Fitted track', POLE_USABLE_WIDTH: 'Fitted pole', PENCIL_PLEAT: 'Pencil pleat', DOUBLE_PINCH: 'Double pinch pleat', WAVE: 'Wave', EYELET: 'Eyelet', PAIR: 'Pair', SINGLE: 'Single curtain', SPLIT: 'Pair opening from centre', LEFT: 'Stack left', RIGHT: 'Stack right' };
    const routes = windowType?.configuration?.routes || [];
    const choices = routeFor(windowType, next)?.constructions || [];
    const replace = (name, values, placeholder) => {
      const field = form.elements[name];
      field.replaceChildren(...['', ...values].map(value => {
        const option = document.createElement('option'); option.value = value; option.textContent = value ? labels[value] : placeholder; return option;
      }));
      field.value = next[name];
    };
    replace('measurementBasis', [...new Set(routes.map(route => route.measurementBasis))], 'Choose your fitted hardware');
    replace('heading', routes.filter(route => route.measurementBasis === next.measurementBasis).map(route => route.heading), 'Choose your heading');
    replace('construction', choices.map(choice => choice.value), 'Choose pair or single');
    replace('stackDirection', constructionFor(windowType, next)?.stackDirections || [], 'Choose opening direction');
  }

  function read(form) {
    return Object.fromEntries(['windowSlug', 'measurementBasis', 'widthCm', 'dropCm', 'fabricId', 'heading', 'lining', 'construction', 'stackDirection'].map(name => [name, form.elements[name]?.value || '']));
  }

  function createRequestGate() {
    let inFlight = false, lastSubmitted = '';
    const rejected = new Map();
    const arrangementKey = state => JSON.stringify([state.windowSlug, state.measurementBasis, state.heading, state.construction, state.stackDirection]);
    const key = state => JSON.stringify(state);
    const rejection = state => rejected.get(arrangementKey(state)) || rejected.get(key(state)) || null;
    return {
      rejection,
      changed(state) { if (lastSubmitted !== key(state)) lastSubmitted = ''; },
      canSubmit(state, automatic) { return !inFlight && !rejection(state) && (!automatic || lastSubmitted !== key(state)); },
      start(state) { inFlight = true; lastSubmitted = key(state); },
      finish() { inFlight = false; },
      reject(state, code, message) {
        const id = code === 'CONFIGURATION_CONSTRUCTION_NOT_ALLOWED' || code === 'CONFIGURATION_STACK_DIRECTION_NOT_ALLOWED' ? arrangementKey(state) : key(state);
        rejected.set(id, message);
        if (rejected.size > 32) rejected.delete(rejected.keys().next().value);
      },
    };
  }
  window.CurtainsUKMtmConfigurator = { release, arrangementMessage, reconcile, validate, read, sync, createRequestGate };
})();
