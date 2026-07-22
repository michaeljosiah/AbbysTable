import type { ReactNode } from 'react';

import { FloralMark } from '@/components/ui';

import styles from './AuthShell.module.css';

/**
 * The split auth frame: a deep-forest brand panel beside the cream form
 * column. There is no design template for these pages — the panel leans on
 * the founder-band language (forest ground, blush display type, Cormorant
 * accent) and the published clean-label standards, nothing invented.
 */
interface AuthShellProps {
  /** Small caps line above the panel title, e.g. "Welcome back". */
  eyebrow: string;
  /** Playfair display line on the brand panel. */
  title: string;
  /** Cormorant accent line under the title. */
  accent: string;
  /** Quiet checklist at the panel's foot (the brand's standards). */
  points: string[];
  children: ReactNode;
}

export function AuthShell({ eyebrow, title, accent, points, children }: AuthShellProps) {
  return (
    <section className={styles.frame}>
      <div className={styles.panel}>
        <FloralMark height={54} className={styles.mark} />
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.accent}>{accent}</p>

        <ul className={styles.points}>
          {points.map((point) => (
            <li key={point} className={styles.point}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.formColumn}>{children}</div>
    </section>
  );
}
