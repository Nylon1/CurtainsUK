(() => {
  'use strict';
  const roles = {
    james: { name: 'James', opening: 'Which track or pole are you fitting?', examples: 'ceiling fitting · a bay window · brackets · a named track model' },
    noah: { name: 'Noah', opening: 'What type of window are you measuring?', examples: 'standard window · bay · patio doors · apex' },
    natalie: { name: 'Natalie', opening: 'What type of window do you need help with?', examples: 'apex · gable · bay · another unusual shape' },
    ben: { name: 'Ben', opening: 'What acoustic improvement are you looking for?', examples: 'reducing echo · noise coming in · noise travelling out' }
  };
  const endpoint = '/apps/curtainsuk-decision/specialists';
  const validSession = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  document.querySelectorAll('[data-advisory-dialog]').forEach(dialog => {
    const panel = dialog.querySelector('[data-specialist-chat]');
    if (!panel) return;
    const publicMode = panel.dataset.specialistPublic === 'true';
    const find = name => panel.querySelector(`[data-specialist-${name}]`);
    const heading = find('heading'), opening = find('opening'), examples = find('examples');
    const consent = find('consent'), signin = find('signin'), start = find('start'), save = find('save'), remove = find('delete');
    const deleteConfirm = find('delete-confirm'), deleteYes = find('delete-yes'), deleteCancel = find('delete-cancel');
    const log = find('log'), form = find('form'), input = find('input'), send = find('send');
    const recovery = find('recovery'), recoveryInput = find('recovery-input'), recover = find('recover'), recoveryOutput = find('recovery-output');
    const status = find('status'), error = find('error');
    const preview = ['example', 'format', 'composer', 'privacy'].map(name => dialog.querySelector(`.cukad-room__${name}`));
    let adviser = null, session = null, csrf = '', binding = null, busy = false;
    const storageKey = () => binding && adviser ? `curtainsuk-specialist-preview:${adviser}:${binding}` : null;
    const remembered = () => { try { return localStorage.getItem(storageKey()); } catch { return null; } };
    const remember = id => { try { if (id) localStorage.setItem(storageKey(), id); else localStorage.removeItem(storageKey()); } catch {} };
    const say = (message, failed = false) => { error.hidden = !failed; error.textContent = failed ? message : ''; status.textContent = failed ? '' : message; };
    const setBusy = value => { busy = value; [start, save, remove, send, recover, input].forEach(node => { node.disabled = value; }); };
    const safeSource = value => {
      try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && url.href.length <= 1200 ? url.href : null; } catch { return null; }
    };
    const clear = () => { session = null; consent.checked = false; recoveryInput.value = ''; recoveryOutput.textContent = ''; recoveryOutput.hidden = true; deleteConfirm.hidden = true; log.replaceChildren(); render(); };
    const render = () => {
      log.replaceChildren();
      if (adviser && session) {
        if (!(session.messages || []).length) {
          const first = document.createElement('article'), title = document.createElement('strong'), copy = document.createElement('p');
          title.textContent = `${roles[adviser].name} · AI adviser`; copy.textContent = roles[adviser].opening;
          first.append(title, copy); log.append(first);
        }
        (session.messages || []).forEach(message => {
          const article = document.createElement('article'), who = document.createElement('strong'), text = document.createElement('p');
          who.textContent = message.role === 'assistant' ? `${roles[adviser].name} · AI adviser` : 'You'; text.textContent = message.text;
          article.append(who, text);
          if (message.role === 'assistant' && Array.isArray(message.citations) && message.citations.length) {
            const sources = document.createElement('div'); sources.className = 'cukad-specialist__sources';
            const label = document.createElement('span'); label.textContent = 'Sources: '; sources.append(label);
            message.citations.forEach(source => { const url = safeSource(source.url); if (!url) return; const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = String(source.title || new URL(url).hostname).slice(0, 150); sources.append(link); });
            article.append(sources);
          }
          log.append(article);
        });
        log.scrollTop = log.scrollHeight;
      }
      start.hidden = !!session || !binding; save.hidden = !session; remove.hidden = !session; form.hidden = !session;
      consent.closest('label').hidden = !!session || !binding;
      recovery.hidden = !binding; signin.hidden = !!binding;
    };
    const loginLink = () => {
      if (!adviser) return;
      const returnTo = new URL('/pages/meet-our-team', location.origin);
      returnTo.searchParams.set('specialist_return', adviser);
      const login = new URL('/customer_authentication/login', location.origin);
      login.searchParams.set('return_to', returnTo.pathname + returnTo.search);
      signin.href = login.pathname + login.search;
    };
    const bootstrap = async () => {
      const response = await fetch(`${endpoint}?adviser=${encodeURIComponent(adviser)}`, { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.csrf !== 'string' || !/^[a-f0-9]{32}$/.test(data.ownerBinding || '')) {
        csrf = ''; binding = null; clear(); loginLink();
        throw Error(response.status === 401 ? 'Please sign in to your customer account.' : publicMode ? 'This consultation is unavailable right now.' : 'This private consultation is unavailable right now.');
      }
      if (binding && binding !== data.ownerBinding) clear();
      binding = data.ownerBinding; csrf = data.csrf; render();
    };
    const request = async (action, extra = {}, id = crypto.randomUUID()) => {
      await bootstrap();
      const command = { adviser, action, requestId: id, sessionId: session?.id ?? null, revision: session?.revision ?? null, text: null, context: null, consent: false, recoveryToken: null, ...extra };
      const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Advisory-CSRF': csrf }, body: JSON.stringify(command) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(data.error === 'BUDGET_EXHAUSTED' ? 'The consultation limit has been reached. Your draft is still here.' : data.error === 'REVISION_CONFLICT' ? 'This conversation changed in another tab. Reopen it before continuing.' : 'The consultation could not be saved. Your draft is still here.');
      if (data.session) {
        if (!validSession.test(data.session.id) || data.session.adviser !== adviser || (session && action !== 'start' && action !== 'recover' && data.session.id !== session.id)) throw Error('The returned consultation did not match this adviser.');
        session = data.session; remember(session.id); render();
      }
      return data;
    };
    const run = async (operation, pending) => { if (busy) return false; setBusy(true); say(pending); try { const result = await operation(); say(typeof result === 'string' ? result : ''); return true; } catch (cause) { say(cause.message || 'This consultation is unavailable.', true); return false; } finally { setBusy(false); } };
    dialog.addEventListener('curtainsuk:jane-room-open', event => {
      const next = event.detail?.identity;
      panel.hidden = !Object.hasOwn(roles, next);
      if (panel.hidden) { adviser = null; return; }
      adviser = next; session = null; binding = null; csrf = ''; log.replaceChildren();
      heading.textContent = `${roles[adviser].name} · AI ${adviser === 'ben' ? 'acoustic' : adviser === 'noah' ? 'measuring' : adviser === 'james' ? 'fitting' : 'specialist window'} adviser`;
      opening.textContent = roles[adviser].opening; examples.textContent = roles[adviser].examples;
      preview.forEach(node => { if (node) node.hidden = true; });
      loginLink(); render(); heading.focus({ preventScroll: true });
      run(async () => {
        await bootstrap();
        const id = remembered();
        if (id && validSession.test(id)) { try { await request('resume', { sessionId: id, revision: 0 }); } catch { remember(null); } }
      }, `Connecting to ${roles[adviser].name}…`);
    });
    start.addEventListener('click', async () => { if (!consent.checked) { say('Please agree before saving a consultation.', true); return; } if (await run(() => request('start', { consent: true }), 'Opening your consultation…')) input.focus(); });
    form.addEventListener('submit', async event => { event.preventDefault(); const text = input.value.trim(); if (!text || !session) return; if (await run(() => request('message', { text }), `${roles[adviser].name} is considering your question…`)) input.value = ''; input.focus(); });
    save.addEventListener('click', () => run(async () => { const data = await request('save', { consent: true }); recoveryOutput.textContent = data.recoveryToken ? `Keep this one-use code privately: ${data.recoveryToken}` : 'No recovery code was returned.'; recoveryOutput.hidden = false; }, 'Creating a recovery code…'));
    recover.addEventListener('click', () => { const code = recoveryInput.value.trim(); if (!/^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/.test(code)) { say('Enter a valid recovery code.', true); return; } run(async () => { await request('recover', { sessionId: null, revision: null, recoveryToken: code, consent: true }); recoveryInput.value = ''; }, 'Recovering your consultation…'); });
    remove.addEventListener('click', () => { if (!session) return; deleteConfirm.hidden = false; deleteCancel.focus(); });
    deleteCancel.addEventListener('click', () => { deleteConfirm.hidden = true; remove.focus(); });
    deleteYes.addEventListener('click', async () => { if (!session) return; if (await run(async () => { await request('delete'); remember(null); clear(); return 'Consultation deleted.'; }, 'Deleting your consultation…')) start.focus(); });
    const recheck = () => { if (!dialog.open || panel.hidden || document.hidden || busy) return; run(async () => { await bootstrap(); }, 'Checking your customer session…'); };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) recheck(); });
  });
})();
