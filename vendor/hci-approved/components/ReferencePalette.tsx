'use client';
import { useEffect, useRef, useState } from 'react';
import { referenceTypes } from '../intelligence/reference-images/evidence';
import { type PaletteEdit, type PaletteState } from '../intelligence/reference-images/palette';
import { RoomPaletteBoard } from './RoomPaletteBoard';
import { ReferenceAnalysis } from './ReferenceAnalysis';
import Link from 'next/link';
import styles from './ReferenceExperience.module.css';
import {
  ReferenceOpening,
  ReferenceIcon,
  ColourDirections,
  ReferenceLearning,
  ReferencePrivacy,
} from './ReferenceExperience';
export type PaletteView = { recordId: string; state: PaletteState };
const label = (value: string) =>
  value === 'cream'
    ? 'Cream / off-white'
    : value[0]!.toUpperCase() + value.slice(1).replaceAll('-', ' ');
const typeLabels: Record<string, string> = {
  room: 'Room',
  paint: 'Paint',
  'sofa-upholstery': 'Sofa / Upholstery',
  wallpaper: 'Wallpaper',
  rug: 'Rug',
  flooring: 'Flooring',
  'existing-fabric': 'Existing fabric',
  moodboard: 'Moodboard',
};
export function ReferencePalette({
  onChange,
  onBusyChange,
  previewOnly = false,
  transport,
  initialView = null,
  maxImageMb = 8,
}: {
  onChange: (view: PaletteView | null) => void;
  onBusyChange?: (busy: boolean) => void;
  previewOnly?: boolean;
  transport?: (request: RequestInit) => Promise<PaletteView>;
  initialView?: PaletteView | null;
  maxImageMb?: number;
}) {
  const [view, setView] = useState<PaletteView | null>(initialView),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [type, setType] = useState('room'),
    [preview, setPreview] = useState(''),
    [canRetry, setCanRetry] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [analysis, setAnalysis] = useState(false);
  const lock = useRef(false),
    retry = useRef<RequestInit | null>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  // The approved presentation is shared unchanged; only its transport is injected.
  async function request(init: RequestInit): Promise<PaletteView> {
    if (transport) return transport(init);
    const response = await fetch('/api/internal/reference-palettes', {
      ...init, signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw Error('PALETTE_REQUEST_FAILED');
    return response.json();
  }
  async function send(init: RequestInit) {
    if (previewOnly || lock.current) return;
    lock.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError('');
    retry.current = init;
    try {
      let result = await request(init);
      if (!result.state.review) {
        const startReview: RequestInit = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordId: result.recordId,
            action: {
              id: crypto.randomUUID(),
              revision: result.state.revision,
              type: 'begin-review',
            },
          }),
        };
        // Retain this exact action for a lost-response retry; do not issue a new revision.
        retry.current = startReview;
        result = await request(startReview);
      }
      setView(result);
      onChange(result);
      retry.current = null;
      setCanRetry(false);
      try {
        if (!transport) localStorage.setItem('hci-reference-palette-v1', result.recordId);
      } catch {
        /* server state remains durable */
      }
      return result as PaletteView;
    } catch {
      setCanRetry(true);
      setError(
        init.body instanceof Blob
          ? 'We couldn’t read this image clearly. Try another photograph with good natural light and a clear view of the colours you’d like us to consider.'
          : 'We could not save that change. Your last saved palette is safe. Retry, or reload the saved palette if it changed elsewhere.',
      );
      setAnalysis(false);
    } finally {
      lock.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  async function edit(action: PaletteEdit): Promise<boolean> {
    if (!view) return false;
    return Boolean(
      await send({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: view.recordId,
          action: { ...action, id: crypto.randomUUID(), revision: view.state.revision },
        }),
      }),
    );
  }
  async function resume(): Promise<boolean> {
    const recordId = localStorage.getItem('hci-reference-palette-v1');
    if (!recordId) {
      setError('No saved palette on this device yet.');
      return false;
    }
    return Boolean(
      await send({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId }),
      }),
    );
  }
  function acceptFile(file: File | undefined) {
    if (!file || previewOnly || busy || lock.current) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG or WebP photograph.');
      return;
    }
    if (file.size > maxImageMb * 1024 * 1024) {
      setError(`Choose an image smaller than ${maxImageMb} MB.`);
      return;
    }
    setPreview(URL.createObjectURL(file));
    setAnalysis(true);
    void send({
      method: 'POST',
      headers: { 'Content-Type': file.type, 'x-hci-reference-type': type },
      body: file,
    });
  }
  if (analysis)
    return (
      <ReferenceAnalysis
        imageUrl={preview}
        state={busy ? undefined : view?.state}
        onContinue={() => setAnalysis(false)}
      />
    );
  return (
    <section
      className={styles.editor}
      aria-labelledby={view ? 'room-palette-title' : 'palette-title'}
    >
      {!view && (
        <>
          <ReferenceOpening primaryHeading={previewOnly || Boolean(transport)} />
          <section
            id="your-reference"
            className={styles.uploadSection}
            aria-labelledby="upload-heading"
          >
            <div className={styles.uploadIntro}>
              <span className={styles.stepLabel}>01 / Your starting point</span>
              <p className={styles.eyebrow}>Begin with something you love</p>
              <h2 id="upload-heading">
                What would you like us to <em>understand?</em>
              </h2>
              <p>
                A whole room, a favourite rug, a colour you keep coming back to. Start wherever
                inspiration finds you.
              </p>
              <p className={styles.optional}>One reference image. Always optional.</p>
            </div>
            <div>
              <div className={styles.typeGrid} aria-label="Reference type">
                {referenceTypes.map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={styles.typeButton}
                    aria-pressed={type === t}
                    disabled={busy}
                    onClick={() => setType(t)}
                  >
                    <ReferenceIcon type={t} />
                    {typeLabels[t] ?? label(t)}
                  </button>
                ))}
              </div>
              <div
                className={styles.dropzone + (dragging ? ' ' + styles.dropActive : '')}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!previewOnly && !busy) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  if (e.dataTransfer.files.length > 1) {
                    if (!previewOnly) setError('Choose one reference image for this consultation.');
                    return;
                  }
                  acceptFile(e.dataTransfer.files[0]);
                }}
              >
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M5 9h7l2-3h6l2 3h5v18H5z" />
                  <circle cx="16" cy="18" r="5" />
                </svg>
                <strong>Show us your space</strong>
                <p>Upload a clear photograph and we’ll begin with its colour relationships.</p>
                <label className={styles.fileLabel}>
                  {error ? 'Choose another photo' : 'Choose photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy || previewOnly}
                    onChange={(e) => acceptFile(e.target.files?.[0])}
                  />
                </label>
                <small>
                  {previewOnly
                    ? 'Image analysis unavailable in this design preview'
                    : 'or drag and drop one photo here'}
                </small>
                <small>JPEG, PNG or WebP · maximum {maxImageMb} MB</small>
                {preview ? (
                  <div
                    className={styles.selectedPreview}
                    role="img"
                    aria-label="Your selected photograph"
                    style={{ backgroundImage: `url(${preview})` }}
                  />
                ) : null}
                {busy ? <p role="status">Reading the colours in your reference…</p> : null}
                {error ? <p role="alert">{error}</p> : null}
              </div>
              {previewOnly && (
                <Link className={styles.primaryLink} href="/reference-experience/room-palette">
                  Try the demonstration journey →
                </Link>
              )}
              {previewOnly && (
                <p className={styles.previewWarning} role="note">
                  Visual preview only. Uploads and saved-palette access are disabled. No image is
                  sent or analysed here.
                </p>
              )}
              {!transport && <button className={styles.resume} disabled={busy || previewOnly} onClick={resume}>
                Resume saved palette
              </button>}
            </div>
          </section>
          <ReferencePrivacy previewOnly={previewOnly} hosted={Boolean(transport)} />
          <ColourDirections />
          <ReferenceLearning />
          <p className={styles.credit}>
            Room photograph:{' '}
            <a
              href="https://unsplash.com/photos/green-sofa-near-glass-window-Ps_ujcY0oT8"
              target="_blank"
              rel="noreferrer"
            >
              Kyoshi Reyes / Unsplash
            </a>
            . Palette and colour studies are illustrative.
          </p>
        </>
      )}
      {error && !view ? (
        <p className={styles.alert} role="alert">
          {error}{' '}
          {canRetry ? (
            <button
              disabled={busy}
              onClick={() => {
                if (retry.current) void send(retry.current);
              }}
            >
              Retry saved request
            </button>
          ) : null}
        </p>
      ) : null}
      {view ? (
        <RoomPaletteBoard
          state={view.state}
          imageUrl={preview || undefined}
          busy={busy}
          error={error}
          onEdit={edit}
          onRetry={
            canRetry ? async () => Boolean(retry.current && (await send(retry.current))) : undefined
          }
          onResume={transport ? undefined : resume}
        />
      ) : (
        <p className={styles.optional}>
          No image is required. You can continue the consultation without one.
        </p>
      )}
    </section>
  );
}

/** Presentation-only route: no upload, resume or palette API requests. */
export function ReferencePalettePreview() {
  return <ReferencePalette previewOnly onChange={() => {}} />;
}
