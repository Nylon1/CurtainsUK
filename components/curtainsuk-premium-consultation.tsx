'use client';
/* eslint-disable @next/next/no-img-element -- Fabric Master and guarded calibration assets retain their existing URL contracts. */

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { fullUrl } from '@/lib/sitemap-utils';
import { shopifyConsultationHandoff } from '@/lib/storefront/consultation-navigation';
import { acknowledgedPremiumRevision, premiumSessionStorageKey, savedPremiumSession } from './curtainsuk-premium-transport';
import { premiumProxyCapability, premiumProxyEnabled, premiumProxyPath } from './curtainsuk-premium-proxy-transport';
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
type Fabric = { id: string; brand: string; design: string; colour: string; images: { url: string }[]; sampleAvailable: boolean; availability: string; configurable: boolean; configurationMessage: string };

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
  const [directionProcessing, setDirectionProcessing] = useState<'search' | 'create' | null>(null);
  const [openingDirection, setOpeningDirection] = useState<number | null>(null);
  const [restartPrompt, setRestartPrompt] = useState(false);
  const [returningPrompt, setReturningPrompt] = useState(false);
  const directionPrepareLock = useRef(false);
  const deliveredDirections = useRef<Record<number, Direction>>({});

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
    if (!background && !directionHydrate) pending.current = payload;
    if (!background) { setBusy(true); setNotice(''); }
    try {
      const endpoint = premiumProxyEnabled() ? premiumProxyPath('premium-command') : '/api/curtain-consultation-premium';
      const body = premiumProxyEnabled() ? { capability: await premiumProxyCapability(), command: payload } : payload;
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Your consultation is temporarily unavailable.');
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
      try { sessionStorage.setItem(premiumSessionStorageKey, data.sessionId); } catch { /* Server evidence remains durable. */ }
      latestView.current = data; setView(data); if (!background && !directionHydrate) pending.current = null;
      return data as View;
    } catch (error) {
      // Palette failures belong to ReferencePalette and its exact saved-request retry.
      // A failed colour save does not declare the whole consultation unavailable.
      if (!paletteRequest && !background) setNotice(error instanceof Error ? error.message : 'Your consultation is temporarily unavailable.');
      return null;
    } finally {
      if (background) directionPrepareLock.current = false;
      else { requestLock.current = false; setBusy(false); }
    }
  };
  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      setEntry(new URLSearchParams(window.location.search).get('entry') === 'guided' ? 'guided' : 'match');
      try { resumeSession.current = savedPremiumSession(sessionStorage.getItem(premiumSessionStorageKey)); } catch { /* Storage may be disabled. */ }
      if (premiumProxyEnabled()) resumeSession.current = savedPremiumSession(new URLSearchParams(window.location.search).get('session')) ?? resumeSession.current;
      setReturningPrompt(Boolean(resumeSession.current));
      void send();
    }
  // This initializes exactly one anonymous consultation; re-running would create a second request.
  }, []);
  useEffect(() => {
    if (!view?.directions.length) return;
    const ids = view.directions.flatMap((direction) => direction.cards.map((card) => card.fabricMasterId)).filter((id) => !(id in fabrics));
    void Promise.all(ids.map(async (id) => {
      try {
        const response = await fetch(premiumProxyEnabled() ? `${premiumProxyPath('premium-catalog')}?fabric=${encodeURIComponent(id)}` : `/api/curtain-consultation-premium?fabric=${encodeURIComponent(id)}`);
        const data = await response.json();
        const result = response.status === 404 ? null : response.ok && data.fabric?.id === id ? data.fabric as Fabric : 'error';
        setFabrics((previous) => ({ ...previous, [id]: result }));
      } catch {
        setFabrics((previous) => ({ ...previous, [id]: 'error' }));
      }
    }));
  }, [view, fabrics]);
  useEffect(() => {
    const delivery = view?.directionDelivery;
    if (!delivery || directionPrepareLock.current) return;
    // Each completed prepare advances the persisted delivery cursor. Later
    // card hydration is deliberately independent of this background work: the
    // customer can open either saved direction without another HCI call.
    const next = delivery.current === 1 ? 1 : delivery.current === 2 ? 2 : null;
    if (next !== null) void send({ type: 'direction-prepare', index: next }, false, false, true);
  }, [view?.directionDelivery?.current, view?.directions, view?.revision]);
  useEffect(() => {
    if (!view || reviewPalette || (view.palette && !view.palette.state.confirmedPalette)) return;
    const step = view.phase === 'discovery' ? view.question?.id :
      view.phase === 'calibration' ? view.calibrationFabric?.fabricMasterId :
        view.phase === 'brief' || view.phase === 'complete' ? 'ready' : null;
    if (!step) return;
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById('premium-current-step');
      if (element) window.scrollTo({ top: Math.max(0, window.scrollY + element.getBoundingClientRect().top - 88), behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [view, reviewPalette]);

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
    try { sessionStorage.removeItem(premiumSessionStorageKey); } catch { /* The active session still resets in memory. */ }
    resumeSession.current = null;
    latestView.current = null;
    pending.current = null;
    deliveredDirections.current = {};
    setView(null); setFabrics({}); setFeedback(null); setNotice(''); setReviewPalette(false);
    setBriefEditing(null); setDirectionProcessing(null); setOpeningDirection(null);
    setRestartPrompt(false); setReturningPrompt(false);
    void send();
  };
  const openDirection = async (index: number) => {
    if (view?.directions[index]?.cards.length || openingDirection !== null) return;
    setOpeningDirection(index);
    await send({ type: 'direction-hydrate', index });
    setOpeningDirection(null);
  };

  if (!view) return <main className={styles.shell}>{notice ? <div className={styles.notice} role="alert">{notice}<button disabled={busy} onClick={() => void send(undefined, true)}>Retry consultation</button></div> : <JourneyPreparation />}</main>;
  const showUpload = entry === 'match' && !roomPalette && !view.directions.length;
  const showPalette = Boolean(roomPalette && (!roomPalette.confirmedPalette || reviewPalette));

  return <main className={showUpload || showPalette ? `${referenceStyles.shell} ${styles.referenceHost}` : styles.shell}>
    <header className={styles.header}><Link href={fullUrl('/')} className={styles.wordmark}>Curtains<span>UK</span></Link><span>Fabric Intelligence™</span><a href={fullUrl('/pages/fabric-library')}>Explore fabrics</a><button className={styles.headerRestart} type="button" onClick={() => setRestartPrompt(true)}>Start again</button></header>
    <div className={styles.progress} aria-label="Consultation progress"><span className={roomPalette ? styles.complete : ''}>Your room</span><span className={view.phase !== 'discovery' ? styles.complete : ''}>Your taste</span><span className={view.phase === 'directions' || view.phase === 'final' || view.directions.length ? styles.complete : ''}>Your edit</span></div>
    {notice && <div className={styles.notice} role="alert">{notice}<button onClick={() => void send(undefined, true)}>Try again</button></div>}
    {!showPalette && roomPalette?.confirmedPalette && <button className={styles.textButton} onClick={() => setReviewPalette(true)}>Review my Room Palette</button>}
    {(showUpload || showPalette) && <ReferencePalette
      initialView={view.palette}
      transport={paletteTransport}
      maxImageMb={2}
      onChange={() => { /* The session response is the source of truth. */ }}
    />}
    {showPalette && roomPalette?.confirmedPalette && <button className={styles.primary} onClick={() => setReviewPalette(false)}>Continue with my Room Palette →</button>}
    {!showUpload && !showPalette && view.phase === 'discovery' && view.question && <section id="premium-current-step" className={`${styles.question} ${styles.taste}`} aria-labelledby="taste-heading"><div className={styles.stepLine}><p className={styles.eyebrow}>Your taste</p>{view.tasteProgress && <span>Question {view.tasteProgress.current} of {view.tasteProgress.total}</span>}</div>{view.tasteProgress && <progress className={styles.stepProgress} max={view.tasteProgress.total} value={view.tasteProgress.current} aria-label="Your taste progress" />}<h1 id="taste-heading">{view.question.prompt}</h1><p>Choose what feels most like you. We’ll use your answer to shape the fabrics you see.</p><div className={styles.tasteChoices}>{view.question.answers.map((answer, index) => <button key={answer.id} className={styles.tasteChoice} disabled={busy} onClick={() => void send({ type: 'answer', answerId: answer.id })}><span className={styles.choiceNumber}>{String(index + 1).padStart(2, '0')}</span><span>{answer.label}</span><span aria-hidden="true">→</span></button>)}</div>{entry === 'guided' && !roomPalette && <button className={styles.textButton} onClick={() => setEntry('match')}>Have something you’d like us to match with? Add a reference image</button>}</section>}
    {!showUpload && !showPalette && view.phase === 'price' && <section id="premium-current-step" className={`${styles.question} ${styles.taste}`} aria-labelledby="price-heading"><div className={styles.stepLine}><p className={styles.eyebrow}>Price level</p><span>One guide for your edit</span></div><h1 id="price-heading">Where would you like us to <em>begin?</em></h1><p>We’ll use the Curtains from guide to focus the real fabrics we show. Final made-to-measure pricing still depends on your measurements and options.</p><div className={styles.tasteChoices}>{[
      ['MID_RANGE', 'Mid Range', 'Curtains from under £50'], ['LUXURY', 'Luxury', 'Curtains from £50–£149.99'], ['PREMIUM_LUXURY', 'Premium Luxury', 'Curtains from £150–£249.99'], ['SUPER_LUXURY', 'Super Luxury', 'Curtains from £250+'],
    ].map(([level, title, detail], index) => <button key={level} className={styles.tasteChoice} disabled={busy} onClick={() => void send({ type: 'price-level', level })}><span className={styles.choiceNumber}>{String(index + 1).padStart(2, '0')}</span><span><strong>{title}</strong><small>{detail}</small></span><span aria-hidden="true">→</span></button>)}</div></section>}
    {!showUpload && !showPalette && view.phase === 'calibration' && <section id="premium-current-step" className={`${styles.calibration} ${styles.eye}`} aria-labelledby="eye-heading"><div className={styles.stepLine}><p className={styles.eyebrow}>Your eye</p>{view.calibrationProgress && <span>Fabric {view.calibrationProgress.current} of {view.calibrationProgress.total}</span>}</div>{view.calibrationProgress && <progress className={styles.stepProgress} max={view.calibrationProgress.total} value={view.calibrationProgress.current} aria-label="Fabric progress" />}<h1 id="eye-heading">Which fabrics <em>feel like you?</em></h1><p>Trust your first impression. Each choice helps us understand your taste.</p>{view.calibrationFabric ? <div className={styles.eyeFabric}><img src={view.calibrationFabric.imageUrl} alt={`${view.calibrationFabric.brand} ${view.calibrationFabric.design} ${view.calibrationFabric.colourway} fabric`} /><div><p className={styles.eyebrow}>{view.calibrationFabric.brand}</p><h2>{view.calibrationFabric.design} <em>{view.calibrationFabric.colourway}</em></h2><p>Fabric reference {view.calibrationFabric.supplierSku}</p></div></div> : view.stimulusId ? <img src={premiumProxyEnabled() ? `${premiumProxyPath('premium-asset')}?name=${encodeURIComponent(view.stimulusId)}.svg` : `/api/curtain-consultation-premium/assets/${encodeURIComponent(view.stimulusId)}.svg`} alt="Curtain design for preference calibration" /> : null}<div className={styles.eyeReactions}>{[['LOVE','Love this'],['LIKE','Like this'],['NOT_SURE','Not sure'],['DISLIKE','Not for me']].map(([reaction, label]) => <button key={reaction} disabled={busy} onClick={() => void send({ type: 'calibrate', reaction })}>{label}</button>)}</div></section>}
    {!showUpload && !showPalette && !directionProcessing && view.interiorBrief && (view.phase === 'brief' || view.phase === 'complete') && <section id="premium-current-step" className={styles.brief} aria-labelledby="brief-heading">
      <div className={styles.briefIntro}><p className={styles.eyebrow}>Your interior fabric brief</p><h1 id="brief-heading">A direction shaped <em>by you.</em></h1><p>{roomPalette?.confirmedPalette ? 'We’ve brought together your room, what matters to you and the fabrics you responded to.' : 'We’ve brought together what matters to you and the fabrics you responded to.'} This is the brief we’ll use to find your curtains.</p></div>
      <div className={styles.briefSources} aria-label="Sources of your brief"><span>Your room <small>{roomPalette?.confirmedPalette ? 'Confirmed palette' : 'Image optional'}</small></span><span>Your taste <small>What matters to you</small></span><span>Your eye <small>Fabrics you responded to</small></span></div>
      <div className={styles.briefBoard}>{view.interiorBrief.sections.map((section, index) => <article className={styles.briefRow} key={section.dimension}><span className={styles.briefNumber}>{String(index + 1).padStart(2, '0')}</span><div><h2>{section.title}</h2><p>{section.description}</p></div><div className={styles.briefValue}><strong>{section.value}</strong>{section.changed && <small>Your choice</small>}</div><button type="button" disabled={busy} onClick={() => setBriefEditing(briefEditing === section.dimension ? null : section.dimension)} aria-expanded={briefEditing === section.dimension} aria-controls={`brief-${section.dimension.replace('.', '-')}`}>Change</button>{briefEditing === section.dimension && <div id={`brief-${section.dimension.replace('.', '-')}`} className={styles.briefChoices} aria-label={`Change ${section.title}`}><p>Which feels closest to you?</p><div>{section.options.map((option) => <button type="button" key={option.value} aria-pressed={section.value === option.value} disabled={busy} onClick={async () => { if (await send({ type: 'brief-change', id: crypto.randomUUID(), choice: { dimension: section.dimension, value: option.value } })) setBriefEditing(null); }}>{option.label}</button>)}</div></div>}</article>)}</div>
      <div className={styles.briefFinish}><div><p className={styles.eyebrow}>Before we choose your fabrics</p><h2>Does this feel like you?</h2><p>You can change your brief later. Your room colours and practical needs remain separate.</p></div><button className={styles.primary} disabled={busy} onClick={() => { setDirectionProcessing('search'); void (async () => { await send({ type: 'brief-confirm', id: crypto.randomUUID() }); setDirectionProcessing(null); })(); }}>This feels like me →</button></div>
      {view.phase === 'complete' && <p className={styles.briefNext}>Next · <strong>Your edit</strong> — five directions, built from your brief.</p>}
    </section>}
    {!showUpload && !showPalette && !view.interiorBrief && view.phase === 'complete' && <section id="premium-current-step" className={styles.ready}><p className={styles.eyebrow}>Your profile</p><h1>Ready to explore <em>your directions.</em></h1><p>{view.profileSummary}</p><button className={styles.primary} disabled={busy} onClick={() => void send({ type: 'recommend' })}>Show my design directions →</button></section>}
    {!showUpload && !showPalette && directionProcessing && <section id="premium-current-step" className={styles.directionProcessing} aria-live="polite" aria-labelledby="direction-processing-heading"><p className={styles.eyebrow}>Fabric Intelligence</p><h1 id="direction-processing-heading">Creating your <em>fabric directions.</em></h1><p>We’re bringing together the evidence you have already confirmed, then checking each real fabric against the current CurtainsUK collection.</p><ol className={styles.processingStages}>{[
      ['Combining your colour palette', roomPalette?.confirmedPalette ? 'complete' : 'skipped'],
      ['Refining your taste preferences', 'complete'],
      ['Applying your chosen price level', 'complete'],
      ['Learning from your calibration choices', 'complete'],
      ['Searching the CurtainsUK fabric collection', directionProcessing === 'search' ? 'active' : 'complete'],
      ['Creating your fabric directions', directionProcessing === 'create' ? 'active' : 'waiting'],
    ].map(([label, status]) => <li key={label} className={styles[`processing_${status}`]}>{status === 'complete' ? <span aria-hidden="true">✓</span> : <span aria-hidden="true">{status === 'active' ? '•' : status === 'skipped' ? '—' : '○'}</span>}{label}</li>)}</ol></section>}
    {!showUpload && !showPalette && !directionProcessing && view.directions.length > 0 && view.phase !== 'brief' && <section className={styles.directions}><p className={styles.eyebrow}>{view.phase === 'final' ? 'Your refined shortlist' : view.directionDelivery ? 'Your edit' : view.directions.every((direction) => direction.cards.length > 1) ? 'Your edit' : 'Five design directions'}</p><h1>{view.phase === 'final' ? <>A shortlist shaped <em>by you.</em></> : view.directionDelivery || view.directions.every((direction) => direction.cards.length > 1) ? <>Three directions, <em>built from your brief.</em></> : <>Five ways your room <em>could go.</em></>}</h1>{view.learning?.summary.length ? <p>{view.learning.summary.join(' ')}</p> : <p>Each direction uses your confirmed room context, calibration and real CurtainsUK fabrics.</p>}{view.interiorBrief && <button className={styles.textButton} disabled={busy} onClick={() => void send({ type: 'brief-adjust', id: crypto.randomUUID() })}>Adjust my brief</button>}<div className={styles.directionGrid}>{view.directions.map((direction, index) => <DirectionCard key={direction.id} direction={direction} fabrics={fabrics} final={view.phase === 'final'} opening={openingDirection === index} onExplore={() => void openDirection(index)} onReaction={(card, reaction, selected = [], likeDirection = false) => setFeedback({ direction, card, reaction, selected, likeDirection })} onOutcome={reportOutcome} commerceUrl={commerceUrl} />)}</div>{view.phase !== 'final' && !view.directionDelivery && !view.directions.every((direction) => direction.cards.length > 1) && <button className={styles.primary} disabled={busy} onClick={() => void send({ type: 'finish' })}>Refine my directions →</button>}</section>}
    {feedback && <FeedbackSheet value={feedback} busy={busy} onClose={() => setFeedback(null)} onChange={setFeedback} onSave={async () => { const directionReaction = feedback.likeDirection ? 'LIKE' : feedback.reaction === 'LOVE' ? 'LOVE' : null; const saved = await send({ type: 'feedback', command: { id: crypto.randomUUID(), strategyId: feedback.direction.id, fabricId: feedback.card.reactionId, fabricReaction: feedback.reaction, directionReaction, optionIds: feedback.selected } }); if (saved && await send({ type: 'finish' })) setFeedback(null); }} />}
    {(restartPrompt || returningPrompt) && <RestartSheet returning={returningPrompt} onContinue={() => { setReturningPrompt(false); setRestartPrompt(false); }} onStartAgain={startAgain} />}
  </main>;
}

const styleRefinementLabels: Record<string, string> = {
  'change:warmer': 'Warmer', 'change:cooler': 'Cooler', 'change:plainer': 'Quieter', 'change:patterned': 'More pattern',
  'change:texture': 'More texture', 'change:smooth': 'Less texture',
};

function JourneyPreparation() {
  return <section className={styles.journeyPreparation} aria-live="polite"><p className={styles.eyebrow}>Fabric Intelligence</p><span className={styles.preparationMark} aria-hidden="true" /><h1>Preparing your <em>Fabric Intelligence journey.</em></h1><p>Getting everything ready for your room…</p></section>;
}

function RestartSheet({ returning, onContinue, onStartAgain }: { returning: boolean; onContinue: () => void; onStartAgain: () => void }) {
  return <div className={styles.sheetBackdrop} role="presentation"><section className={styles.restartSheet} role="dialog" aria-modal="true" aria-label={returning ? 'Continue or start again' : 'Start again'}><p className={styles.eyebrow}>{returning ? 'Welcome back' : 'Start again'}</p><h2>{returning ? 'Would you like to continue your choices?' : 'Start a new Fabric Intelligence journey?'}</h2><p>{returning ? 'Your saved room, taste, price level and fabric choices are ready when you are.' : 'This clears the room, palette, taste, price level, calibration, brief, directions and feedback for this consultation.'}</p><div className={styles.restartActions}><button type="button" className={styles.secondary} onClick={onContinue}>{returning ? 'Continue my choices' : 'Keep my choices'}</button><button type="button" className={styles.primary} onClick={onStartAgain}>Start again</button></div></section></div>;
}

function DirectionCard({ direction, fabrics, final, opening, onExplore, onReaction, onOutcome, commerceUrl }: { direction: Direction; fabrics: Record<string, Fabric | null | 'error'>; final: boolean; opening: boolean; onExplore: () => void; onReaction: (card: Card, reaction: string, selected?: string[], likeDirection?: boolean) => void; onOutcome: (card: Card, direction: Direction, event: string) => Promise<boolean>; commerceUrl: (card: Card, direction: Direction, sample: boolean) => string }) {
  const card = direction.cards[0];
  const fabric = card ? fabrics[card.fabricMasterId] : undefined;
  if (direction.cards.length === 0) {
    return <article className={`${styles.directionCard} ${styles.styleDirectionCard} ${styles.styleDirectionSummary}`}><div className={styles.styleDirectionIntro}><p className={styles.eyebrow}>{direction.label}</p><h2>{direction.purpose}</h2><p>Six real fabrics have been selected for this direction from your confirmed brief.</p><button type="button" className={styles.primary} disabled={opening} onClick={onExplore}>{opening ? 'Opening this direction…' : 'Explore this direction →'}</button>{opening && <p className={styles.directionOpening} aria-live="polite">Bringing together the six fabrics selected for you…</p>}</div></article>;
  }
  if (direction.cards.length > 1) {
    const refinements = card?.feedback?.change.filter((option) => option.id in styleRefinementLabels) ?? [];
    return <article className={`${styles.directionCard} ${styles.styleDirectionCard}`}><div className={styles.styleDirectionIntro}><p className={styles.eyebrow}>{direction.label}</p><h2>{direction.purpose}</h2>{card && refinements.length > 0 && <div className={styles.styleRefinements} aria-label={`Refine ${direction.label}`}><span>Refine this direction</span><div>{refinements.map((option) => <button key={option.id} type="button" onClick={() => onReaction(card, 'NOT_QUITE', [option.id], true)}>{styleRefinementLabels[option.id]}</button>)}</div></div>}</div><div className={styles.styleFabricGrid}>{direction.cards.map((entry) => <StyleFabricCard key={entry.fabricMasterId} card={entry} direction={direction} fabric={fabrics[entry.fabricMasterId]} final={final} onReaction={onReaction} onOutcome={onOutcome} commerceUrl={commerceUrl} />)}</div></article>;
  }
  if (!card || fabric === null) return <article className={styles.directionCard}><div className={styles.cardBody}><p className={styles.eyebrow}>{direction.label}</p><h2>This fabric is currently unavailable.</h2><p>The fabric selected for this direction no longer meets our current catalogue checks. You can continue with another direction or explore the Fabric Library.</p><div className={styles.actions}><a href="/pages/fabric-library">Explore current fabrics →</a></div></div></article>;
  if (fabric === 'error' || fabric === undefined) return <article className={styles.directionCard}><div className={styles.cardBody}><p className={styles.eyebrow}>{direction.label}</p><h2>{fabric === 'error' ? 'We could not verify this fabric.' : 'Checking this fabric…'}</h2><p>{fabric === 'error' ? 'Please refresh the consultation before choosing a fabric.' : 'We are checking its current catalogue details before showing shopping options.'}</p></div></article>;
  const handoff = async (event: MouseEvent<HTMLAnchorElement>, type: string, sample: boolean) => { event.preventDefault(); if (await onOutcome(card, direction, type)) window.location.assign(commerceUrl(card, direction, sample)); };
  return <article className={styles.directionCard}><div className={styles.fabricImage}>{fabric?.images[0] ? <img src={fabric.images[0].url} alt={`${fabric.design} ${fabric.colour} fabric`} /> : <div>Loading fabric</div>}<span>{direction.label}</span></div><div className={styles.cardBody}><p className={styles.eyebrow}>{fabric?.brand ?? 'CurtainsUK fabric'}</p><h2>{fabric?.design ?? 'Loading'} <em>{fabric?.colour}</em></h2><p>{direction.purpose}</p><div className={styles.why}><strong>Why we chose this</strong><p>{card.explanation.join(' ')}</p></div>{!final && <div className={styles.reactions}>{reactionCopy.map(([id, text]) => <button key={id} onClick={() => onReaction(card, id)}>{text}</button>)}</div>}<div className={styles.actions}>{fabric?.sampleAvailable && <a onClick={(event) => void handoff(event, 'SAMPLE_INTENT', true)} href={commerceUrl(card, direction, true)}>Order sample</a>}<a className={styles.primaryLink} onClick={(event) => void handoff(event, 'FABRIC_SELECTED', false)} href={commerceUrl(card, direction, false)}>Make curtains</a></div></div></article>;
}

function StyleFabricCard({ card, direction, fabric, final, onReaction, onOutcome, commerceUrl }: { card: Card; direction: Direction; fabric?: Fabric | null | 'error'; final: boolean; onReaction: (card: Card, reaction: string, selected?: string[], likeDirection?: boolean) => void; onOutcome: (card: Card, direction: Direction, event: string) => Promise<boolean>; commerceUrl: (card: Card, direction: Direction, sample: boolean) => string }) {
  if (fabric === undefined) return <article className={styles.styleFabric}><div className={styles.styleFabricPending}>Checking this fabric…</div></article>;
  if (fabric === null || fabric === 'error') return <article className={styles.styleFabric}><div className={styles.styleFabricPending}>This fabric is no longer available.</div></article>;
  const handoff = async (event: MouseEvent<HTMLAnchorElement>, type: string, sample: boolean) => { event.preventDefault(); if (await onOutcome(card, direction, type)) window.location.assign(commerceUrl(card, direction, sample)); };
  return <article className={styles.styleFabric}><div className={styles.styleFabricImage}>{fabric.images[0] ? <img src={fabric.images[0].url} alt={`${fabric.design} ${fabric.colour} fabric`} /> : <div>Fabric image unavailable</div>}</div><div className={styles.styleFabricBody}><p className={styles.eyebrow}>{fabric.brand}</p><h3>{fabric.design} <em>{fabric.colour}</em></h3><p className={styles.styleReason}>{card.explanation.join(' ')}</p>{!final && <div className={styles.styleFabricFeedback} aria-label={`Tell us about ${fabric.design} ${fabric.colour}`}><button type="button" onClick={() => onReaction(card, 'LOVE')}>Love this</button><button type="button" onClick={() => onReaction(card, 'NOT_FOR_ME')}>Not for me</button></div>}<div className={styles.styleActions}>{fabric.sampleAvailable && <a onClick={(event) => void handoff(event, 'SAMPLE_INTENT', true)} href={commerceUrl(card, direction, true)}>Order sample</a>}<a onClick={(event) => void handoff(event, 'FABRIC_SELECTED', false)} href={commerceUrl(card, direction, false)}>Make curtains</a></div></div></article>;
}

function FeedbackSheet({ value, busy, onClose, onChange, onSave }: { value: { direction: Direction; card: Card; reaction: string; selected: string[]; likeDirection: boolean }; busy: boolean; onClose: () => void; onChange: (value: { direction: Direction; card: Card; reaction: string; selected: string[]; likeDirection: boolean }) => void; onSave: () => Promise<void> }) {
  const options = value.reaction === 'MORE_LIKE_THIS' ? value.card.feedback?.keep ?? [] : ['NOT_QUITE', 'NOT_FOR_ME'].includes(value.reaction) ? value.card.feedback?.change ?? [] : [];
  const title = value.reaction === 'MORE_LIKE_THIS' ? 'What would you like us to keep?' : value.reaction === 'NOT_QUITE' ? 'What would you change?' : value.reaction === 'NOT_FOR_ME' ? 'What put you off?' : 'A direction worth keeping.';
  const toggle = (id: string) => onChange({ ...value, selected: value.selected.includes(id) ? value.selected.filter((item) => item !== id) : [...value.selected, id] });
  return <div className={styles.sheetBackdrop} role="presentation"><section className={styles.sheet} role="dialog" aria-modal="true" aria-label="Tell Fabric Intelligence more"><button className={styles.close} onClick={onClose} aria-label="Close">×</button><p className={styles.eyebrow}>Fabric Intelligence is listening</p><h2>{title}</h2><p>Choose only what matters. These choices come from governed evidence for this fabric and its alternatives.</p><div className={styles.options}>{options.map((option) => <label key={option.id}><input type="checkbox" checked={value.selected.includes(option.id)} onChange={() => toggle(option.id)} /><span><small>{option.group}</small>{option.label}</span></label>)}</div>{value.reaction !== 'LOVE' && <label className={styles.directionLike}><input type="checkbox" checked={value.likeDirection} onChange={(event) => onChange({ ...value, likeDirection: event.target.checked })} />I like this direction, just not this fabric</label>}<button className={styles.primary} disabled={busy} onClick={() => void onSave()}>Use this feedback</button></section></div>;
}
