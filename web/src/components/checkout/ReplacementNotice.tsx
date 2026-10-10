'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useCart } from '@/lib/cart/CartProvider';
import { replacementsBody, replacementsTitle } from '@/lib/shopping-state';

import styles from './DriftNotices.module.css';

/** A removal turned away (another change is in flight) is asked again, briefly. */
const RETRY_MS = 400;
const TRIES_PER_ROUND = 6;
/** Rounds of those before it stops asking by itself and offers "Try again". */
const MAX_ROUNDS = 3;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * "Your box needs N replacement(s)" — Step 2, when dishes in the box are no
 * longer available (SHOPPING-STATE §5). The rest of the box is kept; the
 * customer chooses any N dishes to complete it, and the step's own CTA stays
 * unavailable until they have. From Checkout the line also says the checkout
 * details were kept (`?from=checkout`, set by the entry gate's redirect).
 *
 * Aonik keeps a flagged dish in the box — and counts it — until it is removed,
 * and refuses any add while one is there. So arriving here takes the
 * unavailable dishes out (they cannot be ordered either way) and the notice
 * remembers how many, until the box is whole again: the customer is then asked
 * for exactly the dishes it lost. A removal that cannot be made says so, with
 * "Try again" — never a request to add a dish Aonik would refuse.
 *
 * Known limit: Aonik flags every line of a dish when the demand across lines
 * exceeds its stock, though lowering a quantity could cure it. They are all
 * taken out, and the notice says they are no longer available.
 */
export function ReplacementNotice() {
  const { hydrated, shopping, unavailableDishes, removeLine } = useCart();
  const [fromCheckout, setFromCheckout] = useState(false);
  const [lost, setLost] = useState<{ count: number; names: string[] } | null>(null);
  const [stuck, setStuck] = useState(false);
  const handled = useRef(new Set<string>());
  const rounds = useRef(new Map<string, number>());
  const latest = useRef(unavailableDishes);
  latest.current = unavailableDishes;

  useEffect(() => {
    setFromCheckout(new URLSearchParams(window.location.search).get('from') === 'checkout');
  }, []);

  const takeOut = useCallback(
    async (lines: { lineId: string; name: string; quantity: number }[]) => {
      for (const line of lines) {
        rounds.current.set(line.lineId, (rounds.current.get(line.lineId) ?? 0) + 1);
        let done = false;
        for (let attempt = 0; attempt < TRIES_PER_ROUND && !done; attempt += 1) {
          // Gone already (another tab removed it): nothing to take out.
          if (!latest.current.some((current) => current.lineId === line.lineId)) {
            done = true;
            break;
          }
          try {
            await removeLine(line.lineId);
            done = true;
          } catch (failure) {
            if ((failure as { status?: number } | null)?.status === 404) done = true;
            else await wait(RETRY_MS);
          }
        }
        if (!done) {
          // Let a later change of the box (or "Try again") ask again, a few rounds at most.
          handled.current.delete(line.lineId);
          setStuck(true);
        }
      }
    },
    [removeLine],
  );

  useEffect(() => {
    if (!hydrated) return;
    const fresh = unavailableDishes.filter(
      (line) => !handled.current.has(line.lineId) && (rounds.current.get(line.lineId) ?? 0) < MAX_ROUNDS,
    );
    if (fresh.length === 0) return;
    for (const line of fresh) handled.current.add(line.lineId);
    setLost((current) => {
      const known = new Set(current?.names ?? []);
      const added = fresh.filter((line) => !known.has(line.name));
      return {
        count: (current?.count ?? 0) + added.reduce((total, line) => total + line.quantity, 0),
        names: [...(current?.names ?? []), ...added.map((line) => line.name)],
      };
    });
    void takeOut(fresh);
  }, [hydrated, unavailableDishes, takeOut]);

  // The box is whole again: nothing left to replace.
  useEffect(() => {
    if (lost && hydrated && shopping.complete) {
      setLost(null);
      setStuck(false);
    }
  }, [lost, hydrated, shopping.complete]);

  // Nothing flagged any more: a removal that had stuck has not.
  useEffect(() => {
    if (unavailableDishes.length === 0) setStuck(false);
  }, [unavailableDishes.length]);

  if (!hydrated || !lost) return null;

  // Never more than the box now lacks (a replacement chosen is one fewer to choose).
  const count = Math.min(lost.count, Math.max(1, shopping.missing));
  const tryAgain = () => {
    rounds.current.clear();
    setStuck(false);
    const lines = latest.current.filter((line) => !handled.current.has(line.lineId));
    for (const line of lines) handled.current.add(line.lineId);
    void takeOut(lines);
  };

  return (
    <div className={styles.list} role="status">
      <div className={styles.notice} data-blocking>
        <span className={styles.body}>
          <span className={styles.title}>{replacementsTitle(count)}</span>
          <span className={styles.detail}>{replacementsBody(count, lost.names, fromCheckout)}</span>
          {stuck && unavailableDishes.length > 0 ? (
            <span className={styles.detail}>
              We couldn’t take {unavailableDishes.length === 1 ? unavailableDishes[0].name : 'those dishes'} out of your box just now.{' '}
              <button type="button" className={styles.retry} onClick={tryAgain}>
                Try again
              </button>
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
