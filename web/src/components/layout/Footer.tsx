'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { Logo } from '@/components/brand/Logo';
import { SocialIcons } from '@/components/brand/SocialIcons';
import { Eyebrow, NavLink } from '@/components/ui';
import { FOOTER_COLUMNS, SOCIAL_HANDLE } from '@/lib/content/navigation';

import styles from './Footer.module.css';

/** Matches the template. Bump with the brand's copyright line, not the clock. */
const COPYRIGHT_YEAR = 2026;

export function Footer() {
  const [subscribed, setSubscribed] = useState(false);
  const [openColumns, setOpenColumns] = useState<Record<string, boolean>>({});

  // TODO(aonik): POST to the subscriptions endpoint once it exists. Until then
  // the form confirms optimistically without persisting anything.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubscribed(true);
  };

  const toggleColumn = (heading: string) =>
    setOpenColumns((current) => ({ ...current, [heading]: !current[heading] }));

  return (
    <footer id="contact" className={styles.footer}>
      <div className={styles.brassRule} />

      <div className={`band band--frame ${styles.inner}`}>
        <div className={styles.grid}>
          <div className={styles.news}>
            <Eyebrow tone="brass">Join the table</Eyebrow>
            <p className={styles.newsCopy}>Kitchen notes and offers from Abby monthly.</p>

            {subscribed ? (
              <p className={styles.thanks} role="status">
                Thank you for joining the table.
              </p>
            ) : (
              <form className={styles.form} onSubmit={handleSubmit}>
                <input
                  name="email"
                  type="email"
                  required
                  aria-label="Email address"
                  placeholder="Enter your email address"
                  className={styles.input}
                />
                <button type="submit" className={styles.join}>
                  Join
                </button>
              </form>
            )}
          </div>

          {FOOTER_COLUMNS.map((column) => {
            const isOpen = Boolean(openColumns[column.heading]);
            return (
              <div key={column.heading} className={styles.column} data-open={isOpen || undefined}>
                <button
                  type="button"
                  className={styles.columnHead}
                  onClick={() => toggleColumn(column.heading)}
                  aria-expanded={isOpen}
                >
                  <span>{column.heading}</span>
                  <svg
                    className={styles.chevron}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                <div className={styles.columnLinks}>
                  {column.links.map((link) => (
                    <NavLink key={link.label} href={link.href} tone="light">
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.divider} />

        <div className={styles.bottom}>
          <Link href="/" aria-label="Abby's Table — home" className={styles.footLogo}>
            <Logo width={220} height={38} />
          </Link>

          <div className={styles.centre}>
            <span className={styles.signoff}>Abby x</span>
            <span className={styles.copyright}>© {COPYRIGHT_YEAR} Abby&apos;s Table</span>
          </div>

          <div className={styles.follow}>
            <span className={styles.followLabel}>Follow the table</span>
            <div className={styles.followRow}>
              <SocialIcons />
              <span className={styles.dash} aria-hidden="true">
                –
              </span>
              <a
                href="https://instagram.com/FromAbbysTable"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.handle}
              >
                {SOCIAL_HANDLE}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
