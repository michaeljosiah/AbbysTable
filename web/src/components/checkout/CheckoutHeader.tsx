'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Logo } from '@/components/brand/Logo';

import { HelpPanel } from './HelpPanel';
import styles from './CheckoutHeader.module.css';

/**
 * Checkout chrome: logo, progress stepper and a help entry point.
 *
 * Deliberately without the site nav — someone mid-order should not be one click
 * from wandering off. Steps 3-5 have no templates yet, so they render as
 * upcoming but do not link anywhere.
 */
export interface CheckoutStep {
  number: number;
  label: string;
  href?: string;
}

export const CHECKOUT_STEPS: CheckoutStep[] = [
  { number: 1, label: 'Choose box', href: '/box' },
  { number: 2, label: 'Add dishes', href: '/box/dishes' },
  { number: 3, label: 'Extras', href: '/box/extras' },
  { number: 4, label: 'Review', href: '/box/review' },
  { number: 5, label: 'Checkout' },
];

/**
 * Owns the help panel itself rather than taking an `onHelp` prop: the checkout
 * layout is a Server Component and cannot pass a function across that boundary.
 */
export function CheckoutHeader() {
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);

  const current =
    CHECKOUT_STEPS.filter((step) => step.href && pathname.startsWith(step.href)).sort(
      (a, b) => b.href!.length - a.href!.length,
    )[0] ?? CHECKOUT_STEPS[0];

  return (
    <header className={styles.header}>
      <div className={styles.row}>
        <Link href="/" aria-label="Abby's Table — home" className={styles.logoLink}>
          {/* Sized entirely from CSS so the ≤640px / ≤440px overrides apply. */}
          <Logo className={styles.logo} />
        </Link>

        <div className={styles.spacer} aria-hidden="true" />

        {/* Template geometry: fixed 74px step columns (circle above label) joined
            by flexible 2px lead lines that run through the circles' centres. The
            line lives inside each <li> so the list markup stays valid. */}
        <ol className={styles.stepper} aria-label="Order progress">
          {CHECKOUT_STEPS.map((step) => {
            const state =
              step.number < current.number
                ? 'done'
                : step.number === current.number
                  ? 'current'
                  : 'upcoming';
            return (
              <li
                key={step.number}
                className={styles.step}
                data-state={state}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                {step.number > 1 ? <span className={styles.lead} aria-hidden="true" /> : null}
                <span className={styles.col}>
                  <span className={styles.marker} aria-hidden="true">
                    {state === 'done' ? (
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--white)"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12.5l4.5 4.5L19 7" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </span>
                  <span className={styles.stepLabel}>{step.label}</span>
                </span>
              </li>
            );
          })}
        </ol>

        {/* Compact indicator: wraps to a full-width second header row ≤1080px. */}
        <div className={styles.mobileStepper}>
          <div className={styles.mobileText}>
            <span className={styles.mobileCount}>
              Step {current.number} of {CHECKOUT_STEPS.length}
            </span>
            <span className={styles.mobileLabel}>{current.label}</span>
          </div>
          <div className={styles.mobileTrack} aria-hidden="true">
            <span
              className={styles.mobileFill}
              style={{ width: `${(current.number / CHECKOUT_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className={styles.spacer} aria-hidden="true" />

        <button
          type="button"
          className={styles.help}
          onClick={() => setHelpOpen(true)}
          aria-label="Questions"
          aria-haspopup="dialog"
          aria-expanded={helpOpen}
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M9.6 9.2a2.4 2.4 0 0 1 4.6.9c0 1.6-2.2 2-2.2 3.4" />
            <circle cx="12" cy="17" r=".6" fill="currentColor" />
          </svg>
          <span className={styles.helpLabel}>Questions?</span>
        </button>
      </div>

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
    </header>
  );
}
