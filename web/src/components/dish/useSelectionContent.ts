'use client';

import { useEffect, useState } from 'react';

import type { PersonalisationSelection } from '@/lib/aonik/map';
import type { Dish, HeatingInstruction } from '@/lib/aonik/types';
import {
  readSelectionContentAnswer,
  selectionContentPath,
  withoutSelectionContent,
  withSelectionContent,
  type SelectionContentAnswer,
} from '@/lib/dish/selectionContent';

/** Waits this long after a change of choice before asking, so a run of taps asks once. */
const SETTLE_MS = 250;

export interface SelectionView {
  dish: Dish;
  heating: HeatingInstruction[];
  /** The panels describe the customer's own (non-standard) choices. */
  forSelection: boolean;
  /** Their content is still being asked for. */
  pending: boolean;
}

/**
 * The dish as the panels should describe it for `selection` — the
 * customer's choices, or undefined for the standard preparation
 * (`@/lib/dish/selectionContent`). The standard recipe's declaration is never
 * shown for other choices: until that selection's own content arrives, and if
 * it cannot, the declaration is withheld.
 */
export function useSelectionContent(
  dish: Dish,
  heating: HeatingInstruction[],
  selection: PersonalisationSelection | undefined,
): SelectionView {
  const key = selection ? JSON.stringify(selection) : null;
  const [resolved, setResolved] = useState<{ key: string; answer: SelectionContentAnswer } | null>(null);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(selectionContentPath(dish.slug, JSON.parse(key)), { signal: controller.signal })
        .then(async (response) => readSelectionContentAnswer(await response.json().catch(() => null)))
        .catch((): SelectionContentAnswer => ({ status: 'unavailable' }))
        .then((answer) => {
          if (!controller.signal.aborted) setResolved({ key, answer });
        });
    }, SETTLE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [dish.slug, key]);

  if (!key) return { dish, heating, forSelection: false, pending: false };
  const answer = resolved?.key === key ? resolved.answer : null;
  if (answer?.status === 'resolved') {
    return { dish: withSelectionContent(dish, answer.content), heating: answer.content.heating, forSelection: true, pending: false };
  }
  return { dish: withoutSelectionContent(dish), heating, forSelection: true, pending: answer === null };
}
