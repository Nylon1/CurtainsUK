'use client';
/* eslint-disable @next/next/no-img-element -- Fabric Master and guarded calibration assets retain their existing URL contracts. */

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { fullUrl } from '@/lib/sitemap-utils';
import { shopifyConsultationHandoff } from '@/lib/storefront/consultation-navigation';
import { acknowledgedPremiumRevision, premiumSessionStorageKey, savedPremiumSession } from './curtainsuk-premium-transport';
import styles from './curtainsuk-premium-consultation.module.css';
import referenceStyles from '@/vendor/hci-approved/components/ReferenceExperience.module.css';

import { ReferencePalette, type PaletteView } from '@/vendor/hci-approved/components/ReferencePalette';
import type { PaletteState } from '@/vendor/hci-approved/intelligence/reference-images/palette';

type Card = { fabricMasterId: string; supplierSku: string; reactionId: string; explanation: string[]; commerceToken: string };
type Option = { id: string; label: string; group: string; dimension: string };
type Direction = { id: string; label: string; purpose: string; status: string; cards: Card[]; feedback: { keep: Option[]; change: Option[] } };
type InteriorBrief = { status: 'HCI_PROPOSED' | 'CUSTOMER_CONFIRMED'; version: number; sections: { dimension: string; title: string; description: string; value: string; changed: boolean; options: { value: string; label: string }[] }[] };
type View = {
  sessionId: string;
  revision: number;
  phase: 'discovery' | 'calibration' | 'brief' | 'complete' | 'directions' | 'final';
  profileSummary: string;
  question: { id: string; prompt: string; answers: { id: string; label: string }[] } | null;
  stimulusId: string | null;
  tasteProgress: { current: number; total: number } | null;
  calibrationFabric: { fabricMasterId: string; supplierSku: string; brand: string; design: string; colourway: string; imageUrl: string } | null;
  calibrationProgress: { current: number; total: number } | null;
  interiorBrief: InteriorBrief | null;
  palette: { recordId: string; state: PaletteState } | null;
  directions: Direction[];
  learning: { events: unknown[]; summary: string[] } | null;
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
  const [fabrics, setFabrics] = useState<Record<string, Fabric>>({});
  const [feedback, setFeedback] = useState<{ direction: Direction; reaction: string; selected: string[]; likeDirection: boolean } | null>(null);
  const pending = useRef<Record<string, unknown> | null>(null);
  const loaded = useRef(false);
  const latestView = useRef<View | null>(null);
  const bridgeRequest = useRef<RequestInit | null>(null);
  const requestLock = useRef(false);
  const resumeSession = useRef<string | null>(null);
  const [reviewPalette, setReviewPalette] = useState(false);
  const [briefEditing, setBriefEditing] = useState<string | null>(null);

  const send = async (action?: Record<string, unknown>, retry = false, paletteRequest = false) => {
    if (requestLock.current) return null;
    requestLock.current = true;
    const payload = retry && pending.current ? pending.current : {
      requestId: crypto.randomUUID(),
      sessionId: latestView.current?.sessionId ?? resumeSession.current,
      revision: latestView.current?.revision ?? null,
      ...(action ? { action } : {}),
    };
    pending.current = payload;
    setBusy(true); setNotice('');
    try {
      const response = await fetch('/api/curtain-consultation-premium', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Your consultation is temporarily unavailable.');
      data.revision = acknowledgedPremiumRevision(payload.revision, data.revision, Boolean(payload.action) || !payload.sessionId);
      resumeSession.current = data.sessionId;
      try { sessionStorage.setItem(premiumSessionStorageKey, data.sessionId); } catch { /* Server evidence remains durable. */ }
      latestView.current = data; setView(data); pending.current = null;
      return data as View;
    } catch (error) {
      // Palette failures belong to ReferencePalette and its exact saved-request retry.
      // A failed colour save does not declare the whole consultation unavailable.
      if (!paletteRequest) setNotice(error instanceof Error ? error.message : 'Your consultation is temporarily unavailable.');
      return null;
    } finally { requestLock.current = false; setBusy(false); }
  };
  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      setEntry(new URLSearchParams(window.location.search).get('entry') === 'guided' ? 'guided' : 'match');
      try { resumeSession.current = savedPremiumSession(sessionStorage.getItem(premiumSessionStorageKey)); } catch { /* Storage may be disabled. */ }
      void send();
    }
  // This initializes exactly one anonymous consultation; re-running would create a second request.
  }, []);
  useEffect(() => {
    if (!view?.directions.length) return;
    const ids = view.directions.flatMap((direction) => direction.cards.map((card) => card.fabricMasterId)).filter((id) => !fabrics[id]);
    void Promise.all(ids.map(async (id) => {
      const response = await fetch(`/api/curtain-consultation-premium?fabric=${encodeURIComponent(id)}`);
      const data = await response.json();
      if (response.ok && data.fabric?.id === id) setFabrics((previous) => ({ ...previous, [id]: data.fabric }));
    }));
  }, [view, fabrics]);
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

  if (!view) return <main className={styles.shell}>{notice ? <div className={styles.notice} role="alert">{notice}<button disabled={busy} onClick={() => void send(undefined, true)}>Retry consultation</button></div> : <p className={styles.loading}>Preparing your Fabric Intelligence consultation…</p>}</main>;
  const showUpload = entry === 'match' && !roomPalette && !view.directions.length;
  const showPalette = Boolean(roomPalette && (!roomPalette.confirmedPalette || reviewPalette));

  return <main className={showUpload || showPalette ? `${referenceStyles.shell} ${styles.referenceHost}` : styles.shell}>
    <header className={styles.header}><Link href={fullUrl('/')} className={styles.wordmark}>Curtains<span>UK</span></Link><span>Fabric Intelligence™</span><a href={fullUrl('/pages/fabric-library')}>Explore fabrics</a></header>
    <div className={styles.progress} aria-label="Consultation progress"><span className={roomPalette ? styles.complete : ''}>Your room</span><span className={view.phase !== 'discovery' ? styles.complete : ''}>Your taste</span><span className={view.directions.length ? styles.complete : ''}>Your edit</span></div>
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
    {!showUpload && !showPalette && view.phase === 'calibration' && <section id="premium-current-step" className={`${styles.calibration} ${styles.eye}`} aria-labelledby="eye-heading"><div className={styles.stepLine}><p className={styles.eyebrow}>Your eye</p>{view.calibrationProgress && <span>Fabric {view.calibrationProgress.current} of {view.calibrationProgress.total}</span>}</div>{view.calibrationProgress && <progress className={styles.stepProgress} max={view.calibrationProgress.total} value={view.calibrationProgress.current} aria-label="Fabric progress" />}<h1 id="eye-heading">Which fabrics <em>feel like you?</em></h1><p>Trust your first impression. Each choice helps us understand your taste.</p>{view.calibrationFabric ? <div className={styles.eyeFabric}><img src={view.calibrationFabric.imageUrl} alt={`${view.calibrationFabric.brand} ${view.calibrationFabric.design} ${view.calibrationFabric.colourway} fabric`} /><div><p className={styles.eyebrow}>{view.calibrationFabric.brand}</p><h2>{view.calibrationFabric.design} <em>{view.calibrationFabric.colourway}</em></h2><p>Fabric reference {view.calibrationFabric.supplierSku}</p></div></div> : view.stimulusId ? <img src={`/api/curtain-consultation-premium/assets/${encodeURIComponent(view.stimulusId)}.svg`} alt="Curtain design for preference calibration" /> : null}<div className={styles.eyeReactions}>{[['LOVE','Love this'],['LIKE','Like this'],['NOT_SURE','Not sure'],['DISLIKE','Not for me']].map(([reaction, label]) => <button key={reaction} disabled={busy} onClick={() => void send({ type: 'calibrate', reaction })}>{label}</button>)}</div></section>}
    {!showUpload && !showPalette && view.interiorBrief && (view.phase === 'brief' || view.phase === 'complete') && <section id="premium-current-step" className={styles.brief} aria-labelledby="brief-heading">
      <div className={styles.briefIntro}><p className={styles.eyebrow}>Your interior fabric brief</p><h1 id="brief-heading">A direction shaped <em>by you.</em></h1><p>{roomPalette?.confirmedPalette ? 'We’ve brought together your room, what matters to you and the fabrics you responded to.' : 'We’ve brought together what matters to you and the fabrics you responded to.'} This is the brief we’ll use to find your curtains.</p></div>
      <div className={styles.briefSources} aria-label="Sources of your brief"><span>Your room <small>{roomPalette?.confirmedPalette ? 'Confirmed palette' : 'Image optional'}</small></span><span>Your taste <small>What matters to you</small></span><span>Your eye <small>Fabrics you responded to</small></span></div>
      <div className={styles.briefBoard}>{view.interiorBrief.sections.map((section, index) => <article className={styles.briefRow} key={section.dimension}><span className={styles.briefNumber}>{String(index + 1).padStart(2, '0')}</span><div><h2>{section.title}</h2><p>{section.description}</p></div><div className={styles.briefValue}><strong>{section.value}</strong>{section.changed && <small>Your choice</small>}</div><button type="button" disabled={busy} onClick={() => setBriefEditing(briefEditing === section.dimension ? null : section.dimension)} aria-expanded={briefEditing === section.dimension} aria-controls={`brief-${section.dimension.replace('.', '-')}`}>Change</button>{briefEditing === section.dimension && <div id={`brief-${section.dimension.replace('.', '-')}`} className={styles.briefChoices} aria-label={`Change ${section.title}`}><p>Which feels closest to you?</p><div>{section.options.map((option) => <button type="button" key={option.value} aria-pressed={section.value === option.value} disabled={busy} onClick={async () => { if (await send({ type: 'brief-change', id: crypto.randomUUID(), choice: { dimension: section.dimension, value: option.value } })) setBriefEditing(null); }}>{option.label}</button>)}</div></div>}</article>)}</div>
      <div className={styles.briefFinish}><div><p className={styles.eyebrow}>Before we choose your fabrics</p><h2>Does this feel like you?</h2><p>You can change your brief later. Your room colours and practical needs remain separate.</p></div><button className={styles.primary} disabled={busy} onClick={() => void send({ type: 'brief-confirm', id: crypto.randomUUID() })}>This feels like me →</button></div>
      {view.phase === 'complete' && <p className={styles.briefNext}>Next · <strong>Your edit</strong> — five directions, built from your brief.</p>}
    </section>}
    {!showUpload && !showPalette && !view.interiorBrief && view.phase === 'complete' && <section id="premium-current-step" className={styles.ready}><p className={styles.eyebrow}>Your profile</p><h1>Ready to explore <em>your directions.</em></h1><p>{view.profileSummary}</p><button className={styles.primary} disabled={busy} onClick={() => void send({ type: 'recommend' })}>Show my design directions →</button></section>}
    {!showUpload && !showPalette && view.directions.length > 0 && view.phase !== 'brief' && <section className={styles.directions}><p className={styles.eyebrow}>{view.phase === 'final' ? 'Your refined shortlist' : 'Five design directions'}</p><h1>{view.phase === 'final' ? <>A shortlist shaped <em>by you.</em></> : <>Five ways your room <em>could go.</em></>}</h1>{view.learning?.summary.length ? <p>{view.learning.summary.join(' ')}</p> : <p>Each direction uses your confirmed room context, calibration and real CurtainsUK fabrics.</p>}{view.interiorBrief && <button className={styles.textButton} disabled={busy} onClick={() => void send({ type: 'brief-adjust', id: crypto.randomUUID() })}>Adjust my brief</button>}<div className={styles.directionGrid}>{view.directions.map((direction) => <DirectionCard key={direction.id} direction={direction} fabric={direction.cards[0] ? fabrics[direction.cards[0].fabricMasterId] : undefined} final={view.phase === 'final'} onReaction={(reaction) => setFeedback({ direction, reaction, selected: [], likeDirection: false })} onOutcome={reportOutcome} commerceUrl={commerceUrl} />)}</div>{view.phase !== 'final' && <button className={styles.primary} disabled={busy} onClick={() => void send({ type: 'finish' })}>Refine my directions →</button>}</section>}
    {feedback && <FeedbackSheet value={feedback} busy={busy} onClose={() => setFeedback(null)} onChange={setFeedback} onSave={async () => { const card = feedback.direction.cards[0]; if (!card) return; const directionReaction = feedback.likeDirection ? 'LIKE' : feedback.reaction === 'NOT_FOR_ME' ? 'DISLIKE' : feedback.reaction === 'LOVE' ? 'LOVE' : null; if (await send({ type: 'feedback', command: { id: crypto.randomUUID(), strategyId: feedback.direction.id, fabricId: card.reactionId, fabricReaction: feedback.reaction, directionReaction, optionIds: feedback.selected } })) setFeedback(null); }} />}
  </main>;
}

