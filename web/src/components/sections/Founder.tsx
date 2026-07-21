import Image from 'next/image';

import { Button, Eyebrow, FloralMark, SectionHeading } from '@/components/ui';

import styles from './Founder.module.css';

/**
 * The founder band: Abby's portrait beside the short version of her story.
 * Below 1040px the split collapses to one column and the portrait — first in
 * the DOM — leads as a square above the copy.
 */
export function Founder() {
  return (
    <section id="founder" className={styles.section}>
      <div className={`band ${styles.split}`}>
        <div className={styles.media}>
          <Image
            src="/assets/founder-portrait.png"
            alt="Esther Abby Josiah"
            fill
            sizes="(max-width: 1040px) min(100vw, 460px), 560px"
            className={styles.portrait}
          />
        </div>

        <div className={styles.copy}>
          <FloralMark className={styles.mark} />
          <Eyebrow tone="brass" align="center">
            Meet the founder
          </Eyebrow>
          <SectionHeading level={1} align="center" className={styles.heading}>
            Esther Abby Josiah
          </SectionHeading>

          <div className={styles.story}>
            <p>
              After more than a decade cooking Nigerian food for some of Britain&apos;s finest
              tables through Mrs J Foods and Béllé-Full, one devastating diagnosis changed
              everything.
            </p>
            <p>
              Remission became more than recovery. It became a reason to rethink and relearn
              everything she knew about the food she loved.
            </p>
            <p>That journey gave birth to Abby&apos;s Table.</p>
          </div>

          <div className={styles.cta}>
            <Button variant="outline">Read Abby&apos;s story</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
