/* Shopify presentation only. The approved scene, UVs, cameras and motion stay in the runtime. */
(() => {
  const initialise = (root = document) => {
    for (const section of root.querySelectorAll('[data-cuk-room-tool]')) {
      if (section.dataset.initialised) continue;
      section.dataset.initialised = 'true';
      const frame = section.querySelector('[data-room-frame]');
      const status = section.querySelector('[data-room-status]');
      const label = section.querySelector('[data-room-status-text]');
      const recovery = section.querySelector('[data-room-recovery]');
      const direct = section.querySelector('[data-room-open]');
      const childReasons = new Set(['ROOM_FRAME_GRAPHICS_UNAVAILABLE', 'ROOM_FRAME_MODULE_UNAVAILABLE',
        'ROOM_FRAME_ASSET_UNAVAILABLE', 'ROOM_FRAME_NETWORK_UNAVAILABLE', 'ROOM_FRAME_RENDER_FAILED']);
      let timeout, slowHint, attempt = 0;
      const stop = () => { clearTimeout(timeout); clearTimeout(slowHint); };
      const report = (reason) => document.dispatchEvent(new CustomEvent('curtainsuk:room-frame-error', { detail: { reason } }));
      const reason = () => {
        try {
          const child = frame.contentDocument;
          if (!child) return 'ROOM_FRAME_INACCESSIBLE';
          return child.URL === 'about:blank' ? 'ROOM_FRAME_ABOUT_BLANK' : 'ROOM_FRAME_NOT_READY';
        } catch { return 'ROOM_FRAME_INACCESSIBLE'; }
      };
      const fail = (code) => {
        if (section.dataset.state !== 'loading') return;
        stop(); section.dataset.state = 'error'; status.hidden = false; recovery.hidden = false;
        label.textContent = 'Your room could not load. Please try again, or continue browsing fabrics.';
        report(code);
      };
      const onMessage = (event) => {
        if (event.origin !== location.origin || event.source !== frame.contentWindow ||
            event.data?.type !== 'curtainsuk:room-frame' || event.data.attempt !== attempt ||
            section.dataset.state !== 'loading') return;
        if (event.data.status === 'ready') {
          stop(); section.dataset.state = 'ready'; status.hidden = true;
        } else if (event.data.status === 'error') fail(childReasons.has(event.data.reason)
          ? event.data.reason : 'ROOM_FRAME_CHILD_ERROR');
      };
      const load = () => {
        stop(); attempt += 1; section.dataset.state = 'loading'; status.hidden = false; recovery.hidden = true;
        label.textContent = 'Preparing your fabric';
        const source = new URL(frame.dataset.source, location.origin);
        const params = new URLSearchParams(location.search);
        // Preserve duplicates so the runtime rejects an ambiguous fabric link rather than silently choosing one.
        for (const value of params.getAll('fabric')) source.searchParams.append('fabric', value);
        const room = params.get('room') || section.dataset.defaultRoom;
        if (['living', 'bedroom', 'lounge', 'office'].includes(room)) source.searchParams.set('room', room);
        direct.href = source.href;
        source.searchParams.set('frameAttempt', String(attempt));
        frame.src = source.href;
        slowHint = setTimeout(() => {
          if (section.dataset.state === 'loading') label.textContent = 'Still preparing your room. You can open it in a new tab.';
        }, 10000);
        timeout = setTimeout(() => fail(reason()), 45000);
      };
      section.querySelector('[data-room-retry]').addEventListener('click', load);
      frame.addEventListener('error', () => fail('ROOM_FRAME_LOAD_ERROR'));
      window.addEventListener('message', onMessage);
      document.addEventListener('shopify:section:unload', (event) => {
        if (event.target?.contains(section)) { stop(); window.removeEventListener('message', onMessage); }
      });
      load();
    }
  };
  initialise();
  // Theme Editor replaces sections without a full page navigation.
  if (!window.cukRoomSectionListener) {
    window.cukRoomSectionListener = true;
    document.addEventListener('shopify:section:load', () => initialise());
  }
})();
