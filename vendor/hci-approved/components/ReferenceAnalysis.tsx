'use client';
import { useEffect, useRef } from 'react';
import type { PaletteState } from '../intelligence/reference-images/palette';
import { paletteCategories } from '../intelligence/reference-images/palette';
import { familyLabel, shades } from './room-palette-presentation';
import styles from './ReferenceAnalysis.module.css';

/** The extractor is one non-streaming request. Only pending/result states are claimed.
 * Motion is decorative, never a simulated server milestone or elapsed percentage. */
export function ReferenceAnalysis({
  imageUrl,
  state,
  demo = false,
  onContinue,
  onReveal,
}: {
  imageUrl: string;
  state?: PaletteState;
  demo?: boolean;
  onContinue?: () => void;
  onReveal?: () => void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    title.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, []);
  const colours = state ? paletteCategories.flatMap((role) => state.draft.palette[role]) : [];
  return (
    <section
      className={styles.analysis}
      aria-labelledby="analysis-title"
      aria-busy={!state && !demo}
    >
      {demo && (
        <p className={styles.demo}>
          Design preview / demo analysis · Illustrative sequence. No photograph is being analysed.
        </p>
      )}
      <header>
        <p className={styles.eyebrow}>Fabric Intelligence™</p>
        <h2 id="analysis-title" tabIndex={-1} ref={title}>
          {state ? 'Your colours are ready' : 'Reading your room'}
        </h2>
        <p role="status">
          {state
            ? 'We found the colours. Next, you tell us what they mean.'
            : 'Fabric Intelligence™ is building your colour picture.'}
        </p>
      </header>
      <div className={styles.composition}>
        <div className={styles.photograph} data-ready={Boolean(state)}>
          <div
            role="img"
            aria-label={demo ? 'Demonstration living room' : 'Your selected reference photograph'}
            className={styles.image}
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
          {!state && <div className={styles.scan} aria-hidden="true" />}
          <span className={styles.caption}>
            {state
              ? 'Colour information, ready for your perspective'
              : 'A colour reading. Your room’s meaning comes from you.'}
          </span>
        </div>
        <div className={styles.result}>
          <p className={styles.eyebrow}>
            {state ? 'Your first colour picture' : 'Reading the colour picture'}
          </p>
          <h3>{state ? 'A beginning, not a verdict.' : 'Light. Depth. Colour.'}</h3>
          <p>
            {state
              ? 'Photography can shift colour. You can correct these families, tell us where they appear, and choose which ones matter.'
              : 'Looking at visible colour distribution, warmth, lightness and contrast. We’ll prepare the main, supporting and accent families for you to review.'}
          </p>
          {state ? (
            <ul className={styles.swatches}>
              {colours.map((colour) => (
                <li key={colour}>
                  <span style={{ background: shades[colour] }} />
                  <b>{familyLabel(colour)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.waiting} role="status">
              <span aria-hidden="true" />
              {demo
                ? 'Demonstration paused for review'
                : 'Waiting for the colour analysis to return…'}
            </div>
          )}
          {state && onContinue && (
            <button className={styles.action} onClick={onContinue}>
              Build my Room Palette →
            </button>
          )}
          {!state && demo && onReveal && (
            <button className={styles.action} onClick={onReveal}>
              Reveal the demonstration colours →
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
