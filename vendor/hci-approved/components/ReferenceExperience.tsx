import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import styles from './ReferenceExperience.module.css';

export const colourDirections = [
  {
    name: 'Tonal',
    title: 'A quieter kind of harmony.',
    colour: '#bbb9a5',
    support: '#e7e0d2',
    text: 'Soft stone echoes the room’s quieter neutrals. Changes in depth give the scheme interest without asking for attention.',
  },
  {
    name: 'Complement',
    title: 'Something that belongs.',
    colour: '#738375',
    support: '#ded8c6',
    text: 'A softened green picks up the chair and foliage. It builds a connection across the room, rather than matching the wall.',
  },
  {
    name: 'Contrast',
    title: 'A little more character.',
    colour: '#795049',
    support: '#c8b39a',
    text: 'A deeper earthy red offers a counterpoint to the green. Used thoughtfully, it gives the window a more expressive role.',
  },
] as const;

export function ReferenceIcon({ type }: { type: string }) {
  const paths: Record<string, string> = {
    room: 'M3 11 12 3l9 8M5 10v11h14V10M9 21v-7h6v7',
    'sofa-upholstery':
      'M5 13V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6M3 12h4v5h10v-5h4v8H3zM5 20v2m14-2v2',
    rug: 'M5 4h14v16H5zM8 7h8v10H8zM7 1v3m5-3v3m5-3v3M7 20v3m5-3v3m5-3v3',
    wallpaper: 'M5 3h14v18H5zM9 3v18m6-18v18M5 9h14M5 15h14',
    paint: 'M4 3h12v6H4zM16 5h4v7h-9v3m-2 0h4v7H9z',
    flooring: 'M3 4h18v16H3zM3 9h18M3 15h18M9 4v5m6 0v6m-6 0v5',
    'existing-fabric': 'M4 3h16v18H4zM4 8l5-5m-5 11L15 3M4 20 20 4M10 21 20 11m-4 10 4-4',
    moodboard: 'M3 3h8v10H3zM14 3h7v6h-7zM3 16h8v5H3zM14 12h7v9h-7z',
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[type] ?? paths.room} />
    </svg>
  );
}

export function ReferenceOpening({ primaryHeading = false }: { primaryHeading?: boolean }) {
  const Heading = primaryHeading ? 'h1' : 'h2';
  return (
    <>
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>CurtainsUK · Fabric Intelligence™</p>
          <Heading id="palette-title">
            Let us read
            <br />
            your <em>room.</em>
          </Heading>
          <p className={styles.lede}>
            Show us your room — or something you’d like your curtains to work with.
          </p>
          <a className={styles.primaryLink} href="#your-reference">
            Begin with your room <span aria-hidden="true">↗</span>
          </a>
          <p className={styles.quiet}>
            Fabric Intelligence™ identifies the colours it can observe. Then you help us understand
            what they mean in your space.
          </p>
        </div>
        <figure className={styles.roomFigure}>
          <div className={styles.roomPhoto}>
            <Image
              src="/reference-experience/living-room.jpg"
              alt="Light living room with warm white walls, a grey sofa, a pale green armchair, oak-coloured flooring and green accents"
              fill
              sizes="(max-width: 760px) 100vw, 52vw"
              priority
            />
            <span className={styles.photoLabel}>A real room. More than one possibility.</span>
          </div>
          <figcaption className={styles.examplePalette}>
            <p className={styles.eyebrow}>A room, read in layers</p>
            <div className={styles.exampleRoles}>
              <div>
                <span className={styles.exampleSwatch} style={{ background: '#ddd7c9' }} />
                <b>Primary</b>
                <small>
                  Warm white · grey
                  <br />
                  The visual foundation
                </small>
              </div>
              <div>
                <span className={styles.exampleSwatch} style={{ background: '#aab2a1' }} />
                <b>Secondary</b>
                <small>
                  Soft green · oak brown
                  <br />
                  The supporting colours
                </small>
              </div>
              <div>
                <span className={styles.exampleSwatch} style={{ background: '#7b874e' }} />
                <b>Accent</b>
                <small>
                  Leaf green · pink
                  <br />
                  The smaller details
                </small>
              </div>
            </div>
            <p className={styles.exampleNote}>
              Illustrative palette, selected for this example. Not a live analysis.
            </p>
          </figcaption>
        </figure>
      </div>
      <div
        className={styles.journey}
        aria-label="Your room, then colours, then room palette, then design direction, then fabrics"
      >
        {['Your room', 'Colours', 'Room palette', 'Design direction', 'Fabrics'].map((step, i) => (
          <div key={step}>
            <span>0{i + 1}</span>
            {step}
            {i < 4 && <i aria-hidden="true">→</i>}
          </div>
        ))}
      </div>
    </>
  );
}

