'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import {
  CHECKOUT_STILL_OPEN,
  checkoutReturnGateScript,
  isFromCheckout,
  reachableCheckout,
} from '@/lib/legal/checkoutReturn';

import styles from './CheckoutReturn.module.css';

const GATE_ID = 'legal-checkout-return';

/**
 * How long after asking the browser to switch tabs the page looks to see
 * whether it did: a switch hides this tab (or, across windows, takes its focus).
 */
const SWITCH_CHECK_MS = 300;

/**
 * "← Back to checkout", above a legal document's h1, for a tab that checkout's
 * legal line opened (`?from=checkout`). The rules are in
 * `lib/legal/checkoutReturn.ts`; this is the page's end of them.
 *
 * The server renders it HIDDEN on every visit — the page is static, and only
 * the URL in the browser says where it was opened from:
 *  - on a full page load the inline gate script reveals it before first paint
 *    (`suppressHydrationWarning` covers the `hidden` it may already have
 *    cleared, on this element only);
 *  - after a client-side navigation, or Back/Forward between entries of the
 *    page, the layout effect makes the same check, still before paint.
 * With JavaScript off it never shows. Either way it is there from the first
 * frame or not at all — no layout shift.
 *
 * It is a button, not a link: it never navigates, so it can never open a
 * second checkout. It focuses the checkout tab where the browser allows, and
 * otherwise stays and says that checkout is still open in the previous tab.
 */
export function CheckoutReturn() {
  const [fromCheckout, setFromCheckout] = useState(false);
  const [note, setNote] = useState('');
  const checkTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useLayoutEffect(() => {
    const read = () => setFromCheckout(isFromCheckout(window.location.search));
    read();
    window.addEventListener('popstate', read);
    return () => {
      window.removeEventListener('popstate', read);
      clearTimeout(checkTimer.current);
    };
  }, []);

  const goBack = () => {
    clearTimeout(checkTimer.current);
    // Cleared first, so a second press is announced again.
    setNote('');
    const checkout = reachableCheckout(window.opener, window.location.origin);
    if (checkout) {
      try {
        checkout.focus();
      } catch {
        // Refused: the check below says so.
      }
    }
    // Whether the browser switched is only knowable afterwards: a switch hides
    // this tab (or takes its focus). If it is still in front, say where
    // checkout is — never close this tab, never open another checkout.
    checkTimer.current = setTimeout(
      () => {
        if (document.visibilityState === 'visible' && document.hasFocus()) {
          setNote(CHECKOUT_STILL_OPEN);
        }
      },
      checkout ? SWITCH_CHECK_MS : 0,
    );
  };

  return (
    <>
      <div id={GATE_ID} className={styles.row} hidden={!fromCheckout} suppressHydrationWarning>
        <button type="button" className={styles.back} onClick={goBack}>
          <span aria-hidden="true">&#8592;</span>
          <span>Back to checkout</span>
        </button>
        <p className={styles.note} role="status" aria-live="polite">
          {note}
        </p>
      </div>
      <script dangerouslySetInnerHTML={{ __html: checkoutReturnGateScript(GATE_ID) }} />
    </>
  );
}
