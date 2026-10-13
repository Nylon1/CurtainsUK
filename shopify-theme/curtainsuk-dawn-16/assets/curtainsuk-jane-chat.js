// The theme setting and server release gates both default off.
(() => {
  'use strict';
  const endpoint = '/apps/curtainsuk-decision/jane';
  const storagePrefix = 'curtainsuk-jane-private-session-v2:';
  const commandBase = { text: null, context: null, consent: false, recoveryToken: null };
  const validFabric = /^[A-Za-z0-9][A-Za-z0-9-]{0,149}$/;
  const validSession = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  document.querySelectorAll('[data-advisory-dialog]').forEach(dialog => {
    const panel = dialog.querySelector('[data-jane-chat]');
    if (!panel) return;
    const find = name => panel.querySelector(`[data-jane-${name}]`);
    const log = find('log'), form = find('form'), input = find('input'), error = find('error'), status = find('status'), tools = find('tools');
    const starters = find('starters'), thinking = find('thinking'), signIn = find('signin');
    const consent = find('consent'), startButton = find('start'), deleteButton = find('delete');
    const fabricPanel = find('fabric'), fabricDescription = find('fabric-description'), fabricConsent = find('fabric-consent'), fabricShare = find('fabric-share');
    const preview = ['example', 'format', 'composer', 'privacy'].map(name => dialog.querySelector(`.cukad-room__${name}`));
    let session = null, csrf = '', ownerBinding = null, busy = false, pending = null, selectedFabric = null;
    let renderedSessionId = null, renderedMessages = [];
    const say = (value, isError = false) => { error.hidden = !isError; error.textContent = isError ? value : ''; status.textContent = isError ? '' : value; };
    const setBusy = value => { busy = value; startButton.disabled = value; deleteButton.disabled = value; input.disabled = value; form.querySelector('[data-jane-send]').disabled = value; fabricShare.disabled = value || !fabricConsent.checked; };
    const storageKey = () => ownerBinding ? storagePrefix + ownerBinding : null;
    try { localStorage.removeItem('curtainsuk-jane-private-session-v1'); } catch {}
    const remember = id => { try { const key = storageKey(); if (!key) return; if (id) localStorage.setItem(key, id); else localStorage.removeItem(key); } catch {} };
    const remembered = () => { try { const key = storageKey(); return key ? localStorage.getItem(key) : null; } catch { return null; } };
    const clearPrivateView = () => { session = null; pending = null; consent.checked = false; fabricConsent.checked = false; renderedSessionId = null; renderedMessages = []; log.replaceChildren(); render(); };
    const productUrl = value => { try { const url = new URL(value); return url.origin === 'https://www.curtainsuk.com' && /^\/pages\/fabric\/[a-z0-9-]+$/i.test(url.pathname) && !url.search && !url.hash ? url.href : null; } catch { return null; } };
    const imageUrl = value => { try { const url = new URL(value); return url.origin === 'https://cdn.shopify.com' && !url.search && !url.hash ? url.href : null; } catch { return null; } };
    const showFabricCard = (article, fabric) => {
      if (!fabric || !validFabric.test(fabric.id) || fabric.purchasable !== true) return;
      const url = productUrl(fabric.url), image = imageUrl(fabric.imageUrl);
      if (!url || !image) return;
      const card = document.createElement('div'); card.className = 'cukad-room__jane-card';
      const picture = document.createElement('img'); picture.src = image; picture.alt = ''; picture.loading = 'lazy';
      const detail = document.createElement('div'), title = document.createElement('strong');
      title.textContent = [fabric.design, fabric.colour].filter(Boolean).join(' · ') || fabric.id;
      const profile = document.createElement('a'); profile.href = url; profile.textContent = fabric.sampleAvailable === true ? 'View fabric and sample options' : 'View fabric';
      detail.append(title, document.createElement('br'), profile);
      const room = `/pages/room-visualiser?fabric=${encodeURIComponent(fabric.id)}`;
      if (fabric.roomPreview === room) { const link = document.createElement('a'); link.href = room; link.textContent = 'See in Room Visualiser'; detail.append(link); }
      card.append(picture, detail); article.append(card);
    };
    const appendOpening = () => {
      const opening = document.createElement('article');
      const name = document.createElement('strong'); name.textContent = 'Jane · AI adviser';
      const copy = document.createElement('p'); copy.textContent = 'Tell me what is not quite working in your room. We can find a direction together.';
      opening.append(name, copy); log.append(opening);
    };
    const render = () => {
      if (!session || renderedSessionId !== session.id) {
        log.replaceChildren();
        renderedSessionId = session?.id ?? null;
        renderedMessages = [];
      }
      if (session) {
        if (!log.childElementCount) appendOpening();
        const messages = session.messages || [];
        const fingerprints = messages.map(message => JSON.stringify([message.role, message.text, message.fabrics]));
        if (renderedMessages.length > fingerprints.length || renderedMessages.some((value, index) => value !== fingerprints[index])) {
          log.replaceChildren();
          renderedMessages = [];
          appendOpening();
        }
        messages.slice(renderedMessages.length).forEach(message => {
          const article = document.createElement('article');
          const heading = document.createElement('strong'); heading.textContent = message.role === 'assistant' ? 'Jane · AI adviser' : 'You';
          const p = document.createElement('p'); p.textContent = message.text;
          article.append(heading, p);
          if (message.role === 'assistant' && Array.isArray(message.fabrics)) message.fabrics.slice(0, 4).forEach(fabric => showFabricCard(article, fabric));
          log.append(article);
        });
        if (renderedMessages.length !== fingerprints.length) log.scrollTop = log.scrollHeight;
        renderedMessages = fingerprints;
      }
      startButton.hidden = !!session; deleteButton.hidden = !session; form.hidden = !session;
      if (tools) tools.hidden = !session;
      if (starters) starters.hidden = !session || !!session.messages?.length;
      consent.closest('label').hidden = !!session;
      fabricShare.hidden = !session || !!session?.contexts?.some(c => c.value?.fabricIds?.includes(selectedFabric?.id));
    };
    const bootstrap = async () => {
      // A fresh signed Shopify proxy request detects sign-out and account
      // switching before any cached conversation is displayed or submitted.
      const response = await fetch(endpoint, { cache: 'no-store', credentials: 'same-origin' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body.csrf !== 'string' || !/^[a-f0-9]{32}$/.test(body.ownerBinding || '')) {
        csrf = ''; ownerBinding = null; clearPrivateView();
        if (signIn) signIn.hidden = response.status !== 401;
        throw Error(response.status === 401 ? 'Please sign in to your customer account.' : 'Jane is temporarily unavailable. Your message has not been sent.');
      }
      if (ownerBinding && ownerBinding !== body.ownerBinding) clearPrivateView();
      ownerBinding = body.ownerBinding;
      csrf = body.csrf;
      if (signIn) signIn.hidden = true;
    };
    const request = async (action, extra = {}, requestId = crypto.randomUUID()) => {
      await bootstrap();
      const body = { ...commandBase, action, requestId, sessionId: session?.id ?? null, revision: session?.revision ?? null, ...extra };
      const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Advisory-CSRF': csrf }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(result.error === 'REVISION_CONFLICT' ? 'This consultation changed in another tab. Reopen it before sending again.' : 'Jane could not save that response. Your draft remains here; please try again.');
      if (result.session) {
        if (!validSession.test(result.session.id) || (action === 'resume' && result.session.id !== extra.sessionId) || (session && action !== 'start' && result.session.id !== session.id)) throw Error('Jane returned a different consultation. Nothing was shown; please reopen the room.');
        session = result.session; remember(session.id); render();
      }
      return result;
    };
    const run = async (operation, waitingText) => {
      if (busy) return;
      setBusy(true); say(waitingText);
      if (thinking) thinking.hidden = waitingText !== 'Jane is considering your room…';
      try { await operation(); say(''); }
      catch (cause) { say(cause.message || 'Jane is temporarily unavailable.', true); }
      finally { if (thinking) thinking.hidden = true; setBusy(false); }
    };
    const readFabric = async () => {
      const values = new URLSearchParams(location.search).getAll('jane_fabric');
      if (values.length !== 1 || !validFabric.test(values[0])) return;
      const id = values[0];
      try {
        const response = await fetch('/apps/curtainsuk-decision/catalog?view=retail&browseGuide=1&fabric=' + encodeURIComponent(id), { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok || body.fabric?.id !== id || body.fabric.browseReady !== true || body.fabric.launchReady !== true || body.fabric.orderReady !== true) return;
        selectedFabric = { id, design: body.fabric.design || 'Selected fabric', colour: body.fabric.colour || '' };
        fabricDescription.textContent = `${selectedFabric.design} ${selectedFabric.colour} (${id})`;
        fabricPanel.hidden = false; render();
      } catch { /* A fabric cannot be inferred from an unverified URL. */ }
    };
    dialog.addEventListener('curtainsuk:jane-room-open', event => {
      const jane = event.detail?.identity === 'jane';
      panel.hidden = !jane; preview.forEach(node => { if (node) node.hidden = jane; });
      if (!jane) return;
      log.hidden = true;
      say('');
      run(async () => {
        await bootstrap();
        const saved = remembered();
        if (!session && saved && validSession.test(saved)) {
          try {
            const response = await request('resume', { sessionId: saved, revision: 0 });
            if (!response.session) remember(null);
          } catch { remember(null); }
        }
        render(); await readFabric();
      }, 'Connecting to Jane…').finally(() => { log.hidden = false; });
    });
    const checkAccountOnReturn = () => {
      if (!dialog.open || panel.hidden || document.hidden || busy) return;
      log.hidden = true;
      run(async () => { await bootstrap(); render(); }, 'Checking your customer session…').finally(() => { log.hidden = false; });
    };
    window.addEventListener('focus', checkAccountOnReturn);
    document.addEventListener('visibilitychange', () => { if (document.hidden) log.hidden = true; else checkAccountOnReturn(); });
    startButton.addEventListener('click', () => {
      if (!consent.checked) { say('Please confirm that this consultation may be saved.', true); return; }
      const id = pending?.action === 'start' ? pending.id : crypto.randomUUID(); pending = { action: 'start', id };
      run(async () => { await request('start', { sessionId: null, revision: null, consent: true }, id); pending = null; input.focus(); }, 'Opening your consultation…');
    });
    form.addEventListener('submit', event => {
      event.preventDefault(); const text = input.value.trim(); if (!text || !session) return;
      const id = pending?.action === 'message' && pending.text === text ? pending.id : crypto.randomUUID(); pending = { action: 'message', text, id };
      run(async () => { await request('message', { text }, id); pending = null; input.value = ''; input.focus(); }, 'Jane is considering your room…');
    });
    deleteButton.addEventListener('click', () => run(async () => { await request('delete'); session = null; pending = null; consent.checked = false; fabricConsent.checked = false; remember(null); render(); say('Your consultation was deleted.'); }, 'Deleting your consultation…'));
    fabricConsent.addEventListener('change', () => { fabricShare.disabled = busy || !fabricConsent.checked; });
    fabricShare.addEventListener('click', () => {
      if (!session || !selectedFabric || !fabricConsent.checked) return;
      const id = pending?.action === 'context' ? pending.id : crypto.randomUUID(); pending = { action: 'context', id };
      const context = { version: '1', source: 'customer-notes', consent: true, room: null, fabricIds: [selectedFabric.id], colours: [], heading: null, lighting: null, curtainPosition: null, preferences: [], references: ['fabric-detail:v1'], feedback: 'I selected this exact fabric and would like to discuss it.' };
      run(async () => { await request('context', { context, consent: true }, id); pending = null; say('Jane can now discuss this exact fabric with you.'); }, 'Sharing your selected fabric…');
    });
    starters?.addEventListener('click', event => {
      const button = event.target.closest('[data-jane-prompt]');
      if (!button || !starters.contains(button) || !session || busy) return;
      input.value = button.dataset.janePrompt;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      say('A starting point is in your message box. Edit it to make it yours.');
    });
    render();
  });
})();
