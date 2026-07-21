import { Button, Eyebrow, FloralMark, SectionHeading } from '@/components/ui';

import styles from './Gifting.module.css';

/**
 * Gift-box band: copy left, film right — the mirror of the founder split.
 *
 * The film is a plain `<video>` rather than `next/image`: `autoplay + muted +
 * loop + playsinline` is enough on its own, so the section stays a server
 * component with no JavaScript shipped for it.
 */
export function Gifting() {
  return (
    <section id="gifting" className={styles.section}>
      <div className={`band ${styles.split}`}>
        <div className={styles.copy}>
          <FloralMark className={styles.mark} />

          <Eyebrow tone="brass" align="center">
            A thoughtful gift
          </Eyebrow>

          <SectionHeading level={1} align="center" className={styles.heading}>
            Send a box that says everything.
          </SectionHeading>

          <p className={styles.body}>
            New parents. A season of recovery. A busy stretch. Just because. A box that arrives
            beautifully, keeps in the fridge or freezer, and tastes like someone cooked for them,
            because someone did.
          </p>

          <div className={styles.actions}>
            <Button variant="outline" href="/menu">
              Build a gift box
            </Button>
          </div>
        </div>

        <div className={styles.media}>
          <video
            className={styles.video}
            src="/assets/gifting.mp4"
            poster="/assets/dish-fish-peppersoup.png"
            aria-label="Silent looping film of Abby's Table dishes"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        </div>
      </div>
    </section>
  );
}
