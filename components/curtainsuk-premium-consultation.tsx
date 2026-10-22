'use client';
/* eslint-disable @next/next/no-img-element -- Fabric Master and guarded calibration assets retain their existing URL contracts. */

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { fullUrl } from '@/lib/sitemap-utils';
import { consultationFabricLinks, shopifyConsultationHandoff } from '@/lib/storefront/consultation-navigation';
import { acknowledgedPremiumRevision, premiumSessionStorageKey, savedPremiumSession } from './curtainsuk-premium-transport';
import { fiSessionStorageKey, isFiReadOnlyResumeConflict, nailaPresentationStorageKey, selectFiResumeSession } from './curtainsuk-fi-session';
import { premiumProxyCommand, premiumProxyEnabled, premiumProxyPath } from './curtainsuk-fi-premium-proxy-transport';
import styles from './curtainsuk-premium-consultation.module.css';
import referenceStyles from '@/vendor/hci-approved/components/ReferenceExperience.module.css';

import { ReferencePalette, type PaletteView } from '@/vendor/hci-approved/components/ReferencePalette';
import type { PaletteState } from '@/vendor/hci-approved/intelligence/reference-images/palette';

type Card = { fabricMasterId: string; supplierSku: string; reactionId: string; explanation: string[]; commerceToken: string; feedback?: { keep: Option[]; change: Option[] } };
type Option = { id: string; label: string; group: string; dimension: string };
type Direction = { id: string; label: string; purpose: string; status: string; cards: Card[]; feedback: { keep: Option[]; change: Option[] } };
type InteriorBrief = { status: 'HCI_PROPOSED' | 'CUSTOMER_CONFIRMED'; version: number; sections: { dimension: string; title: string; description: string; value: string; changed: boolean; options: { value: string; label: string }[] }[] };
type View = {
  sessionId: string;
  revision: number;
  phase: 'discovery' | 'price' | 'calibration' | 'brief' | 'complete' | 'directions' | 'final';
  profileSummary: string;
  question: { id: string; prompt: string; answers: { id: string; label: string }[] } | null;
  stimulusId: string | null;
  tasteProgress: { current: number; total: number } | null;
  priceLevel: { selected: 'MID_RANGE' | 'LUXURY' | 'PREMIUM_LUXURY' | 'SUPER_LUXURY' | null } | null;
  calibrationFabric: { fabricMasterId: string; supplierSku: string; brand: string; design: string; colourway: string; imageUrl: string } | null;
  calibrationProgress: { current: number; total: number } | null;
  interiorBrief: InteriorBrief | null;
  palette: { recordId: string; state: PaletteState } | null;
  directions: Direction[];
  learning: { events: unknown[]; summary: string[] } | null;
  /** Gateway-owned delivery state; HCI retains the complete persisted selection. */
  directionDelivery?: { current: number; total: number };
};
type Fabric = { id: string; brand: string; design: string; colour: string; images: { url: string }[]; sampleAvailable: boolean; availability: string; configurable: boolean; configurationMessage: string; fabricProfileUrl?: string; browseReady?: boolean; launchReady?: boolean };

const reactionCopy = [
  ['LOVE', 'Love this'], ['MORE_LIKE_THIS', 'Show me more like this'], ['NOT_QUITE', 'Not quite'], ['NOT_FOR_ME', 'Not for me'],
] as const;
function base64(bytes: ArrayBuffer) {
  let value = '';
  const input = new Uint8Array(bytes);
  for (let start = 0; start < input.length; start += 0x8000)
    value += String.fromCharCode(...input.subarray(start, Math.min(start + 0x8000, input.length)));
  return btoa(value);
}

