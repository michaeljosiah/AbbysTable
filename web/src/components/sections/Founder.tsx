import Image from 'next/image';
import Link from 'next/link';

import { Keep } from './KeepTogether';
import styles from './Founder.module.css';

/**
 * Meet the founder — design/Abby's Table - Homepage v2.dc.html (approved) and
 * build-handoff "Meet the founder — what was settled".
 *
 * On `--blush`. Stacked on a phone (photograph, then copy), still stacked from
 * 640 with the photograph capped at 480px, and 50/50 with the copy centred
 * against it from 1024. The photograph's box is square at EVERY width, so it
 * is never re-cropped between breakpoints.
 *
 * "Esther Abby Josiah" is a subtitle, not part of the heading, so the outline
 * reads "Meet the founder".
 *
 * Photograph: AI-generated placeholder, to be reshot (#38). Lazy — the band is
 * well below the first screen at both reference viewports.
 */
export function Founder() {
  return (
    <section id="founder" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={styles.media}>
            <Image
              src="/assets/home/founder-1237.jpg"
              alt="Esther Abby Josiah at a kitchen table beside a stack of Abby’s Table meal boxes"
              fill
              sizes="(min-width: 1280px) 560px, (min-width: 1024px) calc(50vw - 80px), (min-width: 640px) 480px, calc(100vw - 44px)"
              className={styles.image}
            />
          </div>

          <div className={styles.copy}>
            <h2 className={styles.heading}>Meet the founder</h2>
            <p className={styles.name}>Esther Abby Josiah</p>

            <p className={styles.body}>
              After more than a decade cooking Nigerian food for some of Britain’s finest tables
              through Mrs J Foods and <Keep>Béllé-Full</Keep>, one devastating diagnosis changed
              everything.
            </p>
            <p className={styles.body}>
              Remission became more than recovery. It became a reason to rethink and relearn
              everything she knew about the food she loved.
            </p>
            <p className={styles.body}>That journey gave birth to Abby’s Table.</p>

            <div className={styles.ctaWrap}>
              <Link href="/our-story" className={styles.cta}>
                Read Abby’s story
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
