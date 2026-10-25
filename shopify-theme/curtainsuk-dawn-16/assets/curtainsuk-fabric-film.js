(() => {
  function initialise(root) {
    if (root.dataset.ready) return;
    root.dataset.ready = 'true';
    const video = root.querySelector('video');
    const cover = root.querySelector('[data-film-cover]');
    const status = root.querySelector('[data-film-status]');
    const chapters = [...root.querySelectorAll('[data-film-chapter]')];
    const chapterName = root.querySelector('[data-film-current]');
    const speed = root.querySelector('[data-film-speed]');
    let pendingSeek = null;
    let active = -1;
    function updateChapter() {
      const next = chapters.findLastIndex(link => Number(link.dataset.filmChapter) <= video.currentTime);
      if (next === active) return;
      active = next;
      chapters.forEach((link, index) => {
        if (index === active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
      chapterName.textContent = next >= 0 ? chapters[next].querySelector('strong').textContent : root.dataset.intro;
    }
    function applySeek() {
      if (pendingSeek === null || !Number.isFinite(video.duration)) return;
      video.currentTime = Math.min(pendingSeek, Math.max(0, video.duration - 0.1));
      pendingSeek = null;
      updateChapter();
    }
    function playAt(seconds) {
      status.hidden = true;
      if (Number.isFinite(seconds)) pendingSeek = seconds;
      if (!video.getAttribute('src')) {
        video.src = video.dataset.src;
        video.load();
      } else if (video.error) {
        video.load();
      }
      cover.hidden = true;
      applySeek();
      video.play().catch(() => {
        status.textContent = video.error ? root.dataset.error : root.dataset.playHint;
        status.hidden = false;
      });
    }
    cover.addEventListener('click', event => {
      event.preventDefault();
      playAt(0);
      video.focus({ preventScroll: true });
    });
    chapters.forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      playAt(Number(link.dataset.filmChapter));
      const bounds = video.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight || bounds.top < -bounds.height / 2) {
        video.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    }));
    root.querySelector('[data-film-replay]').addEventListener('click', () => playAt(0));
    speed.addEventListener('change', () => { video.playbackRate = Number(speed.value); });
    video.addEventListener('loadedmetadata', applySeek);
    video.addEventListener('timeupdate', updateChapter);
    video.addEventListener('playing', () => { status.hidden = true; });
    video.addEventListener('error', () => {
      status.textContent = root.dataset.error;
      status.hidden = false;
    });
    root.querySelector('[data-film-toolbar]').hidden = false;
  }
  const scan = () => document.querySelectorAll('[data-fabric-film]').forEach(initialise);
  scan();
  document.addEventListener('shopify:section:load', scan);
})();
