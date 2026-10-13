(() => {
  'use strict';
  const initialise = (root) => {
    if (root.dataset.advisoryInteractionsReady) return;
    const spotlight = root.querySelector('[data-advisory-spotlight]');
    if (!spotlight) return;
    const buttons = [...spotlight.querySelectorAll('[data-spotlight-select]')];
    const panels = [...spotlight.querySelectorAll('[data-spotlight-panel]')];
    const controls = spotlight.querySelector('[data-spotlight-controls]');
    const status = spotlight.querySelector('[data-spotlight-status]');
    if (!buttons.length || !panels.length) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    const stage = spotlight.querySelector('[data-spotlight-stage]');
    const revealTargets = [...root.querySelectorAll('.cukad__profile,.cukad__journey-steps > li,.cukad__preview-visual')];
    let observer = null;
    let frame = null;
    let pointer = null;
    let disposed = false;
    const activate = (button, announce = true) => {
      const selected = panels.find((panel) => panel.dataset.adviser === button.dataset.adviser);
      if (!selected) return;
      panels.forEach((panel) => { panel.hidden = panel !== selected; });
      if (!reduced?.matches) selected.classList.add('cukad-in-view');
      buttons.forEach((candidate) => candidate.setAttribute('aria-pressed', String(candidate === button)));
      spotlight.dataset.activeAdviser = selected.dataset.adviser;
      if (announce && status) status.textContent = [selected.dataset.name, selected.dataset.title].filter(Boolean).join(' — ');
    };
    const onClick = (event) => {
      const button = event.target.closest('[data-spotlight-select]');
      if (button && buttons.includes(button)) activate(button);
    };
    const onKey = (event) => {
      const button = event.target.closest('[data-spotlight-select]');
      const index = buttons.indexOf(button);
      if (index < 0) return;
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
      else if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else return;
      event.preventDefault();
      activate(buttons[next]);
      buttons[next].focus({ preventScroll: true });
    };
    const resetDepth = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      pointer = null;
      ['--tilt-x', '--tilt-y', '--glow-x', '--glow-y'].forEach((property) => stage?.style.removeProperty(property));
    };
    const onPointer = (event) => {
      if (!stage || reduced?.matches || !fine?.matches || event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        if (disposed || !pointer || reduced?.matches || !fine?.matches) return;
        const rect = stage.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = Math.max(0, Math.min(1, (pointer.x - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (pointer.y - rect.top) / rect.height));
        stage.style.setProperty('--tilt-x', `${((0.5 - y) * 6).toFixed(2)}deg`);
        stage.style.setProperty('--tilt-y', `${((x - 0.5) * 6).toFixed(2)}deg`);
        stage.style.setProperty('--glow-x', `${(x * 100).toFixed(1)}%`);
        stage.style.setProperty('--glow-y', `${(y * 100).toFixed(1)}%`);
      });
    };
    const updateMotion = () => {
      resetDepth();
      observer?.disconnect();
      observer = null;
      if (reduced?.matches) {
        revealTargets.forEach((target) => target.classList.remove('cukad-in-view'));
        return;
      }
      if (typeof window.IntersectionObserver !== 'function') return;
      try {
        observer = new window.IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('cukad-in-view');
              observer?.unobserve(entry.target);
            }
          });
        }, { threshold: 0.08 });
        revealTargets.forEach((target) => { if (!target.classList.contains('cukad-in-view')) observer.observe(target); });
      } catch { observer?.disconnect(); observer = null; }
    };
    const unload = (event) => {
      if (!event.target.contains(root)) return;
      disposed = true;
      resetDepth();
      observer?.disconnect();
      spotlight.removeEventListener('click', onClick);
      spotlight.removeEventListener('keydown', onKey);
      stage?.removeEventListener('pointermove', onPointer);
      stage?.removeEventListener('pointerleave', resetDepth);
      reduced?.removeEventListener?.('change', updateMotion);
      fine?.removeEventListener?.('change', updateMotion);
      document.removeEventListener('shopify:section:unload', unload);
      delete root.dataset.advisoryInteractionsReady;
    };
    spotlight.addEventListener('click', onClick);
    spotlight.addEventListener('keydown', onKey);
    stage?.addEventListener('pointermove', onPointer, { passive: true });
    stage?.addEventListener('pointerleave', resetDepth);
    reduced?.addEventListener?.('change', updateMotion);
    fine?.addEventListener?.('change', updateMotion);
    document.addEventListener('shopify:section:unload', unload);
    activate(buttons.find((button) => button.getAttribute('aria-pressed') === 'true') || buttons[0], false);
    if (controls) controls.hidden = false;
    root.dataset.advisoryInteractionsReady = 'true';
    updateMotion();
  };
  const scan = (target) => target.querySelectorAll('[data-advisory-team]').forEach(initialise);
  scan(document);
  document.addEventListener('shopify:section:load', (event) => scan(event.target));
})();
