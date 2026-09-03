import { Button, Eyebrow, FloralMark, SectionHeading } from '@/components/ui';

import styles from './Gifting.module.css';

/**
 * Gift-box band: copy left, film right — the mirror of the founder split.
 *
 * The film is a plain `<video>` rather than `next/image`: `autoplay + muted +
 * loop + playsinline` is enough on its own, so the section stays a server
 * component with no JavaScript shipped for it.
 *
 * The poster is the film's own first frame, so the handover to playback is
 * invisible. Keep it that way if the film is ever recut — a still of anything
 * else reads as a jump cut the moment the video starts.
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
            Send a gift that says everything.
          </SectionHeading>

          <p className={styles.body}>
            For new parents, recovery, busy seasons or just because.
            <br />
            <br />
            Send a carefully chosen Abby&apos;s Table order, or give them a gift card and let them
            choose what suits them best.
          </p>

          <div className={styles.actions}>
            <Button variant="outline" href="/menu">
              Find out more
            </Button>
          </div>
        </div>

        <div className={styles.media}>
          <video
            className={styles.video}
            src="/assets/gifting.mp4"
            poster="/assets/gifting-poster.jpg"
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
