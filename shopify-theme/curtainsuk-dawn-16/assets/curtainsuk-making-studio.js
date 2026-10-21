/* An illustrative make-up sequence. The curtain configurator remains the sole order authority. */
(() => {
  'use strict';
  const mounted = new WeakSet();
  const idPattern = /^[A-Za-z0-9][A-Za-z0-9-]{0,149}$/;
  const approvedImage = /^(?:https:\/\/curtainsuk-production-api\.vercel\.app\/room-visualiser\/(?:textures|fixed140)\/[a-f0-9]{64}\.(?:jpe?g|webp)|https:\/\/cdn\.shopify\.com\/s\/files\/1\/0256\/4551\/4861\/files\/cuk-fabric-[a-f0-9]{64}\.jpg)$/;
  const steps = [
    ['Start making', 'From fabric to finished curtain.', 'Follow a fabric width through the workroom, then see the curtain hanging in the preview below.'],
    ['Measure my fabric', 'Prepare the worktable.', 'Your chosen fabric rolls out as two unjoined widths, one for each curtain.'],
    ['Position the design', 'Measure the face fabric.', 'Guides mark the cloth. Your actual cut dimensions are calculated after you enter your measurements.'],
    ['Cut my fabric', 'Position the design.', 'Pattern placement is checked against the real fabric and your final dimensions.'],
    ['Prepare my lining', 'Cut the face fabric.', 'The two curtain panels are shown separately. No fabric widths are joined in this demonstration.'],
    ['Cut my lining', 'Prepare the lining.', 'Standard lining is measured separately from the face fabric.'],
    ['Make the hems', 'Cut the lining.', 'The lining pieces are prepared for each curtain.'],
    ['Add my lining', 'Make the hems.', 'The face fabric and lining hems are folded and stitched.'],
    ['Create my heading', 'Bring the layers together.', 'The prepared face and lining become one curtain on each side.'],
    ['Finish my curtains', 'Stitch the heading tape.', 'The tape is sewn across each panel. Its cords then gather the top into pencil pleats.'],
    ['See them hanging', 'Trim and finish.', 'Loose threads are cut away. The pair is checked and dressed before it is hung.'],
    ['See the remote', 'Your curtains, in motion.', 'Explore the approved render below. Enter your own measurements when you order.'],
  ];
  function mount(root) {
    if (mounted.has(root)) return;
    mounted.add(root);
    const id = root.dataset.fabricId;
    const table = root.querySelector('.cuk-making__table');
    const status = root.querySelector('[data-making-status]');
    const next = root.querySelector('[data-making-next]');
    const back = root.querySelector('[data-making-back]');
    const replay = root.querySelector('[data-making-replay]');
    const detail = root.querySelector('[data-making-detail]');
    const skip = root.querySelector('[data-making-skip]');
    const retry = root.querySelector('[data-making-retry]');
    const progress = root.querySelector('[data-making-progress]');
    const pieces = root.querySelectorAll('.cuk-making__piece img');
    const cloth = root.querySelector('.cuk-making__cloth img');
    let step = 0;
    let ready = false;
    let loading = false;
    let pattern = null;
    const render = () => {
      const [action, title, description] = steps[step];
      table.dataset.makingStage = String(step);
      root.querySelector('[data-making-title]').textContent = title;
      root.querySelector('[data-making-description]').textContent = step === 3 && pattern === 'plain'
        ? 'A plain fabric needs no motif alignment. Your final cut sizes are checked after you enter your measurements.' : description;
      root.querySelector('[data-making-counter]').textContent = step ? `Step ${step} of ${steps.length - 1}` : 'Ready to begin';
      next.firstChild.textContent = `${step === 2 && pattern === 'plain' ? 'Cut my fabric' : action} `;
      next.disabled = !ready;
      back.disabled = step === 0;
      replay.disabled = !ready || step === 0 || step === steps.length - 1;
      detail.disabled = !ready || step === 0;
      skip.disabled = !ready || step === steps.length - 1;
      progress.replaceChildren(...steps.slice(1).map((item, index) => {
        const marker = document.createElement('li');
        marker.setAttribute('aria-label', `${index + 1}. ${item[1]}${index + 1 < step ? ', completed' : index + 1 === step ? ', current' : ''}`);
        marker.className = index + 1 < step ? 'is-done' : index + 1 === step ? 'is-current' : '';
        return marker;
      }));
    };
    const move = value => {
      if (pattern === 'plain' && value === 3) value = value < step ? 2 : 4;
      step = Math.max(0, Math.min(steps.length - 1, value));
      render();
      if (step === steps.length - 1) {
        root.closest('[data-cuk-canonical-fabric-detail]')?.querySelector('#cuk-curtain-demo')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      }
    };
    next.addEventListener('click', () => move(step === steps.length - 1 ? step : step + 1));
    back.addEventListener('click', () => move(step - 1));
    skip.addEventListener('click', () => move(steps.length - 1));
    replay.addEventListener('click', () => {
      const current = step;
      table.dataset.makingStage = '0';
      void table.offsetWidth;
      requestAnimationFrame(() => { table.dataset.makingStage = String(current); });
    });
    detail.addEventListener('click', () => {
      const selected = table.classList.toggle('is-zoomed');
      detail.setAttribute('aria-pressed', String(selected));
      detail.textContent = selected ? 'Close detail' : 'View detail';
    });
    retry.addEventListener('click', load);
    async function load() {
      if (loading || ready || !idPattern.test(id || '')) return;
      loading = true;
      retry.hidden = true;
      status.textContent = 'Checking the approved fabric render…';
      try {
        const response = await fetch(`/apps/curtainsuk-decision/catalog?view=retail&visualiser=1&fabric=${encodeURIComponent(id)}`, {
          credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw Error('Catalogue unavailable');
        const { fabric } = await response.json();
        const image = fabric?.roomPreview?.worktableImageUrl;
        if (fabric?.id !== id || fabric.roomPreview?.available !== true || !approvedImage.test(image || '')) throw Error('Render unavailable');
        await new Promise((resolve, reject) => { const preload = new Image(); preload.onload = resolve; preload.onerror = reject; preload.src = image; });
        cloth.src = image;
        pieces.forEach(piece => { piece.src = image; });
        pattern = fabric.verticalRepeatMm === 0 || (Array.isArray(fabric.patterns) && fabric.patterns.some(value => value === 'plain' || value === 'textured plain')) ? 'plain' : 'patterned';
        ready = true;
        status.textContent = 'Ready. This is a visual making demonstration of your selected fabric.';
        render();
      } catch {
        status.textContent = 'The making preview is temporarily unavailable. You can still configure and order this fabric.';
        retry.hidden = false;
      } finally { loading = false; }
    }
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(); }
      }, { rootMargin: '220px' });
      observer.observe(root);
    } else load();
    render();
  }
  function start(scope = document) { scope.querySelectorAll('[data-cuk-making-studio]').forEach(mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => start(), { once: true });
  else start();
  document.addEventListener('shopify:section:load', event => start(event.target));
})();