export function ColourDirections() {
  return (
    <section className={styles.directionSection} aria-labelledby="colour-directions-title">
      <div className={styles.sectionIntro}>
        <p className={styles.eyebrow}>One room. Three colour possibilities.</p>
        <h2 id="colour-directions-title">
          A relationship.
          <br />
          <em>Not just a match.</em>
        </h2>
        <p>
          The nearest colour isn’t always the most interesting answer. Your palette can be the
          beginning of several different directions.
        </p>
      </div>
      <div className={styles.directions}>
        {colourDirections.map((direction, i) => (
          <article key={direction.name}>
            <div
              className={styles.fabricStudy}
              style={
                { '--study': direction.colour, '--support': direction.support } as CSSProperties
              }
              aria-hidden="true"
            >
              <span />
              <i />
              <b>0{i + 1}</b>
            </div>
            <p className={styles.eyebrow}>{direction.name}</p>
            <h3>{direction.title}</h3>
            <p>{direction.text}</p>
          </article>
        ))}
      </div>
      <div className={styles.directionFoot}>
        <span>Illustrative colour studies, not product recommendations or fabric samples.</span>
        <Link href="/learn/tonal-complement-contrast">Tonal, complement or contrast? →</Link>
      </div>
    </section>
  );
}

export function ReferenceLearning() {
  return (
    <>
      <section className={styles.consider} aria-labelledby="consider-title">
        <div>
          <p className={styles.eyebrow}>The whole picture</p>
          <h2 id="consider-title">
            More than
            <br />
            <em>colour matching.</em>
          </h2>
          <p>A photograph opens the conversation. Your answers help give it direction.</p>
        </div>
        <div className={styles.capabilities}>
          <article>
            <span>01 / From the image</span>
            <h3>A first colour reading</h3>
            <p>
              Suggested colour families, warm or cool balance, light and depth, richness and
              contrast. Lighting can change that reading—which is why you can correct it.
            </p>
            <Link href="/learn/undertones">Understanding undertones →</Link>
          </article>
          <article>
            <span>02 / From you</span>
            <h3>The way you want to live</h3>
            <p>
              Pattern character and scale, texture, finish, existing furnishings and practical
              curtain requirements are explored through your answers. They are not identified as
              facts from your photograph.
            </p>
            <Link href="/learn/pattern-scale">Choosing pattern scale →</Link>
          </article>
          <article>
            <span>03 / In the consultation</span>
            <h3>How the colours relate</h3>
            <p>
              Your confirmed palette and preferences help frame design directions. A room image does
              not establish a fabric’s composition, performance or technical suitability.
            </p>
            <Link href="/learn/colour-palettes">Learn about colour palettes →</Link>
          </article>
        </div>
      </section>
      <section className={styles.library} aria-labelledby="library-title">
        <div>
          <p className={styles.eyebrow}>The CurtainsUK Design Library</p>
          <h2 id="library-title">
            A little understanding.
            <br />
            <em>A more confident choice.</em>
          </h2>
        </div>
        <nav aria-label="Explore the Design Library">
          <Link href="/learn/colour-palettes">
            Learn about colour palettes <span>→</span>
          </Link>
          <Link href="/learn/undertones">
            Understanding undertones <span>→</span>
          </Link>
          <Link href="/learn/tonal-complement-contrast">
            Tonal, complement or contrast? <span>→</span>
          </Link>
          <Link href="/learn/60-30-10">
            How the 60–30–10 principle works <span>→</span>
          </Link>
          <Link href="/learn/pattern-scale">
            Choosing pattern scale <span>→</span>
          </Link>
          <Link href="/learn/light-and-colour">
            How daylight changes colour <span>→</span>
          </Link>
        </nav>
      </section>
    </>
  );
}

export function ReferencePrivacy({ previewOnly = false, hosted = false }: { previewOnly?: boolean; hosted?: boolean }) {
  return (
    <aside className={styles.privacy}>
      <span className={styles.privacySymbol} aria-hidden="true">
        ↳
      </span>
      <div>
        <p className={styles.eyebrow}>A considered approach to privacy</p>
        <h3>Your room stays your room.</h3>
        <p>
          {previewOnly
            ? 'No image is sent or analysed in this design preview.'
            : hosted ? 'This protected consultation processes your photograph privately to derive colour information. The original image bytes are not saved by the consultation.' : hosted ? 'This protected consultation processes your photograph privately to derive colour information. The original image bytes are not saved by the consultation.' : 'This local image-palette tool processes your photograph without writing the original image bytes to its palette store.'}{' '}
          Please avoid photographs containing people, personal documents, screens or other sensitive
          information. Image analysis is used to derive colour information.
        </p>
        <details>
          <summary>Image privacy & safe uploading</summary>
          <p>
            {hosted ? 'Derived palettes, your corrections and consultation evidence are retained separately. Your photograph is processed for this request and is not sent to a generative AI service. This is a protected integration preview.' : 'Derived palettes, corrections and evidence can be retained by the consultation system. Public hosted image processing, authentication, storage and retention/deletion terms remain a separate release boundary. This preview does not promise automatic deletion or enable customer image analysis.'}
          </p>
        </details>
      </div>
    </aside>
  );
}
