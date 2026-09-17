'use client';
/* eslint-disable @next/next/no-img-element -- Fabric Master and guarded calibration assets retain their existing URL contracts. */

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import styles from './curtainsuk-premium-consultation.module.css';

type Palette = { primary: string[]; secondary: string[]; accent: string[] };
type PaletteCategory = keyof Palette;
type PaletteState = {
  revision: number;
  palette: Palette;
  confirmedPalette: Palette | null;
  review?: { colours: Record<string, 'NEEDS_INPUT' | 'CONFIRMED' | 'IGNORED'> };
  room?: { colours: Record<string, { feature: string | null; influence: 'important' | 'consider' | 'ignore'; source: string }> };
};
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

const referenceTypes = [
  ['room', 'Room'], ['sofa-upholstery', 'Sofa / Upholstery'], ['rug', 'Rug'], ['wallpaper', 'Wallpaper'],
  ['paint', 'Paint'], ['flooring', 'Flooring'], ['existing-fabric', 'Existing fabric'], ['moodboard', 'Moodboard'],
] as const;
const features = [
  ['walls', 'Walls'], ['sofa-upholstery', 'Sofa / Upholstery'], ['flooring', 'Flooring'], ['rug', 'Rug'],
  ['wallpaper', 'Wallpaper'], ['furniture-wood', 'Furniture / Wood'], ['existing-curtains', 'Existing curtains'], ['cushions-soft-furnishings', 'Soft furnishings'], ['artwork', 'Artwork'], ['accessories-metalwork', 'Accessories'], ['other', 'Other'],
] as const;
const influenceCopy = [
  ['important', 'Important', 'Use this strongly when finding my curtain direction.'],
  ['consider', 'Consider', 'Keep it in mind.'],
  ['ignore', 'Ignore', 'Don’t use this when choosing my curtains.'],
] as const;
const reactionCopy = [
  ['LOVE', 'Love this'], ['MORE_LIKE_THIS', 'Show me more like this'], ['NOT_QUITE', 'Not quite'], ['NOT_FOR_ME', 'Not for me'],
] as const;
const colourFamilies = ['white', 'cream', 'beige', 'taupe', 'brown', 'grey', 'black', 'red', 'orange', 'yellow', 'gold', 'green', 'blue', 'purple', 'pink'] as const;

