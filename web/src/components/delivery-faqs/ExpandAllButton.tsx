'use client';

import { useEffect, useRef, useState } from 'react';

import styles from './Faq.module.css';

/**
 * A group's "Expand all" / "Collapse all" — the one control in the FAQ groups
 * that needs JavaScript, so the groups themselves stay server-rendered.
 *
 * Each question is a native `<details>` that owns its own open state, so the
 * label is DERIVED from them rather than tracked: one capturing `toggle`
 * listener on the group (the event does not bubble). "Collapse all" only when
 * every question is open — a partly open group still offers "Expand all",
 * because the label says what the button will do.
 */
export function ExpandAllButton({ groupTitle }: { groupTitle: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [allOpen, setAllOpen] = useState(false);

  const questions = () =>
    Array.from(
      ref.current?.closest('[data-faq-group]')?.querySelectorAll<HTMLDetailsElement>('details') ?? [],
    );

  useEffect(() => {
    const group = ref.current?.closest('[data-faq-group]');
    if (!group) return;
    const sync = () => {
      const all = Array.from(group.querySelectorAll<HTMLDetailsElement>('details'));
      setAllOpen(all.length > 0 && all.every((details) => details.open));
    };
    sync();
    group.addEventListener('toggle', sync, true);
    return () => group.removeEventListener('toggle', sync, true);
  }, []);

  const onClick = () => {
    const next = !allOpen;
    for (const details of questions()) details.open = next;
    setAllOpen(next);
  };

  return (
    <button ref={ref} type="button" className={styles.expand} onClick={onClick}>
      <span>{allOpen ? 'Collapse all' : 'Expand all'}</span>
      {/* Context for a screen reader, which hears eight of these. */}
      <span className="visuallyHidden"> questions in {groupTitle}</span>
      <span className={styles.expandSign} aria-hidden="true">
        {allOpen ? '−' : '+'}
      </span>
    </button>
  );
}
