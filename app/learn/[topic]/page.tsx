import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './guide.module.css';
import { DESIGN_GUIDES as guides } from "@/lib/storefront/design-guides";

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