function label(value: string) { return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function paletteEntries(palette: Palette) { return (['primary', 'secondary', 'accent'] as const).flatMap((role) => palette[role].map((colour) => ({ colour, role }))); }
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
  const [referenceType, setReferenceType] = useState('room');
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [fabrics, setFabrics] = useState<Record<string, Fabric>>({});
  const [feedback, setFeedback] = useState<{ direction: Direction; reaction: string; selected: string[]; likeDirection: boolean } | null>(null);
  const pending = useRef<Record<string, unknown> | null>(null);
  const loaded = useRef(false);

  const send = async (action?: Record<string, unknown>, retry = false) => {
    if (busy && !retry) return false;
    const payload = retry && pending.current ? pending.current : {
      requestId: crypto.randomUUID(),
      sessionId: view?.sessionId ?? null,
      revision: view?.revision ?? null,
      ...(action ? { action } : {}),
    };
    pending.current = payload;
    setBusy(true); setNotice('');
    try {
      const response = await fetch('/api/curtain-consultation-premium', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Your consultation is temporarily unavailable.');
      setView(data); pending.current = null;
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Your consultation is temporarily unavailable.');
      return false;
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
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
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
  const entries = useMemo(() => roomPalette ? paletteEntries(roomPalette.palette) : [], [roomPalette]);
  const nextColour = entries.find(({ colour }) => (roomPalette?.review?.colours[colour] ?? 'NEEDS_INPUT') === 'NEEDS_INPUT') ?? null;
  const reviewStarted = Boolean(roomPalette?.review);

  const upload = async (file: File | undefined) => {
    if (!file || busy) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { setNotice('Choose one JPEG, PNG or WebP image no larger than 2 MB.'); return; }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    const bytes = await file.arrayBuffer();
    await send({ type: 'image', mime: file.type, bytes: base64(bytes), referenceType });
  };
  const editPalette = (edit: Record<string, unknown>) => send({ type: 'palette', edit: { id: crypto.randomUUID(), revision: roomPalette?.revision, ...edit } });
  const commerceUrl = (card: Card, direction: Direction, sample: boolean) => {
    const destination = sample ? '/pages/fabric-library' : '/pages/curtain-visualiser';
    // Customer navigation remains in the current CurtainsUK origin: Shopify in the
    // candidate and this protected same-origin preview during review.
    const url = new URL(destination, window.location.origin);
    url.searchParams.set('fabric', card.fabricMasterId); if (sample) url.searchParams.set('intent', 'sample');
    url.hash = `cuk_hci=${encodeURIComponent(JSON.stringify({ sessionId: view?.sessionId, fabricMasterId: card.fabricMasterId, strategyId: direction.id, commerceToken: card.commerceToken, returnOrigin: window.location.origin }))}`;
    return url.toString();
  };
  const reportOutcome = async (card: Card, direction: Direction, event: string) => send({ type: 'outcome', event, fabricMasterId: card.fabricMasterId, strategyId: direction.id });

  if (!view) return <main className={styles.shell}><p className={styles.loading}>Preparing your Fabric Intelligence consultation…</p></main>;
  const showUpload = entry === 'match' && !roomPalette && !view.directions.length;
  const showPalette = Boolean(roomPalette && !roomPalette.confirmedPalette);
  const showAnalysis = Boolean(busy && preview && !roomPalette);

  return <main className={styles.shell}>
    <header className={styles.header}><a href="/" className={styles.wordmark}>Curtains<span>UK</span></a><span>Fabric Intelligence™</span><a href="/fabrics">Explore fabrics</a></header>
    <div className={styles.progress} aria-label="Consultation progress"><span className={roomPalette ? styles.complete : ''}>Your room</span><span className={view.phase !== 'discovery' ? styles.complete : ''}>Your taste</span><span className={view.directions.length ? styles.complete : ''}>Your edit</span></div>
    {notice && <div className={styles.notice} role="alert">{notice}<button onClick={() => void send(undefined, true)}>Try again</button></div>}
    {showAnalysis ? <section className={styles.analysis} aria-live="polite"><p className={styles.eyebrow}>Fabric Intelligence™</p><h1>Reading <em>your room.</em></h1><p>We’re building your colour picture from the visible colour information in your photograph.</p><div className={styles.analysisImage}><img src={preview ?? ''} alt="Your reference photograph" /><span className={styles.scan} aria-hidden="true" /></div><ol><li>Preparing your image</li><li>Reading the colour picture</li><li>Finding the dominant palette</li><li>Building your Room Palette</li></ol></section> : showUpload && <section className={styles.hero}>
      <p className={styles.eyebrow}>Fabric Intelligence™</p><h1>Let us read <em>your room.</em></h1><p>Show us your room, or something you’d like your curtains to work with. We’ll identify the colours we can observe, then you’ll tell us what those colours mean in your space.</p>
      <div className={styles.journey}><span>Your room</span><b>→</b><span>Colours</span><b>→</b><span>Room Palette</span><b>→</b><span>Design direction</span></div>
      <section className={styles.upload}><p className={styles.eyebrow}>What would you like us to understand?</p><div className={styles.types}>{referenceTypes.map(([value, name]) => <button key={value} type="button" aria-pressed={referenceType === value} onClick={() => setReferenceType(value)}>{name}</button>)}</div><label className={styles.dropzone}><strong>Show us your space</strong><span>Upload a clear photograph and we’ll begin with its colour relationships.</span><span className={styles.file}>Choose photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0])} /></span><small>JPEG, PNG or WebP · maximum 2 MB</small></label></section>
      <aside className={styles.privacy}><strong>Your room stays your room.</strong><p>We derive colour information for this consultation. Please avoid photographs containing people, personal documents, screens or other sensitive information.</p></aside>
    </section>}
    {showPalette && roomPalette && <section className={styles.palette}>
    {!reviewStarted ? <><p className={styles.eyebrow}>Colours found</p><h1>We found the colours.<br/><em>You tell us what they mean.</em></h1><p>We observe the colour. You provide the context. Together we build your Room Palette.</p><div className={styles.swatches}>{entries.map(({ colour, role }) => <span key={colour} className={`${styles.swatch} ${styles[`swatch_${colour}`] ?? ''}`}><i />{label(colour)}<small>{role}</small></span>)}</div><button className={styles.primary} disabled={busy} onClick={() => void editPalette({ type: 'begin-review' })}>Build my Room Palette →</button></> : nextColour ? <ColourConfirmation key={nextColour.colour} colour={nextColour.colour} role={nextColour.role} state={roomPalette} busy={busy} onConfirm={({ previousColour, colour, category, feature, influence }) => void editPalette({ type: 'review-colour', previousColour, colour, category, feature, influence })} /> : <><p className={styles.eyebrow}>Your Room Palette</p><h1>Your palette is <em>ready.</em></h1><p>These are the colours and relationships Fabric Intelligence will use when we explore your curtain direction.</p><div className={styles.swatches}>{entries.map(({ colour, role }) => { const context = roomPalette.room?.colours[colour]; return <span key={colour} className={`${styles.swatch} ${styles[`swatch_${colour}`] ?? ''}`}><i />{label(colour)}<small>{context?.feature ? `${label(context.feature)} · ${role} · ${context.influence}` : role}</small></span>; })}</div><AddColour palette={roomPalette.palette} busy={busy} onAdd={(colour, category) => void editPalette({ type: 'add', colour, category })} /><button className={styles.primary} disabled={busy} onClick={() => void editPalette({ type: 'complete-review' })}>Yes — use my Room Palette →</button></>}
    </section>}
    {!showUpload && !showPalette && view.phase === 'discovery' && view.question && <section className={styles.question}><p className={styles.eyebrow}>Your starting point</p><h1>{view.question.prompt}</h1><div className={styles.answers}>{view.question.answers.map((answer) => <button key={answer.id} disabled={busy} onClick={() => void send({ type: 'answer', answerId: answer.id })}>{answer.label}</button>)}</div>{entry === 'guided' && !roomPalette && <button className={styles.textButton} onClick={() => setEntry('match')}>Have something you’d like us to match with? Add a reference image</button>}</section>}
    {!showUpload && !showPalette && view.phase === 'calibration' && <section className={styles.calibration}><p className={styles.eyebrow}>Visual calibration</p><h1>What is your first <em>reaction?</em></h1><p>Your response helps us understand the fabric character you enjoy.</p>{view.stimulusId && <img src={`/api/curtain-consultation-premium/assets/${encodeURIComponent(view.stimulusId)}.svg`} alt="Curtain design for visual preference calibration" />}<div className={styles.answers}>{[['LOVE','Love it'],['LIKE','I like it'],['NOT_SURE','Not sure'],['DISLIKE','Not for me']].map(([reaction, text]) => <button key={reaction} disabled={busy} onClick={() => void send({ type: 'calibrate', reaction })}>{text}</button>)}</div></section>}
    {!showUpload && !showPalette && view.phase === 'complete' && <section className={styles.ready}><p className={styles.eyebrow}>Your profile</p><h1>Ready to explore <em>your directions.</em></h1><p>{view.profileSummary}</p>{!roomPalette && <button className={styles.textButton} onClick={() => setEntry('match')}>Add a room image first</button>}<button className={styles.primary} disabled={busy} onClick={() => void send({ type: 'recommend' })}>{roomPalette ? 'Show my design directions →' : 'Show my design directions →'}</button></section>}
    {!showUpload && !showPalette && view.directions.length > 0 && <section className={styles.directions}><p className={styles.eyebrow}>{view.phase === 'final' ? 'Your refined shortlist' : 'Five design directions'}</p><h1>{view.phase === 'final' ? <>A shortlist shaped <em>by you.</em></> : <>Five ways your room <em>could go.</em></>}</h1>{view.learning?.summary.length ? <p>{view.learning.summary.join(' ')}</p> : <p>Each direction uses your confirmed room context, calibration and real CurtainsUK fabrics.</p>}<div className={styles.directionGrid}>{view.directions.map((direction) => <DirectionCard key={direction.id} direction={direction} fabric={direction.cards[0] ? fabrics[direction.cards[0].fabricMasterId] : undefined} final={view.phase === 'final'} onReaction={(reaction) => setFeedback({ direction, reaction, selected: [], likeDirection: false })} onOutcome={reportOutcome} commerceUrl={commerceUrl} />)}</div>{view.phase !== 'final' && <button className={styles.primary} disabled={busy} onClick={() => void send({ type: 'finish' })}>Refine my directions →</button>}</section>}
    {feedback && <FeedbackSheet value={feedback} busy={busy} onClose={() => setFeedback(null)} onChange={setFeedback} onSave={async () => { const card = feedback.direction.cards[0]; if (!card) return; const directionReaction = feedback.likeDirection ? 'LIKE' : feedback.reaction === 'NOT_FOR_ME' ? 'DISLIKE' : feedback.reaction === 'LOVE' ? 'LOVE' : null; if (await send({ type: 'feedback', command: { id: crypto.randomUUID(), strategyId: feedback.direction.id, fabricId: card.reactionId, fabricReaction: feedback.reaction, directionReaction, optionIds: feedback.selected } })) setFeedback(null); }} />}
  </main>;
}

