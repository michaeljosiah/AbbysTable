import Link from 'next/link';
import type { ReactNode } from 'react';

import styles from './StatusMessage.module.css';

/**
 * The centred band shared by the 404 and 500 pages (designs: Page Not Found,
 * Something Went Wrong): optional status mark, eyebrow, h1 on the hero scale,
 * lede, a 52px primary and an optional text CTA, then anything page-specific.
 *
 * Renders no landmark of its own — the 404 sits inside the site layout's
 * `<main>`, and the pages that own their chrome wrap it in one.
 *
 * No hooks, so it renders on the server for the 404 and inside the client
 * error boundaries for the 500.
 */
type PrimaryAction = { label: string; href: string } | { label: string; onClick: () => void };

interface StatusMessageProps {
  /** `notFound` hugs its content on a phone; `error` holds the viewport. */
  kind: 'notFound' | 'error';
  /** The decorative status disc. The 404 has none, by design. */
  mark?: 'error';
  eyebrow: string;
  title: string;
  lede: string;
  primary: PrimaryAction;
  /** Site text-CTA: sentence case, brass rule under label and arrow. */
  secondary?: { label: string; href: string };
  children?: ReactNode;
}

export function StatusMessage({
  kind,
  mark,
  eyebrow,
  title,
  lede,
  primary,
  secondary,
  children,
}: StatusMessageProps) {
  return (
    <section className={styles.band} data-kind={kind}>
      <div className={styles.inner}>
        <div className={styles.body}>
          {mark === 'error' ? (
            <div className={styles.mark} aria-hidden="true">
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3.6 21.2 19.5H2.8z" />
                <path d="M12 9.6v4.6M12 16.9h.01" strokeWidth="1.8" />
              </svg>
            </div>
          ) : null}

          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lede}>{lede}</p>

          <div className={styles.actions}>
            {'href' in primary ? (
              <Link href={primary.href} className={styles.primary}>
                {primary.label}
              </Link>
            ) : (
              <button type="button" onClick={primary.onClick} className={styles.primary}>
                {primary.label}
              </button>
            )}

            {secondary ? (
              <Link href={secondary.href} className={styles.secondary}>
                <span>
                  {secondary.label}
                  <span aria-hidden="true">&rarr;</span>
                </span>
              </Link>
            ) : null}
          </div>

          {children}
        </div>
      </div>
    </section>
  );
}