export default function CurtainsUkPremiumConsultation() {
  const [view, setView] = useState<View | null>(null);
  const [entry, setEntry] = useState<'match' | 'guided'>('match');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [resumeConflict, setResumeConflict] = useState(false);
  const [fabrics, setFabrics] = useState<Record<string, Fabric | null | 'error'>>({});
  const [feedback, setFeedback] = useState<{ direction: Direction; card: Card; reaction: string; selected: string[]; likeDirection: boolean } | null>(null);
  const pending = useRef<Record<string, unknown> | null>(null);
  const loaded = useRef(false);
  const latestView = useRef<View | null>(null);
  const bridgeRequest = useRef<RequestInit | null>(null);
  const requestLock = useRef(false);
  const resumeSession = useRef<string | null>(null);
  const [reviewPalette, setReviewPalette] = useState(false);
  const [briefEditing, setBriefEditing] = useState<string | null>(null);
  const [adjustingBrief, setAdjustingBrief] = useState(false);
  const [briefSaved, setBriefSaved] = useState('');
  const [directionProcessing, setDirectionProcessing] = useState<'search' | 'create' | null>(null);
  const [openingDirection, setOpeningDirection] = useState<number | null>(null);
  const [restartPrompt, setRestartPrompt] = useState(false);
  const [returningPrompt, setReturningPrompt] = useState(false);
  const directionPrepareLock = useRef(false);
  const deliveredDirections = useRef<Record<number, Direction>>({});
  const fabricRequests = useRef(new Set<string>());

  const send = async (action?: Record<string, unknown>, retry = false, paletteRequest = false, background = false) => {
    const directionLoad = action?.type === 'direction-load';
    const directionHydrate = action?.type === 'direction-hydrate';
    const directionPrepare = action?.type === 'direction-prepare';
    const directionRead = directionLoad || directionHydrate;
    if (background ? directionPrepareLock.current : requestLock.current) return null;
    if (background) directionPrepareLock.current = true;
    else requestLock.current = true;
    const payload = retry && pending.current ? pending.current : {
      requestId: crypto.randomUUID(),
      sessionId: latestView.current?.sessionId ?? resumeSession.current,
      revision: latestView.current?.revision ?? null,
      ...(action ? { action } : {}),
    };
    const answerAction = (payload.action as { type?: unknown } | undefined)?.type === 'answer';
    if (!background && !directionHydrate) pending.current = payload;
    if (!background) { setBusy(true); setNotice(''); }
    let resumeAfterAnswerConflict = false;
    try {
      const response = premiumProxyEnabled()
        ? await premiumProxyCommand(payload)
        : await fetch('/api/curtain-consultation-premium', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (response.status === 409 && answerAction) resumeAfterAnswerConflict = true;
      if (isFiReadOnlyResumeConflict(response.status, payload.sessionId, payload.action, latestView.current !== null)) setResumeConflict(true);
      if (!response.ok) throw Error(data.error || 'Your consultation is temporarily unavailable.');
      setResumeConflict(false);
      data.revision = acknowledgedPremiumRevision(payload.revision, data.revision, !directionRead && (Boolean(payload.action) || !payload.sessionId));
      if (directionLoad) {
        // This reads an already persisted direction. An older background response
        // must never overwrite a newer customer-preference revision.
        if (latestView.current?.revision !== payload.revision || !data.directionDelivery || data.directions.length !== 1) return null;
        deliveredDirections.current[Number(action.index)] = data.directions[0] as Direction;
        data.directions = Object.keys(deliveredDirections.current).map(Number).sort((a, b) => a - b).map((index) => deliveredDirections.current[index]!);
      } else if (directionHydrate) {
        // The gateway has read exactly one previously persisted six-card
        // direction. Keep the existing summaries and hydrated cards intact.
        const previous = latestView.current;
        if (!previous || previous.revision !== payload.revision || !data.directionDelivery || data.directions.length !== 1) return null;
        const target = Number(action.index);
        data.directions = previous.directions.map((direction, index) => index === target ? data.directions[0] as Direction : direction);
        deliveredDirections.current[target] = data.directions[target] as Direction;
      } else if (directionPrepare) {
        // The later direction has been calculated and persisted in the
        // background, but cards remain deliberately hidden until Explore.
        const previous = latestView.current;
        if (!previous || previous.revision !== payload.revision || !data.directionDelivery || data.directions.length !== 1) return null;
        const target = Number(action.index);
        const directions = [...previous.directions];
        directions[target] = data.directions[0] as Direction;
        data.directions = directions;
      } else if (data.directionDelivery) {
        deliveredDirections.current = {};
        if (data.directionDelivery.current > 0 && data.directions.length === 1)
          deliveredDirections.current[data.directionDelivery.current - 1] = data.directions[0] as Direction;
      } else {
        deliveredDirections.current = {};
      }
      resumeSession.current = data.sessionId;
      try { sessionStorage.setItem(fiSessionStorageKey, data.sessionId); } catch { /* Server evidence remains durable. */ }
      latestView.current = data; setView(data); if (!background && !directionHydrate) pending.current = null;
      return data as View;
    } catch (error) {
      // Palette failures belong to ReferencePalette and its exact saved-request retry.
      // A failed colour save does not declare the whole consultation unavailable.
      if (!paletteRequest && !background && !resumeAfterAnswerConflict)
        setNotice(error instanceof Error ? error.message : 'Your consultation is temporarily unavailable.');
      return null;
    } finally {
      if (background) directionPrepareLock.current = false;
      else { requestLock.current = false; setBusy(false); }
      if (resumeAfterAnswerConflict) {
        // The answer was not committed. Refresh the saved question with a new
        // read-only request, never retry the stale colour click as a pattern.
        pending.current = null;
        queueMicrotask(() => void send());
      }
    }
  };
  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      setEntry(new URLSearchParams(window.location.search).get('entry') === 'guided' ? 'guided' : 'match');
      try {
        resumeSession.current = selectFiResumeSession(
          sessionStorage.getItem(fiSessionStorageKey),
          sessionStorage.getItem(premiumSessionStorageKey),
          sessionStorage.getItem(nailaPresentationStorageKey),
        );
      } catch { /* Storage may be disabled. */ }
      if (premiumProxyEnabled()) resumeSession.current = savedPremiumSession(new URLSearchParams(window.location.search).get('session')) ?? resumeSession.current;
      setReturningPrompt(Boolean(resumeSession.current));
      void send();
    }
  // This initializes exactly one anonymous consultation; re-running would create a second request.
  }, []);
  useEffect(() => {
    if (!view?.directions.length) return;
    const ids = [...new Set(view.directions.flatMap((direction) => direction.cards.map((card) => card.fabricMasterId)))].filter((id) => !(id in fabrics) && !fabricRequests.current.has(id));
    void Promise.all(ids.map(async (id) => {
      fabricRequests.current.add(id);
      try {
        const response = await fetch(premiumProxyEnabled() ? `${premiumProxyPath('premium-catalog')}?fabric=${encodeURIComponent(id)}` : `/api/curtain-consultation-premium?fabric=${encodeURIComponent(id)}`);
        const data = await response.json();
        const result = response.status === 404 ? null : response.ok && data.fabric?.id === id ? data.fabric as Fabric : 'error';
        setFabrics((previous) => ({ ...previous, [id]: result }));
      } catch {
        setFabrics((previous) => ({ ...previous, [id]: 'error' }));
      } finally {
        fabricRequests.current.delete(id);
      }
    }));
  }, [view, fabrics]);
  useEffect(() => {
    const delivery = view?.directionDelivery;
    if (!delivery || directionPrepareLock.current) return;
    // Each completed prepare advances the persisted delivery cursor. Later
    // card hydration is deliberately independent of this background work: the
    // customer can open either saved direction without another HCI call.
    const next = delivery.current === 1 ? 1 : null;
    if (next !== null) void send({ type: 'direction-prepare', index: next }, false, false, true);
  }, [view?.directionDelivery?.current, view?.directions, view?.revision]);
  // Scroll only when the customer enters a new screen. Background fabric
  // hydration and edits within a screen must not pull them away from a control.
  const screenKey = !view ? 'loading' : reviewPalette || (view.palette && !view.palette.state.confirmedPalette) ? 'palette'
    : entry === 'match' && !view.palette && !view.directions.length ? 'upload'
      : directionProcessing ? 'processing'
        : `${view.phase}:${view.phase === 'discovery' ? view.question?.id : view.phase === 'calibration' ? view.calibrationFabric?.fabricMasterId ?? view.stimulusId : ''}`;
  useEffect(() => {
    if (screenKey === 'loading' || screenKey === 'palette') return;
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('#curtainsuk-premium-root h1');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [screenKey]);

  const roomPalette = view?.palette?.state;
  // Translate only transport. The imported HCI components own the approved experience.
  const paletteTransport = async (request: RequestInit): Promise<PaletteView> => {
    const retry = bridgeRequest.current === request && Boolean(pending.current);
    bridgeRequest.current = request;
    let result: View | null;
    if (retry) result = await send(undefined, true, true);
    else if (request.body instanceof Blob) {
      const headers = new Headers(request.headers);
      result = await send({ type: 'image', mime: request.body.type,
        bytes: base64(await request.body.arrayBuffer()),
        referenceType: headers.get('x-hci-reference-type') ?? 'room' }, false, true);
    } else {
      const command = JSON.parse(String(request.body));
      result = await send(command.action ? { type: 'palette', edit: command.action } : undefined, false, true);
    }
    if (!result?.palette) throw Error('PALETTE_REQUEST_FAILED');
    bridgeRequest.current = null;
    return result.palette;
  };
  const commerceUrl = (card: Card, direction: Direction, sample: boolean) => {
    return shopifyConsultationHandoff({ sample, sessionId: view?.sessionId ?? '', profileSummary: view?.profileSummary ?? '',
      fabricMasterId: card.fabricMasterId, supplierSku: card.supplierSku, strategyId: direction.id, commerceToken: card.commerceToken });
  };
  const reportOutcome = async (card: Card, direction: Direction, event: string) => Boolean(await send({ type: 'outcome', event, fabricMasterId: card.fabricMasterId, strategyId: direction.id }));
  const startAgain = () => {
    try { sessionStorage.removeItem(fiSessionStorageKey); } catch { /* The active session still resets in memory. */ }
    resumeSession.current = null;
    latestView.current = null;
    pending.current = null;
    deliveredDirections.current = {};
    fabricRequests.current.clear();
    setView(null); setFabrics({}); setFeedback(null); setNotice(''); setReviewPalette(false);
    setBriefEditing(null); setDirectionProcessing(null); setOpeningDirection(null);
    setAdjustingBrief(false); setBriefSaved('');
    setRestartPrompt(false); setReturningPrompt(false); setResumeConflict(false);
    void send();
  };
  const openDirection = async (index: number) => {
    if (view?.directions[index]?.cards.length || openingDirection !== null) return;
    setOpeningDirection(index);
    await send({ type: 'direction-hydrate', index });
    setOpeningDirection(null);
  };
  const confirmBrief = async () => {
    setDirectionProcessing('search');
    const result = await send({ type: 'brief-confirm', id: crypto.randomUUID() });
    setDirectionProcessing(null);
    if (result) { setAdjustingBrief(false); setBriefSaved(''); }
  };
  const changeBriefChoice = async (section: InteriorBrief['sections'][number], option: { value: string; label: string }) => {
    if (await send({ type: 'brief-change', id: crypto.randomUUID(), choice: { dimension: section.dimension, value: option.value } })) {
      setBriefEditing(null);
      setBriefSaved(`${section.title} saved: ${option.label}.`);
      requestAnimationFrame(() => document.getElementById(`brief-edit-${section.dimension.replaceAll('.', '-')}`)?.focus({ preventScroll: true }));
    }
  };

  if (!view) return <main className={styles.shell}>{notice ? <div className={styles.notice} role="alert">{notice}{resumeConflict ? <button disabled={busy} onClick={startAgain}>Start new consultation</button> : <button disabled={busy} onClick={() => void send(undefined, true)}>Retry consultation</button>}</div> : <JourneyPreparation />}</main>;
  const showUpload = entry === 'match' && !roomPalette && !view.directions.length;
  const showPalette = Boolean(roomPalette && (!roomPalette.confirmedPalette || reviewPalette));
  const journeyStep = showUpload || showPalette ? 0 : view.phase === 'discovery' || view.phase === 'price' ? 1 : view.phase === 'calibration' ? 2 : view.phase === 'brief' || view.phase === 'complete' ? 3 : 4;

  return <main className={`${showUpload || showPalette ? `${referenceStyles.shell} ${styles.referenceHost}` : styles.shell} ${styles.visualShell}`}>
    <header className={styles.header}><Link href={fullUrl('/')} className={styles.wordmark}>Curtains<span>UK</span></Link><span className={styles.headerLabel}>Fabric Intelligence™</span><a href={fullUrl('/pages/fabric-library')}>Browse fabrics ↗</a><button className={styles.headerRestart} type="button" disabled={busy} onClick={() => setRestartPrompt(true)}>Start again</button></header>
    <JourneySteps current={journeyStep} />
    {(showUpload || showPalette) && <p className={styles.stageNote}>{showUpload ? 'Start with a photograph. Then confirm the colours that matter before we explore your style.' : 'Check each colour and tell us where it belongs. Your confirmed palette helps guide the fabrics we suggest.'}</p>}
    {notice && <div className={styles.notice} role="alert">{notice}<button onClick={() => void send(undefined, true)}>Try again</button></div>}
    {!showPalette && roomPalette?.confirmedPalette && <button className={styles.textButton} onClick={() => setReviewPalette(true)}>Review my Room Palette</button>}
    {(showUpload || showPalette) && <ReferencePalette
      initialView={view.palette}
      transport={paletteTransport}
      maxImageMb={2}
      startAtTop
      opening={<FabricIntelligenceWelcome onGuided={() => setEntry('guided')} />}
      onChange={() => { /* The session response is the source of truth. */ }}
    />}
    {showPalette && roomPalette?.confirmedPalette && <button className={styles.primary} onClick={() => setReviewPalette(false)}>Continue with my Room Palette →</button>}
    {!showUpload && !showPalette && view.phase === 'discovery' && view.question && <section id="premium-current-step" className={`${styles.question} ${styles.taste}`} aria-labelledby="taste-heading"><div className={styles.stepLine}><p className={styles.eyebrow}>Your taste</p>{view.tasteProgress && <span>Question {view.tasteProgress.current} of {view.tasteProgress.total}</span>}</div>{view.tasteProgress && <progress className={styles.stepProgress} max={view.tasteProgress.total} value={view.tasteProgress.current} aria-label="Your taste progress" />}<div className={styles.stageLayout}><div><p className={styles.eyebrow}>A little about you</p><h1 id="taste-heading">{view.question.prompt}</h1><p className={styles.stageDescription}>Choose the answer that feels closest. This helps us find fabrics that suit how you want your room to look and feel.</p><div className={styles.tasteChoices}>{view.question.answers.map((answer, index) => <button key={answer.id} className={styles.tasteChoice} disabled={busy} onClick={() => void send({ type: 'answer', questionId: view.question!.id, answerId: answer.id })}><span className={styles.choiceNumber}>{String(index + 1).padStart(2, '0')}</span><span>{answer.label}</span><span aria-hidden="true">→</span></button>)}</div>{entry === 'guided' && !roomPalette && <button className={styles.textButton} onClick={() => setEntry('match')}>Have a room or colour in mind? Add a reference image</button>}</div><RoomInspiration title="Your room. Your point of view." description="A few thoughtful choices bring your fabric search into focus." /></div></section>}
    {!showUpload && !showPalette && view.phase === 'price' && <section id="premium-current-step" className={`${styles.question} ${styles.taste}`} aria-labelledby="price-heading"><div className={styles.stepLine}><p className={styles.eyebrow}>Price level</p><span>One guide for your edit</span></div><div className={styles.stageLayout}><div><h1 id="price-heading">Find your <em>comfort zone.</em></h1><p>We’ll use the Curtains from guide to focus the real fabrics we show. Final made-to-measure pricing still depends on your measurements and options.</p><div className={styles.tasteChoices}>{[
      ['MID_RANGE', 'Mid Range', 'Curtains from under £50'], ['LUXURY', 'Luxury', 'Curtains from £50–£149.99'], ['PREMIUM_LUXURY', 'Premium Luxury', 'Curtains from £150–£249.99'], ['SUPER_LUXURY', 'Super Luxury', 'Curtains from £250+'],
    ].map(([level, title, detail], index) => <button key={level} className={styles.tasteChoice} disabled={busy} onClick={() => void send({ type: 'price-level', level })}><span className={styles.choiceNumber}>{String(index + 1).padStart(2, '0')}</span><span><strong>{title}</strong><small>{detail}</small></span><span aria-hidden="true">→</span></button>)}</div><p className={styles.helpNote}>These bands guide your fabric search. Your curtain quotation depends on the fabric, measurements and finish you choose.</p></div><RoomInspiration title="Beautiful choices, at your pace." description="Choose a starting range. You’ll see the price for your own curtains when you enter your measurements." /></div></section>}
    {!showUpload && !showPalette && view.phase === 'calibration' && <section id="premium-current-step" className={`${styles.calibration} ${styles.eye}`} aria-labelledby="eye-heading"><div className={styles.stepLine}><p className={styles.eyebrow}>Your eye</p>{view.calibrationProgress && <span>Fabric {view.calibrationProgress.current} of {view.calibrationProgress.total}</span>}</div>{view.calibrationProgress && <progress className={styles.stepProgress} max={view.calibrationProgress.total} value={view.calibrationProgress.current} aria-label="Fabric progress" />}<h1 id="eye-heading">Which fabrics <em>feel like you?</em></h1><p>Love the colour? Prefer a quieter pattern? React to each fabric and we’ll use your choices to shape your edit. There is no right answer.</p>{view.calibrationFabric ? <div className={styles.eyeFabric}><img src={view.calibrationFabric.imageUrl} alt={`${view.calibrationFabric.brand} ${view.calibrationFabric.design} ${view.calibrationFabric.colourway} fabric`} /><div><p className={styles.eyebrow}>{view.calibrationFabric.brand}</p><h2>{view.calibrationFabric.design} <em>{view.calibrationFabric.colourway}</em></h2><p>Fabric reference {view.calibrationFabric.supplierSku}</p><p className={styles.helpNote}>Look at the colour, pattern and texture together. Choose “Not sure” if you’re undecided.</p><CalibrationReactions busy={busy} onChoose={(reaction) => void send({ type: 'calibrate', reaction })} /></div></div> : view.stimulusId ? <img src={premiumProxyEnabled() ? `${premiumProxyPath('premium-asset')}?name=${encodeURIComponent(view.stimulusId)}.svg` : `/api/curtain-consultation-premium/assets/${encodeURIComponent(view.stimulusId)}.svg`} alt="Curtain design for preference calibration" /> : null}{!view.calibrationFabric && <CalibrationReactions busy={busy} onChoose={(reaction) => void send({ type: 'calibrate', reaction })} />}</section>}
    {!showUpload && !showPalette && !directionProcessing && view.interiorBrief && (view.phase === 'brief' || view.phase === 'complete') && <section id="premium-current-step" className={styles.brief} aria-labelledby="brief-heading">
      <div className={styles.briefHeading}><div className={styles.briefIntro}>
        <p className={styles.eyebrow}>{adjustingBrief ? 'Adjust my brief' : 'Your fabric preferences'}</p>
        <h1 id="brief-heading">{adjustingBrief ? <>Fine-tune <em>your choices.</em></> : <>Your preferences, <em>brought together.</em></>}</h1>
        <p>Your brief is a summary of the look and feel you want. {adjustingBrief ? 'Your earlier answers are still here. Edit any preference below, then update your fabric suggestions.' : 'We’ve used your answers and fabric reactions to suggest these preferences. Check them or make a change before we find your fabrics.'}</p>
      </div><RoomInspiration compact title="A little change. A new direction." description="Tell us what feels right and let your fabric edit follow." /></div>
      <ol className={styles.briefHowTo} aria-label="How to adjust your brief">
        <li><b>1</b><span><strong>Choose a detail</strong><small>Use Edit on any card below.</small></span></li>
        <li><b>2</b><span><strong>Pick your preference</strong><small>Your choice saves when selected.</small></span></li>
        <li><b>3</b><span><strong>See your fabrics</strong><small>Update the suggestions when ready.</small></span></li>
      </ol>
      <div className={styles.briefNavigation}>
        <nav aria-label="Jump to a brief preference"><span>Jump to</span>{view.interiorBrief.sections.map((section) => <a key={section.dimension} href={`#brief-section-${section.dimension.replaceAll('.', '-')}`}>{section.title}</a>)}</nav>
        <p className={styles.briefSaved} role="status">{briefSaved || 'Keep any choices you already like.'}</p>
      </div>
      <div className={styles.briefBoard}>{view.interiorBrief.sections.map((section, index) => {
        const id = section.dimension.replaceAll('.', '-');
        const expanded = briefEditing === section.dimension;
        return <article className={styles.briefRow} key={section.dimension} id={`brief-section-${id}`} tabIndex={-1} aria-labelledby={`brief-title-${id}`} data-editing={expanded}>
          <span className={styles.briefNumber}>{String(index + 1).padStart(2, '0')}</span>
          <div><h2 id={`brief-title-${id}`}>{section.title}</h2><p>{section.description}</p></div>
          <div className={styles.briefValue}><small>Your current choice</small><strong>{section.options.find((option) => option.value === section.value)?.label ?? section.value}</strong>{section.changed && <small className={styles.savedChoice}>✓ Saved preference</small>}</div>
          <button id={`brief-edit-${id}`} type="button" disabled={busy} onClick={() => { setBriefEditing(expanded ? null : section.dimension); setBriefSaved(''); }} aria-label={`${expanded ? 'Close' : 'Edit'} ${section.title}`} aria-expanded={expanded} aria-controls={`brief-${id}`}>{expanded ? 'Close' : 'Edit'} <span aria-hidden="true">{expanded ? '−' : '+'}</span></button>
          {expanded && <div id={`brief-${id}`} className={styles.briefChoices} role="group" aria-label={`Choose ${section.title}`}><p>Choose the option that feels right. You can change it again.</p><div>{section.options.map((option) => <button type="button" key={option.value} aria-pressed={section.value === option.value} disabled={busy} onClick={() => void changeBriefChoice(section, option)}>{section.value === option.value && <span aria-hidden="true">✓ </span>}{option.label}</button>)}</div></div>}
        </article>;
      })}</div>
      <div className={styles.briefFinish}><div><p className={styles.eyebrow}>Next · Your fabric suggestions</p><h2>Happy with your choices?</h2><p>{adjustingBrief ? 'We’ll use your current preferences to refresh your fabric edit. You can also continue without changing anything.' : 'We’ll find fabrics based on these preferences. You can return here using Adjust my brief from your suggestions.'}</p></div><button className={styles.primary} disabled={busy} onClick={() => void confirmBrief()}>{adjustingBrief ? 'Update my fabric suggestions' : 'Show my fabric suggestions'} <span aria-hidden="true">→</span></button></div>
      {view.phase === 'complete' && <p className={styles.briefNext}>Next · <strong>Your fabric edit</strong> · Real fabrics selected around your choices.</p>}
    </section>}
    {!showUpload && !showPalette && !view.interiorBrief && view.phase === 'complete' && <section id="premium-current-step" className={styles.ready}><p className={styles.eyebrow}>Your profile</p><h1>Ready to explore <em>your directions.</em></h1><p>{view.profileSummary}</p><button className={styles.primary} disabled={busy} onClick={() => void send({ type: 'recommend' })}>Show my design directions →</button></section>}
    {!showUpload && !showPalette && directionProcessing && <section id="premium-current-step" className={styles.directionProcessing} aria-live="polite" aria-labelledby="direction-processing-heading"><p className={styles.eyebrow}>Fabric Intelligence</p><h1 id="direction-processing-heading">Creating your <em>fabric directions.</em></h1><p>We’re using your choices to find real fabrics in the CurtainsUK collection. Your edit will include a short explanation of why each one was chosen.</p><ol className={styles.processingStages}>{[
      ['Combining your colour palette', roomPalette?.confirmedPalette ? 'complete' : 'skipped'],
      ['Refining your taste preferences', 'complete'],
      ['Applying your chosen price level', 'complete'],
      ['Using the fabrics you responded to', 'complete'],
      ['Searching the CurtainsUK fabric collection', directionProcessing === 'search' ? 'active' : 'complete'],
      ['Creating your fabric directions', directionProcessing === 'create' ? 'active' : 'waiting'],
    ].map(([label, status]) => <li key={label} className={styles[`processing_${status}`]}>{status === 'complete' ? <span aria-hidden="true">✓</span> : <span aria-hidden="true">{status === 'active' ? '•' : status === 'skipped' ? '—' : '○'}</span>}{label}</li>)}</ol></section>}
    {!showUpload && !showPalette && !directionProcessing && view.directions.length > 0 && view.phase !== 'brief' && <section className={styles.directions} aria-labelledby="directions-heading">
      <div className={styles.editHeading}><div><p className={styles.eyebrow}>{view.phase === 'final' ? 'Your refined shortlist' : 'Your personal fabric edit'}</p><h1 id="directions-heading">{view.phase === 'final' ? <>A shortlist shaped <em>by you.</em></> : <>Your room. <em>Your fabric edit.</em></>}</h1><p>Explore each direction, look closer at the fabrics and order a sample to see them in your own light.</p></div><aside className={styles.briefEditCard} aria-label="Adjust your fabric preferences"><strong>Want a different look?</strong><p id="adjust-brief-help">Edit your colour, pattern or style preferences, then update your fabric suggestions.</p><button className={styles.primary} disabled={busy} aria-describedby="adjust-brief-help" onClick={async () => { if (await send({ type: 'brief-adjust', id: crypto.randomUUID() })) { setAdjustingBrief(true); setBriefEditing(null); setBriefSaved(''); } }}>Adjust my brief <span aria-hidden="true">↗</span></button><small>Your earlier answers stay saved.</small></aside></div>
      {view.learning?.summary.length ? <p className={styles.learningNote}>{view.learning.summary.join(' ')}</p> : null}
      <div className={styles.editGuide}><span><b>01</b> Explore your fabrics</span><span><b>02</b> Feel a sample at home</span><span><b>03</b> Make curtains to your size</span></div>
      <div className={styles.directionGrid} data-style-directions={Boolean(view.directionDelivery || view.directions.some((direction) => direction.cards.length > 1))}>{view.directions.map((direction, index) => <DirectionCard key={direction.id} direction={direction} fabrics={fabrics} final={view.phase === 'final'} opening={openingDirection === index} onExplore={() => void openDirection(index)} onReaction={(card, reaction, selected = [], likeDirection = false) => setFeedback({ direction, card, reaction, selected, likeDirection })} onOutcome={reportOutcome} commerceUrl={commerceUrl} />)}</div>
      {view.phase !== 'final' && !view.directionDelivery && !view.directions.every((direction) => direction.cards.length > 1) && <button className={styles.primary} disabled={busy} onClick={() => void send({ type: 'finish' })}>Refine my directions →</button>}
      <section className={styles.nextDestinations} aria-labelledby="fabric-next-heading"><p className={styles.eyebrow}>Bring your ideas home</p><h2 id="fabric-next-heading">Your next step, <em>made simple.</em></h2><p>Keep exploring, plan a whole room or get help with measuring and fitting.</p><div>{[
        ['/pages/fabric-library?view=browse-fabrics', 'Browse all fabrics', 'Explore more colours, patterns and textures.'],
        ['/pages/smart-track-studio', 'Motorised Curtain Tracks', 'Try the remote and explore your track options.'],
        ['/pages/build-my-rooms', 'Design My Home', 'Bring your saved room designs together.'],
        ['/pages/how-to-use', 'Explore our guides', 'Find help with using the studios, measuring and fitting.'],
      ].map(([href, title, description]) => <a key={href} href={fullUrl(href)}><strong>{title}<span aria-hidden="true">↗</span></strong><small>{description}</small></a>)}</div></section>
    </section>}
    {feedback && <FeedbackSheet value={feedback} busy={busy} onClose={() => setFeedback(null)} onChange={setFeedback} onSave={async () => { const directionReaction = feedback.likeDirection ? 'LIKE' : feedback.reaction === 'LOVE' ? 'LOVE' : null; const saved = await send({ type: 'feedback', command: { id: crypto.randomUUID(), strategyId: feedback.direction.id, fabricId: feedback.card.reactionId, fabricReaction: feedback.reaction, directionReaction, optionIds: feedback.selected } }); if (saved && await send({ type: 'finish' })) setFeedback(null); }} />}
    {(restartPrompt || returningPrompt) && <RestartSheet busy={busy} returning={returningPrompt} onContinue={() => { setReturningPrompt(false); setRestartPrompt(false); }} onStartAgain={startAgain} />}
  </main>;
}

