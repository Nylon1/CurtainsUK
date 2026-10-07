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
      let timer, started;
      const stop = () => clearInterval(timer);
      const fail = () => {
        stop(); section.dataset.state = 'error'; status.hidden = false; recovery.hidden = false;
        label.textContent = 'Your room could not load. Please try again, or continue browsing fabrics.';
      };
      const inspect = () => {
        if (!section.isConnected) { stop(); return; }
        try {
          const child = frame.contentWindow;
          if ((child.visualiserCustomer?.proof.ready && child.roomProof?.ready) ||
              (child.fixed140Proof?.ready && child.fixed140Proof.profile === 'FIXED140_SINGLE_WIDTH_V1')) {
            stop(); section.dataset.state = 'ready'; status.hidden = true; return;
          }
          const stage = child.document.querySelector('#loading-status')?.textContent;
          if (stage) label.textContent = stage;
          if (child.document.querySelector('#loading-retry')?.hidden === false) { fail(); return; }
        } catch { /* A proxy/authentication failure is covered by the bounded timeout. */ }
        if (Date.now() - started > 45000) fail();
      };
      const load = () => {
        stop(); started = Date.now(); section.dataset.state = 'loading'; status.hidden = false; recovery.hidden = true;
        label.textContent = 'Preparing your fabric';
        const source = new URL(frame.dataset.source, location.origin);
        const params = new URLSearchParams(location.search);
        // Preserve duplicates so the runtime rejects an ambiguous fabric link rather than silently choosing one.
        for (const value of params.getAll('fabric')) source.searchParams.append('fabric', value);
        const room = params.get('room') || section.dataset.defaultRoom;
        if (['living', 'bedroom', 'lounge', 'office'].includes(room)) source.searchParams.set('room', room);
        frame.src = source.href;
        timer = setInterval(inspect, 250);
      };
      section.querySelector('[data-room-retry]').addEventListener('click', load);
      frame.addEventListener('error', fail);
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
