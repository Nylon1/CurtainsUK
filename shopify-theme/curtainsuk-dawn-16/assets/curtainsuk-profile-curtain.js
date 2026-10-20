(() => {
  if (window.CurtainsUKProfileCurtainLoaded) return;
  window.CurtainsUKProfileCurtainLoaded = true;
  const states = new WeakMap();
  const commands = new Set(['open', 'stop', 'close', 'day', 'evening']);
  function send(state, command) {
    if (!state.ready || !commands.has(command)) return;
    state.frame.contentWindow?.postMessage({
      type: 'cuk:fabric-curtain-command', fabricId: state.id, command,
    }, location.origin);
  }
  function controls(state, enabled) {
    state.root.querySelectorAll('[data-preview-command], [data-preview-light]').forEach(button => {
      button.disabled = !enabled;
    });
  }
  function load(state) {
    if (!state.available || !state.near || state.loading || state.ready) return;
    state.loading = true;
    state.retry.hidden = true;
    state.status.textContent = state.root.dataset.loading;
    state.poster.hidden = false;
    state.frame.hidden = false;
    state.frame.src = `/apps/curtainsuk-decision/room-visualiser?fabric=${encodeURIComponent(state.id)}&embed=fabric-profile`;
    clearTimeout(state.timer);
    state.timer = setTimeout(() => error(state), 25000);
  }
  function error(state) {
    clearTimeout(state.timer);
    state.loading = false;
    state.ready = false;
    controls(state, false);
    state.frame.hidden = true;
    state.frame.removeAttribute('src');
    state.poster.hidden = false;
    state.status.textContent = state.root.dataset.unavailable;
    state.motion.textContent = '';
    state.retry.hidden = false;
  }
  function mount(root) {
    if (states.has(root)) return states.get(root);
    const page = root.closest('[data-cuk-canonical-fabric-detail]');
    const state = {
      root, id: page.dataset.fabricMasterId,
      frame: root.querySelector('iframe'), status: root.querySelector('[data-preview-status]'),
      motion: root.querySelector('[data-preview-motion]'),
      retry: root.querySelector('[data-preview-retry]'), poster: root.querySelector('[data-preview-poster]'),
      available: false, loading: false, ready: false, near: false, timer: null, light: 'day',
    };
    states.set(root, state);
    state.retry.addEventListener('click', () => {
      if (state.available) load(state);
      else page.dispatchEvent(new CustomEvent('cuk:room-preview-retry', { bubbles: true }));
    });
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-preview-command], [data-preview-light]');
      if (!button || button.disabled) return;
      const light = button.dataset.previewLight;
      if (light) {
        state.light = light;
        root.querySelectorAll('[data-preview-light]').forEach(item => {
          item.setAttribute('aria-pressed', String(item === button));
        });
      }
      send(state, light || button.dataset.previewCommand);
    });
    if ('IntersectionObserver' in window) {
      state.observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) { state.near = true; load(state); }
          else send(state, 'stop');
        }
      }, { rootMargin: '120px' });
      state.observer.observe(root);
    } else state.near = true;
    return state;
  }
  document.addEventListener('cuk:room-preview', event => {
    const page = event.target.closest('[data-cuk-canonical-fabric-detail]');
    const root = page?.querySelector('[data-profile-curtain]');
    if (!root || event.detail?.fabricId !== page.dataset.fabricMasterId) return;
    const state = mount(root), preview = event.detail.preview;
    if (preview?.available === true && preview.url === `/pages/room-visualiser?fabric=${encodeURIComponent(state.id)}`) {
      state.available = true;
      root.querySelector('[data-preview-room-link]').hidden = false;
      load(state);
    } else {
      state.available = false;
      root.querySelector('[data-preview-room-link]').hidden = true;
      error(state);
    }
  });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.data?.type !== 'cuk:fabric-curtain') return;
    document.querySelectorAll('[data-profile-curtain]').forEach(root => {
      const state = states.get(root);
      if (!state || event.source !== state.frame.contentWindow || event.data.fabricId !== state.id) return;
      const name = event.data.state;
      if (name === 'ready' && state.loading) {
        clearTimeout(state.timer);
        state.loading = false; state.ready = true;
        state.poster.hidden = true;
        state.status.textContent = '';
        root.querySelector('[data-preview-scale]').textContent =
          event.data.profile === 'single' ? root.dataset.single : root.dataset.floor;
        controls(state, true); send(state, state.light);
      } else if (name === 'error') error(state);
      else if (state.ready && ['open', 'closed', 'stopped', 'opening', 'closing'].includes(name)) {
        state.motion.textContent = root.dataset[name];
        root.dataset.motion = name;
      }
    });
  });
  function start(scope = document) { scope.querySelectorAll('[data-profile-curtain]').forEach(mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => start(), { once: true });
  else start();
  document.addEventListener('shopify:section:load', event => start(event.target));
  document.addEventListener('shopify:section:unload', event => {
    event.target.querySelectorAll('[data-profile-curtain]').forEach(root => {
      const state = states.get(root);
      if (!state) return;
      send(state, 'stop'); clearTimeout(state.timer); state.observer?.disconnect();
      state.frame.removeAttribute('src'); states.delete(root);
    });
  });
})();
