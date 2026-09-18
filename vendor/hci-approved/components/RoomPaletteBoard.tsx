'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { colourFamilies, type ColourFamily } from '../intelligence/reference-images/evidence';
import {
  paletteCategories,
  roomColour,
  reviewStatus,
  roomReviewComplete,
  type PaletteCategory,
  type PaletteEdit,
  type PaletteState,
} from '../intelligence/reference-images/palette';
import {
  roomFeatures,
  colourInfluences,
  type RoomFeature,
  type ColourInfluence,
} from '../intelligence/reference-images/room-context';
import styles from './RoomPaletteBoard.module.css';
import { GuidedRoomColour } from './GuidedRoomColour';
import {
  customerShades,
  selectedCustomerShade,
} from '../intelligence/reference-images/customer-shades';

import {
  familyLabel,
  featureLabel,
  influenceCopy,
  shades,
  roomSwatch,
} from './room-palette-presentation';
export { familyLabel, featureLabel } from './room-palette-presentation';
const roleCopy = {
  primary: 'Shapes the overall room',
  secondary: 'Supports the main palette',
  accent: 'Smaller details that add character',
};
type EditDraft = {
  previousColour: ColourFamily | null;
  colour: ColourFamily;
  category: PaletteCategory;
  feature: RoomFeature | null;
  influence: ColourInfluence;
  customerSelectedShade: string | null;
};

