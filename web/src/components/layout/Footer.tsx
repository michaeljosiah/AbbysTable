'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useActionState, useEffect, useId, useRef, useState, type RefObject } from 'react';

import { Logo } from '@/components/brand/Logo';
import { SocialIcons } from '@/components/brand/SocialIcons';
import {
  COOKIE_PREFERENCES_ITEM,
  FOOTER_COLUMNS,
  PRIVACY_ITEM,
  SOCIAL_HANDLE,
  TERMS_ITEM,
} from '@/lib/content/navigation';
import { useMediaQuery } from '@/lib/dom/hooks';
import {
  NEWSLETTER_CONSENT_PATH,
  NEWSLETTER_EMAIL_FIELD,
  type NewsletterSignupAction,
  type NewsletterSignupState,
} from '@/lib/newsletter';
import { CONSENT_VERSION_FIELD, type SignupConsent } from '@/lib/signup/consent';
import { DESKTOP_QUERY } from '@/lib/site-header/visibility';
import { ariaCurrentFor } from '@/lib/site-header/state';

import styles from './Footer.module.css';

/** Matches the design. Bump with the brand's copyright line, not the clock. */
const COPYRIGHT_YEAR = 2026;

/**
 * The v2 site footer (Homepage v2 — canonical, approved mobile and desktop):
 * 2px brass rule, green-deep ground, 1280 shell. Three link columns —
 * accordions on a phone, all open from 1024 — then the wordmark, "Abby x",
 * the follow row (four icon links, @FromAbbysTable as plain text) and the
 * legal strip: © / Privacy Policy | Terms / Cookie preferences.
 *
 * The column heads are accordion BUTTONS below 1024 and plain LABELS from it
 * (design/CLAUDE.md): one heading per column, whose control is swapped for a
 * label at desktop so it leaves the tab order and announces no expanded state
 * for a list that is always open. Server-rendered as the phone version; the
 * desktop semantics follow on the client.
 *
 * "Join the table" renders only where it can really subscribe: the site chrome
 * passes `subscribeAction`, AND the tenant has published its newsletter list
 * in Aonik (michaeljosiah/aonik#357), whose consent wording the block shows
 * and whose version it posts. A form that thanks someone for joining while
 * saving nothing is a live-looking control that does nothing (#6).
 *
 * The published list is read from the BROWSER, once the footer mounts
 * (`useNewsletterConsent`): the chrome renders into every document — the root
 * 404 included — and must never await Aonik (tests/not-found-chrome.test.ts).
 * It asks only as the footer nears the viewport, so most page views never ask
 * at all, and the block is in place before the customer scrolls to it.
 * Without JavaScript it does not appear.
 */
