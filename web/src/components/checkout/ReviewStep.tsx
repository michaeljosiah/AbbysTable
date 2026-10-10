'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { MappedOptionGroup } from '@/lib/aonik/map';
import type {
  BoxPricing,
  Dish,
  Extra,
  HeatingInstruction,
} from '@/lib/aonik/types';
import { useCart } from '@/lib/cart/CartProvider';
import { FlowActions } from './FlowActions';
import { FlowShell } from './FlowShell';
import { DishLines, ExtraLines } from './FlowLines';
import { ReviewChangeLink } from './ReviewReturn';
import { useStepGuard } from './useStepGuard';
import styles from './Flow.module.css';

interface ReviewStepProps {
  dishes: Dish[];
  extras: Extra[];
  pricing: BoxPricing;
  optionGroupsBySlug: Record<string, MappedOptionGroup[]>;
  heating: HeatingInstruction[];
  earliestDeliveryLabel: string | null;
  heading: ReactNode;
}
export function ReviewStep(props: ReviewStepProps) {
  return (
    <FlowActions>
      <Review {...props} />
    </FlowActions>
  );
}
function Review({
  dishes,
  extras,
  pricing,
  optionGroupsBySlug,
  heading,
}: ReviewStepProps) {
  const cart = useCart();
  const guard = useStepGuard('review');
  const gateRun = useRef(false);
  const [gate, setGate] = useState(cart.isServerCart ? 'idle' : 'ready');
  const runGate = useCallback(async () => {
    if (cart.pending) return;
    if (cart.ordered) {
      setGate('ready');
      return;
    }
    setGate('pending');
    try {
      await cart.revalidate();
      setGate('ready');
    } catch {
      setGate('failed');
    }
  }, [cart]);
  useEffect(() => {
    if (
      cart.isServerCart &&
      cart.hydrated &&
      !guard.blocked &&
      !gateRun.current
    ) {
      gateRun.current = true;
      void runGate();
    }
  }, [cart.isServerCart, cart.hydrated, guard.blocked, runGate]);
  const latest = useRef(cart);
  useEffect(() => {
    latest.current = cart;
  });
  useEffect(() => {
    const focus = () => {
      const section =
        new URLSearchParams(window.location.search).get('edited') ??
        history.state?.atReviewEdited;
      if (section !== 'dishes' && section !== 'extras') return;
      const heading = document.getElementById(`review-${section}`);
      if (!heading) return;
      const bounds = heading.getBoundingClientRect();
      heading.focus({
        preventScroll: bounds.top >= 0 && bounds.bottom <= window.innerHeight,
      });
    };
    const show = async (event: PageTransitionEvent) => {
      if (event.persisted) {
        await latest.current.refresh().catch(() => undefined);
        focus();
      }
    };
    focus();
    window.addEventListener('pageshow', show);
    return () => window.removeEventListener('pageshow', show);
  }, []);
  return (
    <FlowShell
      step="review"
      pricing={pricing}
      dishes={dishes}
      extras={extras}
      groups={optionGroupsBySlug}
      blocked={guard.blocked || (cart.isServerCart && gate !== 'ready')}
    >
      {heading}
      {gate === 'pending' && <p role="status">Checking your box…</p>}
      {gate === 'failed' && (
        <p role="alert">
          We couldn’t check your box.{' '}
          <button
            type="button"
            className={styles.textButton}
            onClick={() => void runGate()}
          >
            Try again
          </button>
        </p>
      )}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 id="review-dishes" tabIndex={-1}>
            Your dishes
          </h2>
          <ReviewChangeLink section="dishes">Change</ReviewChangeLink>
        </div>
        <p>{cart.boxSize}-dish box</p>
        <DishLines dishes={dishes} groups={optionGroupsBySlug} readOnly />
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 id="review-extras" tabIndex={-1}>
            Extras
          </h2>
          <ReviewChangeLink section="extras">Change</ReviewChangeLink>
        </div>
        {cart.extras.length ? (
          <ExtraLines extras={extras} />
        ) : (
          <p>
            No extras added.{' '}
            <ReviewChangeLink section="extras">Add extras →</ReviewChangeLink>
          </p>
        )}
      </section>
      {cart.gift?.giftIntent && (
        <section className={styles.section}>
          <h2>Gift food box</h2>
          {cart.gift.hidePrices && <p>Prices hidden from the recipient.</p>}
          {cart.gift.includeGreetingCard && (
            <p>
              Greeting card
              {cart.gift.greetingCardMessage
                ? `: ${cart.gift.greetingCardMessage}`
                : ' included'}
            </p>
          )}
        </section>
      )}
    </FlowShell>
  );
}
