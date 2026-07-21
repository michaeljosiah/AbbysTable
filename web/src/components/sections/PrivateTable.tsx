import { Button, Eyebrow, SectionHeading } from '@/components/ui';

import styles from './PrivateTable.module.css';

/**
 * Navy band for the private consultation service.
 *
 * The CTA has no destination yet — the consultation flow does not exist — so it
 * renders as a `<button>`. Give it an `href` (or an `onClick` from a client
 * wrapper) once there is somewhere for it to go.
 */
export function PrivateTable() {
  return (
    <section id="private" className={styles.section}>
      <div className={`band ${styles.content}`}>
        <Eyebrow tone="brass" align="center">
          A private service
        </Eyebrow>

        <SectionHeading level={1} tone="cream" align="center" className={styles.heading}>
          Abby&apos;s Private Table
        </SectionHeading>

        <p className={styles.body}>
          Bespoke Nigerian-inspired recipe collections, developed with a registered dietitian to
          the guidelines your clinical team has set, and returned to them for sign-off.{' '}
          <span className={styles.worldwide}>
            <span className={styles.lozenge} aria-hidden="true">
              ⬥
            </span>
            Available worldwide
            <span className={styles.lozenge} aria-hidden="true">
              ⬥
            </span>
          </span>
        </p>

        <Button variant="outline-brass">Request a private consultation</Button>
      </div>
    </section>
  );
}
