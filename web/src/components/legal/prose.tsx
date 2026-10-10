import Link from 'next/link';
import type { ReactNode } from 'react';

import { CONSENT_PANEL_ID } from '@/lib/consent/consent';

import styles from './LegalDocument.module.css';

export { Tbc } from './Tbc';
export {
  CompanyEmail,
  CompanyName,
  CompanyNumber,
  CompanyPhone,
  PaymentProvider,
  RegisteredAddress,
  RegisteredOffice,
} from './company';

/*
 * The building blocks of a legal document's copy. Server components: the
 * clause bodies are literal markup (the copy is under legal review, so
 * editability matters more than cleverness — build-handoff.md), and these keep
 * that markup to words rather than styling.
 *
 * Plain <p>, <ul>, <ol>, <li> and <strong> need no component: a section styles
 * them itself (`.docSection`).
 *
 * The company details are the exception (`./company`): client components, as
 * the bodies are module-level markup that cannot take the request's details
 * as props, so they read them from `CompanyProvider`.
 */

/** Terms: a 13px caps label heading a sub-part of a clause. */
export function LabelHeading({ children }: { children: ReactNode }) {
  return <h4 className={styles.labelHeading}>{children}</h4>;
}

/** Privacy: a 16px semibold sub-head inside a section. */
export function Subhead({ children }: { children: ReactNode }) {
  return <h4 className={styles.subhead}>{children}</h4>;
}

/** Privacy: a display-face minor head, one level below `Subhead`. */
export function MinorHead({ children }: { children: ReactNode }) {
  return <h5 className={styles.minorHead}>{children}</h5>;
}

/** A blush panel for the one instruction in a clause that must not be missed. */
export function Note({ children }: { children: ReactNode }) {
  return <p className={styles.note}>{children}</p>;
}

/** A link to another part of the same document: a real fragment link, so it works without JavaScript. */
export function DocLink({ href, children }: { href: `#${string}`; children: ReactNode }) {
  return (
    <a href={href} className={styles.link}>
      {children}
    </a>
  );
}

/** A link to another page of the site, through `next/link`. */
export function SiteLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.link}>
      {children}
    </Link>
  );
}

/**
 * An outbound link as a 52px outline CTA (the ICO). Opens in a new tab; on
 * paper its address is printed after it.
 */
export function OutlineLinkCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <div className={styles.ctaRow}>
      <a href={href} className={styles.cta} target="_blank" rel="noopener noreferrer">
        <span>{children}</span>
      </a>
    </div>
  );
}

/**
 * Privacy section 7's consent trigger: a BUTTON, not a link — a link to the
 * section it already sits in would be meaningless, so it has no fallback
 * destination. The site-wide consent manager opens its preferences panel from
 * any `[data-consent-open]` element (build-handoff.md §3s), so no handler is
 * needed here; and since nothing can happen without the manager, the button
 * and its lead-in stay hidden until the manager marks itself ready.
 * Outline, not filled: a utility action, not the page's main call.
 *
 * It names the panel it discloses (`aria-controls`), and the manager keeps its
 * `aria-expanded` in step with the panel.
 */
export function CookiePreferences() {
  return (
    <div className={styles.prefs}>
      <p>You can review or change your choices at any time:</p>
      <div className={styles.ctaRow}>
        <button
          type="button"
          className={styles.cta}
          data-consent-open
          aria-controls={CONSENT_PANEL_ID}
          aria-expanded="false"
        >
          <span>Cookie preferences</span>
        </button>
      </div>
    </div>
  );
}

/** A panel standing in for content that is not published yet (Privacy section 7's cookie list). */
export function PendingPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.audit}>
      <p className={styles.auditTitle}>{title}</p>
      {children}
    </div>
  );
}

/** Terms clause 4: each standard stated in words beside an in-house glyph (aria-hidden). */
export function StandardsList({
  items,
}: {
  items: ReadonlyArray<{ label: string; glyph: ReactNode }>;
}) {
  return (
    <div className={styles.standards}>
      {items.map((item) => (
        <div key={item.label} className={styles.standard}>
          <svg
            className={styles.standardGlyph}
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {item.glyph}
          </svg>
          <p>{item.label}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Name-value panels.
 *  - `sand`    Terms clause 1, the registered details: semibold labels.
 *  - `outline` Terms clause 39, how to complain: 13px caps labels.
 *  - `plain`   Privacy: no ground, values in the display face.
 */
export function InfoGrid({
  variant,
  children,
}: {
  variant: 'sand' | 'outline' | 'plain';
  children: ReactNode;
}) {
  return (
    <div className={styles.info} data-variant={variant}>
      {children}
    </div>
  );
}

export function InfoItem({
  label,
  labelTone,
  children,
}: {
  label: ReactNode;
  /** The complaints panel's "Online" label is brass-ink in the design; the rest are brown. */
  labelTone?: 'brass';
  children: ReactNode;
}) {
  return (
    <div>
      <p className={styles.infoLabel} data-tone={labelTone}>
        {label}
      </p>
      {children}
    </div>
  );
}

export function InfoValue({ children }: { children: ReactNode }) {
  return <p className={styles.infoValue}>{children}</p>;
}

/**
 * A one-name-one-value table as a definition list: it reflows to a single
 * column on a phone without a per-cell label. The column head is decorative and
 * `aria-hidden` — a `dl` already conveys the relationship.
 */
export function DefinitionList({
  head,
  children,
}: {
  head: readonly [string, string];
  children: ReactNode;
}) {
  // The head sits beside the <dl>, not in it: a <dl>'s div children may only
  // group dt/dd pairs.
  return (
    <div className={styles.dl}>
      <div className={styles.dlHead} aria-hidden="true">
        <span>{head[0]}</span>
        <span>{head[1]}</span>
      </div>
      <dl className={styles.dlList}>{children}</dl>
    </div>
  );
}

export function Row({ term, children }: { term: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}
