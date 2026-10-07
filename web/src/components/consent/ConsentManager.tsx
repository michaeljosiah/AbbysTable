'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import {
  ALL_ACCEPTED,
  CONSENT_STORAGE_KEY,
  consentStore,
  ESSENTIAL_ONLY,
  needsBanner,
  type ConsentCategory,
  type ConsentChoices,
} from '@/lib/consent/consent';
import { useConsent } from '@/lib/consent/useConsent';
import { PRIVACY_COOKIES_HREF } from '@/lib/content/navigation';

import styles from './ConsentManager.module.css';

/**
 * The cookie consent manager: ONE component, mounted once in the root layout,
 * so it covers every route group. Never mount it per page or copy it.
 *
 * Contract: design/build-handoff.md §3s; canonical design (copy, structure,
 * behaviour): `design/Abby's Table - Privacy Policy.dc.html`.
 *
 * - **Banner** — whenever no valid choice is stored. A non-modal region that
 *   never takes focus on load, with no dismiss: choosing is the only way past.
 * - **Preferences panel** — a modal dialog with the four fixed categories,
 *   opened from the banner or from any `[data-consent-open]` trigger. Focus
 *   moves in, is trapped, Escape closes, the page behind is scroll-locked, and
 *   focus returns to the opener (the page h1 when the opener has gone).
 *   Closing without choosing brings the banner back.
 *
 * This component only RECORDS the choice. The gate every tag goes through is
 * `ConsentGate` / `onConsent` (`@/lib/consent/consent`), which reads the same
 * store, so a withdrawal here stops processing without a reload.
 *
 * Fail-safe: anything that goes wrong — unreadable storage, a manager that
 * throws before it is ready — leaves the site on essential processing only,
 * and the footer triggers behave as the plain links they are.
 */
export function ConsentManager() {
  return (
    <ConsentBoundary>
      <ConsentLayer />
    </ConsentBoundary>
  );
}

/** The only selector the manager binds — never an href, never a label. */
const TRIGGER_SELECTOR = '[data-consent-open]';
const PANEL_ID = 'consent-panel';
const TITLE_ID = 'consent-title';

/** The three optional rows. Copy verbatim from the canonical design; categories match Privacy section 7. */
const OPTIONAL_ROWS: ReadonlyArray<{ category: ConsentCategory; title: string; description: string }> = [
  {
    category: 'preferences',
    title: 'Preferences',
    description: 'Remember optional choices you make, so the site can be more convenient to use.',
  },
  {
    category: 'analytics',
    title: 'Analytics',
    description: 'Help us understand which pages are visited and where the site is difficult to use.',
  },
  {
    category: 'advertising',
    title: 'Advertising and measurement',
    description: 'Help us measure whether our advertising works, and personalise it where permitted.',
  },
];

