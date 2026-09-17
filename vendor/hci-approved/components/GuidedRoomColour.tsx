'use client';
import { useEffect, useRef, useState } from 'react';
import type { ColourFamily } from '../intelligence/reference-images/evidence';
import type {
  PaletteCategory,
  PaletteEdit,
  RoomColour,
} from '../intelligence/reference-images/palette';
import {
  colourInfluences,
  roomFeatures,
  type RoomFeature,
  type ColourInfluence,
} from '../intelligence/reference-images/room-context';
import { familyLabel, featureLabel, influenceCopy, roomSwatch } from './room-palette-presentation';
import { selectedCustomerShade } from '../intelligence/reference-images/customer-shades';
import styles from './RoomPaletteBoard.module.css';

export function GuidedRoomColour({
  colour,
  role,
  context,
  busy,
  position,
  total,
  onEdit,
  onChange,
}: {
  colour: ColourFamily;
  role: PaletteCategory;
  context: RoomColour;
  busy: boolean;
  position: number;
  total: number;
  onEdit: (action: PaletteEdit) => Promise<boolean>;
  onChange: (context: Pick<RoomColour, 'feature' | 'influence'>) => void;
}) {
  const [feature, setFeature] = useState<RoomFeature | null>(context.feature);
  const [influence, setInfluence] = useState<ColourInfluence>(context.influence);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [more, setMore] = useState(false);
  const [ignorePrompt, setIgnorePrompt] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      title.current?.focus({ preventScroll: true });
    }
  }, [step]);
  async function confirm(value: ColourInfluence = influence) {
    await onEdit({
      type: 'review-colour',
      previousColour: colour,
      colour,
      category: role,
      feature,
      influence: value,
    });
  }
  return (
    <article className={styles.guidedCard} aria-label={`Review ${familyLabel(colour)}`}>
      <div className={styles.guidedSample}>
        <div
          className={styles.guidedField}
          style={{ background: roomSwatch(colour, context) }}
          aria-hidden="true"
        />
        <div className={styles.guidedCaption}>
          <h3>{familyLabel(colour)}</h3>
          {context.customerSelectedShade && (
            <small>{selectedCustomerShade(colour, context.customerSelectedShade)?.label}</small>
          )}
          <span className={styles.eyebrow}>
            {familyLabel(role)} · {position} of {total}
          </span>
          <div className={styles.corrections}>
            <button disabled={busy} onClick={() => onChange({ feature, influence })}>
              Colour not right?
            </button>
            <button
              disabled={busy}
              onClick={() => onChange({ feature, influence })}
              aria-label={`Change ${familyLabel(colour)} role`}
            >
              {familyLabel(role)} · Change
            </button>
          </div>
        </div>
      </div>
      <div className={styles.guidedChoices}>
        <p className={styles.eyebrow}>Step {step} of 3</p>
        <h4 ref={title} tabIndex={-1}>
          {ignorePrompt
            ? `Ignore ${familyLabel(colour)}?`
            : step === 1
              ? 'Where is this colour?'
              : step === 2
                ? 'How much should this colour influence your curtains?'
                : 'Is everything right?'}
        </h4>
        {step === 1 && (
          <div className={styles.features} role="group" aria-label="Where is this colour?">
            {(more ? roomFeatures : (['walls', 'sofa', 'flooring', 'rug'] as RoomFeature[])).map(
              (f) => (
                <button
                  key={f}
                  disabled={busy}
                  aria-pressed={feature === f}
                  onClick={() => {
                    setFeature(f);
                    setStep(2);
                  }}
                >
                  {featureLabel[f]}
                </button>
              ),
            )}
            <button disabled={busy} aria-expanded={more} onClick={() => setMore(!more)}>
              {more ? 'Fewer options' : 'More +'}
            </button>
          </div>
        )}
        {step === 2 && !ignorePrompt && (
          <>
            <div className={styles.guidedInfluences} role="group" aria-label="Colour influence">
              {colourInfluences.map((i) => (
                <button
                  key={i}
                  disabled={busy}
                  aria-pressed={influence === i}
                  onClick={() => {
                    setInfluence(i);
                    if (i === 'ignore') setIgnorePrompt(true);
                    else setStep(3);
                  }}
                >
                  <b>{familyLabel(i)}</b>
                  <span>{influenceCopy[i]}</span>
                </button>
              ))}
            </div>
            <button className={styles.review} disabled={busy} onClick={() => setIgnorePrompt(true)}>
              This colour isn’t relevant
            </button>
          </>
        )}
        {ignorePrompt && (
          <div className={styles.compactSummary}>
            <p>
              We’ll keep the original observation, but {familyLabel(colour)} won’t influence your
              curtain directions.
            </p>
            <div className={styles.guideAction}>
              <button
                className={styles.primary}
                disabled={busy}
                onClick={() => void confirm('ignore')}
              >
                {busy ? 'Saving…' : 'Yes, ignore it'}
              </button>
            </div>
            <button
              className={styles.review}
              disabled={busy}
              onClick={() => setIgnorePrompt(false)}
            >
              Keep reviewing
            </button>
          </div>
        )}
        {step === 3 && (
          <>
            <div className={styles.compactSummary}>
              <b>{familyLabel(colour)}</b>
              <p>
                {feature ? featureLabel[feature] : 'Feature not assigned'} · {familyLabel(role)} ·{' '}
                {familyLabel(influence)}
              </p>
            </div>
            <div className={styles.guideAction}>
              <button className={styles.primary} disabled={busy} onClick={() => void confirm()}>
                {busy ? 'Saving…' : `Confirm ${familyLabel(colour)} →`}
              </button>
            </div>
          </>
        )}
        {step > 1 && !ignorePrompt && (
          <button
            className={styles.review}
            disabled={busy}
            onClick={() => setStep(step === 3 ? 2 : 1)}
          >
            ← {step === 3 ? 'Change influence' : 'Change location'}
          </button>
        )}
      </div>
    </article>
  );
}
