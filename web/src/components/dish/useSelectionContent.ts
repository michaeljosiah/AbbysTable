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

/** Where the panels' description of the customer's choices stands. */
export type SelectionState = 'standard' | 'pending' | 'resolved' | 'unpublished' | 'unavailable';

export interface SelectionView {
  dish: Dish;
  heating: HeatingInstruction[];
  /** The panels describe the customer's own (non-standard) choices. */
  forSelection: boolean;
  state: SelectionState;
}

/**
 * Which dish AND which choices an answer is for. Group keys are shared across
 * the catalogue, so two dishes can have the same selection — one's answer is
 * never the other's.
 */
export function selectionKey(slug: string, selection: PersonalisationSelection): string {
  return `${slug}\n${JSON.stringify(selection)}`;
}

/** An answer as the hook holds it: the key it was asked for. */
export interface HeldAnswer {
  key: string;
  answer: SelectionContentAnswer;
}

/**
 * What the panels show for the choices at `key` (`null`: the standard
 * preparation), given the last answer that arrived — which counts only if it
 * was for exactly that dish and those choices.
 */
export function selectionView(
  dish: Dish,
  heating: HeatingInstruction[],
  key: string | null,
  held: HeldAnswer | null,
): SelectionView {
  if (!key) return { dish, heating, forSelection: false, state: 'standard' };
  const answer = held?.key === key ? held.answer : null;
  if (answer?.status === 'resolved') {
    return {
      dish: withSelectionContent(dish, answer.content),
      heating: answer.content.heating,
      forSelection: true,
      state: 'resolved',
    };
  }
  // Never the standard's reheating either: its timings need not hold for these choices.
  return { dish: withoutSelectionContent(dish), heating: [], forSelection: true, state: answer?.status ?? 'pending' };
}

/**
 * The dish as the panels should describe it for `selection` — the
 * customer's choices, or `null` for the standard preparation
 * (`@/lib/dish/selectionContent`). The standard recipe's declaration is never
 * shown for other choices: until that selection's own content arrives, and if
 * it cannot, the declaration is withheld.
 */
export function useSelectionContent(
  dish: Dish,
  heating: HeatingInstruction[],
  selection: PersonalisationSelection | null,
): SelectionView {
  const key = selection ? selectionKey(dish.slug, selection) : null;
  const [resolved, setResolved] = useState<HeldAnswer | null>(null);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(selectionContentPath(dish.slug, JSON.parse(key.slice(key.indexOf('\n') + 1))), {
        signal: controller.signal,
      })
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

  return selectionView(dish, heating, key, resolved);
}