export function Footer({ subscribeAction }: { subscribeAction?: NewsletterSignupAction }) {
  const pathname = usePathname();
  const footerRef = useRef<HTMLElement>(null);
  const consent = useNewsletterConsent(Boolean(subscribeAction), footerRef);
  const signup = subscribeAction && consent ? { action: subscribeAction, consent } : null;
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const idBase = useId();
  const [openColumns, setOpenColumns] = useState<Record<string, boolean>>({});

  const toggleColumn = (heading: string) =>
    setOpenColumns((current) => ({ ...current, [heading]: !current[heading] }));

  return (
    // The footer is on the purchase bar's named suppression list in its own
    // right — the page has ended — so it always carries the stop marker
    // (lib/purchase-bar/visibility.ts). Inert on pages without a bar. No id:
    // Contact has its own page now (`CONTACT_HREF`), so nothing jumps here.
    <footer ref={footerRef} className={styles.footer} data-purchase-bar-stop="">
      <div className={styles.brassRule} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.grid} data-signup={signup ? '' : undefined}>
          {signup ? <NewsletterSignup action={signup.action} consent={signup.consent} /> : null}

          <div className={styles.cols}>
            {FOOTER_COLUMNS.map((column, index) => {
              const isOpen = Boolean(openColumns[column.heading]);
              const listId = `${idBase}-footer-${index}`;
              return (
                <div key={column.heading} className={styles.col} data-open={isOpen || undefined}>
                  <h3 className={styles.headWrap}>
                    {desktop ? (
                      <span className={styles.head}>{column.heading}</span>
                    ) : (
                      <button
                        type="button"
                        className={styles.head}
                        onClick={() => toggleColumn(column.heading)}
                        aria-expanded={isOpen}
                        aria-controls={listId}
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
                          focusable="false"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                    )}
                  </h3>

                  <div id={listId} className={styles.links}>
                    {column.links.map((link) => (
                      <Link
                        key={link.label}
                        href={link.href}
                        className={styles.link}
                        aria-current={ariaCurrentFor(pathname, link.href)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop only: on a phone the accordion group's own bottom border
            closes the block. */}
        <div className={styles.divider} aria-hidden="true" />

        {/* DOM order is the visual order at every width — wordmark, signature,
            follow — so focus never runs backwards (WCAG 2.4.3). */}
        <div className={styles.bottom}>
          <Link href="/" aria-label="Abby's Table — home" className={styles.footLogo}>
            {/* No ® on the wordmark anywhere on the site. */}
            <Logo withRegistered={false} />
          </Link>

          {/* 25px: terracotta on green-deep clears 3:1 only as large text. */}
          <span className={styles.signoff}>Abby x</span>

          <div className={styles.follow}>
            <span className={styles.followLabel}>Follow the table</span>
            <div className={styles.followRow}>
              <SocialIcons size={18} className={styles.social} />
              <span className={styles.dash} aria-hidden="true">
                –
              </span>
              {/* Plain text, not a link: the four icons already reach the
                  accounts, so a fifth route to the same place is redundant. */}
              <span className={styles.handle}>{SOCIAL_HANDLE}</span>
            </div>
          </div>
        </div>

        <div className={styles.legal}>
          <span className={styles.copyright}>
            © {COPYRIGHT_YEAR} Abby&rsquo;s Table
          </span>
          <div className={styles.legalRow}>
            <Link
              href={PRIVACY_ITEM.href}
              className={styles.legalLink}
              aria-current={ariaCurrentFor(pathname, PRIVACY_ITEM.href)}
            >
              {PRIVACY_ITEM.label}
            </Link>
            <span className={styles.legalSep} aria-hidden="true">
              |
            </span>
            <Link
              href={TERMS_ITEM.href}
              className={styles.legalLink}
              aria-current={ariaCurrentFor(pathname, TERMS_ITEM.href)}
            >
              {TERMS_ITEM.label}
            </Link>
          </div>
          {/* The canonical consent trigger (design/build-handoff.md §3s): a real
              link to the Privacy cookie section, which the consent manager
              enhances into the preferences panel. */}
          <Link href={COOKIE_PREFERENCES_ITEM.href} className={styles.legalLink} data-consent-open>
            {COOKIE_PREFERENCES_ITEM.label}
          </Link>
        </div>
      </div>
    </footer>
  );
}

/** The published newsletter consent out of `/api/newsletter`'s answer, or null. */
export function readConsent(body: unknown): SignupConsent | null {
  const consent = (body as { consent?: { text?: unknown; version?: unknown } } | null)?.consent;
  return typeof consent?.text === 'string' && consent.text && typeof consent.version === 'string' && consent.version
    ? { text: consent.text, version: consent.version }
    : null;
}

/** How far below the viewport the footer is when it asks for the list. */
const ASK_WITHIN = '600px 0px';

/**
 * Asks this server for the newsletter list's consent once the footer comes
 * within `ASK_WITHIN` of the viewport, once per mount — the footer stays
 * mounted across client navigations, so at most once per page load. Anything
 * but a well-formed answer leaves the block out.
 */
function useNewsletterConsent(wanted: boolean, footer: RefObject<HTMLElement | null>): SignupConsent | null {
  const [consent, setConsent] = useState<SignupConsent | null>(null);

  useEffect(() => {
    const element = footer.current;
    if (!wanted || !element) return;
    const controller = new AbortController();
    const ask = () =>
      fetch(NEWSLETTER_CONSENT_PATH, { cache: 'no-store', signal: controller.signal })
        // The body is read either way: one left unread holds the request open.
        .then(async (response) => {
          const body: unknown = await response.json().catch(() => null);
          return response.ok ? body : null;
        })
        .then((body) => setConsent(readConsent(body)))
        .catch(() => {
          // Aborted, offline or unpublished: no block, which is the safe answer.
        });

    if (typeof IntersectionObserver !== 'function') {
      void ask();
      return () => controller.abort();
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void ask();
      },
      { rootMargin: ASK_WITHIN },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [wanted, footer]);

  return consent;
}

/**
 * The "Join the table" signup. Its own component so the action state hook runs
 * only when there is an action to run.
 *
 * Posts through `useActionState` like the auth forms, so the email travels in
 * a POST body, never a URL. The field is controlled: a resolved form action
 * resets uncontrolled fields, which would blank the address beside its error.
 */
export function NewsletterSignup({ action, consent }: { action: NewsletterSignupAction; consent: SignupConsent }) {
  const [state, formAction, isPending] = useActionState<NewsletterSignupState, FormData>(action, {
    status: 'idle',
  });
  const inputId = useId();
  const [email, setEmail] = useState('');

  return (
    <div className={styles.news}>
      <p className={styles.newsLabel}>Join the table</p>
      <p className={styles.newsCopy}>Kitchen notes and offers from Abby, monthly.</p>

      {state.status === 'joined' ? (
        <p className={styles.thanks} role="status">
          Thank you for joining the table.
        </p>
      ) : (
        <>
          <form className={styles.form} action={formAction} aria-busy={isPending || undefined}>
            <label htmlFor={inputId} className="visuallyHidden">
              Email address
            </label>
            <input
              id={inputId}
              name={NEWSLETTER_EMAIL_FIELD}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={state.status === 'error' || undefined}
              aria-describedby={state.status === 'error' ? `${inputId}-error` : undefined}
              placeholder="Enter your email address"
              className={styles.input}
            />
            {/* The wording shown below, by version — what the sign-up agrees to. */}
            <input type="hidden" name={CONSENT_VERSION_FIELD} value={consent.version} />
            <button type="submit" className={styles.join} disabled={isPending}>
              {isPending ? 'Joining…' : 'Join'}
            </button>
          </form>
          {state.status === 'error' ? (
            <p id={`${inputId}-error`} className={styles.error} role="alert">
              {state.message ?? 'We couldn’t add you just now. Please try again.'}
            </p>
          ) : null}
          {/* The design's line is "We use your email for kitchen notes and
              offers only. Unsubscribe any time. See our Privacy Policy." — all
              but the last sentence is the list's published wording. */}
          <p className={styles.consent}>
            {consent.text} See our{' '}
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
