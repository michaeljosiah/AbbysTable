'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLayoutEffect, useState, type MouseEvent } from 'react';

import { dishReturnGateScript, markReturning, returnsByHistory } from '@/lib/dish-return';
import { loadDishReturn, saveDishReturn } from '@/lib/dish-return-storage';

import styles from './BackToDish.module.css';

const GATE_ID = 'standards-back-to-dish';

interface BackToDishProps {
  /** Validated against the catalogue by the page — never a raw query value. */
  slug: string;
  /** The real dish URL. */
  href: string;
}

/**
 * "Back to dish" at the top of Our Standards' hero. The mechanism, end to end,
 * is documented in `lib/dish-return.ts`; this is the Standards end of it.
 *
 * The page renders this only for a dish the catalogue actually has, and the
 * server renders it HIDDEN: the second signal — a live record for that dish in
 * THIS tab — exists only in the browser, so only the browser may reveal it.
 *  - On a full page load the inline gate script, which runs as the element is
 *    parsed, reveals it before first paint. `suppressHydrationWarning` is
 *    there because the script may have cleared `hidden` before React
 *    hydrates; it covers this element's own attributes and nothing inside it.
 *  - On a client-side navigation React never runs inline scripts, so the
 *    layout effect makes the same check, still before paint.
 * With JavaScript off it never shows. Either way it is there from the first
 * frame or never — no layout shift.
 */
export function BackToDish({ slug, href }: BackToDishProps) {
  const router = useRouter();
  // Matches the server's markup; the gate may already have revealed it.
  const [genuine, setGenuine] = useState(false);

  useLayoutEffect(() => {
    setGenuine(loadDishReturn(slug) !== null);
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

    const record = loadDishReturn(slug);
    if (!record) {
      // The record lapsed while the page was open: an ordinary visit.
      router.replace(href);
      return;
    }
    saveDishReturn(markReturning(record));

    // A TRUE return: back when the entry behind is the dish, otherwise replace
    // this entry — never a forward push, so Back from the dish never bounces
    // into Our Standards again. On replace the dish page puts the scroll
    // position back itself, from the record.
    if (returnsByHistory(record, window.history.length)) {
      router.back();
    } else {
      router.replace(href, { scroll: false });
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
