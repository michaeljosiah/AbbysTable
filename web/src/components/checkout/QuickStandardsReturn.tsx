'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PersonalisationSelection } from '@/lib/aonik/map';
import { isSameTabClick } from '@/lib/dish-return';
import {
  QUICK_RETURN_KEY,
  readQuickReturn,
  type QuickReturn,
} from '@/lib/dish/quick-return';
import styles from './Flow.module.css';

function load() {
  try {
    return readQuickReturn(
      sessionStorage.getItem(QUICK_RETURN_KEY),
      Date.now(),
    );
  } catch {
    return null;
  }
}
function save(record: QuickReturn) {
  try {
    sessionStorage.setItem(QUICK_RETURN_KEY, JSON.stringify(record));
  } catch {
    /* UI restoration is optional when storage is blocked. */
  }
}

export function QuickStandardsLink({
  source,
  id,
  name,
  selection,
}: {
  source: 'dishes' | 'extras';
  id: string;
  name: string;
  selection?: PersonalisationSelection;
}) {
  return (
    <Link
      href={`/standards?from=${source === 'dishes' ? 'step2' : 'step3'}&item=${encodeURIComponent(id)}`}
      onClick={(event) => {
        if (
          !isSameTabClick({
            ...event,
            target: event.currentTarget.getAttribute('target'),
          })
        )
          return;
        const entry = crypto.randomUUID();
        save({
          source,
          id,
          name,
          selection,
          entry,
          url: window.location.pathname + window.location.search,
          time: Date.now(),
          scroll: window.scrollY,
          historyLength: history.length,
          departed: false,
          returning: false,
        });
        history.replaceState({ ...history.state, atQuickEntry: entry }, '');
      }}
    >
      See our standards →
    </Link>
  );
}

export function BackToQuickView() {
  const [record, setRecord] = useState<QuickReturn | null>(null);
  useLayoutEffect(() => {
    const item = load();
    const params = new URLSearchParams(window.location.search);
    if (
      !item ||
      params.get('item') !== item.id ||
      params.get('from') !== (item.source === 'dishes' ? 'step2' : 'step3')
    )
      return;
    const departed = { ...item, departed: true };
    save(departed);
    setRecord(departed);
  }, []);
  if (!record) return null;
  return <QuickBackLink record={record} />;
}

function QuickBackLink({ record }: { record: QuickReturn }) {
  const router = useRouter();
  return (
    <Link
      href={record.url}
      className={styles.back}
      onClick={(event) => {
        if (
          !isSameTabClick({
            ...event,
            target: event.currentTarget.getAttribute('target'),
          })
        )
          return;
        event.preventDefault();
        const current = load();
        if (!current || current.entry !== record.entry) {
          router.replace(`/box/${record.source}`);
          return;
        }
        if (history.length === current.historyLength + 1) router.back();
        else {
          save({ ...current, returning: true });
          router.replace(current.url, { scroll: false });
        }
      }}
    >
      ‹ Back to {record.name}
    </Link>
  );
}

export function useQuickReturn(
  source: 'dishes' | 'extras',
  restore: (record: QuickReturn) => void,
) {
  const callback = useRef(restore);
  useEffect(() => {
    callback.current = restore;
  });
  useLayoutEffect(() => {
    const read = () => {
      const record = load();
      if (
        !record ||
        record.source !== source ||
        !record.departed ||
        (!record.returning && history.state?.atQuickEntry !== record.entry)
      )
        return;
      save({ ...record, returning: false, departed: false });
      callback.current(record);
      requestAnimationFrame(() =>
        window.scrollTo({ top: record.scroll, behavior: 'instant' }),
      );
    };
    read();
    window.addEventListener('popstate', read);
    window.addEventListener('pageshow', read);
    return () => {
      window.removeEventListener('popstate', read);
      window.removeEventListener('pageshow', read);
    };
  }, [source]);
}