function ColourConfirmation({ colour, role, state, busy, onConfirm }: { colour: string; role: PaletteCategory; state: PaletteState; busy: boolean; onConfirm: (value: { previousColour: string; colour: string; category: PaletteCategory; feature: string; influence: string }) => void }) {
  const [feature, setFeature] = useState('walls'); const [influence, setInfluence] = useState('consider');
  const [chosenColour, setChosenColour] = useState(colour); const [category, setCategory] = useState<PaletteCategory>(role);
  const availableRoles = (['primary', 'secondary', 'accent'] as PaletteCategory[]).filter((item) => item === role || state.palette[item].length < 3);
  const selectableColours = colourFamilies.filter((item) => item === colour || !paletteEntries(state.palette).some((entry) => entry.colour === item));
  return <><div className={styles.paletteContext}><i className={styles[`swatch_${colour}`] ?? ''} /> <strong>{label(colour)}</strong><span>{role} · {Object.values(state.review?.colours ?? {}).filter((value) => value !== 'NEEDS_INPUT').length + 1} of {paletteEntries(state.palette).length}</span></div><h1>Where do you see <em>{label(chosenColour)}?</em></h1><p className={styles.correction}><label>Colour not right? <select value={chosenColour} onChange={(event) => setChosenColour(event.target.value)}>{selectableColours.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label><label>{label(category)} · Change <select value={category} onChange={(event) => setCategory(event.target.value as PaletteCategory)}>{availableRoles.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label></p><div className={styles.answers}>{features.map(([value, text]) => <button key={value} className={feature === value ? styles.selected : ''} onClick={() => setFeature(value)}>{text}</button>)}</div><h2>How much should this colour influence your curtains?</h2><div className={styles.influence}>{influenceCopy.map(([value, title, copy]) => <button key={value} className={influence === value ? styles.selected : ''} onClick={() => setInfluence(value)}><strong>{title}</strong><span>{copy}</span></button>)}</div><button className={styles.primary} disabled={busy} onClick={() => onConfirm({ previousColour: colour, colour: chosenColour, category, feature, influence })}>Confirm {label(chosenColour)} →</button></>;
}

function AddColour({ palette, busy, onAdd }: { palette: Palette; busy: boolean; onAdd: (colour: string, category: PaletteCategory) => void }) {
  const [open, setOpen] = useState(false); const used = new Set(paletteEntries(palette).map((entry) => entry.colour));
  const [colour, setColour] = useState<string>(colourFamilies.find((item) => !used.has(item)) ?? 'cream'); const [category, setCategory] = useState<PaletteCategory>('accent');
  if (!open) return <button className={styles.textButton} type="button" onClick={() => setOpen(true)}>Something important is missing? Add a colour</button>;
  const available = (['primary', 'secondary', 'accent'] as PaletteCategory[]).filter((item) => palette[item].length < 3);
  return <div className={styles.addColour}><strong>Add a colour we missed</strong><label>Colour<select value={colour} onChange={(event) => setColour(event.target.value)}>{colourFamilies.filter((item) => !used.has(item)).map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label><label>Role<select value={category} onChange={(event) => setCategory(event.target.value as PaletteCategory)}>{available.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label><button className={styles.secondary} type="button" disabled={busy || !available.length} onClick={() => onAdd(colour, category)}>Add this colour</button></div>;
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
