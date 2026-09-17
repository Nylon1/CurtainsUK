import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './guide.module.css';
const guides = {
  'colour-palettes': {
    title: 'Understanding colour palettes',
    intro:
      'A palette is more than a list of colours. It describes which colours lead the room, which support it and which appear as smaller accents.',
    points: [
      'Primary colours carry most of the visual weight.',
      'Secondary colours support the main palette without competing with it.',
      'Accent colours appear in smaller amounts and can add energy, depth or focus.',
    ],
    tip: 'When choosing curtains, decide whether they should join the primary palette, quietly support it, or become a deliberate accent.',
  },
  undertones: {
    title: 'Warm and cool undertones',
    intro:
      'Two fabrics can both look beige, grey or white and still behave very differently in the same room because of their undertones.',
    points: [
      'Warm undertones lean towards cream, yellow, red or brown.',
      'Cool undertones lean towards blue, green or violet.',
      'Neutral rooms often contain a mixture, so the surrounding light and materials matter.',
    ],
    tip: 'Compare samples in the actual room, at different times of day. Screens cannot reliably show every undertone.',
  },
  'tonal-complement-contrast': {
    title: 'Tonal, complement and contrast',
    intro:
      'There is rarely only one “correct” curtain colour. Different colour relationships can create different moods while still working with the room.',
    points: [
      'Tonal stays close to colours already present for a calm, layered effect.',
      'Complement introduces a related colour that works with the existing palette without copying it.',
      'Contrast creates a purposeful counterpoint and can give the curtains more presence.',
    ],
    tip: 'The right direction depends on how quiet or expressive you want the curtains to feel.',
  },
  '60-30-10': {
    title: 'The 60–30–10 principle',
    intro:
      '60–30–10 is a useful interior-design guide for thinking about visual balance, not a mathematical rule every room must follow.',
    points: [
      'Around 60% represents the dominant visual family.',
      'Around 30% supports it with a secondary family.',
      'Around 10% can be an accent that adds definition or interest.',
    ],
    tip: 'Curtains can sit in any of these roles depending on their size, colour, pattern and how visually prominent the window is.',
  },
  'pattern-scale': {
    title: 'Choosing pattern and scale',
    intro:
      'Pattern is not only about style. Scale changes how busy, calm, dramatic or spacious a fabric feels when used across a full curtain.',
    points: [
      'Small-scale patterns can read almost like texture from a distance.',
      'Medium patterns are often clearly visible without dominating.',
      'Large-scale designs need enough curtain area to show their repeat and character.',
    ],
    tip: 'Always judge pattern on an area large enough to understand its repeat—not from a tiny thumbnail alone.',
  },
  'light-and-colour': {
    title: 'How room light changes colour',
    intro:
      'Fabric colour changes with daylight direction, time of day, artificial lighting and the colours reflected from nearby surfaces.',
    points: [
      'North-facing daylight often makes colours feel cooler.',
      'Warm lamps can make creams, reds and browns feel richer.',
      'Strong coloured walls, floors and furniture can reflect colour onto nearby fabric.',
    ],
    tip: 'Order a sample and look at it beside the window in morning, afternoon and evening light before making a final decision.',
  },
} as const;
export function generateStaticParams() {
  return Object.keys(guides).map((topic) => ({ topic }));
}
export default async function Guide({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  if (!Object.hasOwn(guides, topic)) notFound();
  const guide = guides[topic as keyof typeof guides];
  if (!guide) notFound();
  const returnHref = '/curtain-consultation-premium';
  const number = Object.keys(guides).indexOf(topic) + 1;
  return (
    <main className={styles.page}>
      <div className={styles.masthead}>
        <Link href={returnHref} className={styles.brand}>
          Curtains<i>UK</i>
        </Link>
        <span>The Design Library</span>
      </div>
      <Link href={returnHref} className={styles.back}>
        ← Return to Fabric Intelligence
      </Link>
      <article>
        <div className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Design notes / 0{number}</p>
            <h1>{guide.title}</h1>
            <p className={styles.intro}>{guide.intro}</p>
          </div>
          <div
            className={styles.visual}
            aria-label="Illustrative room palette: warm stone, soft sage and deep earth"
          >
            <span className={styles.stone} />
            <span className={styles.sage} />
            <span className={styles.earth} />
            <p>
              A considered palette,
              <br />
              <em>not a perfect match.</em>
            </p>
          </div>
        </div>
        <section className={styles.observations} aria-labelledby="notice-title">
          <div>
            <p className={styles.eyebrow}>Train your eye</p>
            <h2 id="notice-title">
              Small observations.
              <br />
              <em>Better decisions.</em>
            </h2>
          </div>
          <ol>
            {guide.points.map((point, i) => (
              <li key={point}>
                <span>0{i + 1}</span>
                <p>{point}</p>
              </li>
            ))}
          </ol>
        </section>
        <aside className={styles.curtainNote}>
          <p className={styles.eyebrow}>Bring it back to your curtains</p>
          <h2>In your room.</h2>
          <p>{guide.tip}</p>
          <Link href={returnHref}>Let us read your room →</Link>
        </aside>
        <section className={styles.further}>
          <div>
            <p className={styles.eyebrow}>Keep exploring</p>
            <h2>A little more perspective.</h2>
          </div>
          <nav aria-label="More design notes">
            {Object.entries(guides)
              .filter(([key]) => key !== topic)
              .map(([key, item]) => (
                <Link key={key} href={'/learn/' + key}>
                  {item.title}
                  <span>→</span>
                </Link>
              ))}
          </nav>
        </section>
      </article>
      <p className={styles.foot}>
        Fabric Intelligence™ · Design guidance, with your room at its heart.
      </p>
    </main>
  );
}
