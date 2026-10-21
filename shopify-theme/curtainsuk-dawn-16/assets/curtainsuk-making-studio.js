(() => {
  'use strict';
  const mounted = new WeakSet();
  const idPattern = /^[A-Za-z0-9][A-Za-z0-9-]{0,149}$/;
  const approvedImage = /^(?:https:\/\/curtainsuk-production-api\.vercel\.app\/room-visualiser\/(?:textures|fixed140)\/[a-f0-9]{64}\.(?:jpe?g|webp)|https:\/\/cdn\.shopify\.com\/s\/files\/1\/0256\/4551\/4861\/files\/cuk-fabric-[a-f0-9]{64}\.jpg)$/;
  function makePlan(source) {
    if (!source || !['calibrated', 'colour-only'].includes(source.scaleKind)) throw Error('Scale unavailable');
    const { fabricWidthCm: width, imageWidthCm: imageWidth, imageHeightCm: imageHeight, imageTopCm: imageTop, exampleCutCm: face } = source;
    if (![width, imageWidth, imageHeight, imageTop, face].every(Number.isFinite) || width < 70 || width > 500 || imageWidth < width || imageTop < 0 || ![100, 120].includes(face) || imageTop + face > imageHeight + .001) throw Error('Invalid physical coverage');
    return { width, face, lining: face - 10, finished: face - 20, liningFinished: face - 22, top: 5, faceHem: 15, liningHem: 7, side: 2.5, imageWidth, imageHeight, imageTop, scaleKind: source.scaleKind, scale: Math.min(400 / width, 350 / face) };
  }
  function drawScene(root, stage, plan, image, copy) {
    const { width: w, face: l, lining: ll, finished: drop, top, side, scale: s } = plan;
    const drawing = root.querySelector('[data-making-drawing]');
    const n = value => Math.round(value * 10000) / 10000;
    const fmt = value => new Intl.NumberFormat(document.documentElement.lang || 'en-GB', { maximumFractionDigits: 1 }).format(value);
    const txt = (x, y, value, extra = '') => `<text x="${n(x)}" y="${n(y)}" ${extra} data-scene-text="${value}"></text>`;
    const fabric = (x, y, width, height, cropX = 0, cropY = 0) => `<svg x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" viewBox="${n(cropX)} ${n(cropY)} ${n(width)} ${n(height)}" overflow="hidden"><image href="${image}" x="0" y="${-plan.imageTop}" width="${plan.imageWidth}" height="${plan.imageHeight}" preserveAspectRatio="none"/></svg>`;
    const panel = (x = 0, y = 0) => `<rect x="${x + 1}" y="${y + 2}" width="${w}" height="${l}" fill="#223d31" opacity=".12"/>${fabric(x, y, w, l)}<path d="M${x} ${y}v${l}M${x + w} ${y}v${l}" stroke="#fff9ed" stroke-width=".6"/>`;
    const seam = (path, name) => `<path d="${path}" class="cuk-making__seam ${name}"/>`;
    const needle = (x, y, name) => `<g class="${name}"><g transform="translate(${n(x)} ${n(y)}) scale(.3)"><g class="cuk-making__needle-bob"><use href="#cuk-m-needle"/></g></g></g>`;
    const shears = (x, y, name, size = .35) => `<g class="${name}"><g transform="translate(${n(x)} ${n(y)}) rotate(180) scale(${size})" fill="none" stroke-linecap="round" stroke-linejoin="round">${root.querySelector('#cuk-m-scissors').innerHTML}</g></g>`;
    const roll = (width, lining = false) => `<g class="cuk-making__roll-feed" transform="translate(-3 -18)"><rect x="-5" y="5" width="${width + 16}" height="5" rx="2" fill="#aa9470"/><svg width="${width + 6}" height="15" viewBox="0 0 ${width + 6} 15" overflow="hidden"><rect width="${width + 6}" height="15" rx="7" fill="url(#cuk-m-lining)"/>${lining ? '' : fabric(3, 0, width, 15)}<rect width="${width + 6}" height="15" rx="7" fill="url(#cuk-m-cylinder)"/></svg><ellipse cx="${width + 3}" cy="7.5" rx="3" ry="6.5" fill="#dcd2b9" stroke="#a99878" stroke-width=".6"/><ellipse cx="${width + 3}" cy="7.5" rx="1.2" ry="3" fill="#8f7b57"/></g>`;
    const ruler = (length, width) => {
      const ticks = Array.from({ length: length + 1 }, (_, i) => `<path d="M0 ${length - i}h${i % 10 === 0 ? 5 : i % 5 === 0 ? 3.5 : 2}" stroke="#756135" stroke-width=".25"/>${(i % 20 === 0 || i === length) ? `<text x="7" y="${length - i + 1}" style="font-size:3.4px;fill:#584827">${i}</text>` : ''}`).join('');
      return `<g class="cuk-making__vertical-tape" transform="translate(-19 0)"><rect width="15" height="${length}" rx=".7" fill="#e9cc83" stroke="#b39550" stroke-width=".4"/>${ticks}<rect y="${length - 1.2}" width="15" height="1.2" fill="#aab0a5"/>${txt(7.5, -5, 'cm', 'text-anchor="middle"')}</g><path d="M-22 0H${width}M-22 ${length}H0" class="cuk-making__measure-line"/>${txt(width / 2, length + 12, stage === 4 ? 'lining_width_value' : 'width_value', 'text-anchor="middle"')}${txt(width + 9, length / 2, 'length_value', `transform="rotate(90 ${n(width + 9)} ${n(length / 2)})" text-anchor="middle"`)}`;
    };
    const tape = width => `<rect width="${width}" height="7.5" fill="#faf7e8" stroke="#c9bfa3" stroke-width=".4"/><path d="M0 2.5H${width}M0 5H${width}" stroke="#a98c52" stroke-width=".35"/>${Array.from({ length: Math.floor(width / 5) }, (_, i) => `<path d="M${i * 5 + 2} 1.5v4h1.6v-4" stroke="#b8ac8d" stroke-width=".3" fill="none"/>`).join('')}`;
    const faceLayer = () => `<defs><clipPath id="cuk-m-face-edge"><rect class="cuk-making__face-edge" y="${stage === 8 ? top : 0}" width="${w}" height="${stage === 8 ? drop : l}"/></clipPath></defs><g clip-path="url(#cuk-m-face-edge)">${panel()}<rect width="${w}" height="${l}" fill="#f5f0e3" opacity=".25"/></g>`;
    const liningLayer = () => `<defs><clipPath id="cuk-m-lining-edge"><rect class="cuk-making__lining-edge" y="${stage === 8 ? top : 0}" width="${w}" height="${stage === 8 ? plan.liningFinished : ll}"/></clipPath><clipPath id="cuk-m-lining-lift"><rect class="cuk-making__lining-peel" width="${w}" height="${ll}"/></clipPath></defs><g class="cuk-making__lining-arrive"><g clip-path="url(#cuk-m-lining-lift)"><g clip-path="url(#cuk-m-lining-edge)"><rect x="${side}" y="0" width="${w - side * 2}" height="${ll}" fill="url(#cuk-m-lining)" stroke="#d4c9b1" stroke-width=".4"/></g></g></g>`;
    const sideSeams = () => seam(`M${side} ${stage === 8 ? top : 0}V${stage >= 7 ? ll - plan.liningHem : ll}`, 'cuk-making__side-seam-left') + seam(`M${w - side} ${stage === 8 ? top : 0}V${stage >= 7 ? ll - plan.liningHem : ll}`, 'cuk-making__side-seam-right');
    const faceFoldTop = l - plan.faceHem * 1.5;
    const liningFoldTop = ll - plan.liningHem * 1.5;
    const faceHem = () => `<g class="cuk-making__face-fold" style="--fold-turn:${plan.faceHem / 2}px"><g transform="translate(0 ${faceFoldTop + plan.faceHem / 2}) scale(1 -1)">${fabric(0, 0, w, plan.faceHem / 2, 0, l - plan.faceHem / 2)}</g><path d="M0 ${faceFoldTop}H${w}V${l - plan.faceHem}H0Z" fill="#f7efdd" fill-opacity=".48" stroke="#b4a487" stroke-width=".4"/></g>${seam(`M1 ${faceFoldTop + 1}H${w - 1}`, 'cuk-making__face-hem-stitch')}`;
    const liningHem = () => `<g class="cuk-making__lining-hem-reveal"><g class="cuk-making__lining-fold-new" style="--fold-turn:${plan.liningHem / 2}px"><path d="M${side} ${liningFoldTop}H${w - side}V${ll - plan.liningHem}H${side}Z" fill="url(#cuk-m-fold)" stroke="#c4b89d" stroke-width=".3"/></g>${seam(`M${side + 1} ${liningFoldTop + 1}H${w - side - 1}`, 'cuk-making__lining-hem-stitch')}</g>`;
    let markup = '';
    let tx = 380 - w * s / 2;
    let ty = 162;
    let sceneScale = s;
    const isLining = stage === 4 || stage === 5;
    const cutLength = isLining ? ll : l;
    const cutWidth = isLining ? w - side * 2 : w;
    drawing.style.setProperty('--cut-travel', `${cutWidth}px`);
    drawing.style.setProperty('--sew-short-width', `${w - side * 2 - 2}px`);
    drawing.style.setProperty('--sew-length', `${ll}px`);
    drawing.style.setProperty('--face-fold-y', `${l}px`);
    drawing.style.setProperty('--lining-fold-y', `${ll}px`);
    drawing.style.setProperty('--half-width', `${w / 2}px`);
    drawing.style.setProperty('--cord-start', `${w}px`);
    drawing.style.setProperty('--face-first-turn', (l - plan.faceHem / 2) / l);
    drawing.style.setProperty('--face-final-turn', (l - plan.faceHem) / l);
    drawing.style.setProperty('--lining-first-turn', (ll - plan.liningHem / 2) / ll);
    drawing.style.setProperty('--lining-final-turn', (ll - plan.liningHem) / ll);
    if (stage === 1) {
      sceneScale = Math.min(510 / (2 * w + 18), 320 / l);
      tx = 380 - (2 * w + 18) * sceneScale / 2;
      ty = 190;
      markup = `${panel()}<g transform="translate(${w + 18} 0)">${panel()}</g><path d="M0-6v-6h${w}v6M${w + 18}-6v-6h${w}v6M-7 0h-6v${l}h6" class="cuk-making__measure-line"/>${txt(w / 2, -18, 'width_value', 'text-anchor="middle"')}${txt(w * 1.5 + 18, -18, 'width_value', 'text-anchor="middle"')}${txt(-22, l / 2, 'face_value', `transform="rotate(-90 -22 ${l / 2})" text-anchor="middle"`)}${txt(w / 2, l + 14, 'left', 'text-anchor="middle"')}${txt(w * 1.5 + 18, l + 14, 'right', 'text-anchor="middle"')}`;
    } else if (stage <= 5) {
      const sheet = isLining ? `<rect width="${cutWidth}" height="${cutLength}" fill="url(#cuk-m-lining)" stroke="#c8bea8" stroke-width=".4"/>` : panel();
      markup = `<g class="cuk-making__cut-piece"><g class="cuk-making__unroll">${sheet}</g></g>${roll(cutWidth, isLining)}${ruler(cutLength, cutWidth)}`;
      if (stage === 3 || stage === 5) markup += `<path d="M0 0H${cutWidth}" class="cuk-making__cut-guide"/><path d="M0 0H${cutWidth}" pathLength="1" class="cuk-making__cut-stroke"/>${shears(0, 0, 'cuk-making__shears-travel')}${txt(cutWidth / 2, -27, 'cut_value', 'text-anchor="middle"')}`;
    } else if (stage <= 8) {
      markup = faceLayer() + (stage >= 7 ? faceHem() : '') + liningLayer() + (stage >= 7 ? liningHem() : '') + sideSeams();
      if (stage === 6) markup += needle(side, 0, 'cuk-making__sew-side-one') + needle(w - side, 0, 'cuk-making__sew-side-two');
      if (stage === 7) markup += needle(1, faceFoldTop + 1, 'cuk-making__sew-hem') + needle(side + 1, liningFoldTop + 1, 'cuk-making__sew-lining-hem');
      if (stage === 8) markup += `<g class="cuk-making__new-tape" transform="translate(${side} ${top})">${tape(w - side * 2)}</g>${seam(`M${side + 1} ${top + .8}H${w - side - 1}`, 'cuk-making__tape-stitch-one')}${seam(`M${side + 1} ${top + 6.7}H${w - side - 1}`, 'cuk-making__tape-stitch-two')}${needle(side + 1, top + .8, 'cuk-making__sew-tape-one')}${needle(side + 1, top + 6.7, 'cuk-making__sew-tape-two')}`;
      markup += txt(w / 2, l + 13, stage === 6 ? 'layers' : stage === 7 ? 'hem_label' : 'tape_label', 'text-anchor="middle"');
    } else if (stage === 9) {
      markup = `<g class="cuk-making__new-gather">${fabric(0, 0, w - side * 2, drop, side, top)}<rect class="cuk-making__new-folds" width="${w - side * 2}" height="${drop}" fill="url(#cuk-m-folds)"/><g>${tape(w - side * 2)}</g><rect class="cuk-making__new-folds" width="${w - side * 2}" height="7.5" fill="url(#cuk-m-pencil)"/></g><g class="cuk-making__pull-cords"><path d="M${w - 5} 2.5h20M${w - 5} 5h20" stroke="#a3824f" stroke-width=".6"/><path d="M${w + 15} 0v8m3-4h10m-3-2 3 2-3 2" fill="none" stroke="#436452" stroke-width=".6"/></g>${txt(w / 2, drop + 14, 'gather_label', 'text-anchor="middle"')}`;
    } else {
      const flat = w - 2 * side;
      const gathered = flat / 2;
      const gap = 12;
      tx = 380 - (flat + gap) * s / 2;
      markup = `<rect x="-8" y="-7" width="${flat + gap + 16}" height="${drop + 12}" rx="2" fill="#e7e8de"/><rect x="${gathered / 2}" y="-1" width="${gathered + gap}" height="${drop - 4}" fill="#dae5e0" stroke="#fffdf4" stroke-width="3"/><path d="M${gathered + gap / 2} 0v${drop - 5}" stroke="#fffdf4" stroke-width="2"/><path d="M-9-7H${flat + gap + 9}" stroke="#7d887a" stroke-width="2.4" stroke-linecap="round"/>`;
      const finished = `<g class="cuk-making__dress-panel">${fabric(0, 0, flat, drop, side, top)}<rect width="${flat}" height="${drop}" fill="url(#cuk-m-folds)"/><rect width="${flat}" height="7.5" fill="url(#cuk-m-pencil)"/><path d="M0 ${drop - 1}H${flat}" stroke="#8b7d66" stroke-width=".5"/></g>`;
      markup += `<g transform="scale(.5 1)">${finished}</g><g transform="translate(${gathered + gap} 0) scale(.5 1)">${finished}</g>`;
      for (const offset of [0, gathered + gap]) {
        for (let i = 4; i < gathered; i += 10) markup += `<path class="cuk-making__hook-lift" d="M${offset + i}-1v-4q0-3 2-2" fill="none" stroke="#657564" stroke-width=".7"/>`;
      }
      markup += `<path class="cuk-making__thread-ends" d="M${gathered} ${drop - 1}q6 4 2 9M${gathered + gap} ${drop - 1}q-6 4-2 9" fill="none" stroke="#967643" stroke-width=".6"/>${shears(gathered, drop + 3, 'cuk-making__finishing-scissors', .25)}<path d="M-9 0h-5v${drop}h5" class="cuk-making__measure-line"/>${txt(-21, drop / 2, 'finished_value', `transform="rotate(-90 -21 ${drop / 2})" text-anchor="middle"`)}${txt((flat + gap) / 2, drop + 18, 'finished_label', 'text-anchor="middle"')}`;
    }
    drawing.setAttribute('transform', `translate(${n(tx)} ${ty}) scale(${n(sceneScale)})`);
    drawing.innerHTML = markup;
    drawing.querySelectorAll('text').forEach(el => { if (el.hasAttribute('data-scene-text')) el.style.fontSize = `${13 / sceneScale}px`; });
    const words = { cm: 'cm', width_value: `${fmt(w)} cm`, lining_width_value: `${fmt(w - side * 2)} cm`, face_value: `${fmt(l)} cm`, length_value: `${fmt(cutLength)} cm`, cut_value: copy.cut_at.replace('{length}', fmt(cutLength)), left: copy.left_panel, right: copy.right_panel, layers: copy.layers_label, hem_label: copy.hem_label, tape_label: copy.tape_label, gather_label: copy.gather_label, finished_value: `${fmt(drop)} cm`, finished_label: copy.finished_label };
    drawing.querySelectorAll('[data-scene-text]').forEach(el => { el.textContent = words[el.dataset.sceneText] || ''; });
  }
  function mount(root) {
    if (mounted.has(root)) return;
    const copy = JSON.parse(root.querySelector('[data-making-copy]').textContent);
    mounted.add(root);
    const id = root.dataset.fabricId;
    const table = root.querySelector('.cuk-making__table');
    const scene = root.querySelector('[data-making-scene]');
    const status = root.querySelector('[data-making-status]');
    const next = root.querySelector('[data-making-next]');
    const back = root.querySelector('[data-making-back]');
    const replay = root.querySelector('[data-making-replay]');
    const detail = root.querySelector('[data-making-detail]');
    const skip = root.querySelector('[data-making-skip]');
    const retry = root.querySelector('[data-making-retry]');
    const progress = root.querySelector('[data-making-progress]');
    const reduce = root.querySelector('[data-making-reduce]');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const resumeStep = Number(new URLSearchParams(location.search).get('makingStep'));
    let step = Number.isInteger(resumeStep) && resumeStep >= 1 && resumeStep <= copy.steps.length ? resumeStep - 1 : 0;
    let ready = false;
    let loading = false;
    let plan = null;
    let sourceImage = null;
    let picker = null;
    let pickerFrame = null;
    let pickerStatus = null;
    let pickerToken = null;
    let pickerTimeout = null;
    let pickerReady = false;
    let selection = null;
    let opener = null;
    const closePicker = () => picker?.close();
    root.querySelectorAll('[data-making-change]').forEach(link => link.addEventListener('click', event => {
      if (!window.HTMLDialogElement || !crypto.randomUUID) return;
      event.preventDefault(); opener = link;
      if (!picker) {
        picker = document.createElement('dialog'); picker.className = 'cuk-making__picker';
        picker.setAttribute('aria-label', copy.picker_title);
        const head = document.createElement('div'); head.className = 'cuk-making__picker-head';
        const title = document.createElement('h2'); title.textContent = copy.picker_title;
        const close = document.createElement('button'); close.type = 'button'; close.textContent = copy.picker_close;
        close.addEventListener('click', closePicker); head.append(title, close);
        pickerStatus = document.createElement('p'); pickerStatus.className = 'cuk-making__picker-status'; pickerStatus.setAttribute('role', 'status');
        const fallback = document.createElement('a'); fallback.href = link.href; fallback.target = '_blank'; fallback.rel = 'noopener'; fallback.textContent = copy.picker_fallback;
        const bar = document.createElement('div'); bar.className = 'cuk-making__picker-bar'; bar.append(pickerStatus, fallback);
        pickerFrame = document.createElement('iframe'); pickerFrame.title = copy.picker_title;
        pickerToken = crypto.randomUUID();
        const destination = new URL('/pages/fabric-library', location.origin);
        destination.searchParams.set('view', 'browse-fabrics'); destination.searchParams.set('makingPicker', pickerToken);
        const themePreview = new URLSearchParams(location.search).get('preview_theme_id');
        if (/^\d+$/.test(themePreview || '')) destination.searchParams.set('preview_theme_id', themePreview);
        pickerFrame.src = destination.href;
        picker.append(head, bar, pickerFrame); root.append(picker);
        pickerStatus.textContent = copy.picker_loading;
        pickerTimeout = setTimeout(() => { pickerStatus.textContent = copy.picker_slow; }, 20000);
        picker.addEventListener('close', () => { selection?.abort(); selection = null; document.documentElement.classList.remove('cuk-making-picker-open'); opener?.focus({ preventScroll: true }); });
      }
      if (pickerReady) pickerStatus.textContent = copy.picker_hint;
      document.documentElement.classList.add('cuk-making-picker-open'); picker.showModal();
    }));
    window.addEventListener('message', async event => {
      if (!picker || event.source !== pickerFrame?.contentWindow || event.origin !== location.origin || event.data?.token !== pickerToken) return;
      if (event.data.type === 'cuk:making-picker-ready') { pickerReady = true; clearTimeout(pickerTimeout); pickerStatus.textContent = copy.picker_hint; return; }
      if (!picker.open) return;
      if (event.data.type === 'cuk:making-picker-close') { closePicker(); return; }
      if (event.data.type !== 'cuk:making-fabric' || !idPattern.test(event.data.fabricId || '')) return;
      selection?.abort(); const attempt = new AbortController(); selection = attempt;
      const timeout = setTimeout(() => attempt.abort(), 15000);
      pickerStatus.textContent = copy.picker_checking;
      try {
        const response = await fetch(`/apps/curtainsuk-decision/catalog?view=retail&visualiser=1&fabric=${encodeURIComponent(event.data.fabricId)}`, { credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: attempt.signal });
        if (!response.ok) throw Error('Catalogue unavailable');
        const { fabric } = await response.json();
        if (fabric?.id !== event.data.fabricId || fabric.roomPreview?.available !== true || !approvedImage.test(fabric.roomPreview?.worktableImageUrl || '')) throw Error('Render unavailable');
        makePlan(fabric.roomPreview.worktableSource);
        const destination = new URL(fabric.fabricProfileUrl);
        if (destination.origin !== 'https://www.curtainsuk.com' || !/^\/pages\/fabric\/[a-z0-9-]+$/i.test(destination.pathname) || !destination.pathname.startsWith(`/pages/fabric/${fabric.id}-`)) throw Error('Invalid fabric destination');
        if (selection !== attempt || attempt.signal.aborted || !picker.open) return;
        const handover = new URL(destination.pathname, location.origin); handover.searchParams.set('makingStep', String(step + 1)); handover.hash = 'cuk-making-studio';
        const preview = new URLSearchParams(location.search).get('preview_theme_id');
        if (/^\d+$/.test(preview || '')) handover.searchParams.set('preview_theme_id', preview);
        location.assign(handover.href);
      } catch {
        if (selection === attempt && picker.open) pickerStatus.textContent = copy.picker_unavailable;
      } finally { clearTimeout(timeout); }
    });
    const markers = copy.steps.map((item, index) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${String(index + 1).padStart(2, '0')}  ${item.short}`;
      button.addEventListener('click', () => move(index));
      li.append(button);
      return li;
    });
    progress.replaceChildren(...markers);
    function render() {
      const item = copy.steps[step];
      table.dataset.makingStage = String(step + 1);
      const description = plan ? item.description.replaceAll('{face}', plan.face).replaceAll('{lining}', plan.lining).replaceAll('{finished}', plan.finished) : copy.loading;
      scene.setAttribute('aria-label', `${item.title} ${description}`);
      root.querySelector('[data-making-title]').textContent = item.title;
      root.querySelector('[data-making-description]').textContent = description;
      root.querySelector('[data-making-caption]').textContent = item.caption;
      root.querySelector('[data-making-counter]').textContent = copy.step_label.replace('{step}', step + 1).replace('{total}', copy.steps.length);
      root.querySelector('[data-making-next-label]').textContent = step === copy.steps.length - 1 ? copy.restart : copy.steps[step + 1].action;
      next.disabled = !ready;
      back.disabled = !ready || step === 0;
      replay.disabled = !ready;
      detail.disabled = !ready;
      skip.disabled = !ready || step === copy.steps.length - 1;
      markers.forEach((marker, index) => {
        marker.className = index < step ? 'is-done' : index === step ? 'is-current' : '';
        const button = marker.firstElementChild;
        button.disabled = !ready;
        if (index === step) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      root.querySelector('[data-making-measurements]').hidden = step !== 0 || !plan;
      if (plan) drawScene(root, step + 1, plan, sourceImage, copy);
    }
    function move(value) {
      if (!ready) return;
      step = Math.max(0, Math.min(copy.steps.length - 1, value));
      render();
      if (matchMedia('(max-width: 720px)').matches) table.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
    next.addEventListener('click', () => move(step === copy.steps.length - 1 ? 0 : step + 1));
    back.addEventListener('click', () => move(step - 1));
    skip.addEventListener('click', () => move(copy.steps.length - 1));
    replay.addEventListener('click', () => {
      render();
      if (matchMedia('(max-width: 720px)').matches) table.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    detail.addEventListener('click', () => {
      const selected = detail.getAttribute('aria-pressed') !== 'true';
      detail.setAttribute('aria-pressed', String(selected));
      detail.textContent = selected ? copy.close_detail : copy.detail;
      scene.setAttribute('viewBox', selected ? '110 85 540 460' : '0 0 760 620');
    });
    reduce.checked = motion.matches;
    const setMotion = () => { table.classList.toggle('is-still', reduce.checked); };
    reduce.addEventListener('change', setMotion);
    motion.addEventListener('change', event => { reduce.checked = event.matches; setMotion(); });
    setMotion();
    retry.addEventListener('click', load);
    async function load() {
      if (loading || ready) return;
      loading = true;
      retry.hidden = true;
      status.textContent = copy.loading;
      root.setAttribute('aria-busy', 'true');
      try {
        if (!idPattern.test(id || '')) throw Error('Invalid fabric');
        const shared = root.closest('[data-cuk-canonical-fabric-detail]')?.querySelector('[data-cuk-room-preview]')?.cukPreviewRequest;
        const { fabric } = await (shared || fetch(`/apps/curtainsuk-decision/catalog?view=retail&visualiser=1&fabric=${encodeURIComponent(id)}`, {
          credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000),
        }).then(response => {
          if (!response.ok) throw Error('Catalogue unavailable');
          return response.json();
        }));
        const image = fabric?.roomPreview?.worktableImageUrl;
        if (fabric?.id !== id || fabric.roomPreview?.available !== true || !approvedImage.test(image || '')) throw Error('Render unavailable');
        await new Promise((resolve, reject) => {
          const preload = new Image();
          const timeout = setTimeout(() => { preload.onload = null; preload.onerror = null; reject(Error('Image timed out')); }, 15000);
          preload.onload = () => { clearTimeout(timeout); resolve(); };
          preload.onerror = () => { clearTimeout(timeout); reject(Error('Image unavailable')); };
          preload.src = image;
        });
        plan = makePlan(fabric.roomPreview.worktableSource);
        sourceImage = image;
        const width = plan.width * 10;
        const widthLabel = typeof width === 'number' && Number.isFinite(width) && width > 0
          ? `${new Intl.NumberFormat(document.documentElement.lang || 'en-GB', { maximumFractionDigits: 1 }).format(width / 10)} cm` : copy.width_unknown;
        root.querySelectorAll('[data-making-width]').forEach(node => { node.textContent = widthLabel; });
        root.querySelector('[data-making-lengths]').textContent = copy.lengths_value.replace('{face}', plan.face).replace('{lining}', plan.lining);
        root.querySelector('[data-making-finished]').textContent = `${plan.finished} cm`;
        ready = true;
        status.textContent = copy.ready;
        root.classList.add('is-ready');
        render();
      } catch {
        status.textContent = copy.unavailable;
        root.querySelector('[data-making-description]').textContent = copy.unavailable;
        retry.hidden = false;
      } finally {
        loading = false;
        root.setAttribute('aria-busy', 'false');
      }
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