function ConsentLayer() {
  const consent = useConsent();
  const pathname = usePathname();

  const [panelOpen, setPanelOpen] = useState(false);
  /** The panel's switches. Seeded from what applies now each time it opens. */
  const [draft, setDraft] = useState<ConsentChoices>(ESSENTIAL_ONLY);
  /** True once the delegated trigger listener is bound. */
  const [ready, setReady] = useState(false);

  const bannerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /** The control that opened the panel, so focus can go back to it. */
  const openerRef = useRef<HTMLElement | null>(null);
  /** Set by a user action that closes the layer; acted on once the DOM has updated. */
  const focusReturnRef = useRef<{ target: HTMLElement | null } | null>(null);

  const bannerOn = needsBanner(consent) && !panelOpen;
  const layer = panelOpen ? 'panel' : bannerOn ? 'banner' : null;

  const openPanel = useCallback((opener: HTMLElement | null) => {
    openerRef.current = opener;
    setDraft(consentStore.getSnapshot().choices);
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    focusReturnRef.current = { target: openerRef.current };
    setPanelOpen(false);
  }, []);

  const resolve = (choices: ConsentChoices) => {
    // From the panel, back to its opener; from the banner, whose buttons are
    // about to disappear, to the page heading — never left on <body>.
    focusReturnRef.current = { target: panelOpen ? openerRef.current : null };
    consentStore.choose(choices);
    setPanelOpen(false);
  };

  // Initialise, then bind the ONE delegated trigger listener as the last step.
  // If anything before that throws there is no listener at all, and every
  // trigger stays an ordinary link to the Privacy cookie section.
  useEffect(() => {
    let bound = false;

    const onTriggerClick = (event: MouseEvent) => {
      // Never intercept modified or non-primary clicks: opening Cookie
      // preferences in a new tab must give the reader the Privacy section.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest<HTMLElement>(TRIGGER_SELECTOR);
      if (!trigger) return;

      // Open FIRST and suppress the navigation only on a genuine success.
      // Synchronous by construction: the panel is always mounted, so opening is
      // a state flip with nothing to load.
      let opened = false;
      try {
        if (panelRef.current) {
          openPanel(trigger);
          opened = true;
        }
      } catch {
        opened = false;
      }
      if (opened) event.preventDefault();
    };

    // Another tab changed the choice: re-read, so a withdrawal there applies here.
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CONSENT_STORAGE_KEY) consentStore.init();
    };

    try {
      consentStore.init();
      window.addEventListener('storage', onStorage);
      // Capture phase, so the panel opens before next/link's own click handler
      // runs — it sees the prevented default and does not navigate.
      document.addEventListener('click', onTriggerClick, true);
      bound = true;
      setReady(true);
    } catch (error) {
      console.error('[consent] the consent manager could not initialise; essential only', error);
    }

    return () => {
      window.removeEventListener('storage', onStorage);
      if (bound) document.removeEventListener('click', onTriggerClick, true);
    };
  }, [openPanel]);

  // Announce readiness on <html>. A trigger with no fallback destination —
  // Privacy section 7's "Cookie preferences" button — stays hidden until a
  // click on it can really open the panel. Cleared if the manager unmounts
  // (or its boundary catches a failure), so the button never outlives it.
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.setAttribute('data-consent-ready', '');
    return () => root.removeAttribute('data-consent-ready');
  }, [ready]);

  // ARIA follows behaviour: a trigger is announced as opening a dialog only
  // once one genuinely opens. Re-applied per route, since each route group
  // renders its own footer.
  useEffect(() => {
    if (!ready) return;
    document.querySelectorAll(TRIGGER_SELECTOR).forEach((trigger) => {
      trigger.setAttribute('aria-haspopup', 'dialog');
    });
  }, [ready, pathname]);

  // The layer persists across client navigation; a page change closes the panel.
  const lastPathname = useRef(pathname);
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    focusReturnRef.current = null;
    setPanelOpen(false);
  }, [pathname]);

  // Tell the rest of the page the consent layer is up: globals.css suppresses
  // the purchase bars and ↑ Top while it is (they are bottom-fixed too).
  useEffect(() => {
    if (!layer) return;
    const root = document.documentElement;
    root.setAttribute('data-consent-layer', layer);
    return () => root.removeAttribute('data-consent-layer');
  }, [layer]);

  // The banner's measured height, so the end of the page can still scroll
  // clear of it and focus is never scrolled in behind it (globals.css).
  useEffect(() => {
    const banner = bannerRef.current;
    if (!bannerOn || !banner) return;
    const root = document.documentElement;
    const apply = () => root.style.setProperty('--consent-banner-h', `${banner.offsetHeight}px`);
    apply();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply);
    observer?.observe(banner);
    return () => {
      observer?.disconnect();
      root.style.removeProperty('--consent-banner-h');
    };
  }, [bannerOn]);

  // While the panel is open: focus in, body scroll locked, Escape closes, Tab trapped.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panelOpen || !panel) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // The dialog itself, not its first control: a titled dialog lets a screen
    // reader announce name and role first, and a programmatic focus on the
    // close button would paint a ring on open.
    panel.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePanel();
      } else if (event.key === 'Tab') {
        trapFocus(event, panel);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [panelOpen, closePanel]);

  // Focus return runs after the commit, so a banner that has just come back is
  // already visible and focusable.
  useEffect(() => {
    const pending = focusReturnRef.current;
    if (!pending || panelOpen) return;
    focusReturnRef.current = null;
    returnFocus(pending.target);
  }, [panelOpen, consent]);

  const toggle = (category: ConsentCategory) =>
    setDraft((current) => ({ ...current, [category]: !current[category] }));

  return (
    <>
      <div className={styles.bannerWrap} data-on={bannerOn || undefined}>
        <section ref={bannerRef} className={styles.banner} role="region" aria-label="Cookie choices">
          <div className={styles.bannerInner}>
            <p className={styles.title}>Cookies on Abby&#8217;s Table</p>
            <p className={styles.copy}>
              We use essential cookies to make the site work. We would also like to set optional
              cookies for preferences, analytics and advertising. Nothing optional is set until you
              choose.
            </p>
            <div className={`${styles.actions} ${styles.bannerActions}`}>
              <div className={styles.pair}>
                {/* Accept is filled, Required only outline — a recorded decision. The two are
                    identical boxes and Required only comes first in DOM and visual order. */}
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnOutline}`}
                  onClick={() => resolve(ESSENTIAL_ONLY)}
                >
                  Required only
                </button>
                <button type="button" className={styles.btn} onClick={() => resolve(ALL_ACCEPTED)}>
                  Accept all
                </button>
              </div>
              <button
                type="button"
                className={styles.link}
                onClick={(event) => openPanel(event.currentTarget)}
                aria-expanded={panelOpen}
                aria-controls={PANEL_ID}
              >
                <span>Manage preferences</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className={styles.panelWrap} data-open={panelOpen || undefined}>
        <div className={styles.scrim} onClick={closePanel} aria-hidden="true" />
        <div
          ref={panelRef}
          id={PANEL_ID}
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={TITLE_ID}
          tabIndex={-1}
        >
          <div className={styles.panelHead}>
            <p id={TITLE_ID} className={styles.title}>
              Cookie preferences
            </p>
            <button type="button" className={styles.close} onClick={closePanel} aria-label="Close cookie preferences">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <p className={styles.copy}>
            Choose which optional cookies Abby&#8217;s Table may use. You can change this at any time.
          </p>

          <div className={styles.rows}>
            <div className={styles.row}>
              <p className={styles.rowTitle}>Essential</p>
              <p className={styles.rowDesc}>
                Needed for security, login, your basket, checkout, fraud prevention and remembering
                your cookie choices.
              </p>
              <span className={styles.always}>Always on</span>
            </div>
            {OPTIONAL_ROWS.map((row) => {
              const labelId = `consent-label-${row.category}`;
              return (
                <div key={row.category} className={styles.row}>
                  <p id={labelId} className={styles.rowTitle}>
                    {row.title}
                  </p>
                  <p className={styles.rowDesc}>{row.description}</p>
                  <button
                    type="button"
                    role="switch"
                    className={styles.switch}
                    aria-checked={draft[row.category]}
                    aria-labelledby={labelId}
                    onClick={() => toggle(row.category)}
                  >
                    <span className={styles.track} aria-hidden="true">
                      <span className={styles.knob} />
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Providers, cookie names and durations are a launch dependency (the
              cookie audit) — never invented here. */}
          <p className={styles.note}>
            The individual cookies, providers and durations in each category are{' '}
            <span className={styles.tbc}>to be confirmed</span> before launch, and will be listed in{' '}
            <Link
              href={PRIVACY_COOKIES_HREF}
              className={styles.xref}
              onClick={() => {
                focusReturnRef.current = null;
                setPanelOpen(false);
              }}
            >
              section 7
            </Link>
            .
          </p>

          <div className={`${styles.actions} ${styles.panelActions}`}>
            <button type="button" className={styles.btn} onClick={() => resolve(draft)}>
              Save my choices
            </button>
            <div className={styles.pair}>
              {/* Both outline inside the panel: Save my choices is the primary here. */}
              <button
                type="button"
                className={`${styles.btn} ${styles.btnOutline}`}
                onClick={() => resolve(ESSENTIAL_ONLY)}
              >
                Required only
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnOutline}`}
                onClick={() => resolve(ALL_ACCEPTED)}
              >
                Accept all
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Keeps Tab and Shift+Tab inside the open panel. */
function trapFocus(event: KeyboardEvent, panel: HTMLElement) {
  const controls = Array.from(panel.querySelectorAll<HTMLElement>('button, a[href]')).filter(
    (element) => element.getClientRects().length > 0,
  );
  if (controls.length === 0) {
    event.preventDefault();
    return;
  }

  const first = controls[0];
  const last = controls[controls.length - 1];
  const active = document.activeElement;

  // Focus on the dialog itself (where it lands on open) or somewhere outside it.
  if (active === panel || !panel.contains(active)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return;
  }
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Back to the control that opened the layer while it is still on screen;
 * otherwise to the page h1 as a reading start (the normal case after the
 * banner resolves, since its buttons go with it).
 */
function returnFocus(target: HTMLElement | null) {
  if (
    target &&
    target.isConnected &&
    target.getClientRects().length > 0 &&
    getComputedStyle(target).visibility !== 'hidden'
  ) {
    target.focus();
    return;
  }
  const heading = document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('h1');
  if (!heading) return;
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
}

/**
 * A manager that crashes renders nothing rather than taking the page down with
 * it. The site then stays on essential processing (gates read the store, which
 * never becomes `resolved` without a stored choice) and the triggers are links.
 */
class ConsentBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[consent] the consent manager failed; essential only', error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
