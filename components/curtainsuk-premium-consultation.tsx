'use client';
/* eslint-disable @next/next/no-img-element -- Fabric Master and guarded calibration assets retain their existing URL contracts. */

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { acknowledgedPremiumRevision } from './curtainsuk-premium-transport';
import styles from './curtainsuk-premium-consultation.module.css';
import referenceStyles from '@/vendor/hci-approved/components/ReferenceExperience.module.css';

import { ReferencePalette, type PaletteView } from '@/vendor/hci-approved/components/ReferencePalette';
import type { PaletteState } from '@/vendor/hci-approved/intelligence/reference-images/palette';

type Card = { fabricMasterId: string; supplierSku: string; reactionId: string; explanation: string[]; commerceToken: string };
type Option = { id: string; label: string; group: string; dimension: string };
type Direction = { id: string; label: string; purpose: string; status: string; cards: Card[]; feedback: { keep: Option[]; change: Option[] } };
type View = {
  sessionId: string;
  revision: number;
  phase: 'discovery' | 'calibration' | 'complete' | 'directions' | 'final';
  profileSummary: string;
  question: { id: string; prompt: string; answers: { id: string; label: string }[] } | null;
  stimulusId: string | null;
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

  const send = async (action?: Record<string, unknown>, retry = false) => {
    if (busy && !retry) return null;
    const payload = retry && pending.current ? pending.current : {
      requestId: crypto.randomUUID(),
      sessionId: latestView.current?.sessionId ?? null,
      revision: latestView.current?.revision ?? null,
      ...(action ? { action } : {}),
    };
    pending.current = payload;
    setBusy(true); setNotice('');
    try {
      const response = await fetch('/api/curtain-consultation-premium', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Your consultation is temporarily unavailable.');
      data.revision = acknowledgedPremiumRevision(payload.revision, data.revision);
      latestView.current = data; setView(data); pending.current = null;
      return data as View;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Your consultation is temporarily unavailable.');
      return null;
    } finally { setBusy(false); }
  };
  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      setEntry(new URLSearchParams(window.location.search).get('entry') === 'guided' ? 'guided' : 'match');
      void send();
    }
  // This initializes exactly one anonymous consultation; re-running would create a second request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const roomPalette = view?.palette?.state;
  // Translate only transport. The imported HCI components own the approved experience.
  const paletteTransport = async (request: RequestInit): Promise<PaletteView> => {
    const retry = bridgeRequest.current === request && Boolean(pending.current);
    bridgeRequest.current = request;
    let result: View | null;
    if (retry) result = await send(undefined, true);
    else if (request.body instanceof Blob) {
      const headers = new Headers(request.headers);
      result = await send({ type: 'image', mime: request.body.type,
        bytes: base64(await request.body.arrayBuffer()),
        referenceType: headers.get('x-hci-reference-type') ?? 'room' });
    } else {
      const command = JSON.parse(String(request.body));
      result = await send({ type: 'palette', edit: command.action });
    }
    if (!result?.palette) throw Error('PALETTE_REQUEST_FAILED');
    bridgeRequest.current = null;
    return result.palette;
  };
  const commerceUrl = (card: Card, direction: Direction, sample: boolean) => {
    const destination = sample ? '/pages/fabric-library' : '/pages/curtain-visualiser';
    // Customer navigation remains in the current CurtainsUK origin: Shopify in the
    // candidate and this protected same-origin preview during review.
    const url = new URL(destination, window.location.origin);
    url.searchParams.set('fabric', card.fabricMasterId); if (sample) url.searchParams.set('intent', 'sample');
    url.hash = `cuk_hci=${encodeURIComponent(JSON.stringify({ sessionId: view?.sessionId, fabricMasterId: card.fabricMasterId, strategyId: direction.id, commerceToken: card.commerceToken, returnOrigin: window.location.origin }))}`;
    return url.toString();
  };
  const reportOutcome = async (card: Card, direction: Direction, event: string) => Boolean(await send({ type: 'outcome', event, fabricMasterId: card.fabricMasterId, strategyId: direction.id }));

  if (!view) return <main className={styles.shell}><p className={styles.loading}>Preparing your Fabric Intelligence consultation…</p></main>;
  const showUpload = entry === 'match' && !roomPalette && !view.directions.length;
  const showPalette = Boolean(roomPalette && !roomPalette.confirmedPalette);

  return <main className={showUpload || showPalette ? `${referenceStyles.shell} ${styles.referenceHost}` : styles.shell}>
    <header className={styles.header}><Link href="/" className={styles.wordmark}>Curtains<span>UK</span></Link><span>Fabric Intelligence™</span><a href="/fabrics">Explore fabrics</a></header>
    <div className={styles.progress} aria-label="Consultation progress"><span className={roomPalette ? styles.complete : ''}>Your room</span><span className={view.phase !== 'discovery' ? styles.complete : ''}>Your taste</span><span className={view.directions.length ? styles.complete : ''}>Your edit</span></div>
    {notice && <div className={styles.notice} role="alert">{notice}<button onClick={() => void send(undefined, true)}>Try again</button></div>}
    {(showUpload || showPalette) && <ReferencePalette
      initialView={view.palette}
      transport={paletteTransport}
      maxImageMb={2}
      onChange={() => { /* The session response is the source of truth. */ }}
    />}
    {!showUpload && !showPalette && view.phase === 'discovery' && view.question && <section className={styles.question}><p className={styles.eyebrow}>Your starting point</p><h1>{view.question.prompt}</h1><div className={styles.answers}>{view.question.answers.map((answer) => <button key={answer.id} disabled={busy} onClick={() => void send({ type: 'answer', answerId: answer.id })}>{answer.label}</button>)}</div>{entry === 'guided' && !roomPalette && <button className={styles.textButton} onClick={() => setEntry('match')}>Have something you’d like us to match with? Add a reference image</button>}</section>}
    {!showUpload && !showPalette && view.phase === 'calibration' && <section className={styles.calibration}><p className={styles.eyebrow}>Visual calibration</p><h1>What is your first <em>reaction?</em></h1><p>Your response helps us understand the fabric character you enjoy.</p>{view.stimulusId && <img src={`/api/curtain-consultation-premium/assets/${encodeURIComponent(view.stimulusId)}.svg`} alt="Curtain design for visual preference calibration" />}<div className={styles.answers}>{[['LOVE','Love it'],['LIKE','I like it'],['NOT_SURE','Not sure'],['DISLIKE','Not for me']].map(([reaction, text]) => <button key={reaction} disabled={busy} onClick={() => void send({ type: 'calibrate', reaction })}>{text}</button>)}</div></section>}
    {!showUpload && !showPalette && view.phase === 'complete' && <section className={styles.ready}><p className={styles.eyebrow}>Your profile</p><h1>Ready to explore <em>your directions.</em></h1><p>{view.profileSummary}</p>{!roomPalette && <button className={styles.textButton} onClick={() => setEntry('match')}>Add a room image first</button>}<button className={styles.primary} disabled={busy} onClick={() => void send({ type: 'recommend' })}>{roomPalette ? 'Show my design directions →' : 'Show my design directions →'}</button></section>}
    {!showUpload && !showPalette && view.directions.length > 0 && <section className={styles.directions}><p className={styles.eyebrow}>{view.phase === 'final' ? 'Your refined shortlist' : 'Five design directions'}</p><h1>{view.phase === 'final' ? <>A shortlist shaped <em>by you.</em></> : <>Five ways your room <em>could go.</em></>}</h1>{view.learning?.summary.length ? <p>{view.learning.summary.join(' ')}</p> : <p>Each direction uses your confirmed room context, calibration and real CurtainsUK fabrics.</p>}<div className={styles.directionGrid}>{view.directions.map((direction) => <DirectionCard key={direction.id} direction={direction} fabric={direction.cards[0] ? fabrics[direction.cards[0].fabricMasterId] : undefined} final={view.phase === 'final'} onReaction={(reaction) => setFeedback({ direction, reaction, selected: [], likeDirection: false })} onOutcome={reportOutcome} commerceUrl={commerceUrl} />)}</div>{view.phase !== 'final' && <button className={styles.primary} disabled={busy} onClick={() => void send({ type: 'finish' })}>Refine my directions →</button>}</section>}
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
