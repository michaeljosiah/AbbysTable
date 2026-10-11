'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type MouseEvent } from 'react';
import { useCart } from '@/lib/cart/CartProvider';
import { isSameTabClick } from '@/lib/dish-return';

// In-memory proof deliberately expires on a reload. History length alone is
// insufficient without witnessing the departure from Review in this tab.
let reviewTrip: { section: string; length: number } | null = null;

export function useReviewReturn() {
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const read = () =>
      setEditing(
        new URLSearchParams(window.location.search).get('return') === 'review',
      );
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  return editing;
}

export function ReviewChangeLink({
  section,
  children,
  className,
}: {
  section: 'dishes' | 'extras';
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useCart();
  return (
    <Link
      className={className}
      href={`/box/${section}?return=review`}
      aria-disabled={pending || undefined}
      onClick={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        if (
          !isSameTabClick({
            ...event,
            target: event.currentTarget.getAttribute('target'),
          })
        )
          return;
        // Only this live history pair is proof; a reload clears it and uses replace.
        reviewTrip = { section, length: history.length };
        window.history.replaceState(
          { ...window.history.state, atReviewEdited: section },
          '',
        );
      }}
    >
      {children}
    </Link>
  );
}

export function ReturnLink({
  section,
  disabled,
  className,
  children,
}: {
  section: 'dishes' | 'extras';
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { pending } = useCart();
  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    if (pending || disabled) {
      event.preventDefault();
      return;
    }
    if (
      !isSameTabClick({
        ...event,
        target: event.currentTarget.getAttribute('target'),
      })
    )
      return;
    event.preventDefault();
    if (
      reviewTrip?.section === section &&
      history.length === reviewTrip.length + 1
    ) {
      reviewTrip = null;
      router.back();
      return;
    }
    reviewTrip = null;
    // Replacing is the safe fallback when the previous history entry cannot be proven.
    router.replace(`/box/review?edited=${section}`);
  };
  return (
    <Link
      href={`/box/review?edited=${section}`}
      className={className}
      onClick={click}
      aria-disabled={pending || disabled || undefined}
    >
      {children}
    </Link>
  );
}

export function FlowBack({
  step,
  className,
}: {
  step: 'dishes' | 'extras' | 'review';
  className?: string;
}) {
  const editing = useReviewReturn();
  const { pending, shopping } = useCart();
  if (editing && step !== 'review')
    return (
      <ReturnLink
        section={step}
        disabled={shopping.maxStep !== 'checkout'}
        className={className}
      >
        ‹ Back to review
      </ReturnLink>
    );
  const destinations = {
    dishes: ['/box', 'Build your box'],
    extras: ['/box/dishes', 'Add dishes'],
    review: ['/box/extras', 'Extras'],
  };
  const [href, label] = destinations[step];
  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      ‹ Back to {label}
    </Link>
  );
}