const styleRefinementLabels: Record<string, string> = {
  'change:warmer': 'Warmer', 'change:cooler': 'Cooler', 'change:plainer': 'Quieter', 'change:patterned': 'More pattern',
  'change:texture': 'More texture', 'change:smooth': 'Less texture',
};

function JourneySteps({ current }: { current: number }) {
  const steps = [['Your room', 'Colours & context'], ['Your taste', 'Style & price'], ['Your eye', 'React to fabrics'], ['Your brief', 'Check your choices'], ['Your edit', 'Explore & sample']];
  return <ol className={styles.journeySteps} aria-label="Your Fabric Intelligence journey">{steps.map(([label, detail], index) => <li key={label} aria-current={index === current ? 'step' : undefined} data-complete={index < current}><span aria-hidden="true">{index < current ? '✓' : String(index + 1).padStart(2, '0')}</span><div><strong>{label}</strong><small>{detail}</small></div></li>)}</ol>;
}

function FabricIntelligenceWelcome({ onGuided }: { onGuided: () => void }) {
  return <>
    <section className={styles.welcome} aria-labelledby="palette-title">
      <div className={styles.welcomeCopy}>
        <p className={styles.eyebrow}>Your personal curtain fabric finder</p>
        <h1 id="palette-title">Find fabrics that work <em>with your room.</em></h1>
        <p>Too many fabrics to choose from? Fabric Intelligence brings your room colours, personal style and price range together to suggest real fabrics from the CurtainsUK collection.</p>
        <div className={styles.welcomeActions}><a className={styles.primaryLink} href="#your-reference">Start with my room photo <span aria-hidden="true">→</span></a><button type="button" className={styles.secondary} onClick={onGuided}>Start with my style</button></div>
        <p className={styles.helpNote}>No photo? No problem. Start with a few style choices instead.</p>
      </div>
      <RoomInspiration eager title="From your room to your shortlist." description="An example of the colours that can inspire a fabric search. Your own choices shape your results." />
    </section>
    <div className={styles.welcomeBenefits} aria-label="How Fabric Intelligence helps you">
      <article><span aria-hidden="true">01</span><h2>Make it personal</h2><p>Add a photo or tell us the look and feel you love. You confirm the colours that matter.</p></article>
      <article><span aria-hidden="true">02</span><h2>Find your favourites</h2><p>React to real fabrics. Get a considered edit with a reason for each suggestion.</p></article>
      <article><span aria-hidden="true">03</span><h2>Feel ready to choose</h2><p>Order samples to check at home, then make curtains to your own measurements.</p></article>
    </div>
    <p className={styles.welcomeLimit}>A helping hand with your fabric choice. Screen colours can vary, so a physical sample is the best way to check colour and texture.</p>
  </>;
}