function DirectionCard({ direction, fabric, final, onReaction, onOutcome, commerceUrl }: { direction: Direction; fabric?: Fabric; final: boolean; onReaction: (reaction: string) => void; onOutcome: (card: Card, direction: Direction, event: string) => Promise<boolean>; commerceUrl: (card: Card, direction: Direction, sample: boolean) => string }) {
  const card = direction.cards[0]; if (!card) return <article className={styles.directionCard}><p>{direction.label}</p><h2>{direction.purpose}</h2><span>Unavailable for this consultation</span></article>;
  const handoff = async (event: MouseEvent<HTMLAnchorElement>, type: string, sample: boolean) => { event.preventDefault(); if (await onOutcome(card, direction, type)) window.location.assign(commerceUrl(card, direction, sample)); };
  return <article className={styles.directionCard}><div className={styles.fabricImage}>{fabric?.images[0] ? <img src={fabric.images[0].url} alt={`${fabric.design} ${fabric.colour} fabric`} /> : <div>Loading fabric</div>}<span>{direction.label}</span></div><div className={styles.cardBody}><p className={styles.eyebrow}>{fabric?.brand ?? 'CurtainsUK fabric'}</p><h2>{fabric?.design ?? 'Loading'} <em>{fabric?.colour}</em></h2><p>{direction.purpose}</p><div className={styles.why}><strong>Why we chose this</strong><p>{card.explanation.join(' ')}</p></div>{!final && <div className={styles.reactions}>{reactionCopy.map(([id, text]) => <button key={id} onClick={() => onReaction(id)}>{text}</button>)}</div>}<div className={styles.actions}>{fabric?.sampleAvailable && <a onClick={(event) => void handoff(event, 'SAMPLE_INTENT', true)} href={commerceUrl(card, direction, true)}>Order sample</a>}<a className={styles.primaryLink} onClick={(event) => void handoff(event, 'FABRIC_SELECTED', false)} href={commerceUrl(card, direction, false)}>Make curtains</a></div></div></article>;
}

