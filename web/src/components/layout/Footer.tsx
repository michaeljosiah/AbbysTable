'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

import { Logo } from '@/components/brand/Logo';
import { SocialIcons } from '@/components/brand/SocialIcons';
import { Eyebrow, NavLink } from '@/components/ui';
import {
  COOKIE_PREFERENCES_ITEM,
  FOOTER_COLUMNS,
  PRIVACY_ITEM,
  TERMS_ITEM,
  SOCIAL_HANDLE,
} from '@/lib/content/navigation';
import type { NewsletterSignupAction, NewsletterSignupState } from '@/lib/newsletter';

import styles from './Footer.module.css';

/** Matches the template. Bump with the brand's copyright line, not the clock. */
const COPYRIGHT_YEAR = 2026;

/**
 * Site footer: newsletter signup, link columns and the follow row.
 *
 * The signup renders only when `subscribeAction` is supplied, and nothing
 * supplies it yet: Aonik has no endpoint to store a subscription
 * (michaeljosiah/aonik#357). A form that thanks someone for joining while
 * saving nothing is a live-looking control that does nothing, so the whole
 * "Join the table" block stays out of the page until a server action can
 * really subscribe.
 *
 * Wiring it means passing that server action from the site layout (contract in
 * `@/lib/newsletter`). The consent line's Privacy Policy link (`PRIVACY_ITEM`)
 * already points at the real policy page.
 */
export function Footer({ subscribeAction }: { subscribeAction?: NewsletterSignupAction }) {
  const [openColumns, setOpenColumns] = useState<Record<string, boolean>>({});

  const toggleColumn = (heading: string) =>
    setOpenColumns((current) => ({ ...current, [heading]: !current[heading] }));

  return (
    <footer id="contact" className={styles.footer}>
      <div className={styles.brassRule} />

      <div className={`band band--frame ${styles.inner}`}>
        <div className={styles.grid} data-signup={subscribeAction ? true : undefined}>
          {subscribeAction ? <NewsletterSignup action={subscribeAction} /> : null}

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
            {/* No ® here: Esther asked for it dropped, a deliberate departure
                from the template, which does show one. */}
            <Logo width={220} height={38} withRegistered={false} />
          </Link>

          <div className={styles.centre}>
            <span className={styles.signoff}>Abby x</span>
            <span className={styles.copyright}>© {COPYRIGHT_YEAR} Abby&apos;s Table</span>
            {/* Homepage v2's legal strip: the two documents, then the consent
                trigger. The rest of the v2 footer is #10. */}
            <div className={styles.legalRow}>
              <Link href={PRIVACY_ITEM.href} className={styles.cookieLink}>
                {PRIVACY_ITEM.label}
              </Link>
              <span className={styles.legalSep} aria-hidden="true">
                |
              </span>
              <Link href={TERMS_ITEM.href} className={styles.cookieLink}>
                {TERMS_ITEM.label}
              </Link>
            </div>
            {/* The canonical consent trigger (design/build-handoff.md §3s): a real
                link that the consent manager enhances into the preferences panel. */}
            <Link href={COOKIE_PREFERENCES_ITEM.href} className={styles.cookieLink} data-consent-open>
              {COOKIE_PREFERENCES_ITEM.label}
            </Link>
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

/**
 * The "Join the table" signup. Its own component so the action state hook runs
 * only when there is an action to run.
 *
 * Posts through `useActionState` like the auth forms, so a submit before
 * hydration is still a POST to the server action rather than a GET that would
 * put the email in the URL.
 */
function NewsletterSignup({ action }: { action: NewsletterSignupAction }) {
  const [state, formAction, isPending] = useActionState<NewsletterSignupState, FormData>(action, {
    status: 'idle',
  });

  return (
    <div className={styles.news}>
      <Eyebrow tone="brass">Join the table</Eyebrow>
      <p className={styles.newsCopy}>Kitchen notes and offers from Abby monthly.</p>

      {state.status === 'joined' ? (
        <p className={styles.thanks} role="status">
          Thank you for joining the table.
        </p>
      ) : (
        <>
          <form className={styles.form} action={formAction} aria-busy={isPending || undefined}>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              aria-label="Email address"
              aria-invalid={state.status === 'error' || undefined}
              aria-describedby={state.status === 'error' ? 'newsletter-error' : undefined}
              placeholder="Enter your email address"
              className={styles.input}
            />
            <button type="submit" className={styles.join} disabled={isPending}>
              {isPending ? 'Joining…' : 'Join'}
            </button>
          </form>
          {state.status === 'error' ? (
            <p id="newsletter-error" className={styles.error} role="alert">
              {state.message ?? 'We couldn’t add you just now. Please try again.'}
            </p>
          ) : null}
          <p className={styles.consent}>
            We use your email for kitchen notes and offers only. Unsubscribe any time. See our{' '}
            <Link href={PRIVACY_ITEM.href} className={styles.consentLink}>
              {PRIVACY_ITEM.label}
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}