function RoomInspiration({ title, description, compact = false, eager = false }: { title: string; description: string; compact?: boolean; eager?: boolean }) {
  return <figure className={styles.roomInspiration} data-compact={compact}><div><img src={premiumProxyEnabled() ? premiumProxyPath('premium-asset') + '?name=living-room.jpg' : '/reference-experience/living-room.jpg'} alt="Light living room with soft neutral furnishings and green accents" loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} decoding="async" /><span>Room inspiration</span></div><figcaption><span className={styles.inspirationTones} aria-hidden="true"><i /><i /><i /><i /></span><h2>{title}</h2><p>{description}</p></figcaption></figure>;
}

function JourneyPreparation() {
  return <section className={styles.journeyPreparation} aria-live="polite"><p className={styles.eyebrow}>Fabric Intelligence</p><span className={styles.preparationMark} aria-hidden="true" /><h1>Preparing your <em>Fabric Intelligence journey.</em></h1><p>Getting everything ready for your room…</p></section>;
}

function RestartSheet({ busy, returning, onContinue, onStartAgain }: { busy: boolean; returning: boolean; onContinue: () => void; onStartAgain: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className={styles.restartSheet} aria-labelledby="restart-heading" aria-describedby="restart-description" onCancel={(event) => { event.preventDefault(); onContinue(); }}><p className={styles.eyebrow}>{returning ? 'Welcome back' : 'A fresh starting point'}</p><h2 id="restart-heading">{returning ? 'Pick up where you left off.' : 'Start a new brief?'}</h2><p id="restart-description">{returning ? 'Your saved room, taste and fabric choices are ready to explore.' : 'You’ll begin again with your room, colours, style and price range. Your current directions and feedback will not carry into the new brief.'}</p><div className={styles.restartActions}><button type="button" className={styles.secondary} onClick={onContinue} autoFocus>{returning ? 'Continue my choices' : 'Keep my brief'}</button><button type="button" className={styles.primary} disabled={busy} onClick={onStartAgain}>Start again</button></div></dialog>;

}

function DirectionCard({ direction, fabrics, final, opening, onExplore, onReaction, onOutcome, commerceUrl }: { direction: Direction; fabrics: Record<string, Fabric | null | 'error'>; final: boolean; opening: boolean; onExplore: () => void; onReaction: (card: Card, reaction: string, selected?: string[], likeDirection?: boolean) => void; onOutcome: (card: Card, direction: Direction, event: string) => Promise<boolean>; commerceUrl: (card: Card, direction: Direction, sample: boolean) => string }) {
  const card = direction.cards[0];
  const fabric = card ? fabrics[card.fabricMasterId] : undefined;
  if (direction.cards.length === 0) {
    return <article className={`${styles.directionCard} ${styles.styleDirectionCard} ${styles.styleDirectionSummary}`}><div className={styles.styleDirectionIntro}><p className={styles.eyebrow}>Another way to express your style</p><h2>{direction.label}</h2><p className={styles.directionPurpose}>{direction.purpose}</p><p>Open this direction to explore the fabrics selected from your brief.</p><button type="button" className={styles.primary} disabled={opening} onClick={onExplore}>{opening ? 'Opening this direction…' : 'Explore this direction →'}</button>{opening && <p className={styles.directionOpening} aria-live="polite">Opening your selected fabrics…</p>}</div></article>;
  }
  if (direction.cards.length > 1) {
    const refinements = card?.feedback?.change.filter((option) => option.id in styleRefinementLabels) ?? [];
    return <article className={`${styles.directionCard} ${styles.styleDirectionCard}`}><div className={styles.styleDirectionIntro}><p className={styles.eyebrow}>Your fabric direction · {direction.cards.length} fabrics</p><h2>{direction.label}</h2><p className={styles.directionPurpose}>{direction.purpose}</p></div><div className={styles.styleFabricGrid}>{direction.cards.map((entry) => <StyleFabricCard key={entry.fabricMasterId} card={entry} direction={direction} fabric={fabrics[entry.fabricMasterId]} final={final} onReaction={onReaction} onOutcome={onOutcome} commerceUrl={commerceUrl} />)}</div>{card && refinements.length > 0 && <div className={styles.styleRefinements} aria-label={`Refine ${direction.label}`}><span>Fine-tune the feel</span><p>Choose what you would like more or less of, then confirm your feedback.</p><div>{refinements.map((option) => <button key={option.id} type="button" onClick={() => onReaction(card, 'NOT_QUITE', [option.id], true)}>{styleRefinementLabels[option.id]}</button>)}</div></div>}</article>;
  }
  if (!card || fabric === null) return <article className={styles.directionCard}><div className={styles.cardBody}><p className={styles.eyebrow}>{direction.label}</p><h2>This fabric is currently unavailable.</h2><p>The fabric selected for this direction no longer meets our current catalogue checks. You can continue with another direction or explore the Fabric Library.</p><div className={styles.actions}><a href="/pages/fabric-library">Explore current fabrics →</a></div></div></article>;
  if (fabric === 'error' || fabric === undefined) return <article className={styles.directionCard}><div className={styles.cardBody}><p className={styles.eyebrow}>{direction.label}</p><h2>{fabric === 'error' ? 'We could not verify this fabric.' : 'Checking this fabric…'}</h2><p>{fabric === 'error' ? 'Please refresh the consultation before choosing a fabric.' : 'We are checking its current catalogue details before showing shopping options.'}</p></div></article>;
  const handoff = async (event: MouseEvent<HTMLAnchorElement>, type: string, sample: boolean) => { event.preventDefault(); if (await onOutcome(card, direction, type)) window.location.assign(commerceUrl(card, direction, sample)); };
  return <article className={styles.directionCard}><div className={styles.fabricImage}>{fabric?.images[0] ? <img src={fabric.images[0].url} alt={`${fabric.design} ${fabric.colour} fabric`} loading="lazy" decoding="async" /> : <div>Loading fabric</div>}<span>{direction.label}</span></div><div className={styles.cardBody}><p className={styles.eyebrow}>{fabric?.brand ?? 'CurtainsUK fabric'}</p><h2>{fabric?.design ?? 'Loading'} <em>{fabric?.colour}</em></h2><p>{direction.purpose}</p><div className={styles.why}><strong>Why we chose this</strong><p>{card.explanation.join(' ')}</p></div>{!final && <div className={styles.reactions}>{reactionCopy.map(([id, text]) => <button key={id} onClick={() => onReaction(card, id)}>{text}</button>)}</div>}<FabricDiscoveryLinks fabric={fabric} /><div className={styles.actions}>{fabric?.sampleAvailable && <a onClick={(event) => void handoff(event, 'SAMPLE_INTENT', true)} href={commerceUrl(card, direction, true)}>Order sample</a>}<a className={styles.primaryLink} onClick={(event) => void handoff(event, 'FABRIC_SELECTED', false)} href={commerceUrl(card, direction, false)}>Make curtains</a></div><MoreFabricOptions fabric={fabric} /></div></article>;
}

function StyleFabricCard({ card, direction, fabric, onOutcome, commerceUrl }: { card: Card; direction: Direction; fabric?: Fabric | null | 'error'; final: boolean; onReaction: (card: Card, reaction: string, selected?: string[], likeDirection?: boolean) => void; onOutcome: (card: Card, direction: Direction, event: string) => Promise<boolean>; commerceUrl: (card: Card, direction: Direction, sample: boolean) => string }) {
  if (fabric === undefined) return <article className={styles.styleFabric}><div className={styles.styleFabricPending}>Checking this fabric…</div></article>;
  if (fabric === null || fabric === 'error') return <article className={styles.styleFabric}><div className={styles.styleFabricPending}>This fabric is no longer available.</div></article>;
  const handoff = async (event: MouseEvent<HTMLAnchorElement>, type: string, sample: boolean) => { event.preventDefault(); if (await onOutcome(card, direction, type)) window.location.assign(commerceUrl(card, direction, sample)); };
  return <article className={styles.styleFabric}><div className={styles.styleFabricImage}>{fabric.images[0] ? <img src={fabric.images[0].url} alt={`${fabric.design} ${fabric.colour} fabric`} loading="lazy" decoding="async" /> : <div>Fabric image unavailable</div>}</div><div className={styles.styleFabricBody}><p className={styles.eyebrow}>{fabric.brand}</p><h3>{fabric.design} <em>{fabric.colour}</em></h3><p className={styles.styleReason}>{card.explanation.join(' ')}</p><FabricDiscoveryLinks fabric={fabric} /><div className={styles.styleActions}>{fabric.sampleAvailable && <a className={styles.sampleAction} onClick={(event) => void handoff(event, 'SAMPLE_INTENT', true)} href={commerceUrl(card, direction, true)}>Order sample</a>}<a className={styles.makeCurtains} onClick={(event) => void handoff(event, 'FABRIC_SELECTED', false)} href={commerceUrl(card, direction, false)}>Make curtains →</a></div><MoreFabricOptions fabric={fabric} /></div></article>;
}

function CalibrationReactions({ busy, onChoose }: { busy: boolean; onChoose: (reaction: string) => void }) {
  return <div className={styles.eyeReactions}>{[['LOVE','Love this'],['LIKE','Like this'],['NOT_SURE','Not sure'],['DISLIKE','Not for me']].map(([reaction, label]) => <button key={reaction} disabled={busy} onClick={() => onChoose(reaction)}>{label}</button>)}</div>;
}

function JourneyIcon({ type }: { type: 'details' | 'room' | 'cushions' | 'making' | 'jane' }) {
  const paths = {
    details: 'M4 3h11l5 5v13H4z M14 3v6h6 M8 13h8 M8 17h5',
    room: 'M3 21V8l9-5 9 5v13H3 M8 21V10h8v11 M8 13h8',
    cushions: 'M4 4Q12 6 20 4Q18 12 20 20Q12 18 4 20Q6 12 4 4 M8 8h8v8H8z',
    making: 'M8 8l13 13 M8 16L21 3 M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    jane: 'M9 4a3 3 0 1 0 6 0 3 3 0 0 0-6 0 M5 21v-3a7 7 0 0 1 14 0v3 M5 21h14',
  };
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[type]} /></svg>;
}

