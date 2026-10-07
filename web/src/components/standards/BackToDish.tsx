'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';

import {
  DISH_RETURN_STORAGE_KEY,
  dishReturnGateScript,
  readDishReturnRecord,
  returnsByHistory,
  type DishReturnRecord,
} from '@/lib/dish-return';

import styles from './BackToDish.module.css';

const GATE_ID = 'standards-back-to-dish';

interface BackToDishProps {
  /** Validated against the catalogue by the page — never a raw query value. */
  slug: string;
  /** The real dish URL, carrying the portion to restore. */
  href: string;
}

function readRecord(slug: string): DishReturnRecord | null {
  try {
    return readDishReturnRecord(
      window.sessionStorage.getItem(DISH_RETURN_STORAGE_KEY),
      slug,
      Date.now(),
    );
  } catch {
    // Storage blocked or unavailable: no record, so no link. Never an error.
    return null;
  }
}

/**
 * "Back to dish" at the top of Our Standards' hero. The mechanism, end to end,
 * is documented in `lib/dish-return.ts`; this is the Standards end of it.
 *
 * The page renders this only for a dish the catalogue actually has. What is
 * left to check is the second signal — a live record for that dish in THIS
 * tab — and that needs the browser:
 *  - on a full page load the inline gate script, which runs as the element is
 *    parsed, hides it before first paint when there is no record (a pasted
 *    link). `suppressHydrationWarning` is there because the script may have
 *    set `hidden` before React hydrates; it covers this element's own
 *    attributes and nothing inside it;
 *  - on a client-side navigation React never runs inline scripts, so the
 *    layout effect makes the same check, still before paint.
 * Either way the bar is there from the first frame or never — no layout shift.
 */
export function BackToDish({ slug, href }: BackToDishProps) {
  const router = useRouter();
  // Starts true to match the server's markup; the gate may already have hidden it.
  const [genuine, setGenuine] = useState(true);
  const record = useRef<DishReturnRecord | null>(null);

  useLayoutEffect(() => {
    record.current = readRecord(slug);
    setGenuine(record.current !== null);
  }, [slug]);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // New tab, new window, download: let the browser follow the real href.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();

    // A TRUE return: back when the entry behind is the dish, otherwise replace
    // this entry — never a forward push, so Back from the dish never bounces
    // into Our Standards again.
    const current = record.current ?? readRecord(slug);
    if (current && returnsByHistory(current, window.history.length)) {
      router.back();
    } else {
      router.replace(href);
    }
  };

  return (
    <>
      <div id={GATE_ID} className={styles.bar} hidden={!genuine} suppressHydrationWarning>
        <Link href={href} className={styles.link} onClick={onClick}>
          <svg
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
            <path d="M15 6l-6 6 6 6" />
          </svg>
          {/* "Back to dish" — never bare "Back", never the dish name (design). */}
          <span>Back to dish</span>
        </Link>
      </div>
      <script dangerouslySetInnerHTML={{ __html: dishReturnGateScript(slug, GATE_ID) }} />
    </>
  );
}