export function RoomPaletteBoard({
  state,
  imageUrl,
  busy,
  error,
  demo = false,
  onEdit,
  onRetry,
  onResume,
}: {
  state: PaletteState;
  imageUrl?: string;
  busy: boolean;
  error?: string;
  demo?: boolean;
  onEdit: (action: PaletteEdit) => Promise<boolean>;
  onRetry?: () => Promise<boolean>;
  onResume?: () => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<EditDraft | null>(null),
    [issue, setIssue] = useState('');
  const [selected, setSelected] = useState<ColourFamily | null>(null);
  const [receipt, setReceipt] = useState('');
  const activeReview = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    board = useRef<HTMLDivElement>(null),
    opener = useRef<HTMLElement | null>(null);
  const advanceAfterSave = useRef(false);
  useEffect(() => {
    if (!demo) heading.current?.focus({ preventScroll: true });
  }, [demo]);
  const editing = draft !== null;
  const correctingPending = Boolean(
    draft?.previousColour && reviewStatus(state, draft.previousColour) === 'NEEDS_INPUT',
  );
  useEffect(() => {
    if (!editing) return;
    const el = dialog.current;
    if (!el) return;
    const boardElement = board.current;
    const guideElement = activeReview.current ?? guideHeading.current;
    const target = opener.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    el.showModal();
    return () => {
      el.close();
      document.body.style.overflow = previousOverflow;
      queueMicrotask(() => {
        if (advanceAfterSave.current) {
          advanceAfterSave.current = false;
          guideElement?.focus({ preventScroll: true });
          guideElement?.scrollIntoView({ behavior: 'auto', block: 'start' });
        } else if (target?.isConnected) target.focus({ preventScroll: true });
        else boardElement?.querySelector('button')?.focus({ preventScroll: true });
      });
    };
  }, [editing]);
  function open(
    colour: ColourFamily | null,
    category: PaletteCategory = 'primary',
    pendingContext?: { feature: RoomFeature | null; influence: ColourInfluence },
  ) {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIssue('');
    const first =
      colour ??
      colourFamilies.find((c) => !paletteCategories.some((g) => state.palette[g].includes(c)));
    if (!first) return;
    const role = colour
      ? paletteCategories.find((g) => state.palette[g].includes(colour))!
      : category;
    const context = colour ? roomColour(state, colour) : null;
    setDraft({
      previousColour: colour,
      colour: first,
      category: role,
      feature: context?.feature ?? null,
      influence: context?.influence ?? 'consider',
      customerSelectedShade: context?.customerSelectedShade ?? null,
      ...pendingContext,
    });
  }
  async function save() {
    if (!draft || busy) return;
    if (
      draft.colour !== draft.previousColour &&
      paletteCategories.some((g) => state.palette[g].includes(draft.colour))
    ) {
      setIssue('That colour is already on your board. Change its card instead.');
      return;
    }
    const remaining = state.palette[draft.category].filter((c) => c !== draft.previousColour);
    if (remaining.length >= 3) {
      setIssue(
        'This group has three colours. Choose another role, or move a colour before adding this one.',
      );
      return;
    }
    if (await onEdit({ type: correctingPending ? 'describe' : 'review-colour', ...draft })) {
      if (correctingPending) {
        setSelected(draft.colour);
        setReceipt('');
      } else {
        setReceipt(
          `${draft.influence === 'ignore' ? '—' : '✓'} ${familyLabel(draft.colour)} ${draft.influence === 'ignore' ? 'ignored' : 'confirmed'} · ${draft.feature ? featureLabel[draft.feature] + ' · ' : ''}${familyLabel(draft.category)} · ${familyLabel(draft.influence)}`,
        );
      }
      advanceAfterSave.current = Boolean(
        draft.previousColour && reviewStatus(state, draft.previousColour) === 'NEEDS_INPUT',
      );
      setDraft(null);
    }
  }
  const colours = paletteCategories.flatMap((role) =>
    state.palette[role].map((colour) => ({ colour, role, ...roomColour(state, colour) })),
  );
  const ignored = colours.filter((c) => c.influence === 'ignore'),
    important = colours.filter((c) => c.influence === 'important');
  const remaining = colours.filter((c) => reviewStatus(state, c.colour) === 'NEEDS_INPUT');
  const current = remaining.find((c) => c.colour === selected) ?? remaining[0];
  const completed = colours.length - remaining.length;
  const ready = roomReviewComplete(state);
  const guideHeading = useRef<HTMLHeadingElement>(null);
  const lastCurrent = useRef(current?.colour);
  useEffect(() => {
    if (lastCurrent.current !== current?.colour) {
      lastCurrent.current = current?.colour;
      const target = lastCurrent.current ? activeReview.current : guideHeading.current;
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [current?.colour]);
  return (
    <section className={styles.board} aria-labelledby="room-palette-title">
      {demo && (
        <p className={styles.demo} role="note">
          Demonstration Room Palette · Illustrative colours and room context. Edits stay in this
          preview; no image is analysed or saved.
        </p>
      )}
      <div className={styles.opening}>
        <div>
          <p className={styles.eyebrow}>02 / Build my room palette</p>
          <h2 id="room-palette-title" ref={heading} tabIndex={-1}>
            We found the colours.
            <br />
            <em>You tell us what they mean.</em>
          </h2>
          <p className={styles.lede}>
            Every room tells a different story. We’ve identified the colours we can see; now help
            Fabric Intelligence™ understand where they appear and which ones matter to your curtain
            design.
          </p>
          <p className={styles.intelligence}>
            We observe the colour. You provide the context.
            <br />
            <b>Together we build your Room Palette.</b>
          </p>
        </div>
        {imageUrl && (
          <figure className={styles.reference}>
            <div
              role="img"
              aria-label={demo ? 'Illustrative example room' : 'Your uploaded room reference'}
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
            <figcaption>
              {demo
                ? 'An example room, for exploring the palette board.'
                : 'Your reference. Your own perspective.'}
            </figcaption>
          </figure>
        )}
      </div>
      <div className={styles.guidedTitle}>
        <p className={styles.eyebrow}>Building your Room Palette</p>
        <h3 ref={guideHeading} tabIndex={-1}>
          {remaining.length ? 'Let’s check your Room Palette' : 'Your Room Palette is ready'}
        </h3>
        <p>
          {remaining.length
            ? 'Tell us what each colour belongs to and whether you’d like your curtain choices to respond to it.'
            : 'Your colours now have your meaning behind them.'}
        </p>
        <div className={styles.reviewProgress}>
          <span role="status">
            {completed} of {colours.length} colours confirmed
          </span>
          <progress aria-label="Colours reviewed" value={completed} max={colours.length || 1} />
        </div>
        <div className={styles.colourRail} aria-label="Colour review progress">
          {colours.map((c) => (
            <button
              key={c.colour}
              disabled={busy}
              onClick={() => {
                if (reviewStatus(state, c.colour) !== 'NEEDS_INPUT') open(c.colour);
                else {
                  setSelected(c.colour);
                  activeReview.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
                  activeReview.current?.focus({ preventScroll: true });
                }
              }}
              data-review-status={reviewStatus(state, c.colour)}
              aria-label={`${familyLabel(c.colour)} — ${reviewStatus(state, c.colour) === 'NEEDS_INPUT' ? 'needs your input' : reviewStatus(state, c.colour) === 'IGNORED' ? 'ignored' : 'confirmed'}`}
              aria-current={current?.colour === c.colour ? 'step' : undefined}
            >
              <span style={{ background: roomSwatch(c.colour, c) }} />
              <b>{familyLabel(c.colour)}</b>
              <small>
                {reviewStatus(state, c.colour) === 'NEEDS_INPUT'
                  ? 'To review'
                  : reviewStatus(state, c.colour) === 'IGNORED'
                    ? 'Ignored —'
                    : 'Confirmed ✓'}
              </small>
            </button>
          ))}
        </div>
      </div>
      {current && (
        <div ref={activeReview} tabIndex={-1} className={styles.activeReview}>
          {receipt && (
            <p className={styles.confirmedReceipt} role="status">
              {receipt}
            </p>
          )}
          <p className={styles.eyebrow}>Next colour · {familyLabel(current.colour)}</p>
          <GuidedRoomColour
            key={`${current.colour}:${state.revision}`}
            colour={current.colour}
            role={current.role}
            context={current}
            busy={busy}
            position={colours.findIndex((c) => c.colour === current.colour) + 1}
            total={colours.length}
            onEdit={async (action) => {
              const saved = await onEdit(action);
              if (saved && action.type === 'review-colour') {
                setReceipt(
                  `${action.influence === 'ignore' ? '—' : '✓'} ${familyLabel(action.colour)} ${action.influence === 'ignore' ? 'ignored' : 'confirmed'} · ${action.feature ? featureLabel[action.feature] + ' · ' : ''}${familyLabel(action.category)} · ${familyLabel(action.influence)}`,
                );
                setSelected(null);
              }
              return saved;
            }}
            onChange={(pendingContext) => open(current.colour, current.role, pendingContext)}
          />
        </div>
      )}
      <div className={styles.boardTitle}>
        <div>
          <p className={styles.eyebrow}>Your colours, with meaning</p>
          <h3>Your Room Palette</h3>
        </div>
        <span>Confirmed colours, collected together</span>
      </div>
      <div className={styles.groups} ref={board} id="room-palette-colours">
        {paletteCategories.map((role, index) => (
          <section key={role} aria-label={`${familyLabel(role)} colours`}>
            <div className={styles.groupTitle}>
              <span>
                0{index + 1} / {familyLabel(role)}
              </span>
              <p>{roleCopy[role]}</p>
              <small>{state.palette[role].length} of 3 colours</small>
            </div>
            <div className={styles.cards}>
              {state.palette[role]
                .filter((colour) => reviewStatus(state, colour) !== 'NEEDS_INPUT')
                .map((colour) => {
                  const context = roomColour(state, colour);
                  return (
                    <button
                      key={colour}
                      type="button"
                      className={styles.card}
                      disabled={busy}
                      onClick={() => open(colour)}
                      aria-label={`Change ${familyLabel(colour)}: ${context.feature ? featureLabel[context.feature] : 'feature not assigned'}, ${familyLabel(role)}, ${familyLabel(context.influence)}`}
                    >
                      <span
                        className={styles.colourField}
                        style={{ background: roomSwatch(colour, context) }}
                      >
                        <span className={styles.editMark} aria-hidden="true">
                          ↗
                        </span>
                      </span>
                      <span className={styles.cardBody}>
                        <b>
                          {familyLabel(colour)} {context.influence === 'ignore' ? '—' : '✓'}
                        </b>
                        <small>{familyLabel(role)}</small>
                        <span>
                          {context.feature
                            ? featureLabel[context.feature]
                            : 'Where does this appear?'}
                        </span>
                        <em className={styles[context.influence]}>
                          {familyLabel(context.influence)}
                          {context.influence === 'important'
                            ? ' ✦'
                            : context.influence === 'ignore'
                              ? ' —'
                              : ''}
                        </em>
                        <span>Change ↗</span>
                      </span>
                    </button>
                  );
                })}
              {state.palette[role].length < 3 && (
                <button className={styles.add} disabled={busy} onClick={() => open(null, role)}>
                  + Add a colour <span className={styles.srOnly}>to {familyLabel(role)}</span>
                </button>
              )}
            </div>
          </section>
        ))}
      </div>
      <p className={styles.missingHint}>
        Something important is missing? Add a colour the photograph may have missed.
      </p>
      {busy && (
        <p className={styles.notice} role="status">
          Saving your Room Palette…
        </p>
      )}
      {error && !draft && (
        <div className={styles.error} role="alert">
          {error}
          {onRetry && (
            <button
              className={styles.review}
              onClick={() => {
                void onRetry();
              }}
            >
              Retry saved request
            </button>
          )}
          {onResume && (
            <button
              className={styles.review}
              onClick={() => {
                void onResume();
              }}
            >
              Reload saved palette
            </button>
          )}
        </div>
      )}
      <section className={styles.meaning} aria-labelledby="meaning-title">
        <div>
          <p className={styles.eyebrow}>The picture comes together</p>
          <h3 id="meaning-title">
            A palette that feels
            <br />
            <em>like your room.</em>
          </h3>
          <p>
            {important.length
              ? `${important.map((c) => familyLabel(c.colour)).join(', ')} ${important.length === 1 ? 'is' : 'are'} marked Important in your curtain brief.`
              : 'Tell us where each colour appears and which ones matter most. Your confirmed choices will build the room brief.'}
          </p>
          {ignored.length > 0 && (
            <p>
              {ignored.map((c) => familyLabel(c.colour)).join(', ')}{' '}
              {ignored.length === 1 ? 'stays' : 'stay'} in your room’s record, but won’t guide the
              curtain colour directions after you confirm.
            </p>
          )}
        </div>
        <ul className={styles.summary}>
          {colours
            .filter((c) => reviewStatus(state, c.colour) !== 'NEEDS_INPUT')
            .map((c) => (
              <li key={c.colour}>
                <span
                  className={styles.summarySwatch}
                  style={{ background: roomSwatch(c.colour, c) }}
                  aria-hidden="true"
                />
                <div>
                  <b>{familyLabel(c.colour)}</b>
                  <p>
                    {c.feature ? featureLabel[c.feature] : 'Feature not assigned'} ·{' '}
                    {familyLabel(c.role)} · {familyLabel(c.influence)}
                  </p>
                </div>
                <button
                  disabled={busy}
                  onClick={() => open(c.colour)}
                  aria-label={`Review ${familyLabel(c.colour)}`}
                >
                  ↗
                </button>
              </li>
            ))}
        </ul>
      </section>
      <aside className={styles.principle}>
        <div>
          <p className={styles.eyebrow}>A useful design principle</p>
          <h3>Balance, without a formula.</h3>
          <p>
            Many balanced interiors use roughly 60% Primary, 30% Secondary and 10% Accent. Your room
            doesn’t have to follow a formula. We use it as one way to understand visual balance.
          </p>
          <Link href="/learn/60-30-10">Learn about 60–30–10 →</Link>
        </div>
        <div
          className={styles.ratio}
          aria-label="Illustrative 60–30–10 balance, not measured image proportions"
        >
          <span>
            <b>60</b>Primary
          </span>
          <span>
            <b>30</b>Secondary
          </span>
          <span>
            <b>10</b>Accent
          </span>
        </div>
      </aside>
      <nav className={styles.learning} aria-label="Understand your room palette">
        <Link href="/learn/colour-palettes">Primary, secondary & accent colours →</Link>
        <Link href="/learn/undertones">Why undertones matter →</Link>
        <Link href="/learn/light-and-colour">How room light changes colour →</Link>
      </nav>
      <div className={styles.confirmation}>
        <p className={styles.eyebrow}>Your room. Your point of view.</p>
        <h3>{ready ? 'Does this feel like your room?' : 'Your palette is nearly ready'}</h3>
        <p>
          {ready
            ? 'These are the colours and relationships Fabric Intelligence will use when we explore your curtain direction.'
            : `${completed} of ${colours.length} colours confirmed. Review the remaining colours before continuing.`}
        </p>
        <button
          className={styles.primary}
          disabled={busy || !ready || Boolean(state.confirmedPalette)}
          onClick={() => {
            void onEdit({ type: 'complete-review' });
          }}
        >
          Yes — use my Room Palette →
        </button>
        <button
          className={styles.review}
          onClick={() => {
            if (current) {
              activeReview.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
              activeReview.current?.focus({ preventScroll: true });
            } else {
              board.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
              board.current?.querySelector('button')?.focus({ preventScroll: true });
            }
          }}
        >
          {ready ? 'Make another change' : 'Review remaining colour'}
        </button>
        {state.confirmedPalette && (
          <p className={styles.accepted} role="status">
            {demo
              ? 'Demonstration palette confirmed. No live recommendation is generated.'
              : 'Your Room Palette is confirmed. Continue your consultation when you’re ready.'}
          </p>
        )}
        <div className={styles.next}>
          <span>Next: explore your design direction</span>
          <p>
            TONAL <i>·</i> COMPLEMENT <i>·</i> CONTRAST
          </p>
        </div>
      </div>
      <details className={styles.original}>
        <summary>Your original colour reading</summary>
        {paletteCategories.map((role) => (
          <p key={role}>
            {familyLabel(role)}:{' '}
            {state.draft.palette[role].map(familyLabel).join(', ') || 'None suggested'}
          </p>
        ))}
        <p>Your edits are saved separately. The original observation is never overwritten.</p>
      </details>
      {draft && (
        <dialog
          ref={dialog}
          className={styles.sheet}
          aria-labelledby="colour-edit-title"
          onCancel={(e) => {
            e.preventDefault();
            if (!busy) setDraft(null);
          }}
        >
          <div className={styles.sheetTop}>
            <span
              className={styles.sheetSwatch}
              style={{
                background: roomSwatch(draft.colour, {
                  customerSelectedShade: draft.customerSelectedShade ?? undefined,
                }),
              }}
            />
            <div>
              <p className={styles.eyebrow}>
                {draft.previousColour ? 'Make this colour yours' : 'A colour the photograph missed'}
              </p>
              <h3 id="colour-edit-title">
                {draft.previousColour ? 'Change' : 'Add'} {familyLabel(draft.colour)}
              </h3>
            </div>
            <button
              autoFocus
              disabled={busy}
              className={styles.close}
              onClick={() => setDraft(null)}
              aria-label="Close colour editor"
            >
              ×
            </button>
          </div>
          <div className={styles.sheetContent}>
            <fieldset>
              <legend>
                {draft.previousColour ? '1 — Is the colour right?' : '1 — Choose a colour'}
              </legend>
              <p>
                Photography and lighting can shift colour. Choose the family closest to what you see
                in your room. These are guides, not exact paint or fabric shades.
              </p>
              <div className={styles.familyPicker}>
                {colourFamilies.map((c) => (
                  <button
                    type="button"
                    key={c}
                    disabled={busy}
                    aria-pressed={draft.colour === c}
                    onClick={() => {
                      setIssue('');
                      setDraft({
                        ...draft,
                        colour: c,
                        customerSelectedShade:
                          c === draft.colour ? draft.customerSelectedShade : null,
                      });
                    }}
                  >
                    <span style={{ background: shades[c] }} />
                    {familyLabel(c)}
                  </button>
                ))}
              </div>
              <div className={styles.shadeTitle}>
                <h4>Which {familyLabel(draft.colour).toLowerCase()} feels closest?</h4>
                <p>
                  A visual guide to your room. Screens and lighting affect colour; these are not
                  paint-standard matches.
                </p>
              </div>
              <div
                className={styles.shadePicker}
                role="group"
                aria-label={`${familyLabel(draft.colour)} shades`}
              >
                {customerShades[draft.colour].map((shade) => (
                  <button
                    type="button"
                    key={shade.id}
                    disabled={busy}
                    aria-pressed={draft.customerSelectedShade === shade.id}
                    onClick={() => setDraft({ ...draft, customerSelectedShade: shade.id })}
                  >
                    <span style={{ background: shade.hex }} aria-hidden="true" />
                    <b>{shade.label}</b>
                    <small>
                      {draft.customerSelectedShade === shade.id ? 'Selected ✓' : 'Choose shade'}
                    </small>
                  </button>
                ))}
              </div>
              {draft.customerSelectedShade && (
                <p role="status">
                  Your choice:{' '}
                  {selectedCustomerShade(draft.colour, draft.customerSelectedShade)?.label}
                </p>
              )}
            </fieldset>
            {!correctingPending && (
              <fieldset>
                <legend>2 — Where is it in your room?</legend>
                <div className={styles.features}>
                  {roomFeatures.map((feature) => (
                    <button
                      key={feature}
                      disabled={busy}
                      aria-pressed={draft.feature === feature}
                      onClick={() =>
                        setDraft({ ...draft, feature: draft.feature === feature ? null : feature })
                      }
                    >
                      {featureLabel[feature]}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <fieldset>
              <legend>3 — What role does it play?</legend>
              <div className={styles.roles}>
                {paletteCategories.map((role) => (
                  <button
                    key={role}
                    disabled={busy}
                    aria-pressed={draft.category === role}
                    onClick={() => {
                      setIssue('');
                      setDraft({ ...draft, category: role });
                    }}
                  >
                    <b>{familyLabel(role)}</b>
                    <span>{roleCopy[role]}</span>
                  </button>
                ))}
              </div>
              <p>Up to three colours per group. Changing the role moves this card on your board.</p>
            </fieldset>
            {!correctingPending && (
              <fieldset>
                <legend>4 — How much should this colour influence your curtains?</legend>
                <div className={styles.influences}>
                  {colourInfluences.map((influence) => (
                    <button
                      key={influence}
                      disabled={busy}
                      aria-pressed={draft.influence === influence}
                      onClick={() => setDraft({ ...draft, influence })}
                    >
                      <b>{familyLabel(influence)}</b>
                      <span>{influenceCopy[influence]}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
          <div className={styles.sheetFooter}>
            {(issue || error) && <p role="alert">{issue || error}</p>}
            {error && onRetry && (
              <button
                className={styles.review}
                disabled={busy}
                onClick={async () => {
                  if (await onRetry()) setDraft(null);
                }}
              >
                Retry saved request
              </button>
            )}
            {error && onResume && (
              <button
                className={styles.review}
                disabled={busy}
                onClick={async () => {
                  if (await onResume()) setDraft(null);
                }}
              >
                Reload saved palette
              </button>
            )}
            <button
              className={styles.primary}
              disabled={busy}
              onClick={() => {
                void save();
              }}
            >
              {busy
                ? 'Saving…'
                : correctingPending
                  ? 'Use this colour →'
                  : draft.previousColour &&
                      reviewStatus(state, draft.previousColour) !== 'NEEDS_INPUT'
                    ? 'Save changes'
                    : 'Confirm this colour →'}
            </button>
            <button className={styles.review} disabled={busy} onClick={() => setDraft(null)}>
              Cancel
            </button>
            {draft.previousColour && (
              <button
                className={styles.remove}
                disabled={busy}
                onClick={async () => {
                  if (await onEdit({ type: 'remove', colour: draft.previousColour! }))
                    setDraft(null);
                }}
              >
                Remove this colour
              </button>
            )}
          </div>
        </dialog>
      )}
    </section>
  );
}