function FabricDiscoveryLinks({ fabric }: { fabric: Fabric }) {
  const links = consultationFabricLinks(fabric.id, fabric.fabricProfileUrl);
  return <div className={styles.fabricDiscovery}><a href={links.details}><JourneyIcon type="details" /><span>View fabric details</span><span aria-hidden="true">↗</span></a><a href={links.room}><JourneyIcon type="room" /><span>Room Visualiser</span><span aria-hidden="true">↗</span></a></div>;
}

function MoreFabricOptions({ fabric }: { fabric: Fabric }) {
  const links = consultationFabricLinks(fabric.id, fabric.fabricProfileUrl);
  const canAskJane = fabric.browseReady === true && fabric.launchReady === true;
  return <details className={styles.moreFabric}><summary><span><strong>More with this fabric</strong><small>Cushions{links.making ? ' · Making Studio' : ''}{canAskJane ? ' · Ask Jane' : ''}</small></span><span aria-hidden="true">+</span></summary><div>
    <a href={links.cushions}><JourneyIcon type="cushions" /><span><strong>Make cushions</strong><small>Explore sizes and finishes.</small></span><span aria-hidden="true">↗</span></a>
    {links.making && <a href={links.making}><JourneyIcon type="making" /><span><strong>Try Making Studio</strong><small>Watch a curtain take shape.</small></span><span aria-hidden="true">↗</span></a>}
    {canAskJane && <a href={links.jane}><JourneyIcon type="jane" /><span><strong>Ask Jane</strong><small>Discuss this fabric with our AI specialist.</small></span><span aria-hidden="true">↗</span></a>}
    <p>Each link takes your selected fabric with you. Preview and ordering options depend on its availability.</p>
  </div></details>;
}