function FeedbackSheet({ value, busy, onClose, onChange, onSave }: { value: { direction: Direction; reaction: string; selected: string[]; likeDirection: boolean }; busy: boolean; onClose: () => void; onChange: (value: { direction: Direction; reaction: string; selected: string[]; likeDirection: boolean }) => void; onSave: () => Promise<void> }) {
  const options = value.reaction === 'MORE_LIKE_THIS' ? value.direction.feedback.keep : ['NOT_QUITE', 'NOT_FOR_ME'].includes(value.reaction) ? value.direction.feedback.change : [];
  const title = value.reaction === 'MORE_LIKE_THIS' ? 'What would you like us to keep?' : value.reaction === 'NOT_QUITE' ? 'What would you change?' : value.reaction === 'NOT_FOR_ME' ? 'What put you off?' : 'A direction worth keeping.';
  const toggle = (id: string) => onChange({ ...value, selected: value.selected.includes(id) ? value.selected.filter((item) => item !== id) : [...value.selected, id] });
  return <div className={styles.sheetBackdrop} role="presentation"><section className={styles.sheet} role="dialog" aria-modal="true" aria-label="Tell Fabric Intelligence more"><button className={styles.close} onClick={onClose} aria-label="Close">×</button><p className={styles.eyebrow}>Fabric Intelligence is listening</p><h2>{title}</h2><p>Choose only what matters. These choices come from governed evidence for this fabric and its alternatives.</p><div className={styles.options}>{options.map((option) => <label key={option.id}><input type="checkbox" checked={value.selected.includes(option.id)} onChange={() => toggle(option.id)} /><span><small>{option.group}</small>{option.label}</span></label>)}</div>{value.reaction !== 'LOVE' && <label className={styles.directionLike}><input type="checkbox" checked={value.likeDirection} onChange={(event) => onChange({ ...value, likeDirection: event.target.checked })} />I like this direction, just not this fabric</label>}<button className={styles.primary} disabled={busy} onClick={() => void onSave()}>Use this feedback</button></section></div>;
}
