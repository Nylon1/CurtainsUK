(() => {
  function tabs(container, selector, panel, select) {
    const links = [...container.querySelectorAll(selector)];
    container.setAttribute('role', 'tablist');
    panel.setAttribute('role', 'tabpanel');
    links.forEach((link, index) => {
      link.setAttribute('role', 'tab');
      link.setAttribute('aria-controls', panel.id);
      link.setAttribute('aria-selected', String(index === 0));
      link.tabIndex = index === 0 ? 0 : -1;
      link.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        select(link);
      });
      link.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % links.length;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + links.length - 1) % links.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = links.length - 1;
        if (event.key === ' ') { event.preventDefault(); select(link); return; }
        if (next === undefined) return;
        event.preventDefault();
        links[next].focus();
        select(links[next]);
      });
    });
    panel.setAttribute('aria-labelledby', links[0].id);
    return link => {
      links.forEach(item => {
        const selected = item === link;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', link.id);
    };
  }
  function init(root) {
    if (root.dataset.enhanced) return;
    root.dataset.enhanced = 'true';
    const viewer = root.querySelector('[data-room-viewer]');
    const roomPanel = viewer.querySelector('[data-room-panel]');
    const roomImage = viewer.querySelector('[data-room-image]');
    const lighting = viewer.querySelector('[data-lighting]');
    const modeButtons = [...lighting.querySelectorAll('[data-mode]')];
    const error = viewer.querySelector('[data-room-error]');
    let room = viewer.querySelector('[data-room]');
    let mode = 'daylight';
    let roomRequest = 0;
    let requestedRoom = room;
    let requestedMode = mode;
    const selectRoomTab = tabs(viewer.querySelector('[data-room-tabs]'), '[data-room]', roomPanel, next => renderRoom(next, requestedMode));
    function renderRoom(nextRoom, nextMode) {
      requestedRoom = nextRoom;
      requestedMode = nextMode;
      const request = ++roomRequest;
      const photo = new Image();
      roomPanel.setAttribute('aria-busy', 'true');
      error.hidden = true;
      photo.onload = () => {
        if (request !== roomRequest) return;
        room = nextRoom;
        mode = nextMode;
        roomImage.src = photo.src;
        roomImage.alt = room.dataset.alt;
        selectRoomTab(room);
        modeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
        const modeLabel = modeButtons.find(button => button.dataset.mode === mode).textContent.trim();
        viewer.querySelector('[data-room-title]').textContent = room.dataset.title;
        viewer.querySelector('[data-room-mood]').textContent = modeLabel;
        viewer.querySelector('[data-room-description]').textContent = room.dataset.description;
        viewer.querySelector('[data-room-cta]').href = room.href;
        viewer.querySelector('[data-room-hotspot]').href = room.href;
        viewer.querySelector('[data-room-status]').textContent = `${room.dataset.title}, ${modeLabel}`;
        roomPanel.setAttribute('aria-busy', 'false');
      };
      photo.onerror = () => {
        if (request !== roomRequest) return;
        requestedRoom = room;
        requestedMode = mode;
        roomPanel.setAttribute('aria-busy', 'false');
        error.hidden = false;
      };
      photo.src = nextRoom.dataset[nextMode];
    }
    modeButtons.forEach(button => button.addEventListener('click', () => renderRoom(requestedRoom, button.dataset.mode)));
    lighting.hidden = false;
    const headingExplorer = root.querySelector('[data-heading-explorer]');
    const headingPanel = headingExplorer.querySelector('[data-heading-panel]');
    let headingRequest = 0;
    const selectHeadingTab = tabs(headingExplorer.querySelector('[data-heading-tabs]'), '[data-heading]', headingPanel, link => {
      const request = ++headingRequest;
      const photo = new Image();
      photo.onload = () => {
        if (request !== headingRequest) return;
        headingPanel.querySelector('[data-heading-image]').src = photo.src;
        headingPanel.querySelector('[data-heading-image]').alt = link.dataset.title;
        headingPanel.querySelector('[data-heading-title]').textContent = link.dataset.title;
        headingPanel.querySelector('[data-heading-description]').textContent = link.dataset.description;
        selectHeadingTab(link);
      };
      photo.onerror = () => { if (request === headingRequest) window.location.assign(link.href); };
      photo.src = link.dataset.image;
    });
  }
  const start = scope => scope.querySelectorAll('[data-home-studio]').forEach(init);
  start(document);
  document.addEventListener('shopify:section:load', event => start(event.target));
})();