function FeedbackSheet({ value, busy, onClose, onChange, onSave }: { value: { direction: Direction; card: Card; reaction: string; selected: string[]; likeDirection: boolean }; busy: boolean; onClose: () => void; onChange: (value: { direction: Direction; card: Card; reaction: string; selected: string[]; likeDirection: boolean }) => void; onSave: () => Promise<void> }) {
  const options = value.reaction === 'MORE_LIKE_THIS' ? value.card.feedback?.keep ?? [] : ['NOT_QUITE', 'NOT_FOR_ME'].includes(value.reaction) ? value.card.feedback?.change ?? [] : [];
  const title = value.reaction === 'MORE_LIKE_THIS' ? 'What would you like us to keep?' : value.reaction === 'NOT_QUITE' ? 'What would you change?' : value.reaction === 'NOT_FOR_ME' ? 'What put you off?' : 'A direction worth keeping.';
  const toggle = (id: string) => onChange({ ...value, selected: value.selected.includes(id) ? value.selected.filter((item) => item !== id) : [...value.selected, id] });
  return <div className={styles.sheetBackdrop} role="presentation"><section className={styles.sheet} role="dialog" aria-modal="true" aria-label="Tell Fabric Intelligence more"><button className={styles.close} onClick={onClose} aria-label="Close">×</button><p className={styles.eyebrow}>Fabric Intelligence is listening</p><h2>{title}</h2><p>Tell us what you like or what you would change. Select only the details that matter, then we’ll use your feedback to refine your fabrics.</p><div className={styles.options}>{options.map((option) => <label key={option.id}><input type="checkbox" checked={value.selected.includes(option.id)} onChange={() => toggle(option.id)} /><span><small>{option.group}</small>{option.label}</span></label>)}</div>{value.reaction !== 'LOVE' && <label className={styles.directionLike}><input type="checkbox" checked={value.likeDirection} onChange={(event) => onChange({ ...value, likeDirection: event.target.checked })} />I like this direction, just not this fabric</label>}<button className={styles.primary} disabled={busy} onClick={() => void onSave()}>Use this feedback</button></section></div>;
}

