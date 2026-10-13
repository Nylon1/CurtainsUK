(() => {
  'use strict';
  const duration = 30000;
  const initialise = (root) => {
    if (root.dataset.advisoryReady) return;
    const dialog = root.querySelector('[data-advisory-dialog]');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    const find = (name) => dialog.querySelector(`[data-advisory-${name}]`);
    const waiting = find('waiting');
    const room = find('room');
    const countdown = find('countdown');
    const progress = find('progress');
    const status = find('status');
    const profiles = new Map([...root.querySelectorAll('[data-advisory-profile]')].map((profile) => [profile.dataset.adviser, profile]));
    let deadline = 0;
    let timer = null;
    let opener = null;
    let previousOverflow = '';
    let locked = false;
    const stop = () => { clearInterval(timer); timer = null; };
    const unlock = () => {
      if (!locked) return;
      document.body.style.overflow = previousOverflow;
      locked = false;
    };
    const showRoom = () => {
      if (!dialog.open || !room.hidden) return;
      stop();
      waiting.hidden = true;
      room.hidden = false;
      progress.value = 30;
      countdown.textContent = '0';
      status.textContent = root.dataset.roomStatus || '';
      find('room-title').focus({ preventScroll: true });
    };
    const tick = () => {
      if (!dialog.open) { stop(); return; }
      const remaining = Math.max(0, Math.min(duration, deadline - Date.now()));
      countdown.textContent = String(Math.ceil(remaining / 1000));
      progress.value = (duration - remaining) / 1000;
      if (remaining === 0) showRoom();
    };
    const close = () => { stop(); if (dialog.open) dialog.close(); unlock(); };
    const onClose = () => { stop(); unlock(); opener?.focus({ preventScroll: true }); };
    const open = (button) => {
      const profile = profiles.get(button.dataset.adviser);
      if (!profile || dialog.open) return;
      opener = button;
      find('name').textContent = profile.dataset.name;
      find('title').textContent = profile.dataset.title;
      find('mark').textContent = profile.dataset.name.slice(0, 1);
      find('preparation').textContent = profile.dataset.preparation;
      find('example').textContent = profile.dataset.intro;
      waiting.hidden = false;
      room.hidden = true;
      countdown.textContent = '30';
      progress.value = 0;
      status.textContent = '';
      try {
        dialog.showModal();
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        locked = true;
        deadline = Date.now() + duration;
        status.textContent = root.dataset.waitStatus || '';
        find('close').focus({ preventScroll: true });
        timer = setInterval(tick, 250);
      } catch {
        close();
        const error = root.querySelector('[data-advisory-error]');
        if (error) { error.hidden = false; error.textContent = root.dataset.unavailable || ''; }
      }
    };
    const onClick = (event) => {
      const button = event.target.closest('[data-advisory-open]');
      if (button && root.contains(button)) open(button);
      if (event.target.closest('[data-advisory-close]')) close();
      if (event.target.closest('[data-advisory-skip]')) showRoom();
    };
    const onKey = (event) => {
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]')].filter((el) => el.getClientRects().length);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const visibility = () => { if (!document.hidden && dialog.open && room.hidden) tick(); };
    const unload = (event) => {
      if (!event.target.contains(root)) return;
      close();
      root.removeEventListener('click', onClick);
      dialog.removeEventListener('close', onClose);
      dialog.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pageshow', visibility);
      document.removeEventListener('shopify:section:unload', unload);
    };
    root.addEventListener('click', onClick);
    dialog.addEventListener('close', onClose);
    dialog.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pageshow', visibility);
    document.addEventListener('shopify:section:unload', unload);
    root.dataset.advisoryReady = 'true';
    root.querySelectorAll('[data-advisory-open]').forEach((button) => { button.hidden = false; });
  };
  const scan = (target) => target.querySelectorAll('[data-advisory-team]').forEach(initialise);
  scan(document);
  document.addEventListener('shopify:section:load', (event) => scan(event.target));
})();
